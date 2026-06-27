import { useStore } from '../store.jsx'
import { Wrap, LivePill, Badge, Star } from '../components/atoms.jsx'

function GroupCard({ g }) {
  const { th, t, favs, openTeamAndNav, standings } = useStore()
  const s = standings(g)
  const head = ['', 'Team', 'P', 'W', 'D', 'L', 'GD', 'Pts', '']
  return (
    <div style={{ border: '1px solid ' + th.bd, background: th.sf, borderRadius: 18, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 16px', borderBottom: '1px solid ' + th.bd }}>
        <span style={{ fontWeight: 850, fontSize: 15, color: th.tx }}>{'Group ' + g}</span>
        {s.anyLive ? <LivePill /> : <span style={{ fontSize: 11, fontWeight: 700, color: th.faint, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{s.done ? 'Final' : 'In progress'}</span>}
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr>
            {head.map((c, i) => (
              <th key={i} style={{ textAlign: i < 2 ? 'left' : 'center', padding: '7px 5px', fontSize: 10.5, fontWeight: 700, color: th.faint, letterSpacing: '0.03em', width: i === 0 ? 26 : (i === head.length - 1 ? 28 : (i === 1 ? 'auto' : 30)) }}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {s.rows.map(r => {
            const band = r.rank <= 2 ? th.good : (r.rank === 3 ? th.warn : 'transparent')
            const fav = favs.includes(r.id)
            return (
              <tr key={r.id} onClick={() => openTeamAndNav(r.id)} style={{ cursor: 'pointer', background: fav ? th.accentSoft : 'transparent', borderTop: '1px solid ' + th.bd }}>
                <td style={{ padding: 0, width: 4 }}>
                  <div style={{ width: 3, height: 30, background: band, borderRadius: 9999, margin: '0 auto' }} />
                </td>
                <td style={{ padding: '7px 5px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                    <Badge id={r.id} size={25} />
                    <span style={{ fontWeight: fav ? 800 : 650, color: th.tx, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t(r.id).name}</span>
                  </div>
                </td>
                {['P', 'W', 'D', 'L'].map(k => <td key={k} style={{ textAlign: 'center', color: th.sub, fontWeight: 600 }}>{r[k]}</td>)}
                <td style={{ textAlign: 'center', color: th.sub, fontWeight: 600 }}>{(r.GD > 0 ? '+' : '') + r.GD}</td>
                <td style={{ textAlign: 'center', fontWeight: 850, color: th.tx }}>{r.Pts}</td>
                <td style={{ textAlign: 'center', padding: '0 4px' }} onClick={e => e.stopPropagation()}>
                  <Star id={r.id} size={15} />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export function Groups() {
  const { th } = useStore()
  const legend = (c, l) => (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: th.sub }}>
      <span style={{ width: 9, height: 9, borderRadius: 3, background: c }} />{l}
    </span>
  )
  return (
    <Wrap>
      <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', marginBottom: 18 }}>
        {legend(th.good, 'Round of 32')}
        {legend(th.warn, '3rd — best 8 advance')}
        <span style={{ fontSize: 12, color: th.faint, fontWeight: 600 }}>Click team to view profile · ★ to follow</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(340px,1fr))', gap: 14 }}>
        {'ABCDEFGHIJKL'.split('').map(g => <GroupCard key={g} g={g} />)}
      </div>
    </Wrap>
  )
}
