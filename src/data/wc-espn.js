/* wc-espn.js — live data adapter for ESPN's public (undocumented) soccer API.
   Competition path: soccer/fifa.world. No API key and no CORS proxy required — both
   `site.api.espn.com` and `sports.core.api.espn.com` send `Access-Control-Allow-Origin: *`,
   so the browser calls them directly.

   This is the app's single source of truth. It normalizes ESPN's shape into the internal
   dataset every view consumes, and provides what the football-data.org free tier could not:
   real per-match goal events (with assists), lineups, and match statistics.

   Caveat: this is an unofficial API and can change without notice. If a request fails the
   app shows a loading/error state (there is no bundled fallback data).

   Exposes: load(), refreshLive(matches), detail(matchId). */

const HOST = 'USA · Canada · Mexico'

const SITE = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world'
const SITE_V2 = 'https://site.api.espn.com/apis/v2/sports/soccer/fifa.world'
const CORE = 'https://sports.core.api.espn.com/v2/sports/soccer/leagues/fifa.world'
const SEASON = 2026
const SCHEDULE_RANGE = '20260611-20260719' // full tournament window

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const fmtDate = d => (!d || isNaN(d)) ? null : MON[d.getMonth()] + ' ' + d.getDate()
const fmtTime = d => { if (!d || isNaN(d)) return null; let h = d.getHours(), m = d.getMinutes(), ap = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12; return h + ':' + String(m).padStart(2, '0') + ' ' + ap }
const mapState = s => s === 'in' ? 'LIVE' : s === 'post' ? 'FT' : 'UP'
const ROUND_LABEL = { 'round-of-32': 'Round of 32', 'round-of-16': 'Round of 16', quarterfinals: 'Quarter-final', semifinals: 'Semi-final', '3rd-place-match': 'Third place', final: 'Final' }
const hex = (c, fallback) => !c ? fallback : (String(c)[0] === '#' ? c : '#' + c)
const code3 = t => String((t && t.abbreviation) || '').toUpperCase()
const minuteOf = ev => { const dc = ev && ev.status && (ev.status.displayClock || (ev.status.type && ev.status.type.shortDetail)); const n = parseInt(String(dc || '').replace(/[^0-9]/g, ''), 10); return Number.isFinite(n) ? n : null }

async function getJSON(url) {
  const ctl = new AbortController()
  const to = setTimeout(() => ctl.abort(), 14000)
  let res
  try {
    res = await fetch(url.replace(/^http:/, 'https:'), { signal: ctl.signal, headers: { Accept: 'application/json' } })
  } catch (e) {
    clearTimeout(to)
    throw new Error((e && e.name === 'AbortError') ? 'ESPN request timed out.' : 'Could not reach ESPN.')
  }
  clearTimeout(to)
  if (!res.ok) { const er = new Error('ESPN returned HTTP ' + res.status + '.'); er.kind = 'http'; throw er }
  return res.json()
}

function competitors(c) {
  const comps = (c && c.competitors) || []
  const home = comps.find(x => x.homeAway === 'home') || comps[0] || {}
  const away = comps.find(x => x.homeAway === 'away') || comps[1] || {}
  return { home, away }
}

function mapMatch(ev, codeToGroup, idToCode, TEAMS, CRESTS) {
  const c = (ev.competitions && ev.competitions[0]) || {}
  const { home, away } = competitors(c)
  const reg = (comp) => {
    const t = comp.team || {}
    const code = code3(t)
    if (!code) return code
    if (t.id != null) idToCode[t.id] = code
    if (!TEAMS[code]) {
      TEAMS[code] = { name: t.shortDisplayName || t.displayName || code, code, g: codeToGroup[code] || '?', c: hex(t.color, '#5F26FC'), c2: hex(t.alternateColor, '#111111') }
    } else {
      // enrich a standings-only stub with real colors/group
      if (t.color) TEAMS[code].c = hex(t.color, TEAMS[code].c)
      if (t.alternateColor) TEAMS[code].c2 = hex(t.alternateColor, TEAMS[code].c2)
      if (codeToGroup[code]) TEAMS[code].g = codeToGroup[code]
    }
    if (t.logo) CRESTS[code] = t.logo
    return code
  }
  const h = reg(home), a = reg(away)
  const state = ev.status && ev.status.type && ev.status.type.state
  const status = mapState(state)
  const when = ev.date ? new Date(ev.date) : null
  const grp = codeToGroup[h] || codeToGroup[a] || '?'
  const venue = c.venue || {}
  const v = [venue.fullName, venue.address && venue.address.city].filter(Boolean).join(' · ')
  const score = (comp) => (state === 'pre' || comp.score == null || comp.score === '') ? null : Number(comp.score)
  const round = (ev.season && ev.season.slug) || null
  const stage = grp !== '?' ? null : (ROUND_LABEL[round] || 'Knockout')
  // a side is "known" (a real qualified team) when its code maps to a group; otherwise it's
  // a placeholder slot (e.g. "Group L Winner", "Third Place Group C/E/F/H/I").
  const nameOf = (comp) => (comp.team && (comp.team.displayName || comp.team.shortDisplayName)) || ''
  return {
    id: String(ev.id), g: grp, md: null, h, a,
    hName: nameOf(home), aName: nameOf(away),
    hKnown: !!codeToGroup[h], aKnown: !!codeToGroup[a],
    hs: score(home), as: score(away),
    status,
    date: (when && fmtDate(when)) || 'TBD',
    time: (when && fmtTime(when)) || 'TBD',
    minute: status === 'LIVE' ? minuteOf(ev) : null,
    kickoff: when ? when.getTime() : null, // epoch ms, for match-start alerts
    v, round, stage, _api: true,
  }
}

async function loadScorers(idToCode) {
  const lj = await getJSON(CORE + '/seasons/' + SEASON + '/types/1/leaders')
  const cat = (lj.categories || []).find(c => c.name === 'goalsLeaders')
  if (!cat || !cat.leaders) return []
  const top = cat.leaders.slice(0, 20)
  const rows = await Promise.all(top.map(async (ld) => {
    let name = 'Unknown'
    try { if (ld.athlete && ld.athlete.$ref) { const aj = await getJSON(ld.athlete.$ref); name = aj.displayName || aj.fullName || name } } catch (e) {}
    let code = 'UNK'
    const ref = ld.team && ld.team.$ref
    if (ref) { const id = ref.split('/teams/')[1]; const tid = id ? id.split('?')[0].replace(/\/$/, '') : null; if (tid && idToCode[tid]) code = idToCode[tid] }
    const goals = Number(ld.value) || 0
    const am = /A:\s*(\d+)/.exec(ld.shortDisplayValue || '')
    const assists = am ? Number(am[1]) : 0
    return { name, team: code, goals, assists, pens: 0, mins: 0 }
  }))
  return rows.filter(p => p.goals > 0 && p.team !== 'UNK').sort((a, b) => b.goals - a.goals || b.assists - a.assists)
}

export async function load() {
  const [sb, st] = await Promise.all([
    getJSON(SITE + '/scoreboard?dates=' + SCHEDULE_RANGE + '&limit=400'),
    getJSON(SITE_V2 + '/standings').catch(() => null),
  ])

  const codeToGroup = {}, idToCode = {}, GROUPS = {}, TEAMS = {}, CRESTS = {}

  // groups + memberships from the standings tree
  const children = (st && st.children) || []
  children.forEach(ch => {
    const letter = String(ch.abbreviation || ch.name || '').replace(/group/i, '').trim().toUpperCase().slice(0, 2)
    const entries = (ch.standings && ch.standings.entries) || []
    entries.forEach(e => {
      const t = e.team || {}
      const code = code3(t)
      if (!code) return
      codeToGroup[code] = letter
      if (t.id != null) idToCode[t.id] = code
      GROUPS[letter] = GROUPS[letter] || []
      if (!GROUPS[letter].includes(code)) GROUPS[letter].push(code)
      if (!TEAMS[code]) TEAMS[code] = { name: t.displayName || code, code, g: letter, c: '#5F26FC', c2: '#111111' }
    })
  })

  const MATCHES = (sb.events || []).map(ev => mapMatch(ev, codeToGroup, idToCode, TEAMS, CRESTS))

  // derive GROUPS from matches if standings was unavailable
  if (!Object.keys(GROUPS).length) {
    MATCHES.forEach(m => { if (m.g && m.g !== '?') { GROUPS[m.g] = GROUPS[m.g] || []; [m.h, m.a].forEach(code => { if (!GROUPS[m.g].includes(code)) GROUPS[m.g].push(code) }) } })
  }

  let SCORERS = []
  try { SCORERS = await loadScorers(idToCode) } catch (e) { /* leave empty */ }

  return {
    TEAMS,
    CRESTS,
    GROUPS,
    MATCHES,
    SCORERS,
    HOST,
    TODAY: fmtDate(new Date()),
  }
}

export async function refreshLive(matches) {
  const sb = await getJSON(SITE + '/scoreboard') // current matchday is enough for live scores
  const fresh = {}
  ;(sb.events || []).forEach(ev => {
    const c = (ev.competitions && ev.competitions[0]) || {}
    const { home, away } = competitors(c)
    const state = ev.status && ev.status.type && ev.status.type.state
    const score = (comp) => (state === 'pre' || comp.score == null) ? null : Number(comp.score)
    fresh[String(ev.id)] = { hs: score(home), as: score(away), status: mapState(state), minute: state === 'in' ? minuteOf(ev) : null }
  })
  let liveCount = 0
  const patched = matches.map(m => { const nu = fresh[m.id]; if (!nu) return m; if (nu.status === 'LIVE') liveCount++; return Object.assign({}, m, nu) })
  return { matches: patched, liveCount }
}

const POS_RANK = { G: 0, GK: 0, D: 1, DF: 1, M: 2, MF: 2, F: 3, FW: 3 }

export async function detail(matchId) {
  const out = { id: String(matchId), events: null, lineups: null, stats: null }
  let sj
  try { sj = await getJSON(SITE + '/summary?event=' + matchId) } catch (e) { return out }

  const idToCode = {}
  const comp = (sj.header && sj.header.competitions && sj.header.competitions[0]) || {}
  ;((comp.competitors) || []).forEach(c => { const t = c.team || {}; if (t.id != null) idToCode[t.id] = code3(t) })
  const codeFor = (team) => (team && team.id != null && idToCode[team.id]) || code3(team)

  // goals (with assists)
  const goals = (sj.keyEvents || []).filter(e => e.type && e.type.text === 'Goal')
  out.events = goals.map(e => {
    const min = parseInt(String((e.clock && e.clock.displayValue) || '').replace(/[^0-9]/g, ''), 10) || 0
    const parts = e.participants || []
    const scorer = parts.find(p => /scorer/i.test((p.type && p.type.text) || '')) || parts[0] || {}
    const assist = parts.find(p => /assist/i.test((p.type && p.type.text) || '')) || (parts[1] && parts[1] !== scorer ? parts[1] : null)
    return {
      min, team: codeFor(e.team), type: 'goal',
      name: (scorer.athlete && scorer.athlete.displayName) || '',
      assist: (assist && assist.athlete && assist.athlete.displayName) || '',
    }
  }).sort((a, b) => a.min - b.min)

  // lineups (starting XI, ordered GK→DF→MF→FW for clean pitch rows)
  const lineups = {}
  ;(sj.rosters || []).forEach(r => {
    const code = codeFor(r.team)
    if (!code) return
    const starters = (r.roster || []).filter(p => p.starter)
    starters.sort((a, b) => (POS_RANK[(a.position && a.position.abbreviation) || ''] ?? 4) - (POS_RANK[(b.position && b.position.abbreviation) || ''] ?? 4))
    lineups[code] = {
      formation: r.formation || '4-3-3',
      players: starters.map(p => ({ n: parseInt(p.jersey, 10) || '', name: (p.athlete && (p.athlete.displayName || p.athlete.shortName)) || '' })),
    }
  })
  if (Object.keys(lineups).length) out.lineups = lineups

  // stats (paired bars)
  const stats = {}
  ;((sj.boxscore && sj.boxscore.teams) || []).forEach(tm => {
    const code = codeFor(tm.team)
    if (!code) return
    const map = {}; (tm.statistics || []).forEach(s => { map[s.name] = s.displayValue })
    stats[code] = map
  })
  if (Object.keys(stats).length) out.stats = stats

  return out
}

export const WC_ESPN = { provider: 'ESPN', load, refreshLive, detail }
export default WC_ESPN
