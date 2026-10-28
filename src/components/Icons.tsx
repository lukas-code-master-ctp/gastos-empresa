// Íconos de trazo (estilo Lucide, 1.8 px) dibujados a mano para no sumar dependencias
const paths: Record<string, React.ReactNode> = {
  home: <><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /><path d="M10 21v-6h4v6" /></>,
  receipt: <><path d="M5 3h14v18l-2.3-1.6L14.3 21 12 19.4 9.7 21l-2.4-1.6L5 21z" /><path d="M9 8h6M9 12h6M9 16h3" /></>,
  folder: <><path d="M3 6.5A1.5 1.5 0 0 1 4.5 5H9l2 2.5h8.5A1.5 1.5 0 0 1 21 9v9.5a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.5z" /></>,
  wallet: <><path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H18v4" /><path d="M3 7.5v10A2.5 2.5 0 0 0 5.5 20H21V9H5.5A2.5 2.5 0 0 1 3 7.5z" /><circle cx="16.5" cy="14.5" r="1.2" /></>,
  chat: <><path d="M4 19.5 5.3 16A8 8 0 1 1 8 18.7z" /><path d="M9 11h.01M12 11h.01M15 11h.01" /></>,
  check: <><circle cx="12" cy="12" r="9" /><path d="m8 12.2 2.7 2.7L16 9.5" /></>,
  bank: <><path d="M3 9.5 12 4l9 5.5" /><path d="M5 10v8M9.5 10v8M14.5 10v8M19 10v8" /><path d="M3 20.5h18" /></>,
  logout: <><path d="M15 4h3.5A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5H15" /><path d="M10 16.5 14.5 12 10 7.5M14.5 12H4" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  clip: <path d="m20 11.5-7.8 7.8a5 5 0 0 1-7.1-7.1l8.2-8.2a3.3 3.3 0 0 1 4.7 4.7l-8.2 8.2a1.7 1.7 0 0 1-2.4-2.4l7.5-7.5" />,
  upload: <><path d="M12 15V4M7.5 8.5 12 4l4.5 4.5" /><path d="M4 15v3.5A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V15" /></>,
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
  x: <path d="M6 6l12 12M18 6 6 18" />,
  ok: <path d="m5 12.5 4.5 4.5L19 7.5" />,
};

export type IconName = keyof typeof paths;

export function Icon({ name, className = "size-[18px]" }: { name: IconName; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}
