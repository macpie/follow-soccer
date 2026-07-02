// Inline SVG icons (no icon font). Stroke weights match the prototype.

export function BallMark({ color, size = 30 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32">
      <circle cx="16" cy="16" r="15" fill={color} stroke="none" />
      <path d="M16 7l4.7 3.4-1.8 5.5h-5.8l-1.8-5.5z" fill="#fff" opacity={0.95} />
      <circle cx="16" cy="16" r="15" fill="none" stroke="#fff" strokeOpacity={0.25} strokeWidth={1} />
    </svg>
  )
}

// Bottom-nav tab icons (mobile). One outline glyph per view, 24x24, currentColor.
export function TabIcon({ id, size = 22 }) {
  const p = {
    width: size, height: size, viewBox: '0 0 24 24', fill: 'none',
    stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round',
  }
  switch (id) {
    case 'today': // calendar with today dot
      return (
        <svg {...p}>
          <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
          <path d="M3.5 9.5h17M8 3v4M16 3v4" />
          <circle cx="12" cy="14.5" r="1.5" fill="currentColor" stroke="none" />
        </svg>
      )
    case 'matches': // fixtures list
      return (
        <svg {...p}>
          <path d="M9 6h11M9 12h11M9 18h11" />
          <circle cx="4.5" cy="6" r="1.3" fill="currentColor" stroke="none" />
          <circle cx="4.5" cy="12" r="1.3" fill="currentColor" stroke="none" />
          <circle cx="4.5" cy="18" r="1.3" fill="currentColor" stroke="none" />
        </svg>
      )
    case 'bracket': // two matchups merging into a final
      return (
        <svg {...p}>
          <rect x="3" y="4" width="5.5" height="3" rx="1" />
          <rect x="3" y="17" width="5.5" height="3" rx="1" />
          <rect x="15.5" y="10.5" width="5.5" height="3" rx="1" />
          <path d="M8.5 5.5h3v6.5h4M8.5 18.5h3V12" />
        </svg>
      )
    case 'groups': // standings table
    case 'table': // league table
      return (
        <svg {...p}>
          <rect x="3.5" y="4.5" width="17" height="15" rx="2.5" />
          <path d="M3.5 9.5h17M9.5 9.5V19.5" />
        </svg>
      )
    case 'stats': // bar chart
      return (
        <svg {...p}>
          <path d="M3 20.5h18" />
          <path d="M6.5 20.5V11M12 20.5V4.5M17.5 20.5v-6.5" />
        </svg>
      )
    case 'teams': // two people
      return (
        <svg {...p}>
          <circle cx="9" cy="8" r="3.2" />
          <path d="M3.5 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5" />
          <circle cx="17" cy="9" r="2.3" />
          <path d="M16 14.4c2.6.1 4.5 2 4.5 4.6" />
        </svg>
      )
    default:
      return null
  }
}

export function SunIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19" />
    </svg>
  )
}

export function MoonIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
    </svg>
  )
}

export function RefreshIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 11a8 8 0 0 0-14.3-4.9M4 4v4.5h4.5" />
      <path d="M4 13a8 8 0 0 0 14.3 4.9M20 20v-4.5h-4.5" />
    </svg>
  )
}

export function BellIcon({ size = 18, filled = false }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  )
}

export function GoalIcon({ color, size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 5l2.5 1.8-1 3h-3l-1-3z" fill={color} />
    </svg>
  )
}

// Booking card (yellow / red).
export function CardIcon({ color, size = 13 }) {
  return (
    <svg width={size * 0.72} height={size} viewBox="0 0 13 18">
      <rect x="1" y="1" width="11" height="16" rx="2" fill={color} />
    </svg>
  )
}

// Substitution: green up arrow (on) over red down arrow (off).
export function SubIcon({ size = 14, on = '#1F9D55', off = '#E5202B' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 21V7M8 7l-3.5 3.5M8 7l3.5 3.5" stroke={on} />
      <path d="M16 3v14M16 17l-3.5-3.5M16 17l3.5-3.5" stroke={off} />
    </svg>
  )
}
