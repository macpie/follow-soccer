import { useState, useEffect } from 'react'
import { useStore } from '../store.jsx'
import { Star } from './atoms.jsx'
import { txtOn, liveClock } from '../lib/util.js'

const POS_ORDER = { GK: 0, DF: 1, MF: 2, FW: 3, G: 0, D: 1, M: 2, F: 3 }
const POS_LABEL = { GK: 'Goalkeeper', DF: 'Defender', MF: 'Midfielder', FW: 'Forward', G: 'Goalkeeper', D: 'Defender', M: 'Midfielder', F: 'Forward' }
const TABS = [['squad', 'Squad'], ['schedule', 'Schedule']]

function PlayerCard({ p, teamColor }) {
  const { th } = useStore()
  const [imgErr, setImgErr] = useState(false)
  const [flagErr, setFlagErr] = useState(false)

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
      padding: '14px 8px 12px', borderRadius: 14, background: th.sf2,
      border: '1px solid ' + th.bd, textAlign: 'center', minWidth: 0,
    }}>
      {/* headshot */}
      <div style={{ position: 'relative', flex: '0 0 auto' }}>
        <div style={{
          width: 60, height: 60, borderRadius: '50%', overflow: 'hidden',
          background: teamColor + '22', display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: '2px solid ' + teamColor + '44',
        }}>
          {p.headshot && !imgErr
            ? <img src={p.headshot} alt={p.name} onError={() => setImgErr(true)} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : p.flag && !flagErr
            ? <img src={p.flag} alt={p.nationality || ''} title={p.nationality || ''} onError={() => setFlagErr(true)} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <span style={{ fontWeight: 900, fontSize: 20, color: teamColor }}>{p.n || '?'}</span>
          }
        </div>
        {p.injured && (
          <span title="Injured / doubtful" style={{
            position: 'absolute', right: -2, bottom: -2, width: 16, height: 16, borderRadius: '50%',
            background: '#e5484d', color: '#fff', fontSize: 10, fontWeight: 900,
            display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid ' + th.sf2,
          }}>+</span>
        )}
      </div>

      {/* jersey + position badge */}
      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
        <span style={{
          background: teamColor, color: txtOn(teamColor), fontSize: 9, fontWeight: 900,
          borderRadius: 6, padding: '2px 6px', letterSpacing: '0.02em',
        }}>{p.n || '–'}</span>
        {p.pos && (
          <span style={{
            background: th.sf, color: th.sub, fontSize: 9, fontWeight: 800,
            borderRadius: 6, padding: '2px 6px', border: '1px solid ' + th.bd,
            letterSpacing: '0.03em', textTransform: 'uppercase',
          }}>{p.pos}</span>
        )}
      </div>

      {/* name */}
      <div style={{ fontSize: 11.5, fontWeight: 750, color: th.tx, lineHeight: 1.25, maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={p.name}>{p.name}</div>

      {/* age / nationality */}
      {(p.age || p.nationality) ? (
        <div style={{ fontSize: 10, color: th.faint, lineHeight: 1.4 }}>
          {[p.nationality, p.age ? p.age + ' yrs' : null].filter(Boolean).join(' · ')}
        </div>
      ) : null}
      {p.height ? (
        <div style={{ fontSize: 9.5, color: th.faint, lineHeight: 1.3, opacity: 0.85 }}>{p.height}</div>
      ) : null}
    </div>
  )
}

function MatchRow({ m }) {
  const { th, t, openMatch, closeTeam } = useStore()
  const TH = t(m.h), TA = t(m.a)
  const played = m.hs != null
  const isLive = m.status === 'LIVE'

  return (
    <button
      type="button"
      onClick={() => { closeTeam(); openMatch(m) }}
      aria-label={(TH ? TH.name : m.h) + ' vs ' + (TA ? TA.name : m.a)}
      style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', width: '100%',
        borderRadius: 10, cursor: 'pointer', transition: 'background .12s',
        border: '1px solid ' + th.bd, background: 'transparent', font: 'inherit', textAlign: 'left',
      }}
      onMouseEnter={e => e.currentTarget.style.background = th.sf2}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      {/* home */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 7, justifyContent: 'flex-end', minWidth: 0 }}>
        <span style={{ fontWeight: 650, fontSize: 13, color: th.tx, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{TH ? TH.name : m.h}</span>
        <TeamBadge id={m.h} size={24} />
      </div>

      {/* score / time */}
      <div style={{ flex: '0 0 auto', textAlign: 'center', minWidth: 64 }}>
        {played
          ? <span style={{ fontWeight: 850, fontSize: 16, color: isLive ? th.live : th.tx, letterSpacing: '-0.02em' }}>{m.hs}–{m.as}</span>
          : <span style={{ fontWeight: 750, fontSize: 13, color: th.faint }}>{m.time}</span>
        }
        <div style={{ fontSize: 10, fontWeight: 700, color: isLive ? th.live : th.faint, marginTop: 1 }}>
          {isLive ? liveClock(m) : played ? 'FT' : m.date}
        </div>
      </div>

      {/* away */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
        <TeamBadge id={m.a} size={24} />
        <span style={{ fontWeight: 650, fontSize: 13, color: th.tx, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{TA ? TA.name : m.a}</span>
      </div>

      {/* round label */}
      <span style={{ fontSize: 10, fontWeight: 700, color: th.faint, flex: '0 0 auto', whiteSpace: 'nowrap', display: 'none' }}>{m.stage || (m.g !== '?' ? 'Grp ' + m.g : '')}</span>
    </button>
  )
}

function TeamBadge({ id, size }) {
  const { D, t } = useStore()
  const T = t(id)
  if (!T) return null
  const crest = D.CRESTS && D.CRESTS[id]
  return (
    <span style={{
      width: size, height: size, borderRadius: '50%', flex: '0 0 auto',
      overflow: 'hidden', background: '#fff', display: 'inline-flex',
      alignItems: 'center', justifyContent: 'center',
      boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.10)',
    }}>
      {crest
        ? <img src={crest} alt={T.code} loading="lazy" style={{ width: '76%', height: '76%', objectFit: 'contain' }} />
        : <span style={{ fontSize: size * 0.3, fontWeight: 800, color: T.c }}>{T.code}</span>
      }
    </span>
  )
}

export function TeamModal() {
  const { selTeam, closeTeam } = useStore()

  // Close on Escape while the modal is open.
  useEffect(() => {
    if (!selTeam) return
    const onKey = e => { if (e.key === 'Escape') closeTeam() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selTeam, closeTeam])

  if (!selTeam) return null
  // key={selTeam}: a different team fully remounts this, so its `tab` state resets to
  // 'squad' on its own initial render — no effect needed to force it back afterwards.
  return <TeamModalContent key={selTeam} selTeam={selTeam} />
}

function TeamModalContent({ selTeam }) {
  const { th, D, t, teamSquad, teamSquadLoading, closeTeam } = useStore()
  const [tab, setTab] = useState('squad')

  const T = t(selTeam)
  if (!T) return null

  const crest = D.CRESTS && D.CRESTS[selTeam]
  const teamColor = T.c || '#5F26FC'

  // Squad: the full 26-man roster from ESPN's per-team roster endpoint
  const players = teamSquad ? teamSquad.players : null
  const record = teamSquad ? teamSquad.record : null
  const standing = teamSquad ? teamSquad.standing : null

  // Schedule: all team matches
  const schedule = D.MATCHES.filter(m => m.h === selTeam || m.a === selTeam)

  // Group players by position
  const grouped = {}
  if (players) {
    players.forEach(p => {
      const key = p.pos || 'XX'
      ;(grouped[key] = grouped[key] || []).push(p)
    })
  }
  const posGroups = Object.entries(grouped).sort((a, b) => (POS_ORDER[a[0]] ?? 9) - (POS_ORDER[b[0]] ?? 9))

  return (
    <div onClick={closeTeam} style={{
      position: 'fixed', inset: 0, zIndex: 90, background: 'rgba(8,6,20,0.6)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '40px 16px 40px', overflowY: 'auto',
    }}>
      <div role="dialog" aria-modal="true" aria-label={T.name + ' team profile'} onClick={e => e.stopPropagation()} style={{
        width: '100%', maxWidth: 560, background: th.sf, borderRadius: 22,
        overflow: 'hidden', boxShadow: th.shadow, animation: 'wcPop .2s ease',
      }}>
        {/* header */}
        <div style={{ padding: '22px 22px 16px', borderBottom: '1px solid ' + th.bd, position: 'relative' }}>
          <button type="button" onClick={closeTeam} style={{
            position: 'absolute', right: 14, top: 14, width: 32, height: 32, borderRadius: '50%',
            border: '1px solid ' + th.bd, background: th.sf2, cursor: 'pointer', color: th.sub, fontSize: 18, lineHeight: 1,
          }}>×</button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16, paddingRight: 40 }}>
            {/* crest */}
            <div style={{
              width: 64, height: 64, borderRadius: '50%', overflow: 'hidden', flex: '0 0 auto',
              background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 0 3px ' + teamColor + '44',
            }}>
              {crest
                ? <img src={crest} alt={T.code} style={{ width: '76%', height: '76%', objectFit: 'contain' }} />
                : <span style={{ fontWeight: 900, fontSize: 18, color: teamColor }}>{T.code}</span>
              }
            </div>

            {/* name + group + record */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 850, fontSize: 20, letterSpacing: '-0.02em', color: th.tx }}>{T.name}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: th.faint, marginTop: 2 }}>
                {T.g ? 'Group ' + T.g : D.league}{record ? ' · ' + record + ' W-D-L' : ''}
              </div>
              {standing && (
                <div style={{ fontSize: 11, fontWeight: 700, color: th.accent, marginTop: 2 }}>{standing}</div>
              )}
            </div>

            {/* follow */}
            <Star id={selTeam} size={22} />
          </div>
        </div>

        {/* tabs */}
        <div className="wc-scroll" style={{ display: 'flex', gap: 4, padding: '12px 18px 0', overflowX: 'auto' }}>
          {TABS.map(([id, label]) => (
            <button key={id} type="button" onClick={() => setTab(id)} style={{
              border: 'none', cursor: 'pointer', font: 'inherit', padding: '9px 18px',
              borderRadius: 9999, fontSize: 13, whiteSpace: 'nowrap',
              fontWeight: tab === id ? 800 : 650,
              color: tab === id ? '#fff' : th.sub,
              background: tab === id ? th.accent : 'transparent',
            }}>{label}</button>
          ))}
        </div>

        {/* body */}
        <div style={{ padding: '16px 22px 28px' }}>
          {tab === 'squad' && (
            teamSquadLoading
              ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '36px 0' }}>
                  <div style={{ width: 26, height: 26, borderRadius: '50%', border: '3px solid ' + th.bd, borderTopColor: th.accent, animation: 'wcSpin .8s linear infinite' }} />
                </div>
              )
              : !players || players.length === 0
              ? <div style={{ textAlign: 'center', color: th.faint, fontWeight: 600, padding: '30px 0', lineHeight: 1.5 }}>No squad data available yet.<br />Check back closer to {T.name}'s first match.</div>
              : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  <div style={{ textAlign: 'center', fontSize: 12, fontWeight: 700, color: th.faint, letterSpacing: '0.04em' }}>
                    {players.length}-player squad
                  </div>
                  {posGroups.map(([posKey, posPlayers]) => (
                    <div key={posKey}>
                      <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: th.sub, marginBottom: 10 }}>
                        {POS_LABEL[posKey] || posKey}
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 8 }}>
                        {posPlayers.map(p => <PlayerCard key={p.id || p.name} p={p} teamColor={teamColor} />)}
                      </div>
                    </div>
                  ))}
                </div>
              )
          )}

          {tab === 'schedule' && (
            schedule.length === 0
              ? <div style={{ textAlign: 'center', color: th.faint, fontWeight: 600, padding: '30px 0' }}>No matches scheduled.</div>
              : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {schedule.map(m => (
                    <div key={m.id}>
                      {/* round label */}
                      <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: th.sub, marginBottom: 4 }}>
                        {m.stage || (m.g && m.g !== '?' ? 'Group ' + m.g : D.league)}
                      </div>
                      <MatchRow m={m} />
                    </div>
                  ))}
                </div>
              )
          )}
        </div>
      </div>
    </div>
  )
}
