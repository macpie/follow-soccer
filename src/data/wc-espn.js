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

// Leagues offered in the app's switcher. Slugs are ESPN soccer competition paths.
export const LEAGUES = [
  { slug: 'fifa.world', name: 'World Cup', country: 'International', flag: '🌍' },
  { slug: 'uefa.champions', name: 'Champions League', country: 'Europe', flag: '🇪🇺' },
  { slug: 'eng.1', name: 'Premier League', country: 'England', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  { slug: 'esp.1', name: 'La Liga', country: 'Spain', flag: '🇪🇸' },
  { slug: 'ita.1', name: 'Serie A', country: 'Italy', flag: '🇮🇹' },
  { slug: 'ger.1', name: 'Bundesliga', country: 'Germany', flag: '🇩🇪' },
  { slug: 'fra.1', name: 'Ligue 1', country: 'France', flag: '🇫🇷' },
  { slug: 'usa.1', name: 'MLS', country: 'USA', flag: '🇺🇸' },
  { slug: 'mex.1', name: 'Liga MX', country: 'Mexico', flag: '🇲🇽' },
]
export const DEFAULT_LEAGUE = 'fifa.world'
const leagueName = slug => (LEAGUES.find(l => l.slug === slug) || {}).name || 'Soccer'

const SITE = slug => 'https://site.api.espn.com/apis/site/v2/sports/soccer/' + slug
const SITE_V2 = slug => 'https://site.api.espn.com/apis/v2/sports/soccer/' + slug
const CORE = slug => 'https://sports.core.api.espn.com/v2/sports/soccer/leagues/' + slug
const ymd = d => { const x = new Date(d); return '' + x.getFullYear() + String(x.getMonth() + 1).padStart(2, '0') + String(x.getDate()).padStart(2, '0') }

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const fmtDate = d => (!d || isNaN(d)) ? null : DOW[d.getDay()] + ' ' + MON[d.getMonth()] + ' ' + d.getDate()
const fmtTime = d => { if (!d || isNaN(d)) return null; let h = d.getHours(), m = d.getMinutes(), ap = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12; return h + ':' + String(m).padStart(2, '0') + ' ' + ap }
const mapState = s => s === 'in' ? 'LIVE' : s === 'post' ? 'FT' : 'UP'
const ROUND_LABEL = { 'round-of-32': 'Round of 32', 'knockout-round-playoffs': 'Play-off', 'round-of-16': 'Round of 16', quarterfinals: 'Quarter-final', semifinals: 'Semi-final', '3rd-place-match': 'Third place', final: 'Final' }
const hex = (c, fallback) => !c ? fallback : (String(c)[0] === '#' ? c : '#' + c)
const code3 = t => String((t && t.abbreviation) || '').toUpperCase()
// Stable per-team key: 3-letter code when available, else the ESPN team id. Clubs always
// have an abbreviation, but this guards leagues/teams where it may be missing.
const teamKey = t => code3(t) || (t && t.id != null ? 'T' + t.id : '')
// ESPN's ready-made live clock string, e.g. "49'", "45'+4'", "90'+3'", "HT".
const clockOf = ev => { const st = ev && ev.status; const dc = st && (st.displayClock || (st.type && (st.type.shortDetail || st.type.detail))); const s = String(dc || '').trim(); return s || null }
// Numeric minute (base + added time) for logic/sorting, e.g. "45'+4'" → 49. Note: a naive
// digit-strip would turn "45'+4'" into 454, so parse the groups explicitly.
const minuteOf = ev => { const m = String(clockOf(ev) || '').match(/(\d+)(?:\D+(\d+))?/); if (!m) return null; const base = parseInt(m[1], 10); const extra = m[2] ? parseInt(m[2], 10) : 0; return Number.isFinite(base) ? base + extra : null }

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
    const code = teamKey(t)
    if (!code) return code
    if (t.id != null) idToCode[t.id] = code
    if (!TEAMS[code]) {
      TEAMS[code] = { name: t.shortDisplayName || t.displayName || code, code, tid: t.id != null ? String(t.id) : null, g: codeToGroup[code] || '?', c: hex(t.color, '#5F26FC'), c2: hex(t.alternateColor, '#111111') }
    } else {
      // enrich a standings-only stub with real colors/group/id
      if (t.color) TEAMS[code].c = hex(t.color, TEAMS[code].c)
      if (t.alternateColor) TEAMS[code].c2 = hex(t.alternateColor, TEAMS[code].c2)
      if (codeToGroup[code]) TEAMS[code].g = codeToGroup[code]
      if (t.id != null && !TEAMS[code].tid) TEAMS[code].tid = String(t.id)
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
  // Stage label only applies to WC knockout slugs; league matches have no stage.
  const stage = grp !== '?' ? null : (ROUND_LABEL[round] || null)
  // a side is "known" (a real qualified team) when its code maps to a group; otherwise it's
  // a placeholder slot (e.g. "Group L Winner", "Third Place Group C/E/F/H/I").
  const nameOf = (comp) => (comp.team && (comp.team.displayName || comp.team.shortDisplayName)) || ''
  return {
    id: String(ev.id), g: grp, md: null, h, a,
    hName: nameOf(home), aName: nameOf(away),
    // "known" = a real qualified team (vs a placeholder slot like "Group L Winner").
    // Group membership marks it for the WC; the standings `ranked` flag covers UCL knockouts.
    hKnown: !!(codeToGroup[h] || (TEAMS[h] && TEAMS[h].ranked)),
    aKnown: !!(codeToGroup[a] || (TEAMS[a] && TEAMS[a].ranked)),
    hs: score(home), as: score(away),
    status,
    date: (when && fmtDate(when)) || 'TBD',
    time: (when && fmtTime(when)) || 'TBD',
    minute: status === 'LIVE' ? minuteOf(ev) : null,
    clock: status === 'LIVE' ? clockOf(ev) : null,
    kickoff: when ? when.getTime() : null, // epoch ms, for match-start alerts
    v, round, stage, _api: true,
  }
}

// Tournament leaderboards. Each category keeps the top LEADER_TOP players so the UI can
// show 5 and expand. Athlete names are resolved once (deduped across categories).
const LEADER_CATS = ['goals', 'assists', 'shotsOnTarget', 'totalShots', 'saves', 'foulsCommitted', 'foulsSuffered', 'yellowCards', 'redCards', 'accuratePasses']
const LEADER_TOP = 15

function teamCodeFromRef(ref, idToCode) {
  if (!ref) return 'UNK'
  const idp = ref.split('/teams/')[1]
  const tid = idp ? idp.split('?')[0].replace(/\/$/, '') : null
  return (tid && idToCode[tid]) || 'UNK'
}

async function loadLeaders(idToCode, slug, year) {
  const lj = await getJSON(CORE(slug) + '/seasons/' + year + '/types/1/leaders')
  const byName = {}
  ;(lj.categories || []).forEach(c => { byName[c.name] = c.leaders || [] })

  // pick top-N per category, collecting unique athlete refs to resolve once
  const picks = {}, refSet = new Set()
  LEADER_CATS.forEach(key => {
    picks[key] = (byName[key] || []).slice(0, LEADER_TOP).map(ld => {
      const ref = ld.athlete && ld.athlete.$ref
      if (ref) refSet.add(ref)
      return { value: Number(ld.value) || 0, team: teamCodeFromRef(ld.team && ld.team.$ref, idToCode), ref }
    })
  })

  const names = {}
  await Promise.all([...refSet].map(async ref => {
    try { const aj = await getJSON(ref); names[ref] = aj.displayName || aj.fullName || '' } catch (e) { names[ref] = '' }
  }))

  const LEADERS = {}
  LEADER_CATS.forEach(key => {
    LEADERS[key] = picks[key]
      .map(p => ({ name: names[p.ref] || '', team: p.team, value: p.value }))
      .filter(p => p.name && p.team !== 'UNK' && p.value > 0)
  })
  return LEADERS
}

const statVal = (stats, name) => { const s = (stats || []).find(x => x.name === name); return s ? Number(s.value) || 0 : 0 }

export async function load(slug = DEFAULT_LEAGUE) {
  // First call yields the season window (for the full fixture list) and current events.
  const sb0 = await getJSON(SITE(slug) + '/scoreboard')
  const season = (sb0.leagues && sb0.leagues[0] && sb0.leagues[0].season) || {}
  const year = season.year || new Date().getFullYear()
  const range = (season.startDate && season.endDate) ? ymd(season.startDate) + '-' + ymd(season.endDate) : null

  const [sb, st] = await Promise.all([
    range ? getJSON(SITE(slug) + '/scoreboard?dates=' + range + '&limit=600').catch(() => sb0) : Promise.resolve(sb0),
    getJSON(SITE_V2(slug) + '/standings').catch(() => null),
  ])

  const codeToGroup = {}, idToCode = {}, GROUPS = {}, TEAMS = {}, CRESTS = {}

  // Standings tree shapes: WC = 12 "Group" children; MLS = 2 conference children; most
  // leagues = a single table child; UCL = one league-phase child.
  //  - multiSection (>1 child) → ranks are per-section, so build the flat table by points.
  //  - grouped (children literally named "Group …") → show group chips/labels (WC only).
  const children = (st && st.children) || []
  const multiSection = children.length > 1
  let grouped = false
  const rows = []
  children.forEach(ch => {
    const isGroup = /group/i.test(String(ch.name || '') + ' ' + String(ch.abbreviation || ''))
    if (isGroup) grouped = true
    const letter = isGroup ? String(ch.abbreviation || ch.name || '').replace(/group/i, '').trim().toUpperCase().slice(0, 2) : ''
    const entries = (ch.standings && ch.standings.entries) || []
    entries.forEach(e => {
      const t = e.team || {}
      const code = teamKey(t)
      if (!code) return
      if (t.id != null) idToCode[t.id] = code
      if (letter) {
        codeToGroup[code] = letter
        GROUPS[letter] = GROUPS[letter] || []
        if (!GROUPS[letter].includes(code)) GROUPS[letter].push(code)
      }
      if (!TEAMS[code]) TEAMS[code] = { name: t.displayName || code, code, tid: t.id != null ? String(t.id) : null, g: letter, ranked: true, c: hex(t.color, '#5F26FC'), c2: hex(t.alternateColor, '#111111') }
      else { TEAMS[code].ranked = true; if (letter) TEAMS[code].g = letter; if (t.id != null && !TEAMS[code].tid) TEAMS[code].tid = String(t.id) }
      const logo = (t.logos && t.logos[0] && t.logos[0].href) || t.logo
      if (logo) CRESTS[code] = logo
      rows.push({
        code, g: letter, rank: statVal(e.stats, 'rank'),
        P: statVal(e.stats, 'gamesPlayed'), W: statVal(e.stats, 'wins'), D: statVal(e.stats, 'ties'), L: statVal(e.stats, 'losses'),
        GF: statVal(e.stats, 'pointsFor'), GA: statVal(e.stats, 'pointsAgainst'), GD: statVal(e.stats, 'pointDifferential'), Pts: statVal(e.stats, 'points'),
      })
    })
  })
  // Single-table leagues keep ESPN's official rank (it encodes tiebreakers); multi-section
  // competitions (WC groups, MLS conferences) are merged into one table sorted by points.
  if (multiSection) rows.sort((a, b) => b.Pts - a.Pts || b.GD - a.GD || b.GF - a.GF)
  else rows.sort((a, b) => (a.rank || 99) - (b.rank || 99))
  rows.forEach((r, i) => { r.pos = i + 1 })

  const MATCHES = (sb.events || []).map(ev => mapMatch(ev, codeToGroup, idToCode, TEAMS, CRESTS))

  // derive GROUPS from matches if standings was unavailable (WC fallback)
  if (grouped && !Object.keys(GROUPS).length) {
    MATCHES.forEach(m => { if (m.g && m.g !== '?') { GROUPS[m.g] = GROUPS[m.g] || []; [m.h, m.a].forEach(code => { if (!GROUPS[m.g].includes(code)) GROUPS[m.g].push(code) }) } })
  }

  let LEADERS = {}
  try { LEADERS = await loadLeaders(idToCode, slug, year) } catch (e) { /* leave empty */ }

  // A competition has a knockout bracket if any match carries a knockout stage label.
  const bracket = MATCHES.some(m => m.stage)

  return {
    slug, league: leagueName(slug), grouped, bracket,
    TEAMS, CRESTS, GROUPS, STANDINGS: rows, MATCHES, LEADERS,
    HOST: leagueName(slug),
    TODAY: fmtDate(new Date()),
  }
}

export async function refreshLive(matches, slug = DEFAULT_LEAGUE) {
  const sb = await getJSON(SITE(slug) + '/scoreboard') // current matchday is enough for live scores
  const fresh = {}
  ;(sb.events || []).forEach(ev => {
    const c = (ev.competitions && ev.competitions[0]) || {}
    const { home, away } = competitors(c)
    const state = ev.status && ev.status.type && ev.status.type.state
    const score = (comp) => (state === 'pre' || comp.score == null) ? null : Number(comp.score)
    fresh[String(ev.id)] = { hs: score(home), as: score(away), status: mapState(state), minute: state === 'in' ? minuteOf(ev) : null, clock: state === 'in' ? clockOf(ev) : null }
  })
  let liveCount = 0
  const patched = matches.map(m => { const nu = fresh[m.id]; if (!nu) return m; if (nu.status === 'LIVE') liveCount++; return Object.assign({}, m, nu) })
  return { matches: patched, liveCount }
}

// Which competitions are currently running (in-season / tournament under way) — for the
// dot in the switcher. A comp is "active" if it has a match within ~12 days of today; that
// distinguishes an in-progress competition from one that's off-season or on a long break
// (e.g. a domestic league paused for the World Cup). One light scoreboard request per
// league, in parallel. Returns { slug: true }.
export async function liveLeagues() {
  const out = {}
  const now = Date.now(), WINDOW = 12 * 86400000
  await Promise.all(LEAGUES.map(async l => {
    try {
      const sb = await getJSON(SITE(l.slug) + '/scoreboard')
      out[l.slug] = (sb.events || []).some(ev => ev.date && Math.abs(new Date(ev.date).getTime() - now) <= WINDOW)
    } catch (e) { /* leave undefined */ }
  }))
  return out
}

const POS_RANK = { G: 0, GK: 0, D: 1, DF: 1, M: 2, MF: 2, F: 3, FW: 3 }

// Classify a keyEvent type into the kinds the timeline renders.
function eventKind(text) {
  const T = String(text || '')
  if (/Own Goal/i.test(T)) return { kind: 'goal', note: 'OG' }
  if (/Goal/i.test(T)) return { kind: 'goal', note: /Penalty/i.test(T) ? 'pen' : (/Header/i.test(T) ? 'header' : null) }
  if (/Yellow.?Red|Second Yellow/i.test(T)) return { kind: 'red', note: '2nd yellow' }
  if (/Red Card/i.test(T)) return { kind: 'red', note: null }
  if (/Yellow Card/i.test(T)) return { kind: 'yellow', note: null }
  if (/Substitution/i.test(T)) return { kind: 'sub', note: null }
  if (/Penalty/i.test(T)) return { kind: 'pen-miss', note: /Saved/i.test(T) ? 'saved' : 'missed' }
  if (/^Half.?time$/i.test(T)) return { kind: 'marker', note: 'Half-time' }
  if (/Full.?time|End Regular Time/i.test(T)) return { kind: 'marker', note: 'Full-time' }
  return null
}

const fmtYear = iso => { const d = iso ? new Date(iso) : null; return (d && !isNaN(d)) ? String(d.getFullYear()) : '' }

// Sortable minute from a clock like "45'", "45'+2'", "90'+4'" → 45, 45.02, 90.04.
function clockMin(clock) {
  const mm = String(clock || '').match(/(\d+)(?:\D+(\d+))?/)
  if (!mm) return 0
  return (parseInt(mm[1], 10) || 0) + (mm[2] ? parseInt(mm[2], 10) / 100 : 0)
}

export async function detail(matchId, slug = DEFAULT_LEAGUE) {
  const out = { id: String(matchId), events: null, lineups: null, stats: null, commentary: null, gameInfo: null, form: null, h2h: null, broadcasts: null }
  let sj
  try { sj = await getJSON(SITE(slug) + '/summary?event=' + matchId) } catch (e) { return out }

  const idToCode = {}
  const comp = (sj.header && sj.header.competitions && sj.header.competitions[0]) || {}
  ;((comp.competitors) || []).forEach(c => { const t = c.team || {}; if (t.id != null) idToCode[t.id] = teamKey(t) })
  const codeFor = (team) => (team && team.id != null && idToCode[team.id]) || teamKey(team)
  const nameOfP = (p) => (p && p.athlete && (p.athlete.displayName || p.athlete.shortName)) || ''

  // full event timeline: goals, cards, subs, penalties, half/full-time markers
  const events = []
  ;(sj.keyEvents || []).forEach(e => {
    const info = eventKind(e.type && e.type.text)
    if (!info) return
    const clock = (e.clock && e.clock.displayValue) || ''
    const min = clockMin(clock)
    const parts = e.participants || []
    // markers sort after same-minute play (half-time just after first-half stoppage; full-time last)
    if (info.kind === 'marker') { events.push({ min: info.note === 'Half-time' ? 45.9 : 999, clock: '', kind: 'marker', note: info.note }); return }
    let name = nameOfP(parts[0]), name2 = ''
    if (info.kind === 'sub') { name = nameOfP(parts[0]); name2 = nameOfP(parts[1]) } // in / out
    else if (info.kind === 'goal') { name2 = nameOfP(parts[1]) } // assist
    events.push({ min, clock, team: codeFor(e.team), kind: info.kind, note: info.note, name, name2 })
  })
  if (events.length) out.events = events.sort((a, b) => a.min - b.min)

  // lineups (starting XI, ordered GK→DF→MF→FW for clean pitch rows)
  const lineups = {}
  ;(sj.rosters || []).forEach(r => {
    const code = codeFor(r.team)
    if (!code) return
    const starters = (r.roster || []).filter(p => p.starter)
    if (!starters.length) return
    starters.sort((a, b) => (POS_RANK[(a.position && a.position.abbreviation) || ''] ?? 4) - (POS_RANK[(b.position && b.position.abbreviation) || ''] ?? 4))
    lineups[code] = {
      formation: r.formation || '4-3-3',
      players: starters.map(p => {
        const ath = p.athlete || {}
        const pos = p.position || {}
        const dob = ath.dateOfBirth ? new Date(ath.dateOfBirth) : null
        const now = new Date()
        const age = dob ? (now.getFullYear() - dob.getFullYear() - (now < new Date(now.getFullYear(), dob.getMonth(), dob.getDate()) ? 1 : 0)) : null
        const headshot = (ath.headshot && ath.headshot.href) || (ath.id ? 'https://a.espncdn.com/i/headshots/soccer/players/full/' + ath.id + '.png' : null)
        const nationality = ath.citizenship || (ath.flag && ath.flag.alt) || ''
        return {
          n: parseInt(p.jersey, 10) || '',
          name: ath.displayName || ath.shortName || '',
          pos: pos.abbreviation || '',
          posName: pos.displayName || pos.name || pos.abbreviation || '',
          age,
          nationality,
          headshot,
        }
      }),
    }
  })
  if (Object.keys(lineups).length) out.lineups = lineups

  // stats (raw boxscore map per team; the view picks which to show)
  const stats = {}
  ;((sj.boxscore && sj.boxscore.teams) || []).forEach(tm => {
    const code = codeFor(tm.team)
    if (!code) return
    const map = {}; (tm.statistics || []).forEach(s => { map[s.name] = s.displayValue })
    if (Object.keys(map).length) stats[code] = map
  })
  if (Object.keys(stats).length) out.stats = stats

  // play-by-play commentary (most recent first)
  const comm = (sj.commentary || []).map(c => ({ time: (c.time && c.time.displayValue) || '', text: c.text || '' })).filter(c => c.text)
  if (comm.length) out.commentary = comm.reverse()

  // game info: attendance + referee
  const gi = sj.gameInfo || {}
  const ref = (gi.officials || []).find(o => (o.position && o.position.name) === 'Referee') || (gi.officials || [])[0]
  out.gameInfo = { attendance: gi.attendance || null, referee: ref ? ref.displayName : null }

  // recent form (W/D/L) per team
  const form = {}
  ;(sj.lastFiveGames || []).forEach(g => {
    const tid = g.team && g.team.id
    const code = tid != null && idToCode[tid]
    if (!code) return
    form[code] = (g.events || []).map(ev => {
      const home = String(ev.homeTeamId) === String(tid)
      const gf = Number(home ? ev.homeTeamScore : ev.awayTeamScore)
      const ga = Number(home ? ev.awayTeamScore : ev.homeTeamScore)
      return { r: gf > ga ? 'W' : gf < ga ? 'L' : 'D', score: gf + '-' + ga }
    })
  })
  if (Object.keys(form).length) out.form = form

  // head-to-head history between the two teams
  const h2hEvents = (sj.headToHeadGames && sj.headToHeadGames[0] && sj.headToHeadGames[0].events) || []
  if (h2hEvents.length) {
    out.h2h = h2hEvents.map(ev => ({
      year: fmtYear(ev.gameDate),
      home: idToCode[ev.homeTeamId] || null, away: idToCode[ev.awayTeamId] || null,
      hs: Number(ev.homeTeamScore), as: Number(ev.awayTeamScore),
    }))
  }

  // broadcasts ("where to watch")
  const bc = (sj.broadcasts || []).map(x => x.shortName || (x.media && x.media.shortName) || x.name).filter(Boolean)
  if (bc.length) out.broadcasts = [...new Set(bc)]

  return out
}

// Full squad for a team via ESPN's per-team roster endpoint (the complete 26-man list,
// not just a match's starting XI), plus the team's record/standing and current coach.
// ESPN's WC roster carries no player headshots, so we harvest the real ones it does have
// from the team's recent match summaries (~15% of players) and key them by athlete id;
// everyone else falls back to their nationality flag, then jersey number, in the UI.
export async function teamRoster(teamId, matchIds = [], slug = DEFAULT_LEAGUE) {
  if (!teamId) return null
  const [rj, teamJson, ...summaries] = await Promise.all([
    getJSON(SITE(slug) + '/teams/' + teamId + '/roster'),
    getJSON(SITE(slug) + '/teams/' + teamId).catch(() => null),
    ...matchIds.slice(0, 3).map(id => getJSON(SITE(slug) + '/summary?event=' + id).catch(() => null)),
  ])

  // real headshots by athlete id, gathered from match summaries
  const headById = {}
  summaries.forEach(sj => {
    if (!sj) return
    ;(sj.rosters || []).forEach(r => (r.roster || []).forEach(p => {
      const a = p.athlete
      if (a && a.id != null && a.headshot && a.headshot.href) headById[String(a.id)] = a.headshot.href
    }))
  })

  // athletes can be flat or grouped into { position, items: [...] } buckets
  const list = []
  ;(rj.athletes || []).forEach(a => { if (a && Array.isArray(a.items)) list.push(...a.items); else if (a) list.push(a) })

  const players = list.map(a => {
    const pos = a.position || {}
    const status = a.status || {}
    const injured = (Array.isArray(a.injuries) && a.injuries.length > 0) || (status.type && status.type !== 'active')
    const id = a.id != null ? String(a.id) : null
    return {
      id,
      n: parseInt(a.jersey, 10) || '',
      name: a.displayName || a.fullName || '',
      pos: pos.abbreviation || '',
      posName: pos.displayName || pos.name || pos.abbreviation || '',
      age: a.age || null,
      nationality: a.citizenship || (a.flag && a.flag.alt) || '',
      height: a.displayHeight || '',
      injured: !!injured,
      flag: (a.flag && a.flag.href) || null,
      headshot: (id && headById[id]) || null,
    }
  })

  // NB: ESPN's roster `coach` field is stale (frozen ~2012-2016 for clubs) with no current
  // source, so we deliberately don't surface a coach name — it would be misleading.

  // record (W-D-L) + standing blurb from the team detail endpoint
  const T = teamJson && teamJson.team
  const recItems = (T && T.record && T.record.items) || []
  const rec = recItems.find(i => i.type === 'total') || recItems[0]
  const record = (rec && rec.summary) || null
  const standing = (T && T.standingSummary) || null

  return { players, record, standing }
}

export const WC_ESPN = { provider: 'ESPN', load, refreshLive, detail, teamRoster, liveLeagues, LEAGUES, DEFAULT_LEAGUE }
export default WC_ESPN
