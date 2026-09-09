# Tests: TODO app

Generated from `specs/todo-app/spec.md` (26 acceptance criteria) per Task 2 in `specs/todo-app/tasks.md`. Runner: Node's built-in `node --test` (no test framework dependency — matches the spirit of ADR 0004). One extra dev-only dependency, `jsdom`, gives these tests a real DOM without a browser; it never ships with the app itself.

Run with: `npm install && npm run test:todo-app`

At this stage (before Task 3+ implementation exists) every test in this directory is expected to fail with a "module/file not found" error — that **is** red, correctly, per the test-generator skill.

## Contract these tests assume `src/todo-app/app.js` will expose

Implementation (Tasks 3–12) must satisfy this interface for these tests to be meaningful — it is the executable contract derived from `plan.md`'s data-layer design:

- **No top-level `window`/`document` references.** `app.js` must be importable in plain Node (no DOM) without throwing, so the pure data-layer functions are unit-testable without jsdom. All DOM work happens inside functions called after the module loads (e.g. an `initApp(document, storage)` entry point), not at module-evaluation time.
- **Storage key:** a single fixed localStorage key, `"gaide-todo-tasks"`, holding a JSON array of task objects.
- **Task shape:** `{ id, text, description, urgency, done, createdAt }` — `urgency` is one of `"red" | "yellow" | "green"`.
- **Exported pure functions** (named exports from `app.js`):
  - `createTask({ text, description, urgency })` → a task object; `urgency` defaults to `"green"` (chill) when omitted/falsy; `description` defaults to `""`; throws/returns `null` for empty-or-whitespace `text`.
  - `sortTasks(tasks)` → new array, urgency rank (red → yellow → green) then stable creation order within a tie. Must use native `Array.prototype.sort` (per `plan.md`).
  - `toggleDone(task)` → new task with `done` flipped.
  - `setUrgency(task, urgency)` → new task with `urgency` changed.
  - `deleteTask(tasks, id)` → new array without the matching task.
  - `loadTasks(storage)` / `saveTasks(storage, tasks)` — `storage` is any object with `getItem`/`setItem` (so tests can inject an in-memory fake or jsdom's `localStorage`). `saveTasks` must not throw on a failing `storage.setItem`; instead it returns `{ ok: false }` (or equivalent) so the caller can show a visible error, per Constitution Principle 8.
- **DOM conventions** (for the integration tests that load `index.html` + `app.js` together via jsdom):
  - Each task renders as an element with `[data-testid="task"]`, containing a `input[type=checkbox]` (done toggle), an element with class `.urgency-icon` (text/attribute distinguishes red/yellow/green — never color alone), and, if it has a description, an element `[data-testid="description"]` that starts `hidden` and toggles on click of the task row.
  - Swipe-to-delete: a horizontal drag (simulated via `touchstart`/`touchmove`/`touchend`) past a threshold reveals `[data-testid="delete-control"]` inside the task; a plain `click` on the row must never remove the task on its own.
  - All user-supplied text (`text`, `description`) is set via `textContent`, never `innerHTML` — this is the mechanism the security tests check.

## Files

| File | Covers |
| --- | --- |
| `data-layer.test.js` | C1, C3, C13, C14, C15, C18, C19, C21 (pure logic, no DOM) |
| `rendering.test.js` | C2, C16, C17, C18, C22, C25 (DOM structure/visuals) |
| `interactions.test.js` | C4, C5, C10, C11, C12, C15, C23, C24 (event wiring) |
| `persistence.test.js` | C6, C11, C20, C26 (reload round-trip + storage-failure UX) |
| `security.test.js` | C9, C26 (XSS: rendered as text, never executed) |

## Known gap — not covered by these automated tests

Six criteria are device/browser-chrome facts that jsdom cannot represent and must stay manual, per `plan.md`'s Testing strategy and `tasks.md` Task 14:

- **C7** (installs to iPhone Home Screen, opens full-screen) and **C8** (works with no internet connection) — need a real Safari install and Airplane Mode, not simulable in jsdom.
- The safe-area/notch handling, the 44×44pt touch targets, and the swipe-vs-Safari-edge-navigation risk from `plan.md`'s Implementation risks — visual/physical device facts.

These remain in the Sprint Contract (`plan.md`) and Task 14's manual pass, not here.
