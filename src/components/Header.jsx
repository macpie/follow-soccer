import { useStore } from '../store.jsx'
import { BallMark, SunIcon, MoonIcon, BellIcon } from './icons.jsx'

const TABS = [['today', 'Today'], ['matches', 'Matches'], ['groups', 'Groups'], ['bracket', 'Bracket'], ['scorers', 'Scorers']]

export function Header() {
  const { th, dark, view, setView, toggleDark, D, notify, notifySupported, toggleNotify } = useStore()

  const navBtn = ([id, label]) => {
    const on = view === id
    return (
      <button key={id} onClick={() => setView(id)} style={{
        border: 'none', cursor: 'pointer', font: 'inherit', padding: '8px 15px', borderRadius: 9999, whiteSpace: 'nowrap',
        fontSize: 14, fontWeight: on ? 750 : 600, color: on ? '#fff' : th.sub, background: on ? th.accent : 'transparent', transition: 'all .15s',
      }}>{label}</button>
    )
  }

  return (
    <div style={{
      position: 'sticky', top: 0, zIndex: 40, background: dark ? 'rgba(8,8,12,0.82)' : 'rgba(255,255,255,0.82)',
      backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', borderBottom: '1px solid ' + th.bd,
    }}>
      <div style={{ maxWidth: 1120, margin: '0 auto', padding: '12px 22px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 0', display: 'flex', justifyContent: 'flex-start' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
            <BallMark color={th.accent} />
            <div style={{ lineHeight: 1.05 }}>
              <div style={{ fontWeight: 850, fontSize: 17, letterSpacing: '-0.02em', color: th.tx }}>
                World Cup <span style={{ color: th.accent }}>26</span>
              </div>
              <div style={{ fontSize: 11, fontWeight: 600, color: th.faint, letterSpacing: '0.02em' }}>{D.HOST}</div>
            </div>
          </div>
        </div>
        <div className="wc-scroll" style={{ display: 'flex', gap: 2, overflowX: 'auto', padding: 2, background: th.sf2, borderRadius: 9999, flex: '0 1 auto', justifyContent: 'center' }}>
          {TABS.map(navBtn)}
        </div>
        <div style={{ flex: '1 1 0', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          {notifySupported ? (
            <button onClick={toggleNotify} title={notify ? 'Match alerts on — 15 min before your teams play' : 'Turn on match alerts'} style={{
              width: 38, height: 38, borderRadius: '50%', border: '1px solid ' + (notify ? th.accent : th.bd), background: notify ? th.accentSoft : th.sf, cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: notify ? th.accent : th.tx, flex: '0 0 auto',
            }}>
              <BellIcon filled={notify} />
            </button>
          ) : null}
          <button onClick={toggleDark} title="Toggle theme" style={{
            width: 38, height: 38, borderRadius: '50%', border: '1px solid ' + th.bd, background: th.sf, cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: th.tx, flex: '0 0 auto',
          }}>
            {dark ? <SunIcon /> : <MoonIcon />}
          </button>
        </div>
      </div>
    </div>
  )
}
