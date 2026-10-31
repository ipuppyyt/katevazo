import { Segmented } from "../../components/Segmented";
import type { AudioFormat, Codec, Container, DownloadOptions } from "../../lib/api";
import { useLang, useT, type Key } from "../../lib/i18n";
import styles from "./FormatPicker.module.scss";

export interface FormatChoice {
  kind: "video" | "audio";
  height: number | null;
  container: Container;
  codec: Codec;
  audioFormat: AudioFormat;
  audioBitrate: number | null;
  /** "" for none, a language code for uploaded subtitles, or "auto:<code>" for automatic captions. */
  subtitle: string;
  embedSubtitles: boolean;
}

export const defaultChoice: FormatChoice = {
  kind: "video",
  height: null,
  container: "mp4",
  codec: "any",
  audioFormat: "mp3",
  audioBitrate: null,
  subtitle: "",
  embedSubtitles: true,
};

export function toOptions(c: FormatChoice): DownloadOptions {
  const auto = c.subtitle.startsWith("auto:");
  const subtitles = c.subtitle
    ? {
        lang: auto ? c.subtitle.slice("auto:".length) : c.subtitle,
        auto,
        embed: c.kind === "video" && c.embedSubtitles,
      }
    : null;
  return c.kind === "video"
    ? { kind: "video", height: c.height, container: c.container, codec: c.codec, subtitles }
    : {
        kind: "audio",
        audio_format: c.audioFormat,
        audio_bitrate: isLossy(c.audioFormat) ? c.audioBitrate : null,
        subtitles,
      };
}

/** "pt-BR" becomes "Portuguese (Brazil)"; unknown codes are shown as they are. */
function languageName(code: string): string {
  const base = code.replace(/-orig$/, "");
  try {
    return new Intl.DisplayNames([useLang.getState().lang], { type: "language" }).of(base) ?? base;
  } catch {
    return base;
  }
}


const CONTAINERS: { value: Container; label: string }[] = [
  { value: "mp4", label: "MP4" },
  { value: "mkv", label: "MKV" },
  { value: "webm", label: "WebM" },
];

const CODEC_LABELS: Record<Codec, Key> = {
  any: "fmt.anyCodec",
  h264: "fmt.h264",
  vp9: "fmt.vp9",
  av1: "fmt.av1",
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
  /** Subtitle languages for this video; omit when they are not known (playlists). */
  subtitles?: { manual: string[]; auto: string[] };
}

/** Format controls shared by the single-video and playlist cards. */
export function FormatPicker({ value, onChange, heights, codecs, subtitles }: Props) {
  const t = useT();
  const set = (patch: Partial<FormatChoice>) => onChange({ ...value, ...patch });

  // H.264 cannot be stored in WebM, so it is not offered there.
  const offered = (codecs ?? (["h264", "vp9", "av1"] as Codec[])).filter(
    (c) => value.container !== "webm" || c !== "h264",
  );
  const codecOptions: Codec[] = ["any", ...offered];

  return (
    <div className={styles.picker}>
      <Segmented
        label={t("fmt.format")}
        value={value.kind}
        options={[
          { value: "video", label: t("fmt.video") },
          { value: "audio", label: t("fmt.audio") },
        ]}
        onChange={(kind) => set({ kind })}
      />
      {value.kind === "video" ? (
        <>
          <select
            value={value.height ?? ""}
            onChange={(e) =>
              set({ height: e.currentTarget.value ? Number(e.currentTarget.value) : null })
            }
            aria-label={t("fmt.quality")}
          >
            <option value="">{t("fmt.bestQuality")}</option>
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
            aria-label={t("fmt.container")}
          >
            {CONTAINERS.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
          <select
            value={codecOptions.includes(value.codec) ? value.codec : "any"}
            onChange={(e) => set({ codec: e.currentTarget.value as Codec })}
            aria-label={t("fmt.codec")}
          >
            {codecOptions.map((c) => (
              <option key={c} value={c}>{t(CODEC_LABELS[c])}</option>
            ))}
          </select>
        </>
      ) : (
        <>
          <select
            value={value.audioFormat}
            onChange={(e) => set({ audioFormat: e.currentTarget.value as AudioFormat })}
            aria-label={t("fmt.audioFormat")}
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
              aria-label={t("fmt.bitrate")}
            >
              <option value="">{t("fmt.bestQuality")}</option>
              {BITRATES.map((b) => (
                <option key={b} value={b}>{`${b} kbps`}</option>
              ))}
            </select>
          ) : (
            <span className={styles.hint}>{t("fmt.lossless")}</span>
          )}
        </>
      )}
      {subtitles && (subtitles.manual.length > 0 || subtitles.auto.length > 0) && (
        <>
          <select
            value={value.subtitle}
            onChange={(e) => set({ subtitle: e.currentTarget.value })}
            aria-label={t("fmt.subtitles")}
          >
            <option value="">{t("fmt.noSubs")}</option>
            {subtitles.manual.map((l) => (
              <option key={l} value={l}>{languageName(l)}</option>
            ))}
            {subtitles.auto.map((l) => (
              <option key={`auto:${l}`} value={`auto:${l}`}>
                {t("fmt.auto", { language: languageName(l) })}
              </option>
            ))}
          </select>
          {value.subtitle && value.kind === "video" && (
            <label className={styles.check}>
              <input
                type="checkbox"
                checked={value.embedSubtitles}
                onChange={(e) => set({ embedSubtitles: e.currentTarget.checked })}
              />
              {t("fmt.embed")}
            </label>
          )}
        </>
      )}
    </div>
  );
}
