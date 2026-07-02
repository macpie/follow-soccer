import { useState } from 'react'
import { useStore } from '../store.jsx'
import { Wrap, SectionTitle, Badge } from '../components/atoms.jsx'

const CATEGORIES = [
  { key: 'goals', title: 'Goals', unit: 'goals' },
  { key: 'assists', title: 'Assists', unit: 'assists' },
  { key: 'shotsOnTarget', title: 'Shots on target', unit: 'on target' },
  { key: 'totalShots', title: 'Total shots', unit: 'shots' },
  { key: 'saves', title: 'Saves', unit: 'saves' },
  { key: 'accuratePasses', title: 'Accurate passes', unit: 'passes' },
  { key: 'foulsCommitted', title: 'Fouls committed', unit: 'fouls' },
  { key: 'foulsSuffered', title: 'Fouls won', unit: 'won' },
  { key: 'yellowCards', title: 'Yellow cards', unit: 'cards' },
  { key: 'redCards', title: 'Red cards', unit: 'cards' },
]

const TOP = 5

function CategoryCard({ cat, rows, expanded, onToggle }) {
  const { th, t } = useStore()
  const shown = expanded ? rows : rows.slice(0, TOP)
  const max = rows[0] ? rows[0].value : 1
  return (
    <div style={{ border: '1px solid ' + th.bd, background: th.sf, borderRadius: 18, overflow: 'hidden', alignSelf: 'start' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', padding: '13px 16px', borderBottom: '1px solid ' + th.bd }}>
        <span style={{ fontWeight: 850, fontSize: 14, color: th.tx }}>{cat.title}</span>
        <span style={{ fontSize: 10.5, fontWeight: 700, color: th.faint, letterSpacing: '0.05em', textTransform: 'uppercase' }}>{cat.unit}</span>
      </div>
      {shown.map((p, i) => {
        const top = i < 3
        const team = t(p.team)
        return (
          <div key={p.name + i} style={{ display: 'grid', gridTemplateColumns: '24px 1fr auto', alignItems: 'center', gap: 11, padding: '9px 16px', borderTop: i ? '1px solid ' + th.bd : 'none' }}>
            <span style={{ fontWeight: 850, fontSize: top ? 15 : 13, color: top ? th.accent : th.faint, textAlign: 'center' }}>{i + 1}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
              <Badge id={p.team} size={24} follow={false} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 13.5, color: th.tx, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                <div style={{ fontSize: 11, color: th.faint, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{team ? team.name : p.team}</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 44, height: 5, background: th.sf2, borderRadius: 9999, overflow: 'hidden', display: top ? 'block' : 'none' }}>
                <div style={{ width: (p.value / max * 100) + '%', height: '100%', background: th.accent, borderRadius: 9999 }} />
              </div>
              <span style={{ fontWeight: 850, fontSize: 17, color: th.tx, minWidth: 28, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{p.value}</span>
            </div>
          </div>
        )
      })}
      {rows.length > TOP ? (
        <button type="button" onClick={onToggle} style={{
          width: '100%', border: 'none', borderTop: '1px solid ' + th.bd, background: 'transparent', cursor: 'pointer',
          font: 'inherit', fontSize: 12.5, fontWeight: 700, color: th.accent, padding: '10px 0',
        }}>{expanded ? 'Show less' : 'Show all ' + rows.length}</button>
      ) : null}
    </div>
  )
}

export function Stats() {
  const { D } = useStore()
  const L = D.LEADERS || {}
  const [expanded, setExpanded] = useState({})
  const cats = CATEGORIES.filter(c => (L[c.key] || []).length)

  return (
    <Wrap>
      <SectionTitle label="Tournament leaders" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(340px,1fr))', gap: 14, alignItems: 'start' }}>
        {cats.map(c => (
          <CategoryCard
            key={c.key}
            cat={c}
            rows={L[c.key]}
            expanded={!!expanded[c.key]}
            onToggle={() => setExpanded(prev => ({ ...prev, [c.key]: !prev[c.key] }))}
          />
        ))}
      </div>
    </Wrap>
  )
}
