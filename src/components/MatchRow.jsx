import { useStore } from '../store.jsx'
import { Badge } from './atoms.jsx'
import { liveClock } from '../lib/util.js'

function TeamMini({ id, align, fav }) {
  const { t, th } = useStore()
  const T = t(id)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexDirection: align === 'right' ? 'row-reverse' : 'row', minWidth: 0 }}>
      <Badge id={id} size={26} />
      <span style={{ fontWeight: fav ? 800 : 650, fontSize: 14, color: fav ? th.accent : th.tx, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>{T.name}</span>
      {fav ? <span style={{ color: th.accent, fontSize: 11, flex: '0 0 auto' }}>★</span> : null}
    </div>
  )
}

export function MatchRow({ m }) {
  const { th, favs, mScore, openMatch } = useStore()
  const s = mScore(m)
  const played = s.hs != null
  const clickable = true // every match opens (played → match center, upcoming → preview)
  const isLive = m.status === 'LIVE'
  const winnerH = played && s.hs > s.as
  const winnerA = played && s.as > s.hs
  const favH = favs.includes(m.h), favA = favs.includes(m.a)
  const fav = favH || favA
  const baseBorder = fav ? th.accent : th.bd

  const scoreBox = (isLive || played)
    ? (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 4px' }}>
        <span style={{ fontWeight: 800, fontSize: 18, color: winnerH ? th.tx : th.sub, fontVariantNumeric: 'tabular-nums' }}>{s.hs}</span>
        <span style={{ fontWeight: 700, fontSize: 12, color: th.faint }}>–</span>
        <span style={{ fontWeight: 800, fontSize: 18, color: winnerA ? th.tx : th.sub, fontVariantNumeric: 'tabular-nums' }}>{s.as}</span>
      </div>
    )
    : <div style={{ fontWeight: 700, fontSize: 13, color: th.sub, minWidth: 64, textAlign: 'center' }}>{m.time}</div>

  return (
    <button
      onClick={() => clickable && openMatch(m)}
      style={{
        display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 10, width: '100%',
        textAlign: 'left', border: '1px solid ' + baseBorder, background: fav ? th.accentSoft : th.sf, borderRadius: 14, padding: '11px 14px',
        cursor: clickable ? 'pointer' : 'default', font: 'inherit', transition: 'border-color .15s,transform .1s',
      }}
      onMouseEnter={e => { if (clickable) e.currentTarget.style.borderColor = th.accent }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = baseBorder }}
    >
      <TeamMini id={m.h} align="left" fav={favH} />
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, minWidth: 70 }}>
        {isLive ? (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 800, color: th.live }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: th.live, animation: 'wcPulse 1s infinite' }} />
            {liveClock(s)}
          </span>
        ) : null}
        {scoreBox}
        {!isLive ? (
          <span style={{ fontSize: 10.5, fontWeight: 600, color: th.faint, letterSpacing: '0.02em' }}>{played ? 'FT' : m.date}</span>
        ) : null}
      </div>
      <TeamMini id={m.a} align="right" fav={favA} />
    </button>
  )
}
