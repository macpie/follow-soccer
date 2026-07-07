import { useState, useEffect } from 'react'
import { useStore } from '../store.jsx'
import { BallMark, SunIcon, MoonIcon, BellIcon, RefreshIcon, TabIcon } from './icons.jsx'

// Tab sets by competition shape:
//  - grouped (World Cup): Groups + Bracket
//  - cup with a knockout bracket but no groups (Champions League): Table + Bracket
//  - plain league: Table only
const TABS_GROUPED = [['today', 'Today'], ['matches', 'Matches'], ['bracket', 'Bracket'], ['groups', 'Groups'], ['stats', 'Stats'], ['teams', 'Teams']]
const TABS_CUP = [['today', 'Today'], ['matches', 'Matches'], ['bracket', 'Bracket'], ['table', 'Table'], ['stats', 'Stats'], ['teams', 'Teams']]
const TABS_LEAGUE = [['today', 'Today'], ['matches', 'Matches'], ['table', 'Table'], ['stats', 'Stats'], ['teams', 'Teams']]

// Custom league dropdown: each row shows the league name on the left and its country on
// the right. (A native <select> can't lay options out this way.)
function LiveDot() {
  const { th } = useStore()
  return <span title="Live now" style={{ width: 7, height: 7, borderRadius: '50%', background: th.live, animation: 'wcPulse 1s infinite', flex: '0 0 auto' }} />
}

function LeagueMenu() {
  const { th, dark, league, leagues, setLeague, liveSlugs } = useStore()
  const [open, setOpen] = useState(false)
  const cur = leagues.find(l => l.slug === league) || leagues[0]

  useEffect(() => {
    if (!open) return
    const onKey = e => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <div style={{ position: 'relative', flex: '0 1 auto', minWidth: 0 }}>
      <button type="button" onClick={() => setOpen(o => !o)} aria-haspopup="listbox" aria-expanded={open} style={{
        display: 'inline-flex', alignItems: 'center', gap: 7, maxWidth: 180, width: '100%',
        font: 'inherit', fontSize: 13, fontWeight: 700, color: th.tx,
        background: open ? th.sf2 : th.sf, border: '1px solid ' + (open ? th.accent : th.bd),
        borderRadius: 9999, padding: '8px 12px', cursor: 'pointer', transition: 'border-color .15s',
      }}>
        <span style={{ flex: 1, textAlign: 'left', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{cur.name}</span>
        {liveSlugs[cur.slug] && <LiveDot />}
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ color: th.faint, flex: '0 0 auto', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }}>
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <>
          {/* invisible dismiss scrim — Escape already closes the menu for keyboard users, so
              this is mouse/touch-only and hidden from assistive tech rather than exposed as
              an unlabeled interactive control */}
          <div aria-hidden="true" onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 60 }} />
          <div role="listbox" className="wc-league-menu" style={{
            zIndex: 61, width: 250, maxWidth: '80vw',
            background: th.sf, border: '1px solid ' + th.bd, borderRadius: 14, padding: 5,
            boxShadow: dark ? '0 16px 40px rgba(0,0,0,0.6)' : '0 16px 40px rgba(20,16,50,0.18)',
          }}>
            {leagues.map(l => {
              const on = l.slug === league
              return (
                <button key={l.slug} type="button" role="option" aria-selected={on} onClick={() => { setLeague(l.slug); setOpen(false) }}
                  onMouseEnter={e => { if (!on) e.currentTarget.style.background = th.sf2 }}
                  onMouseLeave={e => { if (!on) e.currentTarget.style.background = 'transparent' }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 9, width: '100%',
                    border: 'none', cursor: 'pointer', font: 'inherit', textAlign: 'left',
                    padding: '9px 11px', borderRadius: 9, background: on ? th.accentSoft : 'transparent',
                  }}>
                  <span style={{ flex: 1, minWidth: 0, fontSize: 13.5, fontWeight: on ? 800 : 650, color: on ? th.accent : th.tx, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.name}</span>
                  {liveSlugs[l.slug] && <LiveDot />}
                  <span style={{ flex: '0 0 auto', fontSize: 11.5, fontWeight: 600, color: th.faint }}>{l.country}</span>
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

export function Header() {
  const { th, dark, view, setView, toggleDark, D, notify, notifySupported, toggleNotify, source, reload } = useStore()
  const refreshing = source === 'loading'
  const tabs = D.grouped ? TABS_GROUPED : (D.bracket ? TABS_CUP : TABS_LEAGUE)

  const navBtn = ([id, label]) => {
    const on = view === id
    return (
      <button key={id} type="button" onClick={() => setView(id)} style={{
        border: 'none', cursor: 'pointer', font: 'inherit', padding: '8px 14px', borderRadius: 9999, whiteSpace: 'nowrap',
        display: 'inline-flex', alignItems: 'center', gap: 6,
        fontSize: 14, fontWeight: on ? 750 : 600, color: on ? '#fff' : th.sub, background: on ? th.accent : 'transparent', transition: 'color .15s ease, background .15s ease',
      }}>
        <TabIcon id={id} size={15} />
        {label}
      </button>
    )
  }

  return (
    <>
    <div style={{
      position: 'sticky', top: 0, zIndex: 40, background: dark ? 'rgba(8,8,12,0.82)' : 'rgba(255,255,255,0.82)',
      backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', borderBottom: '1px solid ' + th.bd,
    }}>
      <div className="wc-hdr" style={{ maxWidth: 1120, margin: '0 auto', padding: '12px 22px' }}>
        <div className="wc-hdr-brand">
          <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
            <BallMark color={th.accent} />
            <div style={{ lineHeight: 1.05 }}>
              <div style={{ fontWeight: 850, fontSize: 17, letterSpacing: '-0.02em', color: th.tx, whiteSpace: 'nowrap' }}>
                Follow <span style={{ color: th.accent }}>Soccer</span>
              </div>
              <div style={{ fontSize: 11, fontWeight: 600, color: th.faint, letterSpacing: '0.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{D.league}</div>
            </div>
          </div>
        </div>
        <div className="wc-scroll wc-hdr-nav" style={{ background: th.sf2 }}>
          {tabs.map(navBtn)}
        </div>
        <div className="wc-hdr-actions">
          <LeagueMenu />
          <button type="button" onClick={() => !refreshing && reload()} disabled={refreshing} title="Refresh live data" aria-label="Refresh live data" style={{
            width: 38, height: 38, borderRadius: '50%', border: '1px solid ' + th.bd, background: th.sf, cursor: refreshing ? 'default' : 'pointer',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: th.tx, flex: '0 0 auto',
          }}>
            <span style={{ display: 'inline-flex', animation: refreshing ? 'wcSpin .7s linear infinite' : 'none' }}>
              <RefreshIcon />
            </span>
          </button>
          {notifySupported ? (
            <button type="button" onClick={toggleNotify} title={notify ? 'Match alerts on — 15 min before your teams play' : 'Turn on match alerts'} aria-label={notify ? 'Match alerts on' : 'Turn on match alerts'} style={{
              width: 38, height: 38, borderRadius: '50%', border: '1px solid ' + (notify ? th.accent : th.bd), background: notify ? th.accentSoft : th.sf, cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: notify ? th.accent : th.tx, flex: '0 0 auto',
            }}>
              <BellIcon filled={notify} />
            </button>
          ) : null}
          <button type="button" onClick={toggleDark} title="Toggle theme" aria-label="Toggle theme" style={{
            width: 38, height: 38, borderRadius: '50%', border: '1px solid ' + th.bd, background: th.sf, cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: th.tx, flex: '0 0 auto',
          }}>
            {dark ? <SunIcon /> : <MoonIcon />}
          </button>
        </div>
      </div>
    </div>

    {/* Mobile bottom tab bar (hidden on desktop via CSS) */}
    <nav className="wc-bottomnav" style={{
      background: dark ? 'rgba(8,8,12,0.94)' : 'rgba(255,255,255,0.96)',
      borderTop: '1px solid ' + th.bd, backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
    }}>
      {tabs.map(([id, label]) => {
        const on = view === id
        return (
          <button key={id} type="button" onClick={() => setView(id)} aria-label={label} style={{
            flex: 1, border: 'none', background: 'transparent', cursor: 'pointer', font: 'inherit',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '8px 2px 7px',
            color: on ? th.accent : th.sub,
          }}>
            <TabIcon id={id} size={21} />
            <span style={{ fontSize: 10, fontWeight: on ? 800 : 600, letterSpacing: '0.01em' }}>{label}</span>
          </button>
        )
      })}
    </nav>
    </>
  )
}
