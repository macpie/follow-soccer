import { useStore } from '../store.jsx'
import { Wrap, SectionTitle, LivePill, Badge, Star } from '../components/atoms.jsx'
import { MatchRow } from '../components/MatchRow.jsx'
import { todayLabel, liveClock } from '../lib/util.js'

function FeaturedLive({ m }) {
  const { th, t, D, favs, mScore, openMatch } = useStore()
  const s = mScore(m)
  const ls = { hs: s.hs, as: s.as, minute: s.minute, clock: s.clock }
  const favH = favs.includes(m.h), favA = favs.includes(m.a)
  const fav = favH || favA
  return (
    <button type="button" onClick={() => openMatch(m)} style={{
      width: '100%', font: 'inherit', textAlign: 'left', cursor: 'pointer', border: '1px solid ' + (fav ? th.accent : th.bd), background: fav ? th.accentSoft : th.sf,
      borderRadius: 20, padding: '22px 26px', position: 'relative', overflow: 'hidden', boxShadow: th.shadow,
    }}>
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: th.live }} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: th.sub, letterSpacing: '0.04em' }}>{[(m.g && m.g !== '?') ? 'Group ' + m.g : null, m.v ? m.v.split('·')[0].trim() : null].filter(Boolean).join(' · ') || D.league}</span>
        <LivePill />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 16 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 9 }}>
          <Badge id={m.h} size={52} />
          <span style={{ fontWeight: favH ? 850 : 750, fontSize: 16, color: favH ? th.accent : th.tx }}>{t(m.h).name}{favH ? ' ★' : ''}</span>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: 850, fontSize: 46, letterSpacing: '-0.03em', color: th.tx, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{ls.hs + ' – ' + ls.as}</div>
          <div style={{ marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 800, color: th.live }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: th.live, animation: 'wcPulse 1s infinite' }} />
            {liveClock(ls)}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 9 }}>
          <Badge id={m.a} size={52} />
          <span style={{ fontWeight: favA ? 850 : 750, fontSize: 16, color: favA ? th.accent : th.tx }}>{t(m.a).name}{favA ? ' ★' : ''}</span>
        </div>
      </div>
    </button>
  )
}

function FavCard({ id }) {
  const { th, t, D, mScore, openMatch } = useStore()
  if (!t(id)) return null
  const next = D.MATCHES.find(m => (m.h === id || m.a === id) && m.status !== 'FT')
  const last = [...D.MATCHES].reverse().find(m => (m.h === id || m.a === id) && mScore(m).hs != null)
  const m = next || last
  return (
    <div style={{ minWidth: 230, flex: '0 0 auto', border: '1px solid ' + th.bd, background: th.sf, borderRadius: 16, padding: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 10 }}>
        <Badge id={id} size={30} />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 750, fontSize: 14, color: th.tx }}>{t(id).name}</div>
          <div style={{ fontSize: 11, color: th.faint, fontWeight: 600 }}>{t(id).g ? 'Group ' + t(id).g : D.league}</div>
        </div>
        <Star id={id} size={17} />
      </div>
      {m ? (
        <button type="button" onClick={() => openMatch(m)} style={{
          width: '100%', font: 'inherit', textAlign: 'left', cursor: 'pointer',
          border: 'none', background: th.sf2, borderRadius: 11, padding: '9px 11px',
        }}>
          <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: m.status === 'LIVE' ? th.live : th.faint, marginBottom: 4 }}>
            {m.status === 'FT' ? 'Result' : (m.status === 'LIVE' ? 'Live now' : 'Up next · ' + m.date)}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 650, color: th.tx }}>{t(m.h === id ? m.a : m.h).name}</span>
            <span style={{ fontSize: 13, fontWeight: 800, color: th.tx }}>{mScore(m).hs != null ? mScore(m).hs + '–' + mScore(m).as : m.time}</span>
          </div>
        </button>
      ) : <div style={{ fontSize: 12, color: th.faint }}>No upcoming fixtures</div>}
    </div>
  )
}

export function Today() {
  const { th, dark, D, t, favs, mScore, setView } = useStore()
  // favs are global across leagues; only show the ones in the current competition
  const myFavs = favs.filter(id => !!t(id))
  const live = D.MATCHES.filter(m => m.status === 'LIVE')
  const todayDone = D.MATCHES.filter(m => m.date === D.TODAY && m.status === 'FT')
  const todayUp = D.MATCHES.filter(m => m.date === D.TODAY && m.status === 'UP')
  const upcoming = D.MATCHES.filter(m => m.status === 'UP').slice(0, 6)
  const goals = D.MATCHES.reduce((n, m) => { const s = mScore(m); return n + (s.hs != null ? s.hs + s.as : 0) }, 0)
  const playedN = D.MATCHES.filter(m => mScore(m).hs != null).length
  const teamsN = Object.values(D.TEAMS).filter(x => x.ranked || (x.g && x.g !== '?')).length
  const eyebrow = D.league
  const heroSub = live.length
    ? (live.length + ' match' + (live.length > 1 ? 'es' : '') + ' live now' + (todayUp.length ? ' · ' + todayUp.length + ' still to kick off today.' : '.'))
    : (todayUp.length ? (todayUp.length + ' match' + (todayUp.length > 1 ? 'es' : '') + ' on the schedule today.') : 'Check the Matches tab for upcoming fixtures.')
  const heroStats = [[String(teamsN), 'Teams']]
  if (D.grouped) heroStats.push([String(Object.keys(D.GROUPS).length), 'Groups'])
  heroStats.push([playedN + ' / ' + D.MATCHES.length, 'Matches played'], [String(goals), 'Goals scored'])

  return (
    <Wrap>
      {/* hero */}
      <div style={{
        borderRadius: 24, padding: '30px 30px', marginBottom: 26, position: 'relative', overflow: 'hidden',
        background: dark ? 'linear-gradient(135deg,#1a0a52,#2a1170 55%,#0c0524)' : 'linear-gradient(135deg,#5F26FC,#7C4DFF 55%,#3D12B0)',
        color: '#fff',
      }}>
        <div style={{ position: 'absolute', right: -40, top: -40, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.10)' }} />
        <div style={{ position: 'absolute', right: 90, top: 80, width: 90, height: 90, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
        <div style={{ position: 'relative' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', opacity: 0.9 }}>
            {eyebrow}{live.length ? <LivePill /> : null}
          </div>
          <div style={{ fontSize: 34, fontWeight: 850, letterSpacing: '-0.03em', margin: '10px 0 4px', lineHeight: 1.04 }}>{todayLabel()}</div>
          <div style={{ fontSize: 15, opacity: 0.85, fontWeight: 550, maxWidth: 520 }}>{heroSub}</div>
          <div style={{ display: 'flex', gap: 26, marginTop: 22, flexWrap: 'wrap' }}>
            {heroStats.map(([n, l]) => (
              <div key={l}>
                <div style={{ fontSize: 26, fontWeight: 850, letterSpacing: '-0.02em' }}>{n}</div>
                <div style={{ fontSize: 11.5, fontWeight: 650, opacity: 0.8, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* live featured */}
      {live.length ? (
        <div>
          <SectionTitle label="Live now" />
          <div style={{ marginBottom: 26 }}>{live.map(m => <FeaturedLive key={m.id} m={m} />)}</div>
        </div>
      ) : null}

      {/* your teams */}
      {myFavs.length ? (
        <div>
          <SectionTitle label="Your teams" />
          <div className="wc-scroll" style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8, marginBottom: 26 }}>
            {myFavs.map(id => <FavCard key={id} id={id} />)}
          </div>
        </div>
      ) : null}

      {/* today results */}
      {(todayDone.length || todayUp.length) ? (
        <div>
          <SectionTitle label="Today's matches" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 10, marginBottom: 26 }}>
            {todayDone.concat(todayUp).map(m => <MatchRow key={m.id} m={m} />)}
          </div>
        </div>
      ) : null}

      {/* upcoming */}
      <div>
        <SectionTitle label="Up next" right={
          <button type="button" onClick={() => setView('matches')} style={{ border: 'none', background: 'transparent', color: th.accent, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>All matches →</button>
        } />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 10 }}>
          {upcoming.map(m => <MatchRow key={m.id} m={m} />)}
        </div>
      </div>
    </Wrap>
  )
}
