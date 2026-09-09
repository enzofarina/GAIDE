# ADR 0004 — TODO app: vanilla JS static PWA, no framework, no build step

- **Status:** accepted
- **Date:** 2026-09-09
- **Decision-makers:** enzofarina

## Context

`specs/todo-app/spec.md` defines a single-user personal task list: create tasks, mark them done/undone, delete them, assign a red/yellow/green urgency (list sorted by it), and attach an optional collapsible description. There is no login, no multi-device sync, and explicitly no backend server or database — all state lives in the browser's on-device storage. The primary target is opening the app on an iPhone via Safari and adding it to the Home Screen, where it must also work offline once loaded.

The app's entire surface is one list view with four interactions on it. Nothing in the spec requires client-side routing, complex state management, server rendering, or a component ecosystem.

## Decision

We will build the TODO app as a static, framework-free web app: plain HTML, CSS, and JavaScript, served as static files with no bundler, transpiler, or package-manager build step. Persistence uses `localStorage` directly. Installability and offline use come from a hand-written `manifest.json` and a minimal service worker that caches only the static app shell.

## Alternatives considered

- **A frontend framework (React, Vue, Svelte, etc.):** gives component structure and a larger ecosystem, but requires a build toolchain (bundler, transpiler, `node_modules`) for an app with one view and no routing. Rejected: the setup and dependency surface outweigh the benefit at this size, and it works against the constitution's bias against premature abstraction.
- **A meta-framework / static site generator (Next.js, Astro, etc.):** same build-step cost as above, plus features (SSR, multi-page routing, data fetching) this app has no use for. Rejected for the same reason.
- **Vanilla JS with a build step (Vite, esbuild) but no framework:** would enable modern JS module syntax and a dev server, at the cost of a `package.json`/toolchain for a handful of files. Rejected for now — nothing in the spec needs bundling; plain `<script>` tags are sufficient. Revisit if the codebase grows enough to need modules (see Future review).

## Consequences

### Positive
- Zero install/build step: clone the repo, open `index.html` (or serve the folder), it runs — matches "no Mac/Xcode/Developer account needed" from the spec's Context
- No dependency surface to patch, audit, or go stale (Constitution Principle 6/10 have nothing to act on here)
- Smallest possible thing that satisfies the spec — no abstraction the app doesn't need yet

### Negative (accepted costs)
- No component model or reactive state library: rendering logic (list diffing, re-render on state change) is hand-written in `app.js` and must stay disciplined as features grow
- No built-in dev ergonomics (hot reload, JSX, TypeScript checking) that a modern toolchain would provide
- If the app grows meaningfully past its current scope, this decision will need revisiting rather than scaling gracefully on its own

### Neutral
- Deployment is just static file hosting (or none — can run from the filesystem/Safari directly); this simplifies hosting but was not itself a driver of the decision

## Constitution adherence

- **Principle 5 (Architectural decisions become ADRs):** this ADR records the stack choice before implementation, per `plan.md`
- **Principle 6 (Secrets never enter the repo):** no build tooling or package manager means no dependency-lockfile/secrets surface to manage
- **Principle 7 (Atomic changes) / general bias against premature abstraction:** chosen specifically because it is the smallest architecture that satisfies the current spec, not one sized for hypothetical future requirements

## Future review

Revisit this decision if any of the following happen:
- The spec grows to need multiple views/routes, shared component state across views, or server-side data (any of these push toward a framework or at least a build step)
- `app.js` becomes hard to maintain by hand (a concrete sign: rendering logic needs its own diffing to stay correct)
- The project adds a second app/surface that would benefit from sharing UI components with this one
