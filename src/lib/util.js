// Small pure helpers shared across the app.

// Choose a readable text color (#10101A or #FFFFFF) for a given hex background.
export function txtOn(hex) {
  const c = hex.replace('#', '')
  if (c.length < 6) return '#fff'
  const r = parseInt(c.slice(0, 2), 16), g = parseInt(c.slice(2, 4), 16), b = parseInt(c.slice(4, 6), 16)
  return (0.299 * r + 0.587 * g + 0.114 * b) > 165 ? '#10101A' : '#FFFFFF'
}

// Display label for a live match clock. Prefers ESPN's ready-made string (e.g. "45'+4'",
// "90'+3'", "HT"); falls back to the parsed numeric minute. Returns '' when unknown.
export function liveClock(o) {
  if (!o) return ''
  if (o.clock) return o.clock
  return o.minute != null ? o.minute + "'" : ''
}

const DW = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const MO = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

export function todayLabel(now = new Date()) {
  return DW[now.getDay()] + ', ' + MO[now.getMonth()] + ' ' + now.getDate()
}

const MON_ABBR_IDX = new Map(['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((m, i) => [m, i]))

// Lay players out into pitch rows from a formation string (e.g. "4-3-3").
// players is an ordered array of { n, name }; row 0 is the keeper.
export function formationRows(formation, players) {
  const sizes = [1].concat(String(formation || '4-3-3').split('-').map(Number).filter(n => n > 0))
  const rows = []; let idx = 0
  sizes.forEach(n => {
    const row = []
    for (let i = 0; i < n; i++) { row.push(players[idx] || { n: '', name: '' }); idx++ }
    rows.push(row)
  })
  return rows
}

// Turn a match date into a chronologically sortable number. Tolerates an optional
// weekday prefix, e.g. both "Jun 27" and "Mon Jun 27". Unknown/"TBD" dates sort last (-1).
export function dateKey(d) {
  if (!d || typeof d !== 'string') return -1
  const parts = d.trim().split(/\s+/)
  for (let i = 0; i < parts.length - 1; i++) {
    const mi = MON_ABBR_IDX.get(parts[i])
    if (mi != null) return mi * 100 + (parseInt(parts[i + 1], 10) || 0)
  }
  return -1
}
