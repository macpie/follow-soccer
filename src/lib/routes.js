/* routes.js — the app's URL ↔ state mapping.

   The app is a single page, but the competition and the open tab live in the path
   (/premier-league/matches), so reloading, bookmarking or sharing a link lands exactly
   where you were, and the browser's back button steps back through tabs. localStorage
   prefs are still the fallback for a bare "/" visit.

   The path uses each league's readable `key` ('premier-league') rather than its ESPN slug
   ('eng.1') — nicer to read, and a dev server's SPA fallback treats a dotted last path
   segment as a static file and 404s it instead of serving index.html. Inbound ESPN slugs
   are still accepted (and rewritten to the canonical form on arrival). */
import { LEAGUES, DEFAULT_LEAGUE } from '../data/wc-espn.js'

// Every view the app can show, across all competition shapes.
const ALL_VIEWS = ['today', 'matches', 'bracket', 'groups', 'table', 'stats', 'teams']

// Which tabs a competition exposes, by shape: grouped (World Cup) gets Groups + Bracket, a
// cup with a published knockout draw (Champions League) gets Table + Bracket, and a plain
// league just a Table. This is the single source of truth for both the rendered tab bar and
// which views a URL may name — they can't drift apart.
export function viewsForData(d) {
  if (d && d.grouped) return ['today', 'matches', 'bracket', 'groups', 'stats', 'teams']
  if (d && d.bracket) return ['today', 'matches', 'bracket', 'table', 'stats', 'teams']
  return ['today', 'matches', 'table', 'stats', 'teams']
}

// The same question answered from the league slug alone, for deciding where to route before
// that league's data has loaded. It's optimistic — a cup only grows a bracket once the
// knockout draw is published — so viewsForData() re-checks the view once the data lands.
export function viewsFor(slug) {
  if (slug === 'fifa.world' || slug === 'uefa.nations') return viewsForData({ grouped: true })
  if (slug === 'uefa.champions') return viewsForData({ bracket: true })
  return viewsForData(null)
}

const leagueKey = slug => { const l = LEAGUES.find(x => x.slug === slug); return (l && l.key) || slug }
// A path segment → ESPN slug: readable key first, then the raw slug as an alias.
const slugForSegment = seg => {
  const byKey = LEAGUES.find(l => l.key === seg)
  if (byKey) return byKey.slug
  const bySlug = LEAGUES.find(l => l.slug === seg)
  return bySlug ? bySlug.slug : null
}

// The whole app state the URL carries: which competition, which page, and which modals are
// stacked on top of it. Modals are a query string rather than more path segments because
// they're an overlay on a page (the page underneath stays in the path), and because a
// two-legged tie opens two matches at once, which `?match=a,b` expresses naturally.
function buildUrl(s) {
  const q = []
  // Each id is escaped on its own so the separating comma stays a literal comma — a legal
  // query character, and %2C in the address bar for a two-legged tie just looks broken.
  if (s.match) q.push('match=' + [s.match, s.match2].filter(Boolean).map(encodeURIComponent).join(','))
  if (s.team) q.push('team=' + encodeURIComponent(s.team))
  return '/' + leagueKey(s.league) + '/' + s.view + (q.length ? '?' + q.join('&') : '')
}

// Pull whatever is recognizable out of a path, in either order and ignoring anything else,
// so /premier-league/matches, /matches and /eng.1 all resolve.
function parsePath(pathname) {
  const segs = String(pathname || '').split('/').filter(Boolean).map(s => {
    try { return decodeURIComponent(s).toLowerCase() } catch (e) { return s.toLowerCase() }
  })
  let league = null, view = null
  segs.forEach(seg => {
    const slug = slugForSegment(seg)
    if (slug && !league) league = slug
    else if (!view && ALL_VIEWS.includes(seg)) view = seg
  })
  return { league, view }
}

// The full state to show: the URL wins, saved prefs fill the gaps, and a view that doesn't
// exist in the resolved league falls back to Today. The match/team ids are taken on trust
// here — only the loaded dataset can say whether they're real, so the store drops the ones
// it can't find once the data arrives.
export function resolveRoute(pathname, search, saved) {
  const hit = parsePath(pathname)
  const prefs = saved || {}
  const league = hit.league || (LEAGUES.some(l => l.slug === prefs.league) ? prefs.league : DEFAULT_LEAGUE)
  const allowed = viewsFor(league)
  // A URL naming only a league means that league's default tab — not whatever tab the last
  // visit left behind, which would make the same link open differently per browser.
  const wanted = hit.view || (hit.league ? null : prefs.view)
  const q = new URLSearchParams(String(search || '').replace(/^\?/, ''))
  const ms = (q.get('match') || '').split(',').map(x => x.trim()).filter(Boolean)
  return {
    league,
    view: allowed.includes(wanted) ? wanted : 'today',
    match: ms[0] || null,
    match2: ms[1] || null,
    team: (q.get('team') || '').trim() || null,
  }
}

export const currentPath = () => (typeof window === 'undefined' ? '/' : window.location.pathname)
export const currentSearch = () => (typeof window === 'undefined' ? '' : window.location.search)

// Point the address bar at a league/view/modal state. `replace` rewrites the current entry
// (used to canonicalize the URL on arrival) instead of adding one to the back stack;
// navigating to where we already are is a no-op, so repeat clicks don't stack up duplicate
// history entries. Opening a modal does add one, so Back closes it.
export function writeRoute(state, options) {
  if (typeof window === 'undefined' || !window.history) return
  const loc = window.location
  const next = buildUrl(state) + loc.hash
  if (next === loc.pathname + loc.search + loc.hash) return
  if (options && options.replace) window.history.replaceState(state, '', next)
  else window.history.pushState(state, '', next)
}
