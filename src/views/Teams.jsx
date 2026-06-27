import { useStore } from '../store.jsx'
import { Wrap, SectionTitle, Star } from '../components/atoms.jsx'

export function Teams() {
  const { D, th, t, openTeam } = useStore()

  const teams = Object.values(D.TEAMS)
    .filter(T => T.g && T.g !== '?')
    .sort((a, b) => a.name.localeCompare(b.name))

  return (
    <Wrap>
      <SectionTitle label="All Teams" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {teams.map(T => <TeamRow key={T.code} id={T.code} onOpen={openTeam} />)}
      </div>
    </Wrap>
  )
}

function TeamRow({ id, onOpen }) {
  const { D, th, t, favs } = useStore()
  const T = t(id)
  if (!T) return null
  const crest = D.CRESTS && D.CRESTS[id]
  const on = favs.includes(id)

  return (
    <div
      onClick={() => onOpen(id)}
      style={{
        display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px',
        borderRadius: 12, cursor: 'pointer', transition: 'background .12s',
        background: on ? th.accentSoft : 'transparent',
        border: '1px solid ' + (on ? th.accent + '44' : th.bd),
      }}
      onMouseEnter={e => e.currentTarget.style.background = on ? th.accentSoft : th.sf}
      onMouseLeave={e => e.currentTarget.style.background = on ? th.accentSoft : 'transparent'}
    >
      {/* crest */}
      <span style={{
        width: 36, height: 36, borderRadius: '50%', flex: '0 0 auto',
        overflow: 'hidden', background: '#fff', display: 'inline-flex',
        alignItems: 'center', justifyContent: 'center',
        boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.10)',
      }}>
        {crest
          ? <img src={crest} alt={T.code} loading="lazy" style={{ width: '76%', height: '76%', objectFit: 'contain' }} />
          : <span style={{ fontSize: 10, fontWeight: 800, color: T.c }}>{T.code}</span>
        }
      </span>

      {/* name + group */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: th.tx, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{T.name}</div>
        <div style={{ fontSize: 12, color: th.faint, marginTop: 1 }}>Group {T.g}</div>
      </div>

      {/* accent dot for followed */}
      {on && <span style={{ width: 8, height: 8, borderRadius: '50%', background: th.accent, flex: '0 0 auto' }} />}

      {/* follow star — stopPropagation so row click doesn't also fire */}
      <span onClick={e => e.stopPropagation()}>
        <Star id={id} size={20} />
      </span>
    </div>
  )
}
