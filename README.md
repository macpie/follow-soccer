# Follow Soccer

A responsive, fully-interactive multi-league soccer tracker built as a real **React (Vite)**
app. Switch between the **FIFA World Cup** and eight club competitions and get live scores,
standings, squads, and a full match center — all from ESPN's public API, with no backend.

> Originally recreated from the `design_handoff_worldcup_tracker` prototype (recreate, not
> port, the design-component runtime), then extended into a multi-league app.

## Leagues

A header dropdown (league name on the left, country on the right) switches competitions; the
choice is persisted to `localStorage` and defaults to the World Cup.

World Cup · Premier League · La Liga · Serie A · Bundesliga · Ligue 1 · MLS · Liga MX ·
Champions League.

Any ESPN soccer slug works — see `LEAGUES` in `src/data/wc-espn.js`.

## Features

- **Today** — hero with live stats for the selected competition, featured live-match card,
  follow-a-team cards, today's results, and up-next fixtures.
- **Matches** — fixtures grouped by date (auto-scrolled to today). The World Cup adds
  Group A–L filter chips; club leagues show All / Live / Upcoming.
- **Table** *(club leagues)* — one ranked standings table (P W D L GD Pts) from ESPN's
  official table; multi-section competitions (MLS conferences) are merged by points.
- **Groups + Bracket** *(World Cup only)* — 12 group cards with **runtime-computed**
  standings, and a horizontally-scrolling Round of 32 → Final with a third-place race.
- **Stats** — multi-category leaderboards (goals, assists, shots, saves, cards, passes…).
- **Teams** — alphabetical club/nation list with a **search box** (name, code, or group)
  and a ★ follow toggle.
- **Team modal** — opens in place from any crest/flag. **Squad** tab shows the full roster
  (headshot with nationality-flag fallback, jersey, position, age, height, injury status)
  plus the team's record and league standing; **Schedule** tab opens the match center.
- **Match modal** — a full match center: Summary (goal timeline with assists), Lineups
  (XIs on a pitch by formation), Stats, Form, head-to-head, broadcasts. A **live** match
  refreshes itself every 30s.
- **Match alerts** — opt-in browser notifications 15 minutes before a followed team kicks
  off (foreground only — see note below).
- **Mobile** — bottom tab bar with icons; the top pill nav is used on desktop.
- **Theming & prefs** — light/dark theme, favourites, and league, persisted to `localStorage`.

### Data — ESPN public API only

All data (fixtures, scores, standings, leaders, lineups, match stats, squads, crests) comes
**live from ESPN's public API**. There is **no bundled sample data** and **no API key or CORS
proxy** — ESPN sends `Access-Control-Allow-Origin: *`, so the browser calls it directly. On
load the app fetches the selected league's season, then renders and polls scores every 30s
(paused when the tab is hidden); if ESPN can't be reached it shows a Retry screen.

> ESPN's API is **undocumented/unofficial** and can change without notice. Two known data
> caveats: the **coach** field is stale (frozen ~2012–2016 for clubs) so it is not shown, and
> player **headshots** exist for only ~15% of players (harvested from match summaries; the
> rest fall back to a nationality flag).

### Notifications caveat

Match alerts use the `Notification` constructor and a foreground timer, so they don't fire
reliably on mobile (iOS Safari requires an installed PWA + service worker; Android Chrome
needs `ServiceWorkerRegistration.showNotification`). They work best with the app open on
desktop. Making them reliable on mobile would require a service worker and the Push API.

## Run

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build → dist/
npm start        # serve the built dist/ on $PORT (defaults to 3000)
```

`npm run build` emits a self-contained static bundle in `dist/`. Since the app talks to ESPN
directly from the browser (no backend, no env vars, no secrets), `dist/` can be served by any
static host or CDN. `npm start` (`serve -s dist -l $PORT`) is a simple production server with
SPA fallback if you prefer to run a Node process.

## Architecture

| Path | Role |
| --- | --- |
| `src/data/wc-espn.js` | The single data source for every league — normalizes ESPN scoreboard/standings/leaders/summary/roster into the app's internal shape. Exposes `LEAGUES`, `load(slug)`, `refreshLive(matches, slug)`, `detail(matchId, slug)`, `teamRoster(teamId, matchIds, slug)`. No key/proxy. |
| `src/store.jsx` | React context store: state (incl. `league`), persistence, loading/error, 30s score polling, live match-detail polling, match alerts, and derived helpers (scores, WC standings/third-place). |
| `src/theme.js` | Light/dark design tokens. |
| `src/lib/` | Pure helpers — runtime WC standings/third-place computation, formation rows, live-clock label, color/date utils. |
| `src/components/` | Header (+ league dropdown, tab icons), atoms (badge/star/pill), match row, match modal, team modal, icons. |
| `src/views/` | Today / Matches / Table / Groups / Bracket / Stats / Teams. |

The dataset carries a `grouped` flag (true only for the World Cup). It drives which tabs show
(Groups+Bracket vs Table), the hero stats, and group labels. Club-league standings come
straight from ESPN's table; the World Cup's group standings and third-place race are computed
from the live match list on every render.

### ESPN endpoints used (all CORS-open, no key)

Paths below use the league slug (`fifa.world`, `eng.1`, `usa.1`, …):

- `site.api.espn.com/.../{slug}/scoreboard?dates={season}` — full fixture list, scores, status, venues, team colours/logos
- `site.api.espn.com/apis/v2/.../{slug}/standings` — the standings table (groups for the WC, conferences/table for clubs)
- `sports.core.api.espn.com/.../{slug}/seasons/{year}/types/1/leaders` — leaderboards (athlete names resolved via `$ref`)
- `site.api.espn.com/.../{slug}/summary?event={id}` — per-match goal events (with assists), lineups, boxscore stats, form, head-to-head, broadcasts
- `site.api.espn.com/.../{slug}/teams/{id}/roster` — full squad (jersey, position, age, nationality, height, injuries); headshots harvested from recent summaries
