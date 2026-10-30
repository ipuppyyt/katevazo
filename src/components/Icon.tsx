// Minimal SF Symbols–style line icons (24px grid, 2px round strokes).
const PATHS = {
  pause: <path d="M9 5v14M15 5v14" />,
  play: <path d="M8 5.5v13l11-6.5z" fill="currentColor" strokeLinejoin="round" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  retry: <path d="M20 12a8 8 0 1 1-2.6-5.9M20 4v4h-4" />,
  download: <path d="M12 4v11m0 0l-4.5-4.5M12 15l4.5-4.5M5 19h14" />,
  music: <path d="M9 18V6l10-2v12M9 18a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0zm10-2a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z" />,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  folder: <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />,
  tray: <path d="M12 4v9m0 0l-3.5-3.5M12 13l3.5-3.5M4 14v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />,
  clock: <path d="M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />,
  gear: <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM19.4 13.5l1.5 1.2-1.6 2.8-1.8-.6a7 7 0 0 1-1.6.9L15.5 19h-3.2l-.4-1.8a7 7 0 0 1-1.6-.9l-1.8.6-1.6-2.8 1.5-1.2a7 7 0 0 1 0-1.8L6.9 9.9l1.6-2.8 1.8.6a7 7 0 0 1 1.6-.9L12.3 5h3.2l.4 1.8a7 7 0 0 1 1.6.9l1.8-.6 1.6 2.8-1.5 1.2a7 7 0 0 1 0 1.8z" />,
  link:<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />,
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {PATHS[name]}
    </svg>
  );
}
