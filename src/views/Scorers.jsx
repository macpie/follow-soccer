import { useStore } from '../store.jsx'
import { Wrap, SectionTitle, Badge } from '../components/atoms.jsx'

export function Scorers() {
  const { th, D, t, favs, toggleFav } = useStore()
  const max = D.SCORERS[0].goals
  return (
    <Wrap>
      <SectionTitle label="Golden Boot" />
      <div style={{ border: '1px solid ' + th.bd, background: th.sf, borderRadius: 18, overflow: 'hidden' }}>
        {D.SCORERS.map((p, i) => {
          const top = i < 3
          return (
            <div key={p.name} onClick={() => toggleFav(p.team)} style={{
              cursor: 'pointer', display: 'grid', gridTemplateColumns: '34px 1fr auto', alignItems: 'center', gap: 14,
              padding: '12px 16px', borderTop: i ? '1px solid ' + th.bd : 'none', background: favs.includes(p.team) ? th.accentSoft : 'transparent',
            }}>
              <span style={{ fontWeight: 850, fontSize: top ? 18 : 14, color: top ? th.accent : th.faint, textAlign: 'center' }}>{i + 1}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 11, minWidth: 0 }}>
                <Badge id={p.team} size={top ? 38 : 30} follow={false} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 750, fontSize: top ? 16 : 14.5, color: th.tx, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                  <div style={{ fontSize: 11.5, color: th.faint, fontWeight: 600 }}>{t(p.team).name + ' · ' + p.assists + ' assists · ' + p.pens + ' pen'}</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 120, height: 6, background: th.sf2, borderRadius: 9999, overflow: 'hidden', display: top ? 'block' : 'none' }}>
                  <div style={{ width: (p.goals / max * 100) + '%', height: '100%', background: th.accent, borderRadius: 9999 }} />
                </div>
                <div style={{ textAlign: 'right', minWidth: 54 }}>
                  <div style={{ fontWeight: 850, fontSize: top ? 24 : 19, color: th.tx, lineHeight: 1 }}>{p.goals}</div>
                  <div style={{ fontSize: 10, color: th.faint, fontWeight: 700, letterSpacing: '0.05em' }}>GOALS</div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </Wrap>
  )
}
