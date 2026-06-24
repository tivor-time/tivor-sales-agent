/**
 * Minimal "circuit board" backdrop in the spirit of clerk.com — faint rounded chip
 * outlines wired together with thin traces + node dots, plus dot-matrix and diagonal
 * hatch fills. Pure monochrome via the --foreground token (so it's theme-safe) with a
 * single restrained --primary accent trace. Deliberately low-contrast and sparse.
 */
export function CircuitBackdrop() {
  const line = 'hsl(var(--foreground) / 0.10)'
  const node = 'hsl(var(--foreground) / 0.22)'
  const accent = 'hsl(var(--primary) / 0.55)'

  return (
    <svg
      aria-hidden
      className="absolute inset-0 h-full w-full"
      viewBox="0 0 1440 900"
      preserveAspectRatio="xMidYMid slice"
      fill="none"
    >
      <defs>
        <pattern id="cb-dots" width="11" height="11" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1.1" fill="hsl(var(--foreground) / 0.18)" />
        </pattern>
        <pattern
          id="cb-hatch"
          width="8"
          height="8"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <line x1="0" y1="0" x2="0" y2="8" stroke="hsl(var(--foreground) / 0.12)" strokeWidth="1.4" />
        </pattern>
      </defs>

      {/* traces */}
      <g stroke={line} strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
        <path d="M246 126 H360 V250" />
        <path d="M980 96 H900 V214" />
        <path d="M1184 120 H1092 V44" />
        <path d="M0 430 H300" />
        <path d="M620 640 H470 V520" />
        <path d="M844 604 H980 V476" />
        <path d="M1334 150 H1440" />
        <path d="M300 470 V560 H470" />
        <path d="M1150 530 H1040" />
      </g>

      {/* chips */}
      <g stroke={line} strokeWidth="1.25">
        <rect x="96" y="72" width="150" height="108" rx="14" />
        <rect x="300" y="210" width="120" height="84" rx="10" />
        <rect x="980" y="44" width="132" height="100" rx="10" />
        <rect x="1184" y="64" width="150" height="108" rx="14" />
        <rect x="620" y="544" width="224" height="200" rx="18" />
        <rect x="1150" y="470" width="150" height="120" rx="14" />
        <rect x="120" y="470" width="150" height="110" rx="14" />
      </g>

      {/* dot-matrix + hatch fills */}
      <rect x="986" y="50" width="120" height="88" rx="6" fill="url(#cb-dots)" />
      <rect x="300" y="250" width="110" height="28" fill="url(#cb-hatch)" />
      <rect x="690" y="600" width="120" height="30" fill="url(#cb-hatch)" />

      {/* a small toggle/switch motif */}
      <g stroke={line} strokeWidth="1.25">
        <rect x="520" y="300" width="46" height="22" rx="11" />
      </g>
      <circle cx="555" cy="311" r="6.5" fill="hsl(var(--foreground) / 0.14)" />

      {/* node dots at junctions/endpoints */}
      <g fill={node}>
        <circle cx="360" cy="126" r="3.4" />
        <circle cx="360" cy="250" r="3.4" />
        <circle cx="900" cy="214" r="3.4" />
        <circle cx="1092" cy="44" r="3.4" />
        <circle cx="300" cy="430" r="3.4" />
        <circle cx="470" cy="520" r="3.4" />
        <circle cx="980" cy="476" r="3.4" />
        <circle cx="470" cy="560" r="3.4" />
        <circle cx="1040" cy="530" r="3.4" />
      </g>
      <g fill={node}>
        <rect x="717" y="641" width="6" height="6" />
        <rect x="1331" y="147" width="6" height="6" />
      </g>

      {/* single restrained brand-accent dotted trace */}
      <path d="M1300 420 H1440" stroke={accent} strokeWidth="1.5" strokeDasharray="2 7" strokeLinecap="round" />
      <circle cx="1300" cy="420" r="3.2" fill={accent} />
    </svg>
  )
}
