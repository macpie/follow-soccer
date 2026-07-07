import { useState, useEffect, useRef } from 'react'
import { useStore } from './store.jsx'
import { Header } from './components/Header.jsx'
import { MatchModal } from './components/MatchModal.jsx'
import { TeamModal } from './components/TeamModal.jsx'
import { BallMark } from './components/icons.jsx'
import { Today } from './views/Today.jsx'
import { Matches } from './views/Matches.jsx'
import { Table } from './views/Table.jsx'
import { Groups } from './views/Groups.jsx'
import { Bracket } from './views/Bracket.jsx'
import { Stats } from './views/Stats.jsx'
import { Teams } from './views/Teams.jsx'

function bodyFor(view, data) {
  switch (view) {
    case 'matches': return <Matches />
    case 'table': return <Table />
    case 'groups': return data.grouped ? <Groups /> : <Table />
    case 'bracket': return (data.grouped || data.bracket) ? <Bracket /> : <Table />
    case 'stats': return <Stats />
    case 'teams': return <Teams />
    default: return <Today />
  }
}

// Crossfades between tabs instead of the outgoing view just vanishing: briefly fade the
// wrapper out, swap which view is actually mounted once it's invisible, then fade back in
// (the incoming view's own wcFade keyframe layers a slide-up on top of that).
function ViewTransition({ view, data }) {
  const [shown, setShown] = useState(view)
  const [fading, setFading] = useState(false)
  const timerRef = useRef(null)

  useEffect(() => {
    if (view === shown) return
    setFading(true)
    timerRef.current = setTimeout(() => { setShown(view); setFading(false) }, 140)
    return () => clearTimeout(timerRef.current)
  }, [view, shown])

  return (
    <div style={{ opacity: fading ? 0 : 1, transition: 'opacity .14s ease' }}>
      {bodyFor(shown, data)}
    </div>
  )
}

function Splash({ children }) {
  const { th } = useStore()
  return (
    <div style={{ minHeight: '100vh', background: th.pg, color: th.tx, fontFamily: 'var(--font-sans)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 18, padding: 24, textAlign: 'center' }}>
      {children}
    </div>
  )
}

export default function App() {
  const { th, view, data, source, reload } = useStore()

  // No bundled data — everything is live from ESPN, so gate on the first load.
  if (!data) {
    if (source === 'error') {
      return (
        <Splash>
          <BallMark color={th.accent} size={40} />
          <div style={{ fontWeight: 850, fontSize: 20, letterSpacing: '-0.01em' }}>Couldn’t reach the live data feed</div>
          <div style={{ fontSize: 14, color: th.sub, maxWidth: 360, lineHeight: 1.5 }}>
            World Cup data comes live from ESPN. The request failed — check your connection and try again.
          </div>
          <button type="button" onClick={reload} style={{ marginTop: 4, padding: '11px 20px', borderRadius: 9999, border: 'none', background: th.accent, color: '#fff', fontWeight: 750, fontSize: 14, cursor: 'pointer' }}>Retry</button>
        </Splash>
      )
    }
    return (
      <Splash>
        <div style={{ width: 34, height: 34, borderRadius: '50%', border: '3px solid ' + th.bd, borderTopColor: th.accent, animation: 'wcSpin .8s linear infinite' }} />
        <div style={{ fontSize: 13, fontWeight: 700, color: th.faint, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Loading live data…</div>
      </Splash>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: th.pg, color: th.tx, fontFamily: 'var(--font-sans)', transition: 'background .2s' }}>
      <Header />
      <ViewTransition view={view} data={data} />
      <MatchModal />
      <TeamModal />
    </div>
  )
}
