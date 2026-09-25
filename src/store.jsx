import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
import { WC_ESPN, LEAGUES } from './data/wc-espn.js'
import { viewsFor, viewsForData, resolveRoute, currentPath, currentSearch, writeRoute } from './lib/routes.js'
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

export function StoreProvider({ children }) {
  const saved = loadPrefs()

  // ---- persisted prefs ----
  // The competition and the open tab come from the URL whenever it names them, so a reload
  // or a shared link opens on the right page; saved prefs are the fallback for a bare "/".
  const route = resolveRoute(currentPath(), currentSearch(), saved)
  const [view, setViewState] = useState(route.view)
  const [dark, setDark] = useState(saved.dark || false)
  const [favs, setFavs] = useState(saved.favs || ['USA', 'BRA'])
  const [notify, setNotify] = useState(saved.notify || false) // match alerts (15 min before kickoff)
  const [league, setLeagueState] = useState(route.league) // ESPN competition slug

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
  const viewRef = useRef(view); viewRef.current = view
  // The open modals are mirrored into refs too, and the actions below update those refs
  // *eagerly* — a handler that closes one modal and opens another (TeamModal's schedule
  // does exactly that) runs both calls before React re-renders, so reading state would
  // rebuild the URL from values one step behind.
  const selRef = useRef(sel); selRef.current = sel
  const sel2Ref = useRef(sel2); sel2Ref.current = sel2
  const selTeamRef = useRef(selTeam); selTeamRef.current = selTeam
  const notifiedRef = useRef(null)
  if (notifiedRef.current === null) notifiedRef.current = new Set() // lazy init — avoid allocating a Set every render

  // Prefs are read through a ref so save() can stay stable across renders — async callbacks
  // (a finished league load, a popstate) persist whatever the latest render knows rather
  // than the values their closure captured.
  const prefsRef = useRef(null); prefsRef.current = { view, dark, favs, notify, league }
  const save = useCallback((patch) => {
    const next = Object.assign({}, prefsRef.current, patch)
    try { localStorage.setItem(PREFS_KEY, JSON.stringify(next)) } catch (e) {}
  }, [])

  // Every action that changes where the user is funnels through here, so the address bar is
  // rebuilt from one place out of the live refs. While `silentRef` is set we're *reacting*
  // to the URL (a Back/Forward press) rather than driving it, and writing would fight the
  // history entry we're restoring.
  const silentRef = useRef(false)
  const syncUrl = (options) => {
    if (silentRef.current) return
    writeRoute({
      league: leagueRef.current, view: viewRef.current,
      match: selRef.current, match2: sel2Ref.current, team: selTeamRef.current,
    }, options)
  }

  // Switching tabs also grabs fresh scores — a lightweight score-only refresh (not a full
  // loadLive), so there's no loading flicker, just up-to-date numbers.
  const setView = (v) => { viewRef.current = v; setViewState(v); save({ view: v }); syncUrl(); refreshScores() }
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
  // Opening a match also dismisses any team modal: the one place that can do both at once is
  // a team's schedule list, where picking a match means "take me there", not "stack it on
  // top". Doing it in one action keeps it to a single history entry, so Back returns to the
  // team rather than to an empty in-between state.
  const openMatch = (m) => {
    if (!m) return
    selRef.current = m.id; sel2Ref.current = null; selTeamRef.current = null
    setSel(m.id); setSel2(null); setSelTeam(null); setModalTab('auto'); setDetail(null); setDetail2(null)
    syncUrl()
    WC_ESPN.detail(m.id, leagueRef.current)
      .then(d => setSel(cur => { if (cur === m.id) setDetail(d); return cur }))
      .catch(() => {})
  }
  // A two-legged tie opens both legs side by side in one dual modal — closing it (backdrop,
  // Escape, or either card's × button all funnel through closeMatch) dismisses both at once.
  const openMatchPair = (m1, m2) => {
    if (!m1 || !m2) return
    selRef.current = m1.id; sel2Ref.current = m2.id; selTeamRef.current = null
    setSel(m1.id); setSel2(m2.id); setSelTeam(null); setModalTab('auto'); setDetail(null); setDetail2(null)
    syncUrl()
    WC_ESPN.detail(m1.id, leagueRef.current)
      .then(d => setSel(cur => { if (cur === m1.id) setDetail(d); return cur }))
      .catch(() => {})
    WC_ESPN.detail(m2.id, leagueRef.current)
      .then(d => setSel2(cur => { if (cur === m2.id) setDetail2(d); return cur }))
      .catch(() => {})
  }
  const closeMatch = () => { selRef.current = null; sel2Ref.current = null; setSel(null); setSel2(null); syncUrl() }

  // `dataset` lets a deep link open a team the moment its competition finishes loading,
  // before the new data has reached state. Call sites pass nothing and get current data.
  const openTeam = (id, dataset) => {
    const d = (dataset && dataset.TEAMS) ? dataset : data
    if (!id || !d) return
    selTeamRef.current = id
    setSelTeam(id)
    setTeamSquad(null)
    syncUrl()
    const tid = d.TEAMS[id] && d.TEAMS[id].tid
    if (tid) {
      setTeamSquadLoading(true)
      // recent played/live matches → used to harvest real player headshots
      const recent = d.MATCHES
        .filter(m => (m.h === id || m.a === id) && (m.status === 'FT' || m.status === 'LIVE'))
        .slice(-3).reverse().map(m => m.id)
      WC_ESPN.teamRoster(tid, recent, leagueRef.current)
        .then(sq => setSelTeam(cur => { if (cur === id) { setTeamSquad(sq); setTeamSquadLoading(false) } return cur }))
        .catch(() => setSelTeam(cur => { if (cur === id) setTeamSquadLoading(false); return cur }))
    } else {
      setTeamSquadLoading(false)
    }
  }
  const closeTeam = () => { selTeamRef.current = null; setSelTeam(null); syncUrl() }

  // ---- what to do once a competition's data arrives ----
  // A modal named in the URL can only be opened once that competition is loaded: the match
  // or team has to exist first, and a stale link shouldn't leave a modal spinning over a
  // match this league doesn't have. Whoever starts a load parks the request here.
  const pendingModalRef = useRef(null)
  // Held in a ref (refreshed every render) so loadLive can stay a stable useCallback while
  // still calling the current version of this.
  const onLoadedRef = useRef(null)
  onLoadedRef.current = (d) => {
    // A competition's real tab set is only known once its data lands — the Champions League
    // has no Bracket tab until the knockout draw is published. If the URL (or a saved pref)
    // asked for a tab this dataset turns out not to have, drop to Today rather than leaving
    // a fallback view up under no highlighted tab.
    if (!viewsForData(d).includes(viewRef.current)) {
      viewRef.current = 'today'
      setViewState('today')
      save({ view: 'today' })
    }

    const want = pendingModalRef.current
    pendingModalRef.current = null
    if (want && (want.match || want.team)) {
      // Open them without writing history: these modals came *from* the URL, so the entry
      // already exists. One replace at the end re-derives the address bar from what actually
      // opened, which quietly drops any id this dataset didn't have.
      silentRef.current = true
      try {
        const find = (id) => d.MATCHES.find(x => String(x.id) === String(id))
        const m1 = want.match ? find(want.match) : null
        const m2 = want.match2 ? find(want.match2) : null
        if (m1 && m2) openMatchPair(m1, m2)
        else if (m1) openMatch(m1)
        if (want.team && d.TEAMS[want.team]) openTeam(want.team, d)
      } finally {
        silentRef.current = false
      }
    }
    syncUrl({ replace: true })
  }

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
      .then(d => {
        if (leagueRef.current !== lg) return
        setData(d); setSource('live')
        onLoadedRef.current(d)
      })
      .catch(() => { if (leagueRef.current === lg) setSource('error') })
  }, [])

  // Switch competitions: persist the choice, clear the old dataset/modals, and reload. The
  // current tab carries over when the new competition also has it, else we land on Today.
  // `wantModals` is only passed when stepping back to a history entry that had a modal open
  // in that league — it's applied once the new dataset can vouch for the ids.
  const applyLeague = (slug, nextView, wantModals) => {
    leagueRef.current = slug
    viewRef.current = nextView
    selRef.current = null; sel2Ref.current = null; selTeamRef.current = null
    pendingModalRef.current = wantModals || null
    setLeagueState(slug)
    setViewState(nextView)
    save({ league: slug, view: nextView })
    setSel(null); setSel2(null); setSelTeam(null); setDetail(null); setDetail2(null); setFilter('all')
    setData(null)
    loadLive(slug)
  }

  const setLeague = (slug) => {
    if (slug === leagueRef.current || !LEAGUES.some(l => l.slug === slug)) return
    const nextView = viewsFor(slug).includes(viewRef.current) ? viewRef.current : 'today'
    applyLeague(slug, nextView)
    syncUrl()
  }

  // Back/forward buttons: re-read the URL and move the app to whatever it now names. Held
  // in a ref refreshed every render (like dataRef above) so the listener can be registered
  // once on mount without ever reading a stale league/view.
  const onPopRef = useRef(null)
  onPopRef.current = () => {
    const r = resolveRoute(currentPath(), currentSearch(), { league: leagueRef.current, view: viewRef.current })
    // A different competition has to reload before its modals mean anything, so hand them to
    // the load; everything else we can apply right now against the data already in hand.
    if (r.league !== leagueRef.current) { applyLeague(r.league, r.view, r); return }

    // We're following the address bar here, not driving it — suppress the writes these
    // actions would otherwise make, or they'd push new entries over the one we're restoring.
    silentRef.current = true
    try {
      if (r.view !== viewRef.current) { viewRef.current = r.view; setViewState(r.view); save({ view: r.view }); refreshScores() }

      const d = dataRef.current
      if (r.match !== selRef.current || r.match2 !== sel2Ref.current) {
        const find = (id) => (d ? d.MATCHES.find(x => String(x.id) === String(id)) : null)
        const m1 = r.match ? find(r.match) : null
        const m2 = r.match2 ? find(r.match2) : null
        if (m1 && m2) openMatchPair(m1, m2)
        else if (m1) openMatch(m1)
        else closeMatch()
      }
      if (r.team !== selTeamRef.current) {
        if (r.team && d && d.TEAMS[r.team]) openTeam(r.team, d)
        else closeTeam()
      }
    } finally {
      silentRef.current = false
    }
  }

  // ---- effects ----
  useEffect(() => {
    // Stamp the canonical URL over whatever we arrived on ("/", a bare league, an ESPN slug)
    // so the address bar always reflects where the app actually is, and persist where we
    // landed — arriving by link counts as "where you were" for the next bare "/" visit. The
    // modal ids ride along untouched; they can't be checked until the data is here.
    writeRoute(route, { replace: true })
    save({ league: route.league, view: route.view })
    pendingModalRef.current = { match: route.match, match2: route.match2, team: route.team }
    loadLive()
    // eslint-disable-next-line react-doctor/exhaustive-deps -- loadLive is a stable useCallback chain; this must run once on mount only
  }, [])

  useEffect(() => {
    const onPop = () => onPopRef.current()
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
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
