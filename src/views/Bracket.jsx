import { useRef, useState, useEffect, useLayoutEffect } from 'react'
import { useStore } from '../store.jsx'
import { Badge } from '../components/atoms.jsx'
import { dateKey, liveClock } from '../lib/util.js'

const GAP = 46         // gap between two expanded rounds (room for the connector elbows)
const TIGHT_GAP = 12   // gap next to a collapsed round — no elbow room needed, its lines are hidden
const CELL_W = 208
const COLLAPSED_W = 18 // width of a hidden round's collapsed divider (no label/click target anymore)
const SLOT = 106       // vertical slot height for a cell in the most-populated round (tall
                       // enough for a two-legged tie card's extra leg-breakdown footer)
const EASE = 'cubic-bezier(.4,0,.2,1)'

// All knockout rounds we know how to render, in order. Only those present in the data show
// as columns — the WC uses Round of 32 (no play-offs); the Champions League uses play-offs.
const KO_ROUNDS = [
  { slug: 'round-of-32', title: 'Round of 32' },
  { slug: 'knockout-round-playoffs', title: 'Play-offs' },
  { slug: 'round-of-16', title: 'Round of 16' },
  { slug: 'quarterfinals', title: 'Quarter-finals' },
  { slug: 'semifinals', title: 'Semi-finals' },
  { slug: 'final', title: 'Final' },
]

// Saved World Cup bracket order from ESPN (espn.com/soccer/bracket/_/league/fifa.world).
// ESPN exposes each match's on-bracket position only on the (CORS-blocked) bracket page, so
// we save it here. For each round, value[k] is the bracket position (1-based) of that round's
// k-th match once the round is sorted by event id — which follows FIFA's fixed match order, so
// this layout holds for the real tournament regardless of which teams qualify. Reordering by
// it makes the columns + connectors match ESPN's bracket. Only the WC matches these counts;
// other competitions fall back to chronological order.
const WC_BRACKET_ORDER = {
  'round-of-32': [3, 9, 4, 1, 10, 11, 2, 8, 7, 12, 5, 6, 15, 14, 13, 16],
  'round-of-16': [2, 1, 5, 6, 3, 4, 8, 7],
  'quarterfinals': [1, 2, 3, 4],
  'semifinals': [1, 2],
  'final': [1],
}

function bracketSorted(slug, matches) {
  const tpl = WC_BRACKET_ORDER[slug]
  if (!tpl || matches.length !== tpl.length) return matches
  return matches.slice().sort((a, b) => Number(a.id) - Number(b.id))
    .map((m, i) => ({ m, pos: tpl[i] }))
    .sort((a, b) => a.pos - b.pos)
    .map(x => x.m)
}

// Pair up two-legged ties (same two teams, home/away swapped) within a round into one unit —
// so the bracket shows a single aggregate-score card instead of two near-identical boxes.
// Competitions without return legs (the World Cup) end up with every "tie" wrapping just its
// one match, a no-op. Only matches where BOTH teams are already decided are eligible: future
// placeholder slots ("Round of 16 3 Winner") can share the same unresolved code, and pairing
// those up would wrongly merge two unrelated undecided ties into one.
function groupTies(matches) {
  const used = new Set()
  const ties = []
  matches.forEach(m => {
    if (used.has(m.id)) return
    const partner = (m.hKnown && m.aKnown) && matches.find(m2 => m2.id !== m.id && !used.has(m2.id) &&
      m2.hKnown && m2.aKnown &&
      ((m2.h === m.h && m2.a === m.a) || (m2.h === m.a && m2.a === m.h)))
    used.add(m.id)
    if (partner) {
      used.add(partner.id)
      const [leg1, leg2] = [m, partner].sort((a, b) => dateKey(a.date) - dateKey(b.date) || Number(a.id) - Number(b.id))
      ties.push({ id: 'tie-' + leg1.id, legs: [leg1, leg2] })
    } else {
      ties.push({ id: m.id, legs: [m] })
    }
  })
  return ties
}

// A team that finished in the league-phase top 8 skips the play-off round entirely and
// goes straight to the Round of 16 — ESPN's play-off round only ever lists the other 28
// teams (9th-24th play a two-legged tie; 25th and below are out), so these direct
// qualifiers never appear as a match anywhere. We add them as standalone boxes so the
// Play-offs column shows the full picture and the Round of 16 connectors have something
// real to match against.
function topQualifiers(D) {
  if (!D.STANDINGS) return []
  return D.STANDINGS.reduce((acc, r) => {
    if (r.pos && r.pos <= 8) acc.push({ id: 'q-' + r.code, type: 'qualified', code: r.code })
    return acc
  }, [])
}

// Known team code(s) a tie/qualifier box represents — used to find which tie in the next
// round it actually feeds into.
function tieCodes(tie) {
  if (tie.type === 'qualified') return [tie.code]
  const leg = tie.legs[0]
  return [leg.hKnown ? leg.h : null, leg.aKnown ? leg.a : null].filter(Boolean)
}

// ---- single-team box for a league-phase top-8 finisher, entered directly into the Round
// of 16 without playing a play-off tie ----
function QualifiedCell({ code }) {
  const { th, t, favs, openTeam } = useStore()
  const fav = favs.includes(code)
  return (
    <button
      type="button"
      onClick={() => openTeam(code)}
      style={{
        width: CELL_W, border: '1px solid ' + (fav ? th.accent : th.bd), background: fav ? th.accentSoft : th.sf, borderRadius: 12, overflow: 'hidden',
        textAlign: 'left', font: 'inherit', cursor: 'pointer', padding: 0, flex: '0 0 auto',
      }}
    >
      <div style={{ padding: '3px 9px', background: th.sf2, borderBottom: '1px solid ' + th.bd }}>
        <span style={{ fontSize: 9.5, fontWeight: 700, color: th.faint }}>Qualified</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '5px 9px' }}>
        <Badge id={code} size={19} />
        <span style={{ flex: 1, minWidth: 0, fontSize: 12, fontWeight: fav ? 800 : 700, color: fav ? th.accent : th.tx, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {t(code) ? t(code).name : code}
        </span>
        {fav ? <span style={{ color: th.accent, fontSize: 10, flex: '0 0 auto' }}>★</span> : null}
      </div>
    </button>
  )
}

// Round header label. Purely informational — filtering is driven by the round-chips row
// above the bracket. Hidden entirely once its column collapses, so a collapsed round leaves
// just a blank slim gap rather than a rotated name.
function ColumnHead({ label, color, collapsed }) {
  return (
    <div style={{
      boxSizing: 'border-box', textAlign: 'center',
      fontSize: 12, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase',
      color, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%',
      whiteSpace: 'nowrap', overflow: 'hidden', flex: '0 0 auto', marginBottom: collapsed ? 0 : 8,
    }}>{collapsed ? '' : label}</div>
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
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '4px 9px' }}>
      {known
        ? <Badge id={code} size={19} />
        : <span style={{ width: 19, height: 19, borderRadius: '50%', border: '1.5px dashed ' + th.bd2, flex: '0 0 auto' }} />}
      <span style={{ flex: 1, minWidth: 0, fontSize: 12, fontWeight: known ? (isFav || isWinner ? 800 : 700) : 550, color: isFav ? th.accent : (known ? th.tx : th.faint), whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {known ? (t(code) ? t(code).name : code) : label}
      </span>
      {isFav ? <span style={{ color: th.accent, fontSize: 10, flex: '0 0 auto' }}>★</span> : null}
      {played ? <span style={{ fontSize: 13, fontWeight: 800, color: isWinner ? th.tx : th.sub, fontVariantNumeric: 'tabular-nums' }}>{score}</span> : null}
    </div>
  )

  return (
    <button
      type="button"
      onClick={() => clickable && openMatch(m)}
      style={{
        width: CELL_W, border: '1px solid ' + (fav ? th.accent : th.bd), background: fav ? th.accentSoft : th.sf, borderRadius: 12, overflow: 'hidden',
        textAlign: 'left', font: 'inherit', cursor: clickable ? 'pointer' : 'default', padding: 0, flex: '0 0 auto',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '3px 9px', background: th.sf2, borderBottom: '1px solid ' + th.bd }}>
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

const ddmmyyyy = (ms) => {
  if (!ms) return ''
  const d = new Date(ms)
  return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear()
}

// Each leg's own kickoff date (DD/MM/YYYY) next to its score, rather than a bare "L1"/"L2"
// label, since the two legs can be weeks apart and the date is the more useful anchor.
const legFooter = (leg, playedFlag, a, b) => ddmmyyyy(leg.kickoff) + (playedFlag ? ` ${a}-${b}` : '')

// ---- two-legged tie, shown as one card with the aggregate score instead of two boxes ----
function LiveTieCell({ tie }) {
  const { th, t, favs, mScore, openMatchPair } = useStore()
  const [leg1, leg2] = tie.legs
  const teamA = leg1.h, teamB = leg1.a
  const knownA = leg1.hKnown, knownB = leg1.aKnown
  const s1 = mScore(leg1), s2 = mScore(leg2)
  const leg2AisHome = leg2.h === teamA
  const leg1A = s1.hs, leg1B = s1.as
  const leg2A = leg2AisHome ? s2.hs : s2.as
  const leg2B = leg2AisHome ? s2.as : s2.hs
  const leg1Played = leg1A != null, leg2Played = leg2A != null
  const bothPlayed = leg1Played && leg2Played
  const aggA = (leg1Played ? leg1A : 0) + (leg2Played ? leg2A : 0)
  const aggB = (leg1Played ? leg1B : 0) + (leg2Played ? leg2B : 0)
  const anyLive = leg1.status === 'LIVE' || leg2.status === 'LIVE'
  const favA = knownA && favs.includes(teamA), favB = knownB && favs.includes(teamB)
  const fav = favA || favB
  const clickable = leg1Played || leg2Played || anyLive || (knownA && knownB)

  const row = (code, known, label, isFav, agg, legScore, isWinner) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '4px 9px' }}>
      {known
        ? <Badge id={code} size={19} />
        : <span style={{ width: 19, height: 19, borderRadius: '50%', border: '1.5px dashed ' + th.bd2, flex: '0 0 auto' }} />}
      <span style={{ flex: 1, minWidth: 0, fontSize: 12, fontWeight: known ? (isFav || isWinner ? 800 : 700) : 550, color: isFav ? th.accent : (known ? th.tx : th.faint), whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {known ? (t(code) ? t(code).name : code) : label}
      </span>
      {isFav ? <span style={{ color: th.accent, fontSize: 10, flex: '0 0 auto' }}>★</span> : null}
      {bothPlayed
        ? <span style={{ fontSize: 13, fontWeight: 800, color: isWinner ? th.tx : th.sub, fontVariantNumeric: 'tabular-nums' }}>{agg}</span>
        : leg1Played ? <span style={{ fontSize: 11, fontWeight: 700, color: th.faint, fontVariantNumeric: 'tabular-nums' }}>{legScore}</span> : null}
    </div>
  )

  const footer = `${legFooter(leg1, leg1Played, leg1A, leg1B)} · ${legFooter(leg2, leg2Played, leg2A, leg2B)}`

  return (
    <button
      type="button"
      onClick={() => clickable && openMatchPair(leg1, leg2)}
      style={{
        width: CELL_W, border: '1px solid ' + (fav ? th.accent : th.bd), background: fav ? th.accentSoft : th.sf, borderRadius: 12, overflow: 'hidden',
        textAlign: 'left', font: 'inherit', cursor: clickable ? 'pointer' : 'default', padding: 0, flex: '0 0 auto',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '3px 9px', background: th.sf2, borderBottom: '1px solid ' + th.bd }}>
        <span style={{ fontSize: 9.5, fontWeight: 700, color: th.faint }}>{bothPlayed ? 'Aggregate' : '2-leg tie'}</span>
        {anyLive
          ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 9.5, fontWeight: 800, color: th.live, flex: '0 0 auto' }}><span style={{ width: 5, height: 5, borderRadius: '50%', background: th.live, animation: 'wcPulse 1s infinite' }} />Live</span>
          : <span style={{ fontSize: 9.5, fontWeight: 700, color: th.faint, flex: '0 0 auto' }}>{bothPlayed ? 'FT' : ''}</span>}
      </div>
      {row(teamA, knownA, leg1.hName, favA, aggA, leg1Played ? leg1A + '-' + leg1B : '', bothPlayed && aggA > aggB)}
      <div style={{ height: 1, background: th.bd }} />
      {row(teamB, knownB, leg1.aName, favB, aggB, leg1Played ? leg1B + '-' + leg1A : '', bothPlayed && aggB > aggA)}
      <div style={{ fontSize: 9, color: th.faint, textAlign: 'center', padding: '3px 6px 5px', borderTop: '1px solid ' + th.bd, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{footer}</div>
    </button>
  )
}

// Reorder every column so a tie sits next to its sibling feeder and the pair converges
// under the round that follows — the same visual the World Cup gets for free from its known
// bracket-position template, derived here purely from the identity-matched `connections`.
// A recursive leaf-order tree layout: walk back from the Final, giving each true leaf (a
// column-0 tie with no feeder of its own) the next sequential slot, and each parent tie the
// midpoint of its two children's slots. Because a parent is only visited after both its
// children are fully placed, true siblings always land on two consecutive leaf slots — which
// is exactly what the existing uniform-slot-height rendering needs to centre a tie above the
// midpoint of the two feeders below it.
function reorderForConvergence(columns, connections) {
  const childrenOf = {}
  connections.forEach(([[fc, fi], [tc, ti]]) => {
    const key = tc + '|' + ti
    ;(childrenOf[key] = childrenOf[key] || []).push([fc, fi])
  })
  const orderVal = columns.map(c => new Array(c.matches.length).fill(null))
  const visited = new Set()
  let nextLeaf = 0
  function place(col, idx) {
    const key = col + '|' + idx
    if (visited.has(key)) return orderVal[col][idx]
    visited.add(key)
    const kids = childrenOf[key]
    if (!kids || !kids.length) { orderVal[col][idx] = nextLeaf++; return orderVal[col][idx] }
    const vals = kids.map(([c2, i2]) => place(c2, i2))
    orderVal[col][idx] = vals.reduce((a, b) => a + b, 0) / vals.length
    return orderVal[col][idx]
  }
  // Walk columns right-to-left so the Final (and anything else with no further round) seeds
  // the recursion; any tie the DFS never reaches (e.g. a still-undecided placeholder) falls
  // through to the per-column loop and just gets its own trailing slot instead of crashing.
  for (let c = columns.length - 1; c >= 0; c--) columns[c].matches.forEach((_, i) => place(c, i))

  const remap = columns.map((col, c) => {
    const withOrder = col.matches.map((m, i) => ({ m, i, v: orderVal[c][i] }))
    withOrder.sort((a, b) => a.v - b.v)
    const map = new Map()
    withOrder.forEach((entry, newIdx) => map.set(entry.i, newIdx))
    col.matches = withOrder.map(e => e.m)
    return map
  })
  connections.forEach(pair => {
    pair[0][1] = remap[pair[0][0]].get(pair[0][1])
    pair[1][1] = remap[pair[1][0]].get(pair[1][1])
  })
}

// Split a rounds array (title+matches, matches already known to be in the correct
// converging order) into a two-sided bracket meeting at the Final in the centre — half of
// each round's array is one Final-finalist's side, the other half is the other's.
function buildMirrored(roundDefs) {
  const columns = [], connections = []
  const last = roundDefs.length - 1
  const tag = {}
  roundDefs.slice(0, last).forEach((r, ri) => { tag['L' + ri] = columns.length; columns.push({ title: r.title, accent: false, roundIdx: ri, matches: r.matches.slice(0, r.matches.length / 2) }) })
  tag.F = columns.length; columns.push({ title: roundDefs[last].title, accent: true, roundIdx: last, matches: roundDefs[last].matches })
  for (let ri = last - 1; ri >= 0; ri--) { tag['R' + ri] = columns.length; columns.push({ title: roundDefs[ri].title, accent: false, roundIdx: ri, matches: roundDefs[ri].matches.slice(roundDefs[ri].matches.length / 2) }) }
  ;['L', 'R'].forEach(side => {
    for (let ri = 0; ri < last; ri++) {
      const fi = tag[side + ri], ti = ri === last - 1 ? tag.F : tag[side + (ri + 1)]
      columns[fi].matches.forEach((m, j) => connections.push([[fi, j], [ti, Math.floor(j / 2)]]))
    }
  })
  return { columns, connections }
}

// Lay the rounds out into columns + the connections between cells. Every column carries
// `roundIdx` — its position in `rounds` (0 = earliest) — so the round filter can hide both
// mirrored copies of an early round symmetrically.
function buildLayout(rounds, byRound) {
  const roundMatches = rounds.map(r => byRound[r.slug] || [])
  const counts = roundMatches.map(a => a.length)
  // A clean single-elimination shape: every round is exactly half the size of the one before
  // it, down to a lone Final. Both the World Cup and the (post-play-off) Champions League
  // fit this once direct qualifiers pad the Play-offs round out to match — see topQualifiers.
  const isBinaryTree = counts.length >= 3 && counts[counts.length - 1] === 1 &&
    counts.slice(0, -1).every((c, i) => c === 2 * counts[i + 1])

  if (isBinaryTree && rounds[0].slug === 'round-of-32') {
    // World Cup: ESPN's own known bracket-position template (applied via bracketSorted)
    // already puts every round in the correct left/right, pair-adjacent order.
    return buildMirrored(rounds.map((r, ri) => ({ title: r.title, matches: roundMatches[ri] })))
  }

  // Any other competition (e.g. the two-legged Champions League): we have no known seeding
  // template, so derive the true bracket order ourselves from team identity — connect each
  // tie to whichever next-round tie contains one of its known teams (an eliminated team never
  // reappears, so this is unambiguous) — then run the same recursive tree layout the World
  // Cup gets for free from its template, so ties converge toward their target instead of
  // sitting in arbitrary chronological (first-leg date) order.
  const flat = rounds.map((r, ri) => ({ title: r.title, matches: roundMatches[ri] }))
  const flatConns = []
  for (let r = 0; r < flat.length - 1; r++) {
    const cur = flat[r].matches, next = flat[r + 1].matches
    // Build the code → next-round-index lookup once per round transition instead of
    // scanning `next` from scratch for every tie in `cur`.
    const nextIdxByCode = new Map()
    next.forEach((t2, j) => { const l2 = t2.legs[0]; if (l2.h) nextIdxByCode.set(l2.h, j); if (l2.a) nextIdxByCode.set(l2.a, j) })
    cur.forEach((tie, i) => {
      const codes = tieCodes(tie)
      if (!codes.length) return
      const j = codes.map(c => nextIdxByCode.get(c)).find(v => v != null)
      if (j != null) flatConns.push([[r, i], [r + 1, j]])
    })
  }
  reorderForConvergence(flat, flatConns)

  // A clean single-elimination shape mirrors into two sides meeting at the Final, just like
  // the World Cup — reorderForConvergence has already grouped each half of every round's
  // array into one whole Final-finalist's subtree, so a plain positional half-split lands on
  // the correct side.
  if (isBinaryTree) return buildMirrored(flat)

  // Not a clean power-of-two shape yet (e.g. some later rounds still fully undecided) — stay
  // a single left-to-right flow, but still benefit from the reordering above.
  const columns = flat.map((r, ri) => ({ title: r.title, accent: ri === flat.length - 1, roundIdx: ri, matches: r.matches }))
  return { columns, connections: flatConns }
}

export function Bracket() {
  const { th, D } = useStore()

  // Group knockout fixtures by round, order each round to match ESPN's bracket layout
  // (falling back to chronological order where we have no saved template), then pair up
  // two-legged ties so each round's "matches" are really one card per tie.
  const byRound = {}
  D.MATCHES.forEach(m => { if (m.round && m.round !== 'group-stage') (byRound[m.round] = byRound[m.round] || []).push(m) })
  Object.keys(byRound).forEach(slug => {
    byRound[slug].sort((a, b) => dateKey(a.date) - dateKey(b.date) || String(a.id).localeCompare(String(b.id)))
    byRound[slug] = groupTies(bracketSorted(slug, byRound[slug]))
  })
  // League-phase top-8 finishers skip the play-off round — surface them there as
  // standalone "Qualified" boxes so the round shows every team feeding the Round of 16.
  if (byRound['knockout-round-playoffs']) {
    byRound['knockout-round-playoffs'] = topQualifiers(D).concat(byRound['knockout-round-playoffs'])
  }
  const rounds = KO_ROUNDS.filter(r => byRound[r.slug] && byRound[r.slug].length)

  const { columns, connections } = buildLayout(rounds, byRound)

  // Round filter: collapses every column earlier than the selected round into a slim tab
  // (on both sides of a two-sided bracket, since a mirrored pair shares the same roundIdx).
  // filterIdx=0 leaves everything expanded; picking a later round narrows in toward the Final.
  // Columns stay mounted (never removed) so their headers remain visible + clickable while
  // collapsed, and so the width/opacity change can transition smoothly instead of just cutting.
  const [filterIdx, setFilterIdx] = useState(0)
  const wrapRef = useRef(null)
  // Reset the filter — and, in the same pass, the horizontal scroll — right where the
  // competition change actually happens, instead of a second effect that only fires because
  // this one just changed filterIdx: chaining them adds an extra commit for no benefit.
  useEffect(() => {
    setFilterIdx(0)
    if (wrapRef.current) wrapRef.current.scrollLeft = 0
  }, [D.slug])

  // Every column reserves the same height regardless of the filter, sized off the fullest
  // round, so collapsing/expanding only animates width — never a vertical jump.
  const maxCells = Math.max(1, ...columns.map(c => c.matches.length))

  // Measure rendered cell positions and draw elbow connectors (works whichever direction the
  // feeder sits relative to its target, so two-sided brackets converge at the centre). The
  // inner track is observed (not the outer scroll clip) so a live-resizing column — mid
  // collapse/expand transition — keeps the lines sliding in step with it.
  const trackRef = useRef(null)
  const cellRefs = useRef([])
  cellRefs.current = columns.map(() => [])
  const [conns, setConns] = useState({ w: 0, h: 0, lines: [], center: false })

  useLayoutEffect(() => {
    const wrap = wrapRef.current, track = trackRef.current
    if (!wrap || !track) return
    const compute = () => {
      const wr = wrap.getBoundingClientRect()
      const box = el => { const r = el.getBoundingClientRect(); return { x: r.left - wr.left + wrap.scrollLeft, y: r.top - wr.top + wrap.scrollTop, w: r.width, h: r.height } }
      const lines = []
      connections.forEach(([[fc, fi], [tc, ti]]) => {
        const fe = cellRefs.current[fc] && cellRefs.current[fc][fi]
        const te = cellRefs.current[tc] && cellRefs.current[tc][ti]
        if (!fe || !te) return
        const hidden = columns[fc].roundIdx < filterIdx || columns[tc].roundIdx < filterIdx
        const a = box(fe), b = box(te)
        const ltr = a.x < b.x
        const ax = ltr ? a.x + a.w : a.x, bx = ltr ? b.x : b.x + b.w
        const ay = a.y + a.h / 2, by = b.y + b.h / 2
        // A smooth S-curve, bulging out from each end by however far apart the two rows
        // sit vertically (capped so it doesn't get silly) rather than a fixed midpoint. A
        // narrow column gap gives a fixed-midpoint curve barely any room to bend, so once
        // the vertical distance is large it degenerates back into the old sharp elbow and
        // every long connector collapses onto the same near-vertical line. Letting the
        // control points reach further out — beyond the gap, behind the neighbouring
        // column's cards if needed, since this overlay sits at z-index 0 — keeps each
        // curve's own shape distinct even when many connectors run in parallel.
        const bulge = Math.min(Math.max(Math.abs(bx - ax) / 2, Math.abs(by - ay) * 0.3), 260)
        const c1x = ltr ? ax + bulge : ax - bulge
        const c2x = ltr ? bx - bulge : bx + bulge
        lines.push({ d: `M${ax.toFixed(1)},${ay.toFixed(1)} C${c1x.toFixed(1)},${ay.toFixed(1)} ${c2x.toFixed(1)},${by.toFixed(1)} ${bx.toFixed(1)},${by.toFixed(1)}`, hidden })
      })
      // Measured off `track` (not `wrap.scrollWidth`): the SVG overlay is itself sized from
      // this same state, so reading the wrap's scrollWidth would include the SVG's own
      // previous (possibly larger) box and could never shrink back down once inflated.
      // Once the round filter collapses enough columns that what's left no longer fills the
      // viewport, centre it instead of leaving it stranded against the left edge — but only
      // when it actually fits, since centring a still-overflowing track would clip its start
      // (the wrap can't scroll to a negative offset to reach it).
      const center = track.scrollWidth <= wr.width
      setConns({ w: track.scrollWidth, h: track.scrollHeight, lines, center })
    }
    compute()
    const ro = new ResizeObserver(compute) // fires repeatedly while the track's CSS transition is running
    ro.observe(track)
    ro.observe(wrap)
    return () => ro.disconnect()
    // eslint-disable-next-line react-doctor/exhaustive-deps -- columns/connections are cheap
    // proxies (length/filterIdx/slug) deliberately used instead so this doesn't re-run (and
    // re-measure) on every render just because buildLayout returns new array references
  }, [D.slug, D.MATCHES.length, filterIdx, columns.length])

  return (
    // full-bleed (not the 1120px page container) so the whole bracket fits on wide screens
    <div style={{ padding: '26px 22px 90px', animation: 'wcFade .25s ease' }}>
      <div style={{ marginBottom: 18, fontSize: 13, color: th.sub, fontWeight: 550 }}>
        Knockout fixtures from the live schedule — kickoff times included. Pick a round to focus on it.
      </div>
      {rounds.length > 1 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginBottom: 18 }}>
          {rounds.map((r, ri) => {
            const on = filterIdx === ri
            return (
              <button key={r.slug} type="button" onClick={() => { setFilterIdx(ri); if (wrapRef.current) wrapRef.current.scrollLeft = 0 }} style={{
                border: '1px solid ' + (on ? th.accent : th.bd), background: on ? th.accent : th.sf, color: on ? '#fff' : th.sub,
                cursor: 'pointer', font: 'inherit', fontSize: 13, fontWeight: 700, padding: '7px 13px', borderRadius: 9999, whiteSpace: 'nowrap',
                transition: 'background .15s ease, color .15s ease, border-color .15s ease',
              }}>{r.title}</button>
            )
          })}
        </div>
      )}
      {columns.length ? (
        <div className="wc-scroll" ref={wrapRef} style={{ overflowX: 'auto', position: 'relative', paddingBottom: 18, display: 'flex', justifyContent: conns.center ? 'center' : 'flex-start' }}>
          <svg width={conns.w} height={conns.h} style={{ position: 'absolute', top: 0, left: 0, zIndex: 0, pointerEvents: 'none', overflow: 'visible' }}>
            {conns.lines.map((l, i) => <path key={i} d={l.d} fill="none" stroke={th.bd2} strokeWidth={1.5} style={{ opacity: l.hidden ? 0 : 1, transition: 'opacity .2s ease' }} />)}
          </svg>
          <div ref={trackRef} style={{ display: 'flex', alignItems: 'stretch', position: 'relative', zIndex: 1, width: 'max-content' }}>
            {columns.map((col, ci) => {
              const collapsed = col.roundIdx < filterIdx
              // Tighten the gap whenever either neighbour is collapsed — a hidden round's
              // connector lines are invisible anyway, so no elbow room is needed there. This
              // is what actually shifts the visible/expanded rounds to the left as rounds hide.
              const nextCollapsed = ci < columns.length - 1 && columns[ci + 1].roundIdx < filterIdx
              const marginRight = ci === columns.length - 1 ? 0 : ((collapsed || nextCollapsed) ? TIGHT_GAP : GAP)
              return (
                <div key={ci} style={{
                  display: 'flex', flexDirection: 'column', flex: '0 0 auto', alignSelf: 'stretch',
                  width: collapsed ? COLLAPSED_W : CELL_W, marginRight, overflow: 'hidden',
                  transition: `width .32s ${EASE}, margin-right .32s ${EASE}`,
                }}>
                  <ColumnHead label={col.title} color={col.accent ? th.accent : th.tx} collapsed={collapsed} />
                  <div style={{ flex: collapsed ? 0 : 1, display: 'flex', flexDirection: 'column', opacity: collapsed ? 0 : 1, transition: `opacity .22s ${EASE}`, pointerEvents: collapsed ? 'none' : 'auto' }}>
                    {col.matches.map((tie, mi) => (
                      <div key={tie.id} style={{ height: (SLOT * maxCells) / col.matches.length, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div ref={el => { const bucket = cellRefs.current[ci]; if (bucket) bucket[mi] = el }}>
                          {tie.type === 'qualified' ? <QualifiedCell code={tie.code} /> : tie.legs.length === 2 ? <LiveTieCell tie={tie} /> : <LiveKoCell m={tie.legs[0]} />}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <div style={{ padding: '30px 0', color: th.faint, fontWeight: 600 }}>Knockout fixtures will appear once they’re scheduled.</div>
      )}
    </div>
  )
}
