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

async function loadLeaders(idToCode) {
  const lj = await getJSON(CORE + '/seasons/' + SEASON + '/types/1/leaders')
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
      if (!TEAMS[code]) TEAMS[code] = { name: t.displayName || code, code, tid: t.id != null ? String(t.id) : null, g: letter, c: '#5F26FC', c2: '#111111' }
      else if (t.id != null && !TEAMS[code].tid) TEAMS[code].tid = String(t.id)
    })
  })

  const MATCHES = (sb.events || []).map(ev => mapMatch(ev, codeToGroup, idToCode, TEAMS, CRESTS))

  // derive GROUPS from matches if standings was unavailable
  if (!Object.keys(GROUPS).length) {
    MATCHES.forEach(m => { if (m.g && m.g !== '?') { GROUPS[m.g] = GROUPS[m.g] || []; [m.h, m.a].forEach(code => { if (!GROUPS[m.g].includes(code)) GROUPS[m.g].push(code) }) } })
  }

  let LEADERS = {}
  try { LEADERS = await loadLeaders(idToCode) } catch (e) { /* leave empty */ }

  return {
    TEAMS,
    CRESTS,
    GROUPS,
    MATCHES,
    LEADERS,
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

export async function detail(matchId) {
  const out = { id: String(matchId), events: null, lineups: null, stats: null, commentary: null, gameInfo: null, form: null, h2h: null, broadcasts: null }
  let sj
  try { sj = await getJSON(SITE + '/summary?event=' + matchId) } catch (e) { return out }

  const idToCode = {}
  const comp = (sj.header && sj.header.competitions && sj.header.competitions[0]) || {}
  ;((comp.competitors) || []).forEach(c => { const t = c.team || {}; if (t.id != null) idToCode[t.id] = code3(t) })
  const codeFor = (team) => (team && team.id != null && idToCode[team.id]) || code3(team)
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
// not just a match's starting XI). Returns normalized players + current head coach.
export async function teamRoster(teamId) {
  if (!teamId) return null
  const rj = await getJSON(SITE + '/teams/' + teamId + '/roster')

  // athletes can be flat or grouped into { position, items: [...] } buckets
  const list = []
  ;(rj.athletes || []).forEach(a => { if (a && Array.isArray(a.items)) list.push(...a.items); else if (a) list.push(a) })

  const players = list.map(a => {
    const pos = a.position || {}
    const status = a.status || {}
    const headshot = (a.headshot && a.headshot.href) || (a.id ? 'https://a.espncdn.com/i/headshots/soccer/players/full/' + a.id + '.png' : null)
    const injured = (Array.isArray(a.injuries) && a.injuries.length > 0) || (status.type && status.type !== 'active')
    return {
      n: parseInt(a.jersey, 10) || '',
      name: a.displayName || a.fullName || '',
      pos: pos.abbreviation || '',
      posName: pos.displayName || pos.name || pos.abbreviation || '',
      age: a.age || null,
      nationality: a.citizenship || (a.flag && a.flag.alt) || '',
      height: a.displayHeight || '',
      injured: !!injured,
      headshot,
    }
  })

  // ESPN lists coaches historically (oldest→newest); the last entry is the current one.
  const coaches = rj.coach || []
  const cc = coaches[coaches.length - 1]
  const coach = cc ? [cc.firstName, cc.lastName].filter(Boolean).join(' ') : null

  return { players, coach }
}

export const WC_ESPN = { provider: 'ESPN', load, refreshLive, detail, teamRoster }
export default WC_ESPN
