import { Segmented } from "../../components/Segmented";
import type { AudioFormat, Codec, Container, DownloadOptions } from "../../lib/api";
import styles from "./FormatPicker.module.scss";

export interface FormatChoice {
  kind: "video" | "audio";
  height: number | null;
  container: Container;
  codec: Codec;
  audioFormat: AudioFormat;
  audioBitrate: number | null;
}

export const defaultChoice: FormatChoice = {
  kind: "video",
  height: null,
  container: "mp4",
  codec: "any",
  audioFormat: "mp3",
  audioBitrate: null,
};

export function toOptions(c: FormatChoice): DownloadOptions {
  return c.kind === "video"
    ? { kind: "video", height: c.height, container: c.container, codec: c.codec }
    : {
        kind: "audio",
        audio_format: c.audioFormat,
        audio_bitrate: isLossy(c.audioFormat) ? c.audioBitrate : null,
      };
}

const KINDS = [
  { value: "video", label: "Video" },
  { value: "audio", label: "Audio" },
] as const;

const CONTAINERS: { value: Container; label: string }[] = [
  { value: "mp4", label: "MP4" },
  { value: "mkv", label: "MKV" },
  { value: "webm", label: "WebM" },
];

const CODEC_LABELS: Record<Codec, string> = {
  any: "Any codec",
  h264: "H.264",
  vp9: "VP9",
  av1: "AV1",
};

const AUDIO_FORMATS: { value: AudioFormat; label: string }[] = [
  { value: "mp3", label: "MP3" },
  { value: "m4a", label: "M4A" },
  { value: "opus", label: "Opus" },
  { value: "flac", label: "FLAC" },
  { value: "wav", label: "WAV" },
];

const BITRATES = [320, 256, 192, 128, 96];

const isLossy = (f: AudioFormat) => f !== "flac" && f !== "wav";

interface Props {
  value: FormatChoice;
  onChange: (value: FormatChoice) => void;
  /** Heights to offer; playlists use a fixed list since each video differs. */
  heights: number[];
  /** Codecs known to exist for this video; omit to offer all. */
  codecs?: Codec[];
}

/** Format controls shared by the single-video and playlist cards. */
export function FormatPicker({ value, onChange, heights, codecs }: Props) {
  const set = (patch: Partial<FormatChoice>) => onChange({ ...value, ...patch });

  // H.264 cannot be stored in WebM, so it is not offered there.
  const offered = (codecs ?? (["h264", "vp9", "av1"] as Codec[])).filter(
    (c) => value.container !== "webm" || c !== "h264",
  );
  const codecOptions: Codec[] = ["any", ...offered];

  return (
    <div className={styles.picker}>
      <Segmented
        label="Format"
        value={value.kind}
        options={KINDS}
        onChange={(kind) => set({ kind })}
      />
      {value.kind === "video" ? (
        <>
          <select
            value={value.height ?? ""}
            onChange={(e) =>
              set({ height: e.currentTarget.value ? Number(e.currentTarget.value) : null })
            }
            aria-label="Video quality"
          >
            <option value="">Best quality</option>
            {heights.map((h) => (
              <option key={h} value={h}>{`${h}p`}</option>
            ))}
          </select>
          <select
            value={value.container}
            onChange={(e) => {
              const container = e.currentTarget.value as Container;
              set({
                container,
                codec: container === "webm" && value.codec === "h264" ? "any" : value.codec,
              });
            }}
            aria-label="Container"
          >
            {CONTAINERS.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
          <select
            value={codecOptions.includes(value.codec) ? value.codec : "any"}
            onChange={(e) => set({ codec: e.currentTarget.value as Codec })}
            aria-label="Video codec"
          >
            {codecOptions.map((c) => (
              <option key={c} value={c}>{CODEC_LABELS[c]}</option>
            ))}
          </select>
        </>
      ) : (
        <>
          <select
            value={value.audioFormat}
            onChange={(e) => set({ audioFormat: e.currentTarget.value as AudioFormat })}
            aria-label="Audio format"
          >
            {AUDIO_FORMATS.map((f) => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
          {isLossy(value.audioFormat) ? (
            <select
              value={value.audioBitrate ?? ""}
              onChange={(e) =>
                set({ audioBitrate: e.currentTarget.value ? Number(e.currentTarget.value) : null })
              }
              aria-label="Audio bitrate"
            >
              <option value="">Best quality</option>
              {BITRATES.map((b) => (
                <option key={b} value={b}>{`${b} kbps`}</option>
              ))}
            </select>
          ) : (
            <span className={styles.hint}>Lossless</span>
          )}
        </>
      )}
    </div>
  );
}
