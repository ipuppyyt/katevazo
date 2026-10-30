import {
  ArrowDownToLine,
  Check,
  Clock,
  Download,
  Folder,
  History,
  Inbox,
  Link,
  Music,
  Pause,
  Play,
  RotateCcw,
  Settings,
  X,
  type LucideIcon,
} from "lucide-react";

const ICONS = {
  pause: Pause,
  play: Play,
  close: X,
  retry: RotateCcw,
  download: ArrowDownToLine,
  music: Music,
  check: Check,
  folder: Folder,
  tray: Inbox,
  clock: Clock,
  history: History,
  gear: Settings,
  link: Link,
  save: Download,
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof ICONS;

export function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  const Glyph = ICONS[name];
  return (
    <Glyph
      size={size}
      strokeWidth={1.9}
      fill={name === "play" ? "currentColor" : "none"}
      aria-hidden="true"
    />
  );
}
