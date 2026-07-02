import { useEffect } from 'react'
import { useStore } from '../store.jsx'
import { Badge } from './atoms.jsx'
import { GoalIcon, CardIcon, SubIcon } from './icons.jsx'
import { txtOn, formationRows, liveClock } from '../lib/util.js'

function Pitch({ tid, lineup, attackUp }) {
  const { th, t, dark } = useStore()
  const T = t(tid)
  let rows = lineup.rows.slice()
  if (attackUp) rows = rows.slice().reverse()
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, justifyContent: 'center' }}>
        <Badge id={tid} size={24} follow={false} />
        <span style={{ fontWeight: 750, fontSize: 14, color: th.tx }}>{T.name}</span>
        <span style={{ fontSize: 11, fontWeight: 700, color: th.faint }}>{lineup.f}</span>
      </div>
      <div style={{
        position: 'relative', borderRadius: 14, padding: '14px 8px', display: 'flex', flexDirection: 'column', gap: 6,
        background: dark ? 'linear-gradient(180deg,#13361f,#0e2a18)' : 'linear-gradient(180deg,#2f9e54,#268a48)',
        boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.12)',
      }}>
        <div style={{ position: 'absolute', left: '12%', right: '12%', top: '50%', height: 1, background: 'rgba(255,255,255,0.25)' }} />
        {rows.map((row, ri) => (
          <div key={ri} style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
            {row.map((p, pi) => (
              <div key={pi} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, width: 60 }}>
                <span style={{ width: 26, height: 26, borderRadius: '50%', background: T.c, color: txtOn(T.c), display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 11, boxShadow: '0 2px 5px rgba(0,0,0,0.3)' }}>{p.n}</span>
                <span style={{ fontSize: 9.5, fontWeight: 700, color: '#fff', textShadow: '0 1px 2px rgba(0,0,0,0.5)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 60 }}>{p.name || ''}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

function statNum(map, key) {
  if (map && map[key] != null && map[key] !== '') return parseFloat(String(map[key]).replace('%', '')) || 0
  return null
}

const STAT_DEFS = [
  ['Possession', 'possessionPct', true],
  ['Shots', 'totalShots'],
  ['Shots on target', 'shotsOnTarget'],
  ['Shot accuracy', 'shotPct', true],
  ['Blocked shots', 'blockedShots'],
  ['Corners', 'wonCorners'],
  ['Offsides', 'offsides'],
  ['Fouls', 'foulsCommitted'],
  ['Yellow cards', 'yellowCards'],
  ['Passes', 'totalPasses'],
  ['Pass accuracy', 'passPct', true],
  ['Crosses', 'totalCrosses'],
  ['Tackles', 'totalTackles'],
  ['Interceptions', 'interceptions'],
  ['Clearances', 'effectiveClearance'],
  ['Saves', 'saves'],
]

function liveStatRows(sH, sA) {
  if (!sH || !sA) return null
  const rows = []
  STAT_DEFS.forEach(([label, key, pct]) => {
    const vh = statNum(sH, key), va = statNum(sA, key)
    if (vh == null || va == null) return
    if (!pct && vh === 0 && va === 0) return
    rows.push([label, pct ? vh + '%' : vh, pct ? va + '%' : va, vh, va])
  })
  return rows.length ? rows : null
}

function Msg({ children }) {
  const { th } = useStore()
  return <div style={{ textAlign: 'center', color: th.faint, fontWeight: 600, padding: '30px 0', lineHeight: 1.5 }}>{children}</div>
}

// One timeline row (goal / card / sub / penalty), aligned to the scoring side.
function EventRow({ e, home }) {
  const { th, t } = useStore()
  if (e.kind === 'marker') {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0' }}>
        <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: th.faint, background: th.sf2, borderRadius: 9999, padding: '3px 12px' }}>{e.note}</span>
      </div>
    )
  }
  const icon = e.kind === 'goal' ? <GoalIcon color={th.tx} />
    : e.kind === 'yellow' ? <CardIcon color={th.warn} />
      : e.kind === 'red' ? <CardIcon color={th.live} />
        : e.kind === 'sub' ? <SubIcon on={th.good} off={th.live} />
          : <GoalIcon color={th.faint} />
  const tag = e.note && e.kind === 'goal' && e.note !== 'header' ? ' (' + e.note + ')' : ''
  const secondary = e.kind === 'sub'
    ? (e.name2 ? <span style={{ color: th.faint, fontWeight: 600, fontSize: 12 }}>{'  ↓ ' + e.name2}</span> : null)
    : e.kind === 'goal' && e.name2 ? <span style={{ color: th.faint, fontWeight: 600, fontSize: 12 }}>{'  assist ' + e.name2}</span>
      : e.kind === 'pen-miss' ? <span style={{ color: th.faint, fontWeight: 600, fontSize: 12 }}>{'  penalty ' + (e.note || 'missed')}</span>
        : e.note ? <span style={{ color: th.faint, fontWeight: 600, fontSize: 12 }}>{'  ' + e.note}</span> : null
  return (
    <div style={{ display: 'flex', justifyContent: home ? 'flex-start' : 'flex-end', padding: '6px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexDirection: home ? 'row' : 'row-reverse', maxWidth: '82%' }}>
        <span style={{ fontWeight: 850, fontSize: 12.5, color: th.accent, minWidth: 36, textAlign: home ? 'left' : 'right' }}>{e.clock || (e.min + "'")}</span>
        <span style={{ display: 'inline-flex', width: 16, justifyContent: 'center', flex: '0 0 auto' }}>{icon}</span>
        <span style={{ fontSize: 14, fontWeight: 650, color: th.tx, textAlign: home ? 'left' : 'right' }}>
          {(e.kind === 'sub' ? '↑ ' : '') + e.name}{tag}{secondary}
          <span style={{ color: th.faint, fontWeight: 600 }}>{'  ' + (t(e.team) ? t(e.team).code : e.team)}</span>
        </span>
      </div>
    </div>
  )
}

function FormPills({ form }) {
  const { th } = useStore()
  const color = (r) => r === 'W' ? th.good : r === 'L' ? th.live : th.faint
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {form.map(g => (
        <span key={g.id} title={g.score} style={{ width: 20, height: 20, borderRadius: 6, background: color(g.r), color: '#fff', fontSize: 11, fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{g.r}</span>
      ))}
    </div>
  )
}

// One match's full card — score header, tabs, and tab body. Used both for the regular
// single-match modal and (twice, side by side) for a two-legged tie's dual modal, so it
// takes its match id and detail object as props rather than reading the store's single
// `sel`/`detail` pair directly.
function MatchCard({ matchId, detailObj, narrow }) {
  const { th, D, t, modalTab, setModalTab, mScore, closeMatch } = useStore()
  const m = D.MATCHES.find(x => x.id === matchId)
  if (!m) return null
  const s = mScore(m)
  const isLive = m.status === 'LIVE'
  const played = s.hs != null
  const ready = !!(detailObj && detailObj.id === m.id)
  const detail = ready ? detailObj : null

  const events = (detail && detail.events) || null
  const lineups = detail && detail.lineups
  const stats = detail && detail.stats
  const statRows = stats ? liveStatRows(stats[m.h], stats[m.a]) : null
  const commentary = (detail && detail.commentary) || null
  const form = detail && detail.form
  const h2h = detail && detail.h2h
  const gi = (detail && detail.gameInfo) || {}
  const broadcasts = detail && detail.broadcasts

  // state-aware tab set
  const tabs = []
  if (events && events.length) tabs.push(['timeline', 'Timeline'])
  if (lineups) tabs.push(['lineups', 'Lineups'])
  if (statRows) tabs.push(['stats', 'Stats'])
  if (form || (h2h && h2h.length)) tabs.push(['form', played ? 'Form' : 'Preview'])
  if (commentary && commentary.length) tabs.push(['commentary', 'Commentary'])
  const tab = tabs.some(tt => tt[0] === modalTab) ? modalTab : (tabs[0] && tabs[0][0])

  // info strip pieces
  const infoBits = []
  if (!played && !isLive) infoBits.push(m.date + ' · ' + m.time)
  if (gi.attendance) infoBits.push('Att ' + Number(gi.attendance).toLocaleString())
  if (gi.referee) infoBits.push('Ref ' + gi.referee)
  if (broadcasts && broadcasts.length) infoBits.push('TV: ' + broadcasts.join(', '))

  let body
  if (!ready) {
    body = (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '36px 0' }}>
        <div style={{ width: 26, height: 26, borderRadius: '50%', border: '3px solid ' + th.bd, borderTopColor: th.accent, animation: 'wcSpin .8s linear infinite' }} />
      </div>
    )
  } else if (!tab) {
    body = <Msg>{played ? 'No match detail available.' : 'Match preview isn’t available yet.'}</Msg>
  } else if (tab === 'timeline') {
    body = <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>{events.map(e => <EventRow key={e.id} e={e} home={e.team === m.h} />)}</div>
  } else if (tab === 'stats') {
    body = (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '4px 2px' }}>
        {statRows.map(row => {
          const [label, vh, va, bh, ba] = row
          return (
            <div key={label}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 750, color: th.tx, marginBottom: 6 }}>
                <span>{vh}</span>
                <span style={{ color: th.sub, fontWeight: 700, fontSize: 11, letterSpacing: '0.05em', textTransform: 'uppercase' }}>{label}</span>
                <span>{va}</span>
              </div>
              <div style={{ display: 'flex', gap: 4, height: 7 }}>
                <div style={{ flex: bh || 1, background: th.accent, borderRadius: 9999, opacity: bh ? 1 : 0.25 }} />
                <div style={{ flex: ba || 1, background: th.sub, borderRadius: 9999, opacity: ba ? 0.55 : 0.25 }} />
              </div>
            </div>
          )
        })}
      </div>
    )
  } else if (tab === 'lineups') {
    const luH = lineups && lineups[m.h], luA = lineups && lineups[m.a]
    body = (luH && luA)
      ? (
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <Pitch tid={m.h} lineup={{ f: luH.formation, rows: formationRows(luH.formation, luH.players) }} attackUp={false} />
          <Pitch tid={m.a} lineup={{ f: luA.formation, rows: formationRows(luA.formation, luA.players) }} attackUp />
        </div>
      )
      : <Msg>Lineups aren’t available yet.</Msg>
  } else if (tab === 'commentary') {
    body = (
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {commentary.slice(0, 80).map((c, i) => (
          <div key={c.id} style={{ display: 'flex', gap: 10, padding: '8px 0', borderTop: i ? '1px solid ' + th.bd : 'none' }}>
            <span style={{ flex: '0 0 auto', width: 34, fontSize: 11.5, fontWeight: 800, color: th.accent }}>{c.time}</span>
            <span style={{ fontSize: 13, color: th.tx, lineHeight: 1.45 }}>{c.text}</span>
          </div>
        ))}
      </div>
    )
  } else { // form / preview
    const recent = h2h ? h2h.slice().reverse().slice(0, 6) : []
    body = (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {form ? (
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: th.sub, marginBottom: 10 }}>Recent form</div>
            {[m.h, m.a].map(code => form[code] ? (
              <div key={code} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <Badge id={code} size={22} follow={false} />
                <span style={{ flex: 1, fontWeight: 700, fontSize: 13.5, color: th.tx, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t(code) ? t(code).name : code}</span>
                <FormPills form={form[code]} />
              </div>
            ) : null)}
          </div>
        ) : null}
        {recent.length ? (
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: th.sub, marginBottom: 10 }}>Head-to-head</div>
            {recent.map((g, i) => (
              <div key={g.id} style={{ display: 'grid', gridTemplateColumns: '40px 1fr auto 1fr', alignItems: 'center', gap: 8, padding: '7px 0', borderTop: i ? '1px solid ' + th.bd : 'none' }}>
                <span style={{ fontSize: 11.5, fontWeight: 700, color: th.faint }}>{g.year}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 7, justifyContent: 'flex-end', minWidth: 0 }}>
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: th.tx, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{g.home && t(g.home) ? t(g.home).name : g.home}</span>
                  {g.home ? <Badge id={g.home} size={18} follow={false} /> : null}
                </span>
                <span style={{ fontWeight: 850, fontSize: 13, color: th.tx, fontVariantNumeric: 'tabular-nums' }}>{g.hs + '–' + g.as}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
                  {g.away ? <Badge id={g.away} size={18} follow={false} /> : null}
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: th.tx, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{g.away && t(g.away) ? t(g.away).name : g.away}</span>
                </span>
              </div>
            ))}
          </div>
        ) : null}
        {!form && !recent.length ? <Msg>No preview data for this match.</Msg> : null}
      </div>
    )
  }

  return (
    <div style={{ width: '100%', maxWidth: narrow ? 460 : 520, background: th.sf, borderRadius: 22, overflow: 'hidden', boxShadow: th.shadow, animation: 'wcPop .2s ease', flex: narrow ? '1 1 0' : 'none' }}>
      <div style={{ padding: '18px 22px', borderBottom: '1px solid ' + th.bd, position: 'relative' }}>
        <button type="button" onClick={closeMatch} aria-label="Close" style={{ position: 'absolute', right: 14, top: 14, width: 32, height: 32, borderRadius: '50%', border: '1px solid ' + th.bd, background: th.sf2, cursor: 'pointer', color: th.sub, fontSize: 18, lineHeight: 1 }}>×</button>
        <div style={{ textAlign: 'center', fontSize: 11.5, fontWeight: 700, color: th.faint, letterSpacing: '0.04em' }}>
          {[(m.g && m.g !== '?') ? 'Group ' + m.g : m.stage, m.v].filter(Boolean).join(' · ') || D.league}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 14, marginTop: 14 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <Badge id={m.h} size={46} />
            <span style={{ fontWeight: 750, fontSize: 14, color: th.tx, textAlign: 'center' }}>{t(m.h).name}</span>
          </div>
          <div style={{ textAlign: 'center' }}>
            {played
              ? <div style={{ fontWeight: 850, fontSize: 38, letterSpacing: '-0.03em', color: th.tx, lineHeight: 1 }}>{s.hs + ' – ' + s.as}</div>
              : <div style={{ fontWeight: 800, fontSize: 20, color: th.tx }}>{m.time}</div>}
            <div style={{ marginTop: 6, fontSize: 12, fontWeight: 800, color: isLive ? th.live : th.faint }}>
              {isLive ? (liveClock(s) + ' · ' + m.date) : (played ? ('Full time · ' + m.date) : m.date)}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <Badge id={m.a} size={46} />
            <span style={{ fontWeight: 750, fontSize: 14, color: th.tx, textAlign: 'center' }}>{t(m.a).name}</span>
          </div>
        </div>
        {ready && infoBits.length ? (
          <div style={{ textAlign: 'center', fontSize: 11.5, fontWeight: 600, color: th.faint, marginTop: 12, lineHeight: 1.5 }}>{infoBits.join('  ·  ')}</div>
        ) : null}
      </div>
      {ready && tabs.length ? (
        <div className="wc-scroll" style={{ display: 'flex', gap: 4, padding: '12px 18px 0', justifyContent: 'center', overflowX: 'auto' }}>
          {tabs.map(([id, label]) => (
            <button key={id} type="button" onClick={() => setModalTab(id)} style={{
              border: 'none', cursor: 'pointer', font: 'inherit', padding: '9px 14px', borderRadius: 9999, fontSize: 13, whiteSpace: 'nowrap',
              fontWeight: tab === id ? 800 : 650, color: tab === id ? '#fff' : th.sub, background: tab === id ? th.accent : 'transparent',
            }}>{label}</button>
          ))}
        </div>
      ) : null}
      <div style={{ padding: '16px 22px 24px' }}>{body}</div>
    </div>
  )
}

// Backdrop + close-on-Escape wrapper. Renders one card normally, or — for a two-legged tie
// opened via openMatchPair — two cards side by side (stacked on mobile, see .wc-tie-modal in
// index.css). Any dismissal (backdrop click, Escape, or either card's × button, which all
// funnel through closeMatch) closes both at once, since they share one sel/sel2 pair.
export function MatchModal() {
  const { sel, sel2, detail, detail2, closeMatch } = useStore()

  useEffect(() => {
    if (!sel) return
    const onKey = e => { if (e.key === 'Escape') closeMatch() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [sel, closeMatch])

  if (!sel) return null
  return (
    <div onClick={closeMatch} style={{
      position: 'fixed', inset: 0, zIndex: 80, background: 'rgba(8,6,20,0.55)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '40px 16px', overflowY: 'auto',
    }}>
      {/* the real dialog surface — role/aria-modal here (not on the backdrop, which just
          closes the dialog on an outside click and has no content of its own to expose) */}
      <div className="wc-tie-modal" role="dialog" aria-modal="true" aria-label="Match details" onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: sel2 ? 960 : 520 }}>
        <MatchCard matchId={sel} detailObj={detail} narrow={!!sel2} />
        {sel2 ? <MatchCard matchId={sel2} detailObj={detail2} narrow /> : null}
      </div>
    </div>
  )
}
