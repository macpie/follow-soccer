import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
import { WC_ESPN, LEAGUES, DEFAULT_LEAGUE } from './data/wc-espn.js'
import { theme } from './theme.js'
import { standings as calcStandings, thirdRace as calcThirdRace } from './lib/standings.js'

const PREFS_KEY = 'wc_prefs_v1'
const StoreContext = createContext(null)
export const useStore = () => useContext(StoreContext)

function loadPrefs() {
  try { return JSON.parse(localStorage.getItem(PREFS_KEY) || '{}') } catch (e) { return {} }
}

function mScore(m) {
  if (m.status === 'LIVE') return { hs: m.hs != null ? m.hs : 0, as: m.as != null ? m.as : 0, status: 'LIVE', minute: m.minute, clock: m.clock }
  return { hs: m.hs, as: m.as, status: m.status, minute: null }
}

// Which tabs each competition shape exposes (the World Cup has groups + bracket, the
// Champions League a bracket + table, plain leagues just a table). Used to reset the view
// when switching to a league where the current tab doesn't exist.
function viewsFor(slug) {
  if (slug === 'fifa.world') return ['today', 'matches', 'bracket', 'groups', 'stats', 'teams']
  if (slug === 'uefa.champions') return ['today', 'matches', 'bracket', 'table', 'stats', 'teams']
  return ['today', 'matches', 'table', 'stats', 'teams']
}

export function StoreProvider({ children }) {
  const saved = loadPrefs()

  // ---- persisted prefs ----
  const [view, setViewState] = useState(saved.view || 'today')
  const [dark, setDark] = useState(saved.dark || false)
  const [favs, setFavs] = useState(saved.favs || ['USA', 'BRA'])
  const [notify, setNotify] = useState(saved.notify || false) // match alerts (15 min before kickoff)
  const validLeague = LEAGUES.some(l => l.slug === saved.league) ? saved.league : DEFAULT_LEAGUE
  const [league, setLeagueState] = useState(validLeague) // ESPN competition slug

  // ---- ephemeral UI ----
  const [sel, setSel] = useState(null)
  const [sel2, setSel2] = useState(null) // second leg, only set for a two-legged tie's dual modal
  const [modalTab, setModalTab] = useState('summary')
  const [filter, setFilter] = useState('all')
  const [selTeam, setSelTeam] = useState(null)
  const [teamSquad, setTeamSquad] = useState(null)
  const [teamSquadLoading, setTeamSquadLoading] = useState(false)

  // ---- ESPN data source ----
  const [source, setSource] = useState('loading') // loading | live | error
  const [data, setData] = useState(null)
  const [detail, setDetail] = useState(null)
  const [detail2, setDetail2] = useState(null)
  const [liveSlugs, setLiveSlugs] = useState({}) // { leagueSlug: true } for in-progress leagues

  // live refs so callbacks always read the current value without re-arming
  const dataRef = useRef(data); dataRef.current = data
  const favsRef = useRef(favs); favsRef.current = favs
  const leagueRef = useRef(league); leagueRef.current = league
  const notifiedRef = useRef(null)
  if (notifiedRef.current === null) notifiedRef.current = new Set() // lazy init — avoid allocating a Set every render

  const save = useCallback((patch) => {
    const next = Object.assign({ view, dark, favs, notify, league }, patch)
    try { localStorage.setItem(PREFS_KEY, JSON.stringify(next)) } catch (e) {}
  }, [view, dark, favs, notify, league])

  // Switching tabs also grabs fresh scores — a lightweight score-only refresh (not a full
  // loadLive), so there's no loading flicker, just up-to-date numbers.
  const setView = (v) => { setViewState(v); save({ view: v }); refreshScores() }
  const toggleDark = () => { const d = !dark; setDark(d); save({ dark: d }) }
  const toggleFav = (id) => {
    setFavs(prev => {
      const has = prev.includes(id)
      const nextFavs = has ? prev.filter(x => x !== id) : prev.concat([id])
      save({ favs: nextFavs })
      return nextFavs
    })
  }

  // Match alerts: ask for Notification permission, then fire 15 min before a followed
  // team's kickoff (while the app is open — see the scheduler effect below).
  const notifySupported = typeof window !== 'undefined' && 'Notification' in window
  const toggleNotify = async () => {
    if (!notifySupported) return
    if (notify) { setNotify(false); save({ notify: false }); return }
    let perm = Notification.permission
    if (perm === 'default') { try { perm = await Notification.requestPermission() } catch (e) {} }
    if (perm === 'granted') {
      setNotify(true); save({ notify: true })
      try { new Notification('Match alerts on', { body: "We'll remind you 15 minutes before your followed teams play." }) } catch (e) {}
    } else {
      setNotify(false); save({ notify: false })
    }
  }

  // ---- data accessors ----
  const D = data
  const th = theme(dark)
  const t = (id) => (D ? D.TEAMS[id] : null)

  const standings = (g) => calcStandings(D, g, mScore)
  const thirdRace = () => calcThirdRace(D, mScore)

  // Is the detail for the currently-open match loaded yet?
  const detailReady = (m) => !!(detail && detail.id === m.id)

  // Whether the currently-open match modal is showing a live (in-progress) game.
  const openMatchLive = !!(sel && data && (data.MATCHES.find(x => x.id === sel) || {}).status === 'LIVE')
  const openMatchLive2 = !!(sel2 && data && (data.MATCHES.find(x => x.id === sel2) || {}).status === 'LIVE')

  // ---- match modal ----
  // Any match can be opened — played/live show the full match center, upcoming show a
  // preview (form, head-to-head, broadcasts) from the same detail call.
  const openMatch = (m) => {
    if (!m) return
    setSel(m.id); setSel2(null); setModalTab('auto'); setDetail(null); setDetail2(null)
    WC_ESPN.detail(m.id, leagueRef.current)
      .then(d => setSel(cur => { if (cur === m.id) setDetail(d); return cur }))
      .catch(() => {})
  }
  // A two-legged tie opens both legs side by side in one dual modal — closing it (backdrop,
  // Escape, or either card's × button all funnel through closeMatch) dismisses both at once.
  const openMatchPair = (m1, m2) => {
    if (!m1 || !m2) return
    setSel(m1.id); setSel2(m2.id); setModalTab('auto'); setDetail(null); setDetail2(null)
    WC_ESPN.detail(m1.id, leagueRef.current)
      .then(d => setSel(cur => { if (cur === m1.id) setDetail(d); return cur }))
      .catch(() => {})
    WC_ESPN.detail(m2.id, leagueRef.current)
      .then(d => setSel2(cur => { if (cur === m2.id) setDetail2(d); return cur }))
      .catch(() => {})
  }
  const closeMatch = () => { setSel(null); setSel2(null) }

  const openTeam = (id) => {
    if (!id || !data) return
    setSelTeam(id)
    setTeamSquad(null)
    const tid = data.TEAMS[id] && data.TEAMS[id].tid
    if (tid) {
      setTeamSquadLoading(true)
      // recent played/live matches → used to harvest real player headshots
      const recent = data.MATCHES
        .filter(m => (m.h === id || m.a === id) && (m.status === 'FT' || m.status === 'LIVE'))
        .slice(-3).reverse().map(m => m.id)
      WC_ESPN.teamRoster(tid, recent, leagueRef.current)
        .then(sq => setSelTeam(cur => { if (cur === id) { setTeamSquad(sq); setTeamSquadLoading(false) } return cur }))
        .catch(() => setSelTeam(cur => { if (cur === id) setTeamSquadLoading(false); return cur }))
    } else {
      setTeamSquadLoading(false)
    }
  }
  const closeTeam = () => setSelTeam(null)

  // ---- live data (ESPN) ----
  // Reads the latest data via dataRef (kept in sync below) instead of a setData updater, since
  // the network call is a side effect — React 18 StrictMode double-invokes updater functions in
  // dev specifically to catch that kind of impurity, which was silently doubling this request.
  const refreshScores = useCallback(() => {
    const curData = dataRef.current
    if (!curData) return
    WC_ESPN.refreshLive(curData.MATCHES, leagueRef.current)
      .then(r => setData(s => (s ? Object.assign({}, s, { MATCHES: r.matches }) : s)))
      .catch(() => {})
  }, [])

  const loadLive = useCallback((slug) => {
    const lg = slug || leagueRef.current
    setSource('loading')
    WC_ESPN.load(lg)
      .then(d => { if (leagueRef.current !== lg) return; setData(d); setSource('live') })
      .catch(() => { if (leagueRef.current === lg) setSource('error') })
  }, [])

  // Switch competitions: persist the choice, clear the old dataset/modals, and reload.
  const setLeague = (slug) => {
    if (slug === leagueRef.current || !LEAGUES.some(l => l.slug === slug)) return
    leagueRef.current = slug
    setLeagueState(slug)
    if (viewsFor(slug).includes(view)) { save({ league: slug }) }
    else { setViewState('today'); save({ league: slug, view: 'today' }) }
    setSel(null); setSel2(null); setSelTeam(null); setDetail(null); setDetail2(null); setFilter('all')
    setData(null)
    loadLive(slug)
  }

  // ---- effects ----
  useEffect(() => {
    loadLive()
    // eslint-disable-next-line react-doctor/exhaustive-deps -- loadLive is a stable useCallback chain; this must run once on mount only
  }, [])

  // Match alerts: while enabled, check every 30s and fire a notification once a followed
  // team's match is within 15 minutes of kickoff. Only works while the app is open.
  useEffect(() => {
    if (!notify || !notifySupported || Notification.permission !== 'granted') return
    const check = () => {
      const d = dataRef.current; if (!d) return
      const fv = favsRef.current; const now = Date.now()
      d.MATCHES.forEach(m => {
        if (m.status !== 'UP' || !m.kickoff) return
        if (!(fv.includes(m.h) || fv.includes(m.a))) return
        const mins = (m.kickoff - now) / 60000
        if (mins > 0 && mins <= 15 && !notifiedRef.current.has(m.id)) {
          notifiedRef.current.add(m.id)
          const nm = (id) => (d.TEAMS[id] && d.TEAMS[id].name) || id
          try {
            new Notification('Kickoff in ' + Math.max(1, Math.round(mins)) + ' min', {
              body: nm(m.h) + ' vs ' + nm(m.a) + (m.v ? ' · ' + m.v : ''),
              tag: 'wc-' + m.id,
            })
          } catch (e) {}
        }
      })
    }
    check()
    const iv = setInterval(check, 30000)
    return () => clearInterval(iv)
  }, [notify, notifySupported])

  // While a LIVE match modal is open, re-fetch its detail (event timeline, stats,
  // commentary, lineups) every 30s so the game tracks itself without reopening the
  // modal. The header score/clock already update from the live MATCHES poll; this keeps
  // the rest of the match center in sync. Stops once the match ends or the modal closes.
  useEffect(() => {
    if (!sel || !openMatchLive) return
    const iv = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return
      WC_ESPN.detail(sel, leagueRef.current)
        .then(dt => setSel(cur => { if (cur === sel) setDetail(dt); return cur }))
        .catch(() => {})
    }, 30000)
    return () => clearInterval(iv)
  }, [sel, openMatchLive])

  // Same as above, for a two-legged tie's second leg when it's the one still live.
  useEffect(() => {
    if (!sel2 || !openMatchLive2) return
    const iv = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return
      WC_ESPN.detail(sel2, leagueRef.current)
        .then(dt => setSel2(cur => { if (cur === sel2) setDetail2(dt); return cur }))
        .catch(() => {})
    }, 30000)
    return () => clearInterval(iv)
  }, [sel2, openMatchLive2])

  // No background poll — scores instead refresh on tab switch (see setView) and whenever the
  // app comes back into view: returning to this browser tab (visibilitychange) or refocusing
  // the browser window itself (focus), e.g. after switching away to another app and back.
  useEffect(() => {
    const onRefocus = () => { if (!document.hidden) refreshScores() }
    document.addEventListener('visibilitychange', onRefocus)
    window.addEventListener('focus', onRefocus)
    return () => {
      document.removeEventListener('visibilitychange', onRefocus)
      window.removeEventListener('focus', onRefocus)
    }
  }, [refreshScores])

  // Which leagues are live right now — drives the live dot in the switcher. Checked on
  // mount and every 60s (paused while the tab is hidden).
  useEffect(() => {
    let on = true
    const check = () => {
      if (typeof document !== 'undefined' && document.hidden) return
      WC_ESPN.liveLeagues().then(r => { if (on) setLiveSlugs(r) }).catch(() => {})
    }
    check()
    const iv = setInterval(check, 60000)
    return () => { on = false; clearInterval(iv) }
  }, [])

  const value = {
    // state
    view, dark, favs, notify, notifySupported, sel, sel2, modalTab, filter, source, data, detail, detail2,
    selTeam, teamSquad, teamSquadLoading, league, leagues: LEAGUES, liveSlugs,
    // accessors
    D, th, t, mScore, standings, thirdRace, detailReady,
    // actions
    setView, toggleDark, toggleFav, toggleNotify, setFilter, setModalTab, setLeague,
    openMatch, openMatchPair, closeMatch, openTeam, closeTeam, reload: loadLive,
  }
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}
