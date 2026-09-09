# Tasks: TODO app

> **Prerequisite:** `plan.md` approved.
>
> Decomposition into **atomic** tasks (~30 min each). Each task has a verifiable completion criterion.
>
> **Status lifecycle:** `pending → in-progress → done → verified`.
> `done` = implemented and its own tests pass. `verified` = checked against the spec's acceptance criteria by someone (or some agent) other than whoever implemented it.
> Status only moves forward when the work actually happened — re-marking tasks to make work *appear* done violates Constitution Principle 9.

---

## Task 1 — Record ADR 0004 (vanilla JS static PWA)

**Status:** done

**Files:** `docs/adr/0004-vanilla-js-static-pwa.md`

**Description:** Record the framework-free/no-build-step stack decision via the `adr-writer` skill.

**Done when:**
- [x] ADR follows the project template
- [x] Alternatives considered and consequences documented

**Estimate:** ~20 min

**Depends on:** —

---

## Task 2 — Generate tests from the spec

**Status:** done

**Files:** `tests/todo-app/README.md`, `tests/todo-app/helpers/load-app.js`, `tests/todo-app/data-layer.test.js`, `tests/todo-app/rendering.test.js`, `tests/todo-app/interactions.test.js`, `tests/todo-app/persistence.test.js`, `tests/todo-app/security.test.js`, `package.json` (new — adds `jsdom` as the only dev dependency, `node --test` as the runner; no framework added to the app itself)

**Description:** Invoked via the `test-generator` skill against `specs/todo-app/spec.md`. 20 of the 26 acceptance criteria have automated tests (Node's built-in test runner + jsdom, zero app-side dependencies). The remaining 6 — C7, C8, and the safe-area/touch-target/icon-visual/swipe-vs-edge-gesture items from `plan.md` — are device/browser-chrome facts jsdom cannot represent; they stay manual, already tracked in `plan.md`'s Sprint Contract and Task 14. See `tests/todo-app/README.md` for the full criterion → test file mapping, the gap list, and the module/DOM interface contract Tasks 3–12 must implement against.

**Done when:**
- [x] Each of the 20 automatable acceptance criteria has at least one matching test; the other 6 are explicitly logged as manual-only (not silently skipped)
- [x] All tests are red — confirmed via `npm install && npm run test:todo-app`: 19 tests, 1 pass (a no-op sanity check unrelated to the app), 18 fail, all `ENOENT`/module-not-found on the not-yet-created `src/todo-app/app.js` and `index.html`

**Estimate:** ~30 min

**Depends on:** —

---

## Task 3 — Data layer: model, storage, sort

**Status:** done

**Files:** `src/todo-app/app.js` (new)

**Description:** Task model (`id, text, description, urgency, done, createdAt`); localStorage read/write/add/delete/toggle-done/set-urgency; urgency-then-creation-order sort using native `Array.prototype.sort`; storage calls wrapped in try/catch.

**Done when:**
- [x] Unit tests pass: add, delete, toggle-done, set-urgency
- [x] Sort places red before yellow before green, and preserves creation order within a tie
- [x] A simulated storage-write failure is caught, not thrown uncaught

**Estimate:** ~45 min

**Depends on:** Task 2

---

## Task 4 — App shell and styles

**Status:** done

**Files:** `src/todo-app/index.html` (new), `src/todo-app/style.css` (new)

**Description:** Static page skeleton: task list container, new-task form (text, description, urgency picker). CSS for urgency colors, done/not-done state, collapsed/expanded description. iOS-specific baseline: `viewport-fit=cover` + `env(safe-area-inset-*)` padding so content clears the notch and home indicator; form inputs at 16px+ font size (prevents iOS Safari's auto-zoom on focus); interactive controls sized to at least 44×44pt (Apple's minimum touch target).

**Done when:**
- [x] Page loads with an empty list and a visible new-task form
- [x] Red/yellow/green colors and done (strikethrough) styles are defined
- [x] Safe-area padding, 16px+ inputs, and 44×44pt touch targets are all in place

**Estimate:** ~40 min

**Depends on:** —

---

## Task 5 — Render the task list

**Status:** done

**Files:** `src/todo-app/app.js`, `src/todo-app/style.css` (icon coloring rules), `tests/todo-app/helpers/load-app.js` (bugfix — see note)

**Description:** Render tasks from the data layer's sorted state: urgency color plus a distinct icon per level (not color alone), done/not-done styling, description collapsed by default. Icons are plain Unicode glyphs (▲/■/●) distinguished by shape, not images — no `icons/` directory needed for this; that path is still expected in Task 12, but for the real Home-Screen/`apple-touch-icon` assets, a different concern than per-task urgency icons.

**Note — bug found and fixed in Task 2's test helper:** `tests/todo-app/helpers/load-app.js` relied on jsdom executing `<script type="module" src="app.js">` the way a real browser does. jsdom never executes module scripts at all (a known jsdom limitation — real Safari has no such restriction), so every seeded-storage test was silently rendering an empty list regardless of implementation. Fixed by having the helper import `app.js` and call its `initApp(document, storage)` entry point directly, the same call a real browser's module-script execution would make. Also had to pin the test window to a concrete `https://` origin — jsdom's `localStorage` throws on the opaque origin a bare `file://` URL produces.

**Done when:**
- [x] List renders in urgency order (red, yellow, green)
- [x] Each task shows its urgency color AND a distinct icon
- [ ] Descriptions are not visible until expanded

**Estimate:** ~35 min

**Depends on:** Task 3, Task 4

---

## Task 6 — Create-task form

**Status:** done

**Files:** `src/todo-app/app.js`, `tests/todo-app/helpers/load-app.js` (bugfix — see note), `tests/todo-app/rendering.test.js`, `tests/todo-app/security.test.js`, `tests/todo-app/persistence.test.js` (bugfix — see note)

**Description:** Wire form submission: required text (reject empty/whitespace), optional description, urgency picker defaulting to yellow if unset. On submit, add via the data layer and re-render.

**Note — second Task 2 test bug found and fixed:** every test that submitted the form used `form.requestSubmit()`, which jsdom also leaves unimplemented — like the module-script gap from Task 5, it logs a warning and never actually fires the `submit` event. Fixed by adding a `submitForm(form)` helper to `load-app.js` that dispatches a real `submit` event directly (`form.dispatchEvent(new Event('submit', {...}))`), and updated the 4 call sites across the 3 test files to use it.

**Done when:**
- [x] Submitting text creates a not-done task
- [x] Empty/whitespace-only text creates nothing
- [x] No urgency picked → task defaults to yellow
- [x] Description field is optional

**Estimate:** ~30 min

**Depends on:** Task 5

---

## Task 7 — Done/undone and change-urgency interactions

**Status:** done

**Files:** `src/todo-app/app.js`

**Description:** Wire per-task controls: toggle done/undone, change urgency. Each calls the data layer and re-renders (re-sorting as needed). Added a per-task `[data-testid="urgency-picker"]` select (not part of Task 5's row markup) since changing urgency after creation needs a control to change it to.

**Design note:** done-toggle updates the existing row's checkbox/class in place rather than going through a full list re-render — done never changes sort position, and a full rebuild would replace the DOM node interactions.test.js holds a reference to across the click. Urgency change *does* affect sort position, so it goes through `renderTaskList` for a full re-render; that test re-queries the DOM afterwards instead of holding a stale reference, so it's unaffected.

**Done when:**
- [x] Marking/unmarking done toggles visual state both ways
- [x] Changing urgency updates the task's color/icon and its position in the sorted list

**Estimate:** ~25 min

**Depends on:** Task 6

---

## Task 8 — Swipe-to-delete

**Status:** done

**Files:** `src/todo-app/app.js`

**Description:** Swiping a task left reveals a delete control; tapping that control deletes the task via the data layer and re-renders. A plain tap never deletes. The gesture is bound directly to the task row's own `touchstart`/`touchmove`/`touchend` (never `document`-level or viewport-edge listeners), so it only ever reacts to a drag that begins on a task — nothing here globally intercepts edge touches, which is what would risk colliding with iOS Safari's own back/forward edge-swipe gesture.

**Note:** `event.touches` (the real `TouchEvent` API) isn't constructible in jsdom, so `interactions.test.js` (Task 2) simulates touches via `CustomEvent` with `detail.touches` instead. The handler reads `event.touches?.[0] ?? event.detail?.touches?.[0]`, so the same code path serves both a real iPhone and the test suite — no test-only branch in the implementation. `src/todo-app/style.css` wasn't touched; Task 4's existing `.task button`/`.delete-control` rules already cover it.

**Done when:**
- [x] Swipe-left reveals a delete control; tapping it removes the task from the DOM and from storage
- [x] A plain tap on the task does not delete it
- [ ] A screen-edge swipe still triggers Safari navigation, not the delete reveal — genuinely device-only, carried to Task 14's manual pass, not checked off here

**Estimate:** ~40 min

**Depends on:** Task 7

---

## Task 9 — Expand/collapse description

**Status:** done

**Files:** `src/todo-app/app.js`

**Description:** Tapping/clicking a task with a description toggles it expanded/collapsed. A task with no description has no expand control and is unaffected by taps.

**Note:** the row's click listener ignores clicks whose target is inside `input, select, button` — otherwise clicking the done checkbox, the urgency picker, or (post-swipe) the delete control would bubble up and also toggle the description, since they all live inside the same row.

**Done when:**
- [x] Tap expands a collapsed description; tap again collapses it
- [x] A task without a description has no expand control and does not react to taps

**Estimate:** ~20 min

**Depends on:** Task 5

---

## Task 10 — Reload persistence and storage-failure UX

**Status:** done

**Files:** `src/todo-app/app.js`, `tests/todo-app/persistence.test.js` (bugfix — see note)

**Description:** Confirm a fresh page load rehydrates the exact prior state (tasks, urgency, done-state, descriptions) from localStorage. Surface a visible error if a storage write fails, instead of silently dropping the task (Constitution Principle 8). Reload persistence itself was already passing as a side effect of Tasks 5–8 (rendering + storage were already correct); this task added the missing piece — `persistTasks(doc, storage, tasks)`, a single choke point all four mutations (create, done-toggle, urgency-change, delete) now go through, which shows/clears the `storage-error` banner based on `saveTasks`'s result.

**Note — third Task 2 test bug found and fixed:** the storage-failure test tried to force a write failure via `window.localStorage.setItem = () => { throw ... }`. jsdom's `Storage` object intercepts plain property assignment and stores it as a literal key/value pair named `"setItem"` — it does not override the method, so the fake failure never actually happened and the real (working) `setItem` ran instead. Fixed by patching `Object.getPrototypeOf(window.localStorage).setItem` (the shared prototype) instead, which jsdom does respect.

**Done when:**
- [x] A simulated reload reproduces the prior list exactly, including a deleted task staying gone
- [x] A simulated storage-write failure shows a visible error to the user

**Estimate:** ~30 min

**Depends on:** Task 3, Task 8

---

## Task 11 — XSS hardening and tests

**Status:** done

**Files:** `src/todo-app/app.js`, `tests/todo-app/security.test.js`

**Description:** Confirm task title and description are rendered via `textContent`, never `innerHTML` or string interpolation into markup. Add tests asserting `<script>`-bearing input renders literally.

**Note:** no new code needed — `renderTaskRow` (Task 5) already used `textContent` exclusively for every user-supplied string from the start, and the tests (Task 2) already existed and were already passing since Task 6 wired the create form. This task's actual work was verification: `grep -n "innerHTML\|insertAdjacentHTML\|outerHTML\|document.write" src/todo-app/app.js` returns zero matches, and `security.test.js` passes in isolation (2/2).

**Done when:**
- [x] A task titled `<script>alert(1)</script>` renders as literal text; no script executes
- [x] Same check passes for the description field

**Estimate:** ~20 min

**Depends on:** Task 6, Task 9

---

## Task 12 — PWA shell: manifest, iOS meta tags, service worker, icons

**Status:** done (code-complete; device-only items carried to Task 14)

**Files:** `src/todo-app/manifest.json` (new), `src/todo-app/service-worker.js` (new), `src/todo-app/icons/icon.svg`, `icon-180.png`, `icon-192.png`, `icon-512.png` (new — generated from the SVG via `rsvg-convert`), `src/todo-app/index.html`, `src/todo-app/app.js` (service worker registration)

**Description:** Web app manifest (name, standalone display, icons). iOS-specific meta tags in `index.html` (`apple-mobile-web-app-capable`, `apple-touch-icon` links, status-bar style) — required for a true full-screen launch on iOS, since Safari's manifest support alone is not sufficient. A minimal service worker caching only the static app shell (not task data), with a versioned `CACHE_NAME` (`todo-v1`) that clears old caches on `activate`.

**Note:** registered the service worker from `app.js`'s existing browser-only guard (`navigator.serviceWorker.register(...)`, no-op when the API is absent — which it is in jsdom, so this doesn't touch the test suite) rather than a separate inline script in `index.html`, to keep all JS in the one file per ADR 0004.

**Done when:**
- [x] Manifest is valid JSON and its icons exist as real PNG files (`icon-192.png`, `icon-512.png`)
- [x] iOS meta tags (`apple-mobile-web-app-capable`, `apple-touch-icon`, status-bar style) are present in `index.html`
- [ ] Adding to Home Screen actually opens full-screen with no browser chrome — device-only, carried to Task 14
- [ ] Service worker actually registers/caches in a real browser, and bumping `CACHE_NAME` evicts the old cache at runtime — jsdom has no Service Worker API at all, so this can't be exercised here; carried to Task 14
- [ ] Reloading with the network disabled still loads the app shell — device-only, carried to Task 14

**Estimate:** ~45 min

**Depends on:** Task 4

**Note:** any later task that edits `index.html`, `style.css`, or `app.js` must also bump `CACHE_NAME` here, or an already-installed phone will keep serving the stale version.

---

## Task 13 — Deploy to GitHub Pages

**Status:** file written; not yet run (needs a push to `main` — see note)

**Files:** `.github/workflows/deploy-pages.yml` (new)

**Description:** GitHub Actions workflow that publishes `src/todo-app/` to GitHub Pages on push to `main`, giving the app a real HTTPS URL (required for the service worker and reliable installability). Triggers on pushes touching `src/todo-app/**` or the workflow file itself, plus manual `workflow_dispatch`. Single job (checkout → configure-pages → upload-pages-artifact → deploy-pages), `pages: write` + `id-token: write` at the workflow level — matches GitHub's own standard Pages-via-Actions template rather than a build/deploy split, since splitting would have put `configure-pages` (which needs write access to auto-enable Pages on a repo where it's never been turned on) in a job that only had read access. Actions pinned to commit SHAs, matching this repo's existing convention in `security.yml`.

**Not done yet — needs your call, not mine:** actually running this requires pushing/merging to `main` (we're on `minhas-notas`), which is a shared-state action I won't take without your say-so. If GitHub Pages has never been enabled on this repo before, the very first run might also need a one-time manual step: Settings → Pages → Build and deployment → Source: "GitHub Actions" (recent GitHub versions often auto-provision this from the workflow itself, but it can still require that manual flip on some repos/orgs).

**Done when:**
- [ ] Workflow runs successfully on push to `main`
- [ ] The published URL serves the app over HTTPS and loads correctly in a browser

**Estimate:** ~30 min

**Depends on:** Task 12

---

## Task 14 — Manual verification on a physical iPhone

**Status:** in-progress — first pass found 2 real bugs, both fixed below; needs a re-test on-device

**Files:** —

**Description:** Exercised the deployed app on an actual iPhone (via the live GitHub Pages URL) by the user directly, not the `verifier` skill — that skill drives a browser via Playwright MCP, which can't control a physical device's Safari, Add-to-Home-Screen flow, or Airplane Mode. Add to Home Screen via Safari, confirm full-screen standalone launch, enable Airplane Mode, confirm create/mark-done/change-urgency/swipe-to-delete/description-expand all work.

**Bugs found on first pass, fixed in `src/todo-app/app.js`/`style.css` (not part of Tasks 1–13's original scope — found only by exercising the real app on the real device):**
- **Swipe-revealed delete control could never be hidden again** — `attachSwipeToDelete`'s `touchmove` handler only ever checked "does it already exist?" and no-opped forever once revealed. Fixed to continuously sync to the current drag: swiping back right past the threshold within the same gesture hides it again, and a plain tap elsewhere on the row also dismisses it. Two new tests added to `interactions.test.js` covering both.
- **Task text rendered as a vertical column of single characters when the row was compressed** (swiping, or a description showing) — `.task` had no `flex-wrap`, so `.description`'s `flex-basis: 100%` couldn't actually drop to a new line; instead it fought `.task-text` for space in one line, and `.task-text`'s default flex `min-width: auto` floor plus `word-break: break-word` rendered the squeeze as one character per line. Fixed with `flex-wrap: wrap` on `.task`, `min-width: 0` on `.task-text`, and `flex-shrink: 0` on `.delete-control` so it holds its size instead of participating in the squeeze. This is a pure CSS/visual fix — not something the DOM-structure-only test suite could have caught, hence why it only surfaced here.
- Bumped `service-worker.js`'s `CACHE_NAME` to `todo-v2` per the standing rule in Task 12/`plan.md`, since both fixes touch cached files.

**Done when:**
- [ ] All Sprint Contract items in `plan.md` are checked on-device, against the live URL
- [ ] Offline behavior after first load is confirmed on the physical device, not just DevTools

**Estimate:** ~25 min

**Depends on:** Task 10, Task 11, Task 13

---

## Task 15 — Code review

**Status:** pending

**Files:** —

**Description:** Run the `code-reviewer` skill over the full diff. Address any blockers.

**Done when:**
- [ ] No remaining blockers
- [ ] Suggestions assessed (accepted or justified)

**Estimate:** ~30 min

**Depends on:** Tasks 3–14

---

## Task 16 — Final verification and merge

**Status:** pending

**Files:** —

**Description:** Confirm all 26 spec criteria are verified, `plan.md`'s Definition of Done is complete, get human approval, then commit.

**Done when:**
- [ ] All 26 acceptance criteria verified (traceability table below fully `verified`)
- [ ] Definition of Done complete

**Estimate:** ~20 min

**Depends on:** Task 15

---

## Traceability

| Spec criterion | Test(s) | Task(s) | Status |
| --- | --- | --- | --- |
| C1: add a new task by entering text | `rendering.test.js`, `data-layer.test.js` | Task 6 | pending |
| C2: new task appears not done | `rendering.test.js` | Task 5, Task 6 | pending |
| C3: empty/whitespace text rejected | `data-layer.test.js` | Task 6 | pending |
| C4: mark task done (visual diff) | `interactions.test.js` | Task 7 | pending |
| C5: unmark a done task | `interactions.test.js` | Task 7 | pending |
| C6: done/not-done persists across reload | `persistence.test.js` | Task 10 | pending |
| C7: installable to iPhone Home Screen, full-screen | *manual only — jsdom can't represent this* | Task 12, Task 13, Task 14 | pending |
| C8: usable offline after first load | *manual only — jsdom can't represent this* | Task 12, Task 13, Task 14 | pending |
| C9: task text renders as plain text (no script) | `security.test.js` | Task 11 | pending |
| C10: delete a task | `interactions.test.js` | Task 8 | pending |
| C11: deleted task does not reappear after reload | `interactions.test.js`, `persistence.test.js` | Task 8, Task 10 | pending |
| C12: delete requires swipe-reveal, not a plain tap | `interactions.test.js` | Task 8 | pending |
| C13: assign urgency (red/yellow/green) at creation | `data-layer.test.js` | Task 6 | pending |
| C14: default urgency is yellow | `data-layer.test.js` | Task 6 | pending |
| C15: change urgency after creation | `data-layer.test.js`, `interactions.test.js` | Task 7 | pending |
| C16: each urgency shows a distinct color | `rendering.test.js` | Task 5 | pending |
| C17: each urgency shows a distinct icon (not color alone) | `rendering.test.js` | Task 5 | pending |
| C18: list sorted red → yellow → green | `data-layer.test.js`, `rendering.test.js` | Task 3, Task 5 | pending |
| C19: same-urgency tasks keep creation order | `data-layer.test.js` | Task 3 | pending |
| C20: urgency/sort order persists across reload | `persistence.test.js` | Task 10 | pending |
| C21: description is optional at creation | `data-layer.test.js` | Task 6 | pending |
| C22: description collapsed by default | `rendering.test.js` | Task 5, Task 9 | pending |
| C23: tap expands description | `interactions.test.js` | Task 9 | pending |
| C24: tap again collapses description | `interactions.test.js` | Task 9 | pending |
| C25: no expand control without a description | `rendering.test.js` | Task 9 | pending |
| C26: description persists across reload, renders as plain text | `persistence.test.js`, `security.test.js` | Task 10, Task 11 | pending |

> Update status as tasks progress, using the same lifecycle (`pending | in-progress | done | verified`). A criterion is `verified` only when exercised against the running application, not just by green unit tests.
> Test files live in `tests/todo-app/`; see `tests/todo-app/README.md` for the full module/DOM interface contract Tasks 3–12 must implement against, and for why C7/C8 (plus the safe-area/touch-target/icon-visual/edge-gesture items in `plan.md`) stay manual-only.
