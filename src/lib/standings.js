// Group standings and the third-place race are ALWAYS computed at runtime from the
// match list — never hardcoded. `score(m)` resolves a match to its current score
// (handling LIVE matches in both sample and live modes).

export function standings(D, g, score) {
  const ids = D.GROUPS[g] || []
  const tab = {}
  ids.forEach(id => { tab[id] = { id, P: 0, W: 0, D: 0, L: 0, GF: 0, GA: 0, Pts: 0 } })
  let finished = 0, total = 0
  D.MATCHES.forEach(m => {
    if (m.g !== g) return
    total++
    const s = score(m)
    let hs = s.hs, as = s.as
    if (hs == null) return
    finished++
    const H = tab[m.h], A = tab[m.a]
    if (!H || !A) return
    H.P++; A.P++; H.GF += hs; H.GA += as; A.GF += as; A.GA += hs
    if (hs > as) { H.W++; A.L++; H.Pts += 3 }
    else if (hs < as) { A.W++; H.L++; A.Pts += 3 }
    else { H.D++; A.D++; H.Pts++; A.Pts++ }
  })
  const arr = Object.values(tab).map(r => Object.assign(r, { GD: r.GF - r.GA }))
  arr.sort((a, b) => b.Pts - a.Pts || b.GD - a.GD || b.GF - a.GF || a.id.localeCompare(b.id))
  arr.forEach((r, i) => { r.rank = i + 1 })
  return { rows: arr, done: finished >= 6, anyLive: D.MATCHES.some(m => m.g === g && m.status === 'LIVE') }
}

export function thirdRace(D, score) {
  const out = []
  'ABCDEFGHIJKL'.split('').forEach(g => {
    const s = standings(D, g, score)
    const r = s.rows[2]
    if (r) out.push(Object.assign({ g, done: s.done }, r))
  })
  out.sort((a, b) => b.Pts - a.Pts || b.GD - a.GD || b.GF - a.GF)
  out.forEach((r, i) => { r.q = i < 8 })
  return out
}
