import { useState } from 'react'
import { useStore } from '../store.jsx'
import { Wrap, SectionTitle, Star } from '../components/atoms.jsx'

export function Teams() {
  const { D, th, openTeam } = useStore()
  const [q, setQ] = useState('')

  const all = Object.values(D.TEAMS)
    .filter(T => T.ranked || (T.g && T.g !== '?'))
    .sort((a, b) => a.name.localeCompare(b.name))

  // Filter by team name, 3-letter code, or group (e.g. "fra", "group b", "b").
  const query = q.trim().toLowerCase()
  const teams = query
    ? all.filter(T =>
        T.name.toLowerCase().includes(query) ||
        T.code.toLowerCase().includes(query) ||
        ('group ' + T.g).toLowerCase().includes(query) ||
        T.g.toLowerCase() === query)
    : all

  return (
    <Wrap>
      <SectionTitle label="All Teams" right={
        <span style={{ fontSize: 12, fontWeight: 700, color: th.faint }}>{teams.length} of {all.length}</span>
      } />

      {/* search */}
      <div style={{ position: 'relative', marginBottom: 14 }}>
        <svg viewBox="0 0 24 24" width="16" height="16" style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
          <circle cx="11" cy="11" r="7" fill="none" stroke={th.faint} strokeWidth="2" />
          <line x1="16.5" y1="16.5" x2="21" y2="21" stroke={th.faint} strokeWidth="2" strokeLinecap="round" />
        </svg>
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Search teams…"
          aria-label="Search teams"
          style={{
            width: '100%', boxSizing: 'border-box', padding: '11px 36px 11px 38px',
            borderRadius: 12, border: '1px solid ' + th.bd, background: th.sf, color: th.tx,
            fontSize: 14, fontWeight: 600, font: 'inherit',
          }}
          onFocus={e => e.currentTarget.style.borderColor = th.accent}
          onBlur={e => e.currentTarget.style.borderColor = th.bd}
        />
        {q && (
          <button type="button" onClick={() => setQ('')} aria-label="Clear search" style={{
            position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
            width: 24, height: 24, borderRadius: '50%', border: 'none', background: th.sf2,
            cursor: 'pointer', color: th.sub, fontSize: 15, lineHeight: 1,
          }}>×</button>
        )}
      </div>

      {teams.length === 0
        ? <div style={{ textAlign: 'center', color: th.faint, fontWeight: 600, padding: '30px 0' }}>No teams match “{q}”.</div>
        : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {teams.map(T => <TeamRow key={T.code} id={T.code} onOpen={openTeam} />)}
          </div>
        )}
    </Wrap>
  )
}

function TeamRow({ id, onOpen }) {
  const { D, th, t, favs } = useStore()
  const T = t(id)
  if (!T) return null
  const crest = D.CRESTS && D.CRESTS[id]
  const on = favs.includes(id)

  // Not a real <button>: it wraps the follow <Star>, which is itself a <button>, and
  // nesting interactive controls inside a native button is invalid HTML — role="button" +
  // a key handler gives the same keyboard/AT affordance without that conflict.
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(id)}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(id) } }}
      aria-label={T.name}
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
        <div style={{ fontSize: 12, color: th.faint, marginTop: 1 }}>{T.g ? 'Group ' + T.g : D.league}</div>
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

