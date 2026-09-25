import { useStore } from '../store.jsx'
import { Wrap, SectionTitle, LivePill, Pill, Badge, Star } from '../components/atoms.jsx'
import { groupIds } from '../lib/standings.js'

const HEAD = [['rank', ''], ['team', 'Team'], ['p', 'P'], ['w', 'W'], ['d', 'D'], ['l', 'L'], ['gd', 'GD'], ['pts', 'Pts'], ['fav', '']]

function GroupCard({ g, wc }) {
  const { th, t, favs, openTeam, standings } = useStore()
  const s = standings(g)
  return (
    <div style={{ border: '1px solid ' + th.bd, background: th.sf, borderRadius: 18, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 16px', borderBottom: '1px solid ' + th.bd }}>
        <span style={{ fontWeight: 850, fontSize: 15, color: th.tx }}>{'Group ' + g}</span>
        {s.anyLive ? <LivePill /> : <span style={{ fontSize: 11, fontWeight: 700, color: th.faint, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{s.done ? 'Final' : 'In progress'}</span>}
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr>
            {HEAD.map(([k, c], i) => (
              <th key={k} style={{ textAlign: i < 2 ? 'left' : 'center', padding: '7px 5px', fontSize: 10.5, fontWeight: 700, color: th.faint, letterSpacing: '0.03em', width: i === 0 ? 26 : (i === HEAD.length - 1 ? 28 : (i === 1 ? 'auto' : 30)) }}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {s.rows.map(r => {
            // WC: top two go through, third may as one of the best 8. Elsewhere just mark the winner.
            const band = wc ? (r.rank <= 2 ? th.good : (r.rank === 3 ? th.warn : 'transparent')) : (r.rank === 1 ? th.good : 'transparent')
            const fav = favs.includes(r.id)
            return (
              <tr key={r.id} onClick={() => openTeam(r.id)} aria-label={t(r.id).name + ' details'} style={{ cursor: 'pointer', background: fav ? th.accentSoft : 'transparent', borderTop: '1px solid ' + th.bd }}>
                <td aria-hidden="true" style={{ padding: 0, width: 4 }}>
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

const GRID = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(340px,1fr))', gap: 14 }

export function Groups() {
  const { th, t, D, thirdRace } = useStore()
  const wc = D.slug === 'fifa.world'
  const third = wc ? thirdRace() : []
  const ids = groupIds(D)
  // Nations League groups are named "A1".."D2": section them by league tier (A-D).
  const tiers = []
  ids.forEach(g => {
    const tier = g.length > 1 ? g[0] : ''
    const last = tiers[tiers.length - 1]
    if (last && last.tier === tier) last.groups.push(g); else tiers.push({ tier, groups: [g] })
  })
  const legend = (c, l) => (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: th.sub }}>
      <span style={{ width: 9, height: 9, borderRadius: 3, background: c }} />{l}
    </span>
  )
  return (
    <Wrap>
      <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', marginBottom: 18 }}>
        {wc ? legend(th.good, 'Round of 32') : legend(th.good, 'Group winner')}
        {wc ? legend(th.warn, '3rd — best 8 advance') : null}
        <span style={{ fontSize: 12, color: th.faint, fontWeight: 600 }}>Click team to view profile · ★ to follow</span>
      </div>
      {tiers.map(({ tier, groups }, i) => (
        <div key={tier || 'all'} style={{ marginTop: i ? 30 : 0 }}>
          {tier ? <SectionTitle label={'League ' + tier} /> : null}
          <div style={GRID}>
            {groups.map(g => <GroupCard key={g} g={g} wc={wc} />)}
          </div>
        </div>
      ))}

      {/* third-place race — the best 8 third-placed teams advance to the Round of 32 */}
      {wc ? <div style={{ marginTop: 30 }}>
        <SectionTitle label="Third-place race · best 8 advance" />
        <div style={{ border: '1px solid ' + th.bd, background: th.sf, borderRadius: 16, overflow: 'hidden' }}>
          {third.map((r, i) => (
            <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '9px 14px', borderTop: i ? '1px solid ' + th.bd : 'none', background: r.q ? th.accentSoft : 'transparent' }}>
              <span style={{ width: 20, fontWeight: 800, color: r.q ? th.accent : th.faint, fontSize: 13 }}>{i + 1}</span>
              <Badge id={r.id} size={24} />
              <span style={{ flex: 1, fontWeight: 700, fontSize: 13.5, color: th.tx }}>
                {t(r.id).name}<span style={{ color: th.faint, fontWeight: 600, fontSize: 12 }}>{'  Grp ' + r.g}</span>
              </span>
              <span style={{ fontSize: 12, color: th.sub, fontWeight: 600, width: 60, textAlign: 'right' }}>{'GD ' + (r.GD > 0 ? '+' : '') + r.GD}</span>
              <span style={{ fontSize: 13, fontWeight: 850, color: th.tx, width: 34, textAlign: 'right' }}>{r.Pts + ' pt'}</span>
              <span style={{ width: 74, textAlign: 'right' }}>
                {r.q ? <Pill label="In" fg="#fff" bg={th.accent} /> : <span style={{ fontSize: 11, color: th.faint, fontWeight: 700 }}>Out</span>}
              </span>
            </div>
          ))}
        </div>
      </div> : null}
    </Wrap>
  )
}
