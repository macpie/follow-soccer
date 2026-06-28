import { useStore } from '../store.jsx'
import { Wrap, SectionTitle, Pill, Badge } from '../components/atoms.jsx'
import { dateKey, liveClock } from '../lib/util.js'

const KO_ROUNDS = [
  { slug: 'round-of-32', title: 'Round of 32' },
  { slug: 'round-of-16', title: 'Round of 16' },
  { slug: 'quarterfinals', title: 'Quarter-finals' },
  { slug: 'semifinals', title: 'Semi-finals' },
  { slug: 'final', title: 'Final' },
]

function ColumnHead({ label, color }) {
  return (
    <div style={{ textAlign: 'center', fontSize: 12, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color, marginBottom: 4 }}>{label}</div>
  )
}

function Column({ title, color, children }) {
  // The title stays pinned at the top; the cells fill the remaining height and spread
  // evenly (space-around), so each round centers against the round that feeds it.
  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: '0 0 auto', alignSelf: 'stretch' }}>
      <ColumnHead label={title} color={color} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-around', gap: 10 }}>
        {children}
      </div>
    </div>
  )
}

// ---- live bracket cell, built from a real ESPN knockout match ----
function LiveKoCell({ m }) {
  const { th, t, favs, mScore, openMatch } = useStore()
  const s = mScore(m)
  const played = s.hs != null
  const isLive = m.status === 'LIVE'
  const clickable = played || isLive || (m.hKnown && m.aKnown) // decided matchups open a preview
  const favH = m.hKnown && favs.includes(m.h), favA = m.aKnown && favs.includes(m.a)
  const fav = favH || favA

  const slot = (code, known, label, score, isWinner, isFav) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px' }}>
      {known
        ? <Badge id={code} size={22} />
        : <span style={{ width: 22, height: 22, borderRadius: '50%', border: '1.5px dashed ' + th.bd2, flex: '0 0 auto' }} />}
      <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, fontWeight: known ? (isFav || isWinner ? 800 : 700) : 550, color: isFav ? th.accent : (known ? th.tx : th.faint), whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {known ? (t(code) ? t(code).name : code) : label}
      </span>
      {isFav ? <span style={{ color: th.accent, fontSize: 10, flex: '0 0 auto' }}>★</span> : null}
      {played ? <span style={{ fontSize: 13, fontWeight: 800, color: isWinner ? th.tx : th.sub, fontVariantNumeric: 'tabular-nums' }}>{score}</span> : null}
    </div>
  )

  return (
    <button
      onClick={() => clickable && openMatch(m)}
      style={{
        width: 208, flex: '0 0 auto', border: '1px solid ' + (fav ? th.accent : th.bd), background: fav ? th.accentSoft : th.sf, borderRadius: 12, overflow: 'hidden',
        textAlign: 'left', font: 'inherit', cursor: clickable ? 'pointer' : 'default', padding: 0,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 10px', background: th.sf2, borderBottom: '1px solid ' + th.bd }}>
        <span style={{ fontSize: 9.5, fontWeight: 700, color: th.faint, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.date + ' · ' + m.time}</span>
        {isLive
          ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 9.5, fontWeight: 800, color: th.live, flex: '0 0 auto' }}><span style={{ width: 5, height: 5, borderRadius: '50%', background: th.live, animation: 'wcPulse 1s infinite' }} />{liveClock(s)}</span>
          : <span style={{ fontSize: 9.5, fontWeight: 700, color: th.faint, flex: '0 0 auto' }}>{played ? 'FT' : ''}</span>}
      </div>
      {slot(m.h, m.hKnown, m.hName, s.hs, played && s.hs > s.as, favH)}
      <div style={{ height: 1, background: th.bd }} />
      {slot(m.a, m.aKnown, m.aName, s.as, played && s.as > s.hs, favA)}
    </button>
  )
}

export function Bracket() {
  const { th, t, D, thirdRace } = useStore()

  // Build columns from the live knockout fixtures.
  const byRound = {}
  D.MATCHES.forEach(m => { if (m.round && m.round !== 'group-stage') (byRound[m.round] = byRound[m.round] || []).push(m) })
  Object.values(byRound).forEach(list => list.sort((a, b) => dateKey(a.date) - dateKey(b.date) || String(a.id).localeCompare(String(b.id))))
  const hasKO = KO_ROUNDS.some(r => byRound[r.slug] && byRound[r.slug].length)

  const third = thirdRace()

  return (
    <Wrap>
      <div style={{ marginBottom: 18, fontSize: 13, color: th.sub, fontWeight: 550 }}>
        Knockout fixtures from the live schedule — kickoff times included. Decided matchups show teams and scores; undecided slots fill in as the group stage finishes. Scroll →
      </div>
      {hasKO ? (
        <div className="wc-scroll" style={{ display: 'flex', gap: 30, overflowX: 'auto', paddingBottom: 18, alignItems: 'stretch' }}>
          {KO_ROUNDS.map((r, i) => (
            <Column key={r.slug} title={r.title} color={i === KO_ROUNDS.length - 1 ? th.accent : th.tx}>
              {(byRound[r.slug] || []).map(m => <LiveKoCell key={m.id} m={m} />)}
            </Column>
          ))}
        </div>
      ) : (
        <div style={{ padding: '30px 0', color: th.faint, fontWeight: 600 }}>Knockout fixtures will appear once they’re scheduled.</div>
      )}

      {/* third place race */}
      <div style={{ marginTop: 30 }}>
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
      </div>
    </Wrap>
  )
}
