//! Download queue: spawns yt-dlp per job, bounded by a semaphore, and streams
//! progress to the UI as `download://update` events.
//!
//! Pause kills the yt-dlp process but keeps the job, so resuming re-spawns it and
//! yt-dlp continues from the `.part` file it left on disk.
use std::{
    collections::HashMap,
    path::PathBuf,
    sync::{
        Arc, Mutex,
        atomic::{AtomicU64, Ordering},
    },
};

use crate::{history, notify, settings, template};
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, Manager, State};
use tauri_plugin_shell::process::{CommandChild, CommandEvent};
use tokio::sync::Semaphore;

const MAX_CONCURRENT: usize = 3;

pub struct DownloadState {
    next_id: AtomicU64,
    slots: Semaphore,
    jobs: Mutex<HashMap<String, Entry>>,
}

impl Default for DownloadState {
    fn default() -> Self {
        Self {
            next_id: AtomicU64::new(1),
            slots: Semaphore::new(MAX_CONCURRENT),
            jobs: Mutex::default(),
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq)]
enum Desired {
    Run,
    Pause,
    Cancel,
}

struct Spec {
    url: String,
    options: Options,
    out_dir: PathBuf,
}

struct Entry {
    spec: Arc<Spec>,
    /// What the user last asked for; checked whenever the job is about to (re)start or stops.
    desired: Desired,
    /// True while a task is waiting for a slot or running yt-dlp.
    alive: bool,
    child: Option<CommandChild>,
    /// Survives pauses so the progress bar never moves backwards.
    tracker: Tracker,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum Kind {
    Video,
    Audio,
}

#[derive(Debug, Clone, Copy, Default, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum Container {
    #[default]
    Mp4,
    Mkv,
    Webm,
}

impl Container {
    fn as_str(self) -> &'static str {
        match self {
            Container::Mp4 => "mp4",
            Container::Mkv => "mkv",
            Container::Webm => "webm",
        }
    }
}

/// Preferred video codec; falls back to the best available when the video has none of it.
#[derive(Debug, Clone, Copy, Default, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum Codec {
    #[default]
    Any,
    H264,
    Vp9,
    Av1,
}

impl Codec {
    /// yt-dlp format filter, or empty for "no preference".
    fn filter(self) -> &'static str {
        match self {
            Codec::Any => "",
            Codec::H264 => "[vcodec^=avc]",
            Codec::Vp9 => "[vcodec~='^(vp9|vp09)']",
            Codec::Av1 => "[vcodec^=av01]",
        }
    }
}

#[derive(Debug, Clone, Copy, Default, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum AudioFormat {
    #[default]
    Mp3,
    M4a,
    Opus,
    Flac,
    Wav,
}

impl AudioFormat {
    fn as_str(self) -> &'static str {
        match self {
            AudioFormat::Mp3 => "mp3",
            AudioFormat::M4a => "m4a",
            AudioFormat::Opus => "opus",
            AudioFormat::Flac => "flac",
            AudioFormat::Wav => "wav",
        }
    }

    /// Lossless formats have no bitrate to choose.
    fn is_lossy(self) -> bool {
        !matches!(self, AudioFormat::Flac | AudioFormat::Wav)
    }
}

#[derive(Debug, Clone, Deserialize)]
pub struct Subtitles {
    /// Language code as listed by yt-dlp, e.g. `en`, `pt-BR` or `de-orig`.
    pub lang: String,
    /// The language only has automatic captions.
    #[serde(default)]
    pub auto: bool,
    /// Put the subtitles inside the video file instead of saving an .srt next to it.
    #[serde(default)]
    pub embed: bool,
}

impl Subtitles {
    /// Language codes are passed to yt-dlp as a regex, so only plain codes are allowed.
    fn is_valid(&self) -> bool {
        (1..=16).contains(&self.lang.len())
            && self.lang.chars().all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_')
    }
}

/// A start and end time, in seconds, to keep from the video.
#[derive(Debug, Clone, Copy, Deserialize)]
pub struct Section {
    pub start: f64,
    pub end: f64,
}

impl Section {
    fn is_valid(&self) -> bool {
        self.start.is_finite() && self.end.is_finite() && self.start >= 0.0 && self.end > self.start
    }

    /// yt-dlp's `--download-sections` syntax: `*START-END` in seconds.
    fn arg(&self) -> String {
        format!("*{}-{}", self.start, self.end)
    }
}

#[derive(Debug, Clone, Deserialize)]
pub struct Options {
    pub kind: Kind,
    /// Maximum video height (e.g. 1080); `None` means best available.
    pub height: Option<u32>,
    #[serde(default)]
    pub container: Container,
    #[serde(default)]
    pub codec: Codec,
    #[serde(default)]
    pub audio_format: AudioFormat,
    /// Audio bitrate in kbit/s; `None` means the best quality.
    #[serde(default)]
    pub audio_bitrate: Option<u32>,
    #[serde(default)]
    pub subtitles: Option<Subtitles>,
    /// Download only this part of the video.
    #[serde(default)]
    pub section: Option<Section>,
    /// Both come from the user's settings rather than from the caller.
    #[serde(skip)]
    pub embed_metadata: bool,
    #[serde(skip)]
    pub embed_thumbnail: bool,
    /// The user's filename template; empty or invalid means the default.
    #[serde(skip)]
    pub filename_template: String,
    /// Overrides the default Downloads folder.
    pub dir: Option<String>,
    /// Display title recorded in history.
    #[serde(default)]
    pub title: Option<String>,
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum Status {
    Queued,
    Downloading,
    /// All bytes are in; yt-dlp/ffmpeg is merging or converting.
    Processing,
    Paused,
    Done,
    Error,
    Cancelled,
}

#[derive(Debug, Clone, Serialize)]
pub struct Update {
    pub id: String,
    pub status: Status,
    pub percent: Option<f64>,
    pub speed: Option<f64>,
    pub eta: Option<u64>,
    pub file: Option<String>,
    pub error: Option<String>,
}

impl Update {
    fn new(id: &str, status: Status) -> Self {
        Self {
            id: id.to_string(),
            status,
            percent: None,
            speed: None,
            eta: None,
            file: None,
            error: None,
        }
    }

    fn with_percent(mut self, percent: f64) -> Self {
        self.percent = Some(percent);
        self
    }
}

// ---------------------------------------------------------------------------
// Progress parsing
// ---------------------------------------------------------------------------

const PROGRESS_PREFIX: &str = "PROGRESS|";
const STREAMS_PREFIX: &str = "STREAMS|";
const FILE_PREFIX: &str = "FILE|";

struct Progress {
    /// Fraction (0..1) of the *current stream*, when its size is known.
    fraction: Option<f64>,
    speed: Option<f64>,
    eta: Option<u64>,
    filename: String,
}

/// Parses `PROGRESS|downloaded|total|total_estimate|speed|eta|filename` (numbers may be "NA").
/// The filename is last because it may itself contain `|`.
fn parse_progress(line: &str) -> Option<Progress> {
    let fields: Vec<&str> = line.strip_prefix(PROGRESS_PREFIX)?.splitn(6, '|').collect();
    let num = |i: usize| fields.get(i).and_then(|v| v.trim().parse::<f64>().ok());
    let fraction = match (num(0), num(1).or(num(2))) {
        (Some(d), Some(t)) if t > 0.0 => Some((d / t).clamp(0.0, 1.0)),
        _ => None,
    };
    Some(Progress {
        fraction,
        speed: num(3),
        eta: num(4).map(|e| e as u64),
        filename: fields.get(5).unwrap_or(&"").to_string(),
    })
}

/// Parses `STREAMS|id0|size0|id1|size1` printed once per video by yt-dlp.
/// Audio-only or single-file formats print `NA` ids, which yields an empty list.
fn parse_streams(line: &str) -> Option<(Vec<String>, Vec<Option<f64>>)> {
    let fields: Vec<&str> = line.strip_prefix(STREAMS_PREFIX)?.split('|').collect();
    let (mut ids, mut sizes) = (Vec::new(), Vec::new());
    for pair in fields.chunks(2) {
        let id = pair[0].trim();
        if id.is_empty() || id == "NA" {
            continue;
        }
        ids.push(id.to_string());
        sizes.push(pair.get(1).and_then(|s| s.trim().parse::<f64>().ok()));
    }
    Some((ids, sizes))
}

/// Combines the per-stream progress of a merged download (video + audio are fetched
/// one after the other) into a single monotonic percentage.
#[derive(Debug, Default, Clone)]
struct Tracker {
    ids: Vec<String>,
    weights: Vec<f64>,
    last_file: Option<String>,
    idx: usize,
    overall: f64,
}

impl Tracker {
    fn set_streams(&mut self, ids: Vec<String>, sizes: Vec<Option<f64>>) {
        let n = ids.len().max(1);
        let total: f64 = sizes.iter().flatten().sum();
        self.weights = if sizes.len() == n && sizes.iter().all(Option::is_some) && total > 0.0 {
            sizes.iter().map(|s| s.unwrap() / total).collect()
        } else {
            vec![1.0 / n as f64; n]
        };
        self.ids = ids;
        self.last_file = None;
        self.idx = 0;
    }

    /// Returns the overall percentage (never decreasing).
    fn update(&mut self, fraction: Option<f64>, filename: &str) -> f64 {
        if self.weights.is_empty() {
            self.set_streams(Vec::new(), Vec::new());
        }
        // Stream files are named like `Title [id].f137.mp4`; match on the format id.
        // Without ids (single stream), fall back to counting filename changes.
        let by_id = self
            .ids
            .iter()
            .position(|id| filename.contains(&format!(".f{id}.")));
        match by_id {
            Some(i) => self.idx = i,
            None => {
                if self.last_file.as_deref().is_some_and(|f| f != filename) {
                    self.idx += 1;
                }
            }
        }
        self.last_file = Some(filename.to_string());
        self.idx = self.idx.min(self.weights.len() - 1);

        if let Some(f) = fraction {
            let done: f64 = self.weights[..self.idx].iter().sum();
            let now = (done + self.weights[self.idx] * f) * 100.0;
            self.overall = self.overall.max(now.min(100.0));
        }
        self.overall
    }
}

// ---------------------------------------------------------------------------
// Process helpers
// ---------------------------------------------------------------------------

/// Best video+audio within the height cap, preferring `codec` and falling back to anything.
fn video_selector(height: Option<u32>, codec: Codec) -> String {
    let h = height.map(|h| format!("[height<={h}]")).unwrap_or_default();
    let c = codec.filter();
    if c.is_empty() {
        format!("bv*{h}+ba/b{h}")
    } else {
        format!("bv*{c}{h}+ba/bv*{h}+ba/b{h}")
    }
}

fn build_args(options: &Options, out_dir: &str, ffmpeg: Option<&str>, url: &str) -> Vec<String> {
    let mut a: Vec<String> = [
        "--newline",
        "--no-playlist",
        "--progress",
        "--progress-template",
        "download:PROGRESS|%(progress.downloaded_bytes)s|%(progress.total_bytes)s|%(progress.total_bytes_estimate)s|%(progress.speed)s|%(progress.eta)s|%(progress.filename)s",
        "--print",
        "video:STREAMS|%(requested_formats.0.format_id)s|%(requested_formats.0.filesize,requested_formats.0.filesize_approx)s|%(requested_formats.1.format_id)s|%(requested_formats.1.filesize,requested_formats.1.filesize_approx)s",
        "--print",
        "after_move:FILE|%(filepath)s",
        "-o",
    ]
    .map(String::from)
    .to_vec();
    let name = template::render(&options.filename_template)
        .or_else(|_| template::render(template::DEFAULT))
        .expect("the default template is valid");
    a.push(format!("{out_dir}/{name}.%(ext)s"));
    if let Some(f) = ffmpeg {
        a.push("--ffmpeg-location".into());
        a.push(f.into());
    }
    match options.kind {
        Kind::Video => {
            a.extend([
                "-f".into(),
                video_selector(options.height, options.codec),
                "--merge-output-format".into(),
                options.container.as_str().into(),
            ]);
        }
        Kind::Audio => {
            a.extend([
                "-x".into(),
                "--audio-format".into(),
                options.audio_format.as_str().into(),
            ]);
            if options.audio_format.is_lossy() {
                // 0 is yt-dlp's "best"; otherwise a fixed bitrate such as 192K.
                let quality = options.audio_bitrate.map_or("0".to_string(), |k| format!("{k}K"));
                a.extend(["--audio-quality".into(), quality]);
            }
        }
    }
    if options.embed_metadata {
        a.push("--embed-metadata".into());
    }
    if options.embed_thumbnail {
        // Cover art must be JPEG or PNG; YouTube serves WebP.
        a.extend(["--embed-thumbnail".into(), "--convert-thumbnails".into(), "jpg".into()]);
    }
    if let Some(s) = options.subtitles.as_ref().filter(|s| s.is_valid()) {
        a.extend(["--write-subs".into(), "--sub-langs".into(), s.lang.clone()]);
        if s.auto {
            a.push("--write-auto-subs".into());
        }
        // Players read .srt most widely; embedding only makes sense in a video file.
        a.extend(["--convert-subs".into(), "srt".into()]);
        if s.embed && options.kind == Kind::Video {
            a.push("--embed-subs".into());
        }
    }
    if let Some(sec) = options.section.filter(Section::is_valid) {
        // Cut on the exact frames rather than the nearest keyframes; ffmpeg re-encodes the edges.
        a.extend(["--download-sections".into(), sec.arg(), "--force-keyframes-at-cuts".into()]);
    }
    // `--` stops option parsing so the URL can never be read as a flag.
    a.push("--".into());
    a.push(url.into());
    a
}

/// Tauri copies sidecars next to the app executable (without the target triple).
fn ffmpeg_path() -> Option<String> {
    let name = if cfg!(windows) {
        "ffmpeg.exe"
    } else {
        "ffmpeg"
    };
    let p = std::env::current_exe().ok()?.parent()?.join(name);
    p.exists().then(|| p.to_string_lossy().into_owned())
}

/// Stops yt-dlp *and its children*. The PyInstaller build of yt-dlp runs the real
/// work in a child process, so killing only the parent would leave the download going.
fn kill_tree(child: CommandChild) {
    let pid = child.pid().to_string();
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x0800_0000;
        let ok = std::process::Command::new("taskkill")
            .args(["/PID", &pid, "/T", "/F"])
            .creation_flags(CREATE_NO_WINDOW)
            .status()
            .is_ok_and(|s| s.success());
        if ok {
            return;
        }
    }
    #[cfg(unix)]
    {
        // The PyInstaller bootloader forwards SIGTERM to its child.
        let ok = std::process::Command::new("kill")
            .args(["-TERM", &pid])
            .status()
            .is_ok_and(|s| s.success());
        if ok {
            return;
        }
    }
    let _ = child.kill();
}

fn emit(app: &AppHandle, update: Update) {
    let _ = app.emit("download://update", update);
}

// ---------------------------------------------------------------------------
// Scheduling
// ---------------------------------------------------------------------------

#[tauri::command]
pub async fn start_download(
    app: AppHandle,
    state: State<'_, DownloadState>,
    url: String,
    mut options: Options,
) -> Result<String, String> {
    let id = state.next_id.fetch_add(1, Ordering::Relaxed).to_string();
    let prefs = settings::load(&app);
    options.embed_metadata = prefs.embed_metadata;
    options.embed_thumbnail = prefs.embed_thumbnail;
    options.filename_template = prefs.filename_template.clone();
    let out_dir: PathBuf = match options.dir.clone().or(prefs.download_dir) {
        Some(d) => PathBuf::from(d),
        None => app.path().download_dir().map_err(|e| e.to_string())?,
    };
    state.jobs.lock().unwrap().insert(
        id.clone(),
        Entry {
            spec: Arc::new(Spec {
                url,
                options,
                out_dir,
            }),
            desired: Desired::Run,
            alive: true,
            child: None,
            tracker: Tracker::default(),
        },
    );
    emit(&app, Update::new(&id, Status::Queued));
    spawn_task(&app, id.clone());
    Ok(id)
}

fn spawn_task(app: &AppHandle, id: String) {
    let app = app.clone();
    tauri::async_runtime::spawn(async move { drive(&app, &id).await });
}

/// Waits for a free slot, then runs the job unless it was paused or cancelled meanwhile.
async fn drive(app: &AppHandle, id: &str) {
    let state = app.state::<DownloadState>();
    let Ok(_permit) = state.slots.acquire().await else {
        return;
    };

    let spec = {
        let mut jobs = state.jobs.lock().unwrap();
        let Some(entry) = jobs.get_mut(id) else {
            return;
        };
        match entry.desired {
            Desired::Run => entry.spec.clone(),
            Desired::Pause => {
                entry.alive = false;
                let pct = entry.tracker.overall;
                drop(jobs);
                return emit(app, Update::new(id, Status::Paused).with_percent(pct));
            }
            Desired::Cancel => {
                jobs.remove(id);
                drop(jobs);
                return emit(app, Update::new(id, Status::Cancelled));
            }
        }
    };
    run_job(app, &state, id, &spec).await;
}

async fn run_job(app: &AppHandle, state: &DownloadState, id: &str, spec: &Spec) {
    let args = build_args(
        &spec.options,
        &spec.out_dir.to_string_lossy().replace('\\', "/"),
        ffmpeg_path().as_deref(),
        &spec.url,
    );
    let spawned =
        crate::ytdlp::command(app).and_then(|c| c.args(args).spawn().map_err(|e| e.to_string()));
    let (mut rx, child) = match spawned {
        Ok(v) => v,
        Err(e) => return finish_error(app, state, id, e),
    };

    {
        let mut jobs = state.jobs.lock().unwrap();
        match jobs.get_mut(id) {
            Some(entry) if entry.desired == Desired::Run => entry.child = Some(child),
            // Paused or cancelled while spawning: stop it now; the event loop below
            // sees the process end and settles the final state.
            _ => kill_tree(child),
        }
    }
    let pct = state
        .jobs
        .lock()
        .unwrap()
        .get(id)
        .map_or(0.0, |e| e.tracker.overall);
    emit(app, Update::new(id, Status::Downloading).with_percent(pct));

    let mut file = None;
    let mut last_err = String::new();
    let mut code = None;
    while let Some(event) = rx.recv().await {
        match event {
            CommandEvent::Stdout(bytes) => {
                for line in String::from_utf8_lossy(&bytes).lines() {
                    handle_line(app, state, id, line, &mut file);
                }
            }
            CommandEvent::Stderr(bytes) => {
                let text = String::from_utf8_lossy(&bytes);
                if let Some(l) = text.lines().rev().find(|l| !l.trim().is_empty()) {
                    last_err = l.trim().to_string();
                }
            }
            CommandEvent::Terminated(p) => {
                code = p.code;
                break;
            }
            _ => {}
        }
    }

    let (desired, pct) = {
        let mut jobs = state.jobs.lock().unwrap();
        match jobs.get_mut(id) {
            Some(e) => {
                e.child = None;
                (e.desired, e.tracker.overall)
            }
            None => (Desired::Cancel, 0.0),
        }
    };
    match desired {
        Desired::Cancel => {
            state.jobs.lock().unwrap().remove(id);
            emit(app, Update::new(id, Status::Cancelled));
        }
        Desired::Pause => {
            if let Some(e) = state.jobs.lock().unwrap().get_mut(id) {
                e.alive = false;
            }
            emit(app, Update::new(id, Status::Paused).with_percent(pct));
        }
        Desired::Run if code == Some(0) => {
            state.jobs.lock().unwrap().remove(id);
            let kind = if spec.options.kind == Kind::Audio {
                "audio"
            } else {
                "video"
            };
            let title = spec.options.title.as_deref().unwrap_or(&spec.url);
            history::record(app, title, &spec.url, file.as_deref(), kind);
            let mut u = Update::new(id, Status::Done).with_percent(100.0);
            u.file = file;
            emit(app, u);
            notify::download_ended(app, title, None);
        }
        Desired::Run => {
            let msg = if last_err.is_empty() {
                format!("yt-dlp exited with code {code:?}")
            } else {
                last_err
            };
            finish_error(app, state, id, msg);
        }
    }
}

/// Marks the job failed but keeps it, so the UI can offer Retry (resume).
fn finish_error(app: &AppHandle, state: &DownloadState, id: &str, message: String) {
    let title = state.jobs.lock().unwrap().get_mut(id).map(|e| {
        e.alive = false;
        e.spec.options.title.clone().unwrap_or_else(|| e.spec.url.clone())
    });
    let mut u = Update::new(id, Status::Error);
    u.error = Some(message.clone());
    emit(app, u);
    if let Some(title) = title {
        notify::download_ended(app, &title, Some(&message));
    }
}

fn is_subtitle_file(filename: &str) -> bool {
    let name = filename.strip_suffix(".part").unwrap_or(filename);
    name.rsplit('.').next().is_some_and(|ext| {
        matches!(
            ext,
            "vtt" | "srt" | "ttml" | "ass" | "lrc" | "json3" | "srv1" | "srv2" | "srv3" | "sbv"
        )
    })
}

fn handle_line(
    app: &AppHandle,
    state: &DownloadState,
    id: &str,
    line: &str,
    file: &mut Option<String>,
) {
    if let Some(p) = parse_progress(line) {
        // A subtitle file is not one of the video or audio streams, and counting it
        // would advance the tracker and make the bar jump.
        if is_subtitle_file(&p.filename) {
            return;
        }
        let overall = {
            let mut jobs = state.jobs.lock().unwrap();
            let Some(entry) = jobs.get_mut(id) else {
                return;
            };
            entry.tracker.update(p.fraction, &p.filename)
        };
        let status = if overall >= 99.9 {
            Status::Processing
        } else {
            Status::Downloading
        };
        let mut u = Update::new(id, status).with_percent(overall);
        (u.speed, u.eta) = (p.speed, p.eta);
        emit(app, u);
    } else if let Some((ids, sizes)) = parse_streams(line) {
        if let Some(entry) = state.jobs.lock().unwrap().get_mut(id) {
            entry.tracker.set_streams(ids, sizes);
        }
    } else if let Some(f) = line.strip_prefix(FILE_PREFIX) {
        *file = Some(f.trim().to_string());
    }
}

// ---------------------------------------------------------------------------
// Controls
// ---------------------------------------------------------------------------

#[tauri::command]
pub fn pause_download(app: AppHandle, state: State<'_, DownloadState>, id: String) {
    let mut jobs = state.jobs.lock().unwrap();
    let Some(entry) = jobs.get_mut(&id) else {
        return;
    };
    entry.desired = Desired::Pause;
    match entry.child.take() {
        // Running: killing the process ends the event loop, which reports `Paused`.
        Some(child) => kill_tree(child),
        // Waiting for a slot (or still spawning): report immediately.
        None => {
            let pct = entry.tracker.overall;
            drop(jobs);
            emit(&app, Update::new(&id, Status::Paused).with_percent(pct));
        }
    }
}

/// Resumes a paused job, or retries a failed one.
#[tauri::command]
pub fn resume_download(app: AppHandle, state: State<'_, DownloadState>, id: String) {
    let respawn = {
        let mut jobs = state.jobs.lock().unwrap();
        let Some(entry) = jobs.get_mut(&id) else {
            return;
        };
        entry.desired = Desired::Run;
        // If a task is still waiting for a slot it will simply continue.
        !std::mem::replace(&mut entry.alive, true)
    };
    emit(&app, Update::new(&id, Status::Queued));
    if respawn {
        spawn_task(&app, id);
    }
}

#[tauri::command]
pub fn cancel_download(app: AppHandle, state: State<'_, DownloadState>, id: String) {
    let mut jobs = state.jobs.lock().unwrap();
    let Some(entry) = jobs.get_mut(&id) else {
        return;
    };
    entry.desired = Desired::Cancel;
    if let Some(child) = entry.child.take() {
        // Running: the event loop reports `Cancelled` once the process is gone.
        return kill_tree(child);
    }
    if !entry.alive {
        // Paused or failed: nothing is running, so settle it here.
        jobs.remove(&id);
    }
    drop(jobs);
    emit(&app, Update::new(&id, Status::Cancelled));
}

#[cfg(test)]
mod tests {
    use super::*;

    fn opts(kind: Kind, height: Option<u32>) -> Options {
        Options {
            kind,
            height,
            container: Container::default(),
            codec: Codec::default(),
            audio_format: AudioFormat::default(),
            audio_bitrate: None,
            subtitles: None,
            section: None,
            embed_metadata: false,
            embed_thumbnail: false,
            filename_template: String::new(),
            dir: None,
            title: None,
        }
    }

    fn flag(args: &[String], name: &str) -> Option<String> {
        args.iter().position(|a| a == name).map(|i| args[i + 1].clone())
    }

    #[test]
    fn parses_progress_with_total() {
        let p = parse_progress("PROGRESS|500|1000|NA|2048.5|30|C:/x/a b.mp4").unwrap();
        assert_eq!(p.fraction, Some(0.5));
        assert_eq!(p.speed, Some(2048.5));
        assert_eq!(p.eta, Some(30));
        assert_eq!(p.filename, "C:/x/a b.mp4");
    }

    #[test]
    fn filename_may_contain_pipes() {
        let p = parse_progress("PROGRESS|1|2|NA|NA|NA|My | Title.f137.mp4").unwrap();
        assert_eq!(p.filename, "My | Title.f137.mp4");
    }

    #[test]
    fn falls_back_to_estimate_and_handles_na() {
        let p = parse_progress("PROGRESS|250|NA|1000|NA|NA|f").unwrap();
        assert_eq!(p.fraction, Some(0.25));
        assert_eq!((p.speed, p.eta), (None, None));
    }

    #[test]
    fn ignores_other_lines() {
        assert!(parse_progress("[download] Destination: x").is_none());
    }

    #[test]
    fn parses_streams() {
        let (ids, sizes) = parse_streams("STREAMS|395|223779|251|252182").unwrap();
        assert_eq!(ids, ["395", "251"]);
        assert_eq!(sizes, [Some(223779.0), Some(252182.0)]);
        let (ids, _) = parse_streams("STREAMS|NA|NA|NA|NA").unwrap();
        assert!(ids.is_empty());
    }

    #[test]
    fn merged_download_progress_never_goes_backwards() {
        let mut t = Tracker::default();
        t.set_streams(
            vec!["395".into(), "251".into()],
            vec![Some(750.0), Some(250.0)],
        );
        let video = "T [x].f395.mp4";
        let audio = "T [x].f251.webm";
        let a = t.update(Some(0.5), video);
        assert!((a - 37.5).abs() < 1e-9);
        let b = t.update(Some(1.0), video);
        assert!((b - 75.0).abs() < 1e-9);
        // Second stream starts again from 0% but the overall bar keeps climbing.
        let c = t.update(Some(0.0), audio);
        assert!((c - 75.0).abs() < 1e-9);
        let d = t.update(Some(1.0), audio);
        assert!((d - 100.0).abs() < 1e-9);
    }

    #[test]
    fn resumed_job_skips_finished_stream_without_regressing() {
        let mut t = Tracker::default();
        t.set_streams(vec!["395".into(), "251".into()], vec![None, None]);
        t.update(Some(1.0), "T.f395.mp4"); // 50%
        // After a resume only the audio stream is downloaded.
        t.set_streams(vec!["395".into(), "251".into()], vec![None, None]);
        assert!((t.update(Some(0.2), "T.f251.webm") - 60.0).abs() < 1e-9);
    }

    #[test]
    fn single_stream_without_ids() {
        let mut t = Tracker::default();
        t.set_streams(Vec::new(), Vec::new());
        assert!((t.update(Some(0.4), "a.webm") - 40.0).abs() < 1e-9);
    }

    #[test]
    fn url_is_after_option_terminator() {
        let args = build_args(&opts(Kind::Audio, None), "/tmp", None, "--exec=evil");
        let n = args.len();
        assert_eq!(args[n - 2], "--");
        assert_eq!(args[n - 1], "--exec=evil");
    }

    #[test]
    fn video_selector_caps_height() {
        let args = build_args(&opts(Kind::Video, Some(720)), "/tmp", None, "u");
        assert!(args.contains(&"bv*[height<=720]+ba/b[height<=720]".to_string()));
    }

    #[test]
    fn codec_preference_falls_back_to_anything() {
        let mut o = opts(Kind::Video, Some(1080));
        o.codec = Codec::H264;
        o.container = Container::Mkv;
        let args = build_args(&o, "/tmp", None, "u");
        assert_eq!(
            flag(&args, "-f").unwrap(),
            "bv*[vcodec^=avc][height<=1080]+ba/bv*[height<=1080]+ba/b[height<=1080]"
        );
        assert_eq!(flag(&args, "--merge-output-format").unwrap(), "mkv");
    }

    #[test]
    fn audio_format_and_bitrate() {
        let mut o = opts(Kind::Audio, None);
        o.audio_format = AudioFormat::M4a;
        o.audio_bitrate = Some(192);
        let args = build_args(&o, "/tmp", None, "u");
        assert_eq!(flag(&args, "--audio-format").unwrap(), "m4a");
        assert_eq!(flag(&args, "--audio-quality").unwrap(), "192K");
        o.audio_bitrate = None;
        let args = build_args(&o, "/tmp", None, "u");
        assert_eq!(flag(&args, "--audio-quality").unwrap(), "0");
    }

    #[test]
    fn lossless_audio_has_no_bitrate() {
        let mut o = opts(Kind::Audio, None);
        o.audio_format = AudioFormat::Flac;
        o.audio_bitrate = Some(320);
        let args = build_args(&o, "/tmp", None, "u");
        assert!(flag(&args, "--audio-quality").is_none());
    }

    #[test]
    fn embeds_metadata_and_cover_art_when_enabled() {
        let mut o = opts(Kind::Audio, None);
        let plain = build_args(&o, "/tmp", None, "u");
        assert!(!plain.contains(&"--embed-metadata".to_string()));
        assert!(!plain.contains(&"--embed-thumbnail".to_string()));
        o.embed_metadata = true;
        o.embed_thumbnail = true;
        let args = build_args(&o, "/tmp", None, "u");
        assert!(args.contains(&"--embed-metadata".to_string()));
        assert!(args.contains(&"--embed-thumbnail".to_string()));
        assert_eq!(flag(&args, "--convert-thumbnails").unwrap(), "jpg");
    }

    #[test]
    fn output_name_uses_the_template_or_falls_back() {
        let mut o = opts(Kind::Video, None);
        let out = |o: &Options| flag(&build_args(o, "/tmp", None, "u"), "-o").unwrap();
        assert_eq!(out(&o), "/tmp/%(title).150B [%(id)s].%(ext)s");
        o.filename_template = "{uploader} - {title}".into();
        assert_eq!(out(&o), "/tmp/%(uploader|Unknown).100B - %(title).150B.%(ext)s");
        o.filename_template = "../evil".into();
        assert_eq!(out(&o), "/tmp/%(title).150B [%(id)s].%(ext)s");
    }

    #[test]
    fn subtitle_args() {
        let mut o = opts(Kind::Video, None);
        o.subtitles = Some(Subtitles { lang: "en".into(), auto: true, embed: true });
        let args = build_args(&o, "/tmp", None, "u");
        assert_eq!(flag(&args, "--sub-langs").unwrap(), "en");
        assert!(args.contains(&"--write-auto-subs".to_string()));
        assert!(args.contains(&"--embed-subs".to_string()));
        assert_eq!(flag(&args, "--convert-subs").unwrap(), "srt");
    }

    #[test]
    fn subtitles_are_not_embedded_in_audio_and_bad_langs_are_dropped() {
        let mut o = opts(Kind::Audio, None);
        o.subtitles = Some(Subtitles { lang: "en".into(), auto: false, embed: true });
        assert!(!build_args(&o, "/tmp", None, "u").contains(&"--embed-subs".to_string()));
        o.subtitles = Some(Subtitles { lang: ".*".into(), auto: false, embed: false });
        assert!(flag(&build_args(&o, "/tmp", None, "u"), "--sub-langs").is_none());
    }

    #[test]
    fn subtitle_progress_is_recognised() {
        assert!(is_subtitle_file("C:/x/Title [id].en.vtt"));
        assert!(is_subtitle_file("Title.en.vtt.part"));
        assert!(!is_subtitle_file("Title [id].f137.mp4"));
    }

    #[test]
    fn trims_to_a_section() {
        let mut o = opts(Kind::Video, None);
        o.section = Some(Section { start: 62.5, end: 90.0 });
        let args = build_args(&o, "/tmp", None, "u");
        assert_eq!(flag(&args, "--download-sections").as_deref(), Some("*62.5-90"));
        assert!(args.contains(&"--force-keyframes-at-cuts".to_string()));
    }

    #[test]
    fn invalid_sections_are_ignored() {
        for (start, end) in [(10.0, 10.0), (20.0, 10.0), (-1.0, 5.0), (0.0, f64::INFINITY), (f64::NAN, 5.0)] {
            let mut o = opts(Kind::Video, None);
            o.section = Some(Section { start, end });
            assert!(flag(&build_args(&o, "/tmp", None, "u"), "--download-sections").is_none());
        }
    }

    #[test]
    fn unknown_formats_are_rejected() {
        let bad = r#"{"kind":"video","height":null,"container":"exe"}"#;
        assert!(serde_json::from_str::<Options>(bad).is_err());
    }
}
