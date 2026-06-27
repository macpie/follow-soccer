import { useStore } from '../store.jsx'
import { txtOn } from '../lib/util.js'

// Team badge: real crest (live mode) or a brand-colored circle with the 3-letter code.
// Clicking it toggles following that team (unless `follow` is false, e.g. in Scorers, or
// the slot is a knockout placeholder rather than a real qualified team).
export function Badge({ id, size = 30, follow = true }) {
  const { t, D, th, favs, toggleFav } = useStore()
  const T = t(id)
  if (!T) return null
  const crest = D.CRESTS && D.CRESTS[id]
  const followable = follow && T.g && T.g !== '?'
  const on = favs.includes(id)
  const fx = followable ? {
    onClick: (e) => { e.stopPropagation(); toggleFav(id) },
    title: (on ? 'Following ' : 'Follow ') + T.name,
  } : {}
  const cursor = followable ? 'pointer' : 'inherit'

  if (crest) {
    return (
      <span {...fx} style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: size, height: size, borderRadius: '50%', flex: '0 0 auto', overflow: 'hidden', cursor,
        background: '#fff', boxShadow: 'inset 0 0 0 ' + (on ? '2px ' + th.accent : '1px rgba(0,0,0,0.10)'),
      }}>
        <img src={crest} alt={T.code} loading="lazy" style={{ width: '76%', height: '76%', objectFit: 'contain' }} />
      </span>
    )
  }
  return (
    <span {...fx} style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: size, height: size, borderRadius: '50%', flex: '0 0 auto', cursor,
      background: T.c, color: txtOn(T.c), fontWeight: 800, fontSize: size * 0.34,
      letterSpacing: '-0.02em', boxShadow: 'inset 0 0 0 ' + Math.max(1, size * 0.06) + 'px ' + T.c2 + '33',
    }}>{T.code}</span>
  )
}

// Follow toggle (★).
export function Star({ id, size = 16 }) {
  const { favs, toggleFav, th } = useStore()
  const on = favs.includes(id)
  return (
    <button
      onClick={(e) => { e.stopPropagation(); toggleFav(id) }}
      title={on ? 'Following' : 'Follow'}
      style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 2, lineHeight: 0, display: 'inline-flex' }}
    >
      <svg width={size} height={size} viewBox="0 0 24 24" fill={on ? th.accent : 'none'} stroke={on ? th.accent : th.faint} strokeWidth={2} strokeLinejoin="round">
        <path d="M12 2.5l2.9 6.1 6.6.9-4.8 4.7 1.2 6.6L12 18.6 5.9 21.8l1.2-6.6L2.3 9.5l6.6-.9z" />
      </svg>
    </button>
  )
}

export function Pill({ label, fg, bg, extra }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 9px', borderRadius: 9999,
      fontSize: 11, fontWeight: 700, letterSpacing: '0.03em', textTransform: 'uppercase',
      color: fg, background: bg, ...(extra || {}),
    }}>{label}</span>
  )
}

export function LivePill() {
  const { th } = useStore()
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 10px', borderRadius: 9999,
      fontSize: 11, fontWeight: 800, letterSpacing: '0.05em', color: '#fff', background: th.live,
    }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#fff', animation: 'wcPulse 1s infinite' }} />
      LIVE
    </span>
  )
}

// Centered page container (max width 1120, 22px side padding) with a fade-in.
export function Wrap({ children }) {
  return (
    <div style={{ maxWidth: 1120, margin: '0 auto', padding: '26px 22px 90px', animation: 'wcFade .25s ease' }}>
      {children}
    </div>
  )
}

export function SectionTitle({ label, right }) {
  const { th } = useStore()
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', margin: '0 0 12px' }}>
      <h2 style={{ margin: 0, fontSize: 13, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: th.sub }}>{label}</h2>
      {right || null}
    </div>
  )
}
