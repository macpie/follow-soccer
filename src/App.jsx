import { useStore } from './store.jsx'
import { Header } from './components/Header.jsx'
import { MatchModal } from './components/MatchModal.jsx'
import { TeamModal } from './components/TeamModal.jsx'
import { BallMark } from './components/icons.jsx'
import { Today } from './views/Today.jsx'
import { Matches } from './views/Matches.jsx'
import { Groups } from './views/Groups.jsx'
import { Bracket } from './views/Bracket.jsx'
import { Stats } from './views/Stats.jsx'
import { Teams } from './views/Teams.jsx'

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
          <button onClick={reload} style={{ marginTop: 4, padding: '11px 20px', borderRadius: 9999, border: 'none', background: th.accent, color: '#fff', fontWeight: 750, fontSize: 14, cursor: 'pointer' }}>Retry</button>
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

  let body
  switch (view) {
    case 'matches': body = <Matches />; break
    case 'groups': body = <Groups />; break
    case 'bracket': body = <Bracket />; break
    case 'stats': body = <Stats />; break
    case 'teams': body = <Teams />; break
    default: body = <Today />
  }

  return (
    <div style={{ minHeight: '100vh', background: th.pg, color: th.tx, fontFamily: 'var(--font-sans)', transition: 'background .2s' }}>
      <Header />
      {body}
      <MatchModal />
      <TeamModal />
    </div>
  )
}
