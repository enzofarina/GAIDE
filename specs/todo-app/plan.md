
# Plan: TODO app

> **Prerequisite:** `spec.md` approved.

## Architectural decisions

- **No framework, no build step — vanilla HTML/CSS/JS static app:** the app is small (one list, four interactions, no routing) and must run entirely client-side with zero backend. A framework/bundler would add setup and dependency surface for no real benefit here. — **ADR required** (stack choice, Constitution Principle 5). See `docs/adr/0004-vanilla-js-static-pwa.md` (to be created via `adr-writer`).
- **Single localStorage key holding a JSON array of tasks** (`{id, text, description, urgency, done, createdAt}`), read/written through a small data-layer module — minor decision, no ADR.
- **Sort = urgency rank, then stable native `Array.prototype.sort`** (stable since ES2019) for the creation-order tie-break, rather than a hand-rolled sort — minor decision, no ADR.
- **PWA installability via `manifest.json` + a minimal service worker** that caches only the static app shell (HTML/CSS/JS), not task data — required directly by the spec's Home-Screen-install and offline acceptance criteria, not a discretionary choice — minor decision, no ADR.
- **Render all user text via `textContent`, never `innerHTML`** — the mechanism behind the spec's "no script execution from task content" criteria — minor decision, no ADR.
- **Static hosting on GitHub Pages, published by a GitHub Actions workflow from `src/todo-app/`** — needed for a real HTTPS URL (required for service worker/installability) without duplicating the app into `/docs`. Reversible, no long-term lock-in — minor decision, no ADR.
- **Service worker cache versioning is a manual `CACHE_NAME` bump** (e.g. `todo-v1` → `todo-v2`), not automatic hashing — keeps ADR 0004's "no build step" intact. Every future task that edits `index.html`/`style.css`/`app.js` must also bump it, or updates won't reach an already-installed phone.

## Affected components

- `src/todo-app/index.html` — app shell: task list, new-task form (text, optional description, urgency picker)
- `src/todo-app/style.css` — layout, urgency colors, expand/collapse and done/not-done visual states
- `src/todo-app/app.js` — data layer (localStorage CRUD, sort) + rendering + event wiring
- `src/todo-app/manifest.json` — PWA manifest (name, icons, standalone display) for Home Screen install
- `src/todo-app/service-worker.js` — caches the app shell for offline load
- `src/todo-app/icons/` — Home Screen icon assets + per-urgency icons (red/yellow/green)
- `.github/workflows/deploy-pages.yml` — publishes `src/todo-app/` to GitHub Pages on push to `main`
- `tests/todo-app/` — tests derived from the spec's 26 acceptance criteria
- `docs/adr/0004-vanilla-js-static-pwa.md` — the framework-free decision

## Implementation sequence

1. **ADR 0004** — record the vanilla-JS/static-PWA decision via the `adr-writer` skill
2. **Red tests** — generate tests via the `test-generator` skill from `spec.md`
3. **Data layer** — task model, localStorage read/write/CRUD, urgency-then-creation-order sort, storage-failure handling
4. **App shell & styles** — layout, iOS safe-area insets (`viewport-fit=cover` + `env(safe-area-inset-*)`), 16px+ form inputs (avoids iOS auto-zoom), 44×44pt minimum touch targets
5. **Rendering** — list rendering: urgency color + icon, done/not-done state, collapsed/expanded description
6. **Create form** — text input (required), description input (optional), urgency picker (defaults to green/chill)
7. **Interactions** — mark done/undone, change urgency — each wired to the data layer + re-render
8. **Swipe-to-delete** — swipe-left gesture reveals a delete control; tapping it deletes; guards against accidental single-tap deletion
9. **Expand/collapse** — description toggle
10. **PWA shell** — `manifest.json`, iOS meta tags (`apple-mobile-web-app-capable`, `apple-touch-icon`, status-bar style), `service-worker.js` with versioned `CACHE_NAME`, icons
11. **Deployment** — `.github/workflows/deploy-pages.yml` publishing `src/todo-app/` to GitHub Pages
12. **Verification** — all tests green; manual pass on a physical iPhone against the live Pages URL (see Sprint contract); `code-reviewer` skill

## Testing strategy

- **Unit:** data-layer functions in isolation — add/delete/toggle-done/set-urgency/sort comparator, storage-failure path
- **DOM/integration:** create → appears not-done and green by default; mark/unmark done → visual + storage state; delete → removed from DOM and storage; expand/collapse toggles description visibility; changing urgency re-sorts the list
- **Persistence:** simulate a reload (re-read from localStorage into a fresh render) and confirm tasks, urgency, done-state, and descriptions all match
- **Security:** create a task with `<script>` tags in title and description, assert it renders as literal text and never executes
- **Manual (device):** install to iPhone Home Screen via Safari from the live GitHub Pages URL; confirm full-screen launch with no browser chrome, content not obscured by the notch or home indicator, urgency icons visible, swipe-to-delete works; open in Airplane Mode after first load

## Implementation risks

- **Risk:** localStorage read/write can throw (quota exceeded, Safari private mode) and silently drop a task — **Mitigation:** wrap storage calls in try/catch and show a visible error (Constitution Principle 8), per spec's Identified risks
- **Risk:** iOS Safari can evict script-writable storage after ~7 days of disuse (ITP) — **Mitigation:** already documented as an accepted limitation in `spec.md`; no code fix in this iteration
- **Risk:** a hand-written sort could silently become unstable under refactors — **Mitigation:** rely on native `Array.prototype.sort` only; cover with a unit test asserting tie-break order
- **Risk:** a future code change ships without bumping the service worker's `CACHE_NAME`, so an already-installed phone silently keeps serving the old version — **Mitigation:** call out the bump explicitly in every task touching app files (see Architectural decisions); check for it in code review
- **Risk:** an edge-originating swipe gesture could be intercepted by iOS Safari's own back/forward navigation gesture instead of the app's swipe-to-delete — **Mitigation:** trigger swipe-to-delete only from a horizontal drag starting on the task row itself, not from the screen edge; verify manually on-device

## Sprint contract

> Agreed before implementation; the reviewer checks each item one by one.

- [ ] Add a task with text only → appears in the list, not done, green (default urgency) — verify by: open the app, add a task, inspect it
- [ ] Add a task with urgency=red and a description → appears above existing yellow/green tasks, description hidden — verify by: add it, check its position and that no description text is visible
- [ ] Tap a task with a description → expands; tap again → collapses — verify by: manual tap test
- [ ] Mark a task done, then unmark it → visual state toggles both ways — verify by: manual test
- [ ] Swipe a task left, tap the revealed delete control → disappears immediately from the list; a plain tap alone never deletes it — verify by: manual test
- [ ] Reload the page → all tasks, urgencies, done-state, and descriptions match exactly what was left — verify by: reload and compare
- [ ] The live GitHub Pages URL loads the app over HTTPS — verify by: open the Actions-deployed URL in a browser
- [ ] Add to Home Screen from Safari (from the live URL), open it, then enable Airplane Mode and reopen → app still loads and works fully, full-screen with no browser chrome — verify by: manual test on a physical iPhone
- [ ] Content is not obscured by the notch or home indicator — verify by: visual check on a physical iPhone
- [ ] Each urgency level shows a distinct icon, not just a color — verify by: visual check
- [ ] Create a task titled `<script>alert(1)</script>` → renders as literal text, no alert fires — verify by: manual test / DOM assertion

## Definition of Done

- [ ] All 26 spec acceptance criteria have green tests
- [ ] ADR 0004 recorded and referenced in the code
- [ ] `code-reviewer` skill ran without blockers
- [ ] Human review approved
- [ ] Deployed and reachable at the GitHub Pages URL
- [ ] Manually verified on a physical iPhone (Home Screen install + offline use)
- [ ] No secrets, no new external dependencies
