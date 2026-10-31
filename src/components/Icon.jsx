// Petites icônes dessinées en SVG (traits fins, style uniforme).
// Utilisation : <Icon name="search" size={20} />
const CHEMINS = {
  search: <><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></>,
  close: <path d="M18 6L6 18M6 6l12 12" />,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>,
  moon: <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />,
  download: <path d="M12 3v12m0 0l-4-4m4 4l4-4M4 21h16" />,
  chart: <path d="M3 3v18h18M7 15l4-4 3 3 5-6" />,
  list: <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 16v-4M12 8h.01" /></>,
  check: <path d="M5 13l4 4L19 7" />,
  print: <path d="M6 9V3h12v6M6 18H4v-7h16v7h-2M7 14h10v7H7z" />,
  share: <path d="M4 12v7a1 1 0 001 1h14a1 1 0 001-1v-7M16 6l-4-4-4 4M12 2v14" />,
  shield: <><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z" /><path d="M9 12l2 2 4-4" /></>,
  globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 010 18M12 3a14 14 0 000 18" /></>,
  link: <path d="M10 13a5 5 0 007 0l3-3a5 5 0 00-7-7l-1 1M14 11a5 5 0 00-7 0l-3 3a5 5 0 007 7l1-1" />,
  chevronL: <path d="M15 18l-6-6 6-6" />,
  chevronR: <path d="M9 18l6-6-6-6" />,
  alert: <><path d="M12 3l10 18H2L12 3z" /><path d="M12 10v5M12 18h.01" /></>,
  refresh: <path d="M21 12a9 9 0 1 1-3-6.7M21 4v5h-5" />,
  school: <path d="M3 10l9-6 9 6-9 6-9-6zM7 12.5V17c0 1.5 2.2 3 5 3s5-1.5 5-3v-4.5" />,
  pin: <><path d="M12 22s7-6.2 7-12a7 7 0 10-14 0c0 5.8 7 12 7 12z" /><circle cx="12" cy="10" r="2.5" /></>,
  qr: <path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h3v3h-3zM20 14v3M14 20h3M20 20h1" />,
}

export default function Icon({ name, size = 20, className = '', ...reste }) {
  return (
    <svg
      className={`icon ${className}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...reste}
    >
      {CHEMINS[name]}
    </svg>
  )
}
