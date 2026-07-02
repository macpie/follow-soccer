import { useStore } from '../store.jsx'
import { Wrap, SectionTitle, Star } from '../components/atoms.jsx'

const HEAD = ['#', 'Club', 'P', 'W', 'D', 'L', 'GD', 'Pts']

// League/standings table — one ranked list of clubs with stats. Replaces the
// World-Cup-specific Groups + Bracket views in multi-league mode.
export function Table() {
  const { D, th, t, favs, openTeam } = useStore()
  const rows = D.STANDINGS || []

  return (
    <Wrap>
      <SectionTitle label={D.league + ' Table'} right={
        <span style={{ fontSize: 12, fontWeight: 700, color: th.faint }}>{rows.length} clubs</span>
      } />

      {rows.length === 0
        ? <div style={{ textAlign: 'center', color: th.faint, fontWeight: 600, padding: '40px 0' }}>No standings available yet.</div>
        : (
          <div className="wc-scroll" style={{ border: '1px solid ' + th.bd, background: th.sf, borderRadius: 16, overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 360 }}>
              <thead>
                <tr>
                  {HEAD.map((c, i) => (
                    <th key={c} style={{ textAlign: i === 1 ? 'left' : 'center', padding: '11px 6px', fontSize: 10.5, fontWeight: 700, color: th.faint, letterSpacing: '0.03em', width: i === 0 ? 34 : (i === 1 ? 'auto' : 34) }}>{c}</th>
                  ))}
                  <th aria-label="Follow" style={{ width: 30 }} />
                </tr>
              </thead>
              <tbody>
                {rows.map(r => {
                  const T = t(r.code)
                  if (!T) return null
                  const fav = favs.includes(r.code)
                  const crest = D.CRESTS && D.CRESTS[r.code]
                  return (
                    <tr key={r.code} onClick={() => openTeam(r.code)} aria-label={T.name + ' details'} style={{ cursor: 'pointer', background: fav ? th.accentSoft : 'transparent', borderTop: '1px solid ' + th.bd }}>
                      <td style={{ textAlign: 'center', fontWeight: 800, color: r.pos <= 4 ? th.good : th.sub, padding: '9px 4px' }}>{r.pos}</td>
                      <td style={{ padding: '9px 6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
                          <span style={{ width: 24, height: 24, borderRadius: '50%', flex: '0 0 auto', overflow: 'hidden', background: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.1)' }}>
                            {crest
                              ? <img src={crest} alt={T.code} loading="lazy" style={{ width: '76%', height: '76%', objectFit: 'contain' }} />
                              : <span style={{ fontSize: 9, fontWeight: 800, color: T.c }}>{T.code}</span>}
                          </span>
                          <span style={{ fontWeight: fav ? 800 : 650, color: th.tx, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{T.name}</span>
                        </div>
                      </td>
                      {['P', 'W', 'D', 'L'].map(k => <td key={k} style={{ textAlign: 'center', color: th.sub, fontWeight: 600 }}>{r[k]}</td>)}
                      <td style={{ textAlign: 'center', color: th.sub, fontWeight: 600 }}>{(r.GD > 0 ? '+' : '') + r.GD}</td>
                      <td style={{ textAlign: 'center', fontWeight: 850, color: th.tx }}>{r.Pts}</td>
                      <td style={{ textAlign: 'center', padding: '0 4px' }} onClick={e => e.stopPropagation()}>
                        <Star id={r.code} size={14} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      <div style={{ marginTop: 12, fontSize: 12, color: th.faint, fontWeight: 600 }}>Click a club to view its profile · ★ to follow</div>
    </Wrap>
  )
}
