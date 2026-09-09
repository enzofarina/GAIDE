# Spec: TODO app

> **Status:** draft
> **Author:** enzofarina
> **Date:** 2026-09-09

## Context

The user wants a simple personal task list they can open and use on their iPhone: add tasks, see them, and mark them done. There is no team, no accounts, and no server today — this is a single-user tool for personal use. It is built as a web app (PWA) so it can be added to the iPhone Home Screen and opened like a native app, without requiring a Mac, Xcode, or an Apple Developer account.

## Expected behavior

The application lets a single user create tasks, view them in a list, mark them as done or not done, delete them, and assign each an urgency level (red = urgent, yellow = medium, green = chill). The list is sorted by urgency, red first. A task may optionally have a longer description, collapsed by default and revealed by tapping the task. Tasks are stored on the device itself (browser storage) — there is no login and no server.

### Use cases

1. **Main case — create a task**

   - Given: the task list is open, with or without existing tasks
   - When: the user types text into the "new task" field and submits it
   - Then: a new task appears in the list, shown as not done
2. **Alternative case — mark a task done**

   - Given: a task exists and is not done
   - When: the user marks it (e.g., taps a checkbox)
   - Then: the task is visually shown as done (e.g., checked, struck through) and stays in the list
3. **Alternative case — unmark a task**

   - Given: a task exists and is marked done
   - When: the user unmarks it
   - Then: the task returns to the not-done state
4. **Error case — empty task text**

   - Given: the "new task" field is empty or contains only whitespace
   - When: the user submits it
   - Then: no task is created; the list is unchanged
5. **Edge case — reopening the app**

   - Given: the user has created and/or completed tasks in a previous session
   - When: the user closes and reopens the app (or reloads the page)
   - Then: all tasks reappear exactly as left, including done/not-done state
6. **Edge case — offline use**

   - Given: the app was already opened once on the device
   - When: the user opens it again with no internet connection
   - Then: the app still loads and works normally (create, view, mark done) using on-device data
7. **Alternative case — delete a task**

   - Given: a task exists (done or not done)
   - When: the user swipes it left to reveal a delete control, then taps that control
   - Then: the task is permanently removed from the list and from on-device storage
8. **Alternative case — set urgency on creation**

   - Given: the user is creating a new task
   - When: the user picks an urgency (red/yellow/green), or picks none
   - Then: the task is created with that urgency, or with yellow (medium) if none was picked
9. **Alternative case — change urgency later**

   - Given: a task exists with some urgency level
   - When: the user changes its urgency (e.g., red to green)
   - Then: the task's color updates and it moves to its new position in the sorted list
10. **Main case — list sorted by urgency**

    - Given: tasks exist with a mix of red, yellow, and green urgency
    - When: the user views the list
    - Then: all red tasks appear first, then all yellow, then all green; tasks sharing an urgency keep their relative creation order
11. **Alternative case — add a description**

    - Given: the user is creating a new task
    - When: the user also enters text into an optional "description" field and submits
    - Then: the task is created with that description, initially collapsed (not visible) in the list
12. **Main case — expand a description**

    - Given: a task with a description exists, currently collapsed
    - When: the user taps/clicks the task
    - Then: the description expands and becomes visible below the task
13. **Alternative case — collapse a description**

    - Given: a task's description is currently expanded
    - When: the user taps/clicks the task again
    - Then: the description collapses and is hidden again
14. **Edge case — task with no description**

    - Given: a task was created without a description
    - When: the user views it
    - Then: there is no expand control for it, and tapping the task has no expand/collapse effect

## Acceptance criteria

- [ ] User can add a new task by entering text and submitting it
- [ ] A newly created task appears in the list marked as not done
- [ ] Submitting empty or whitespace-only text does not create a task
- [ ] User can mark a not-done task as done, with a clear visual difference (e.g., checkbox + strikethrough)
- [ ] User can unmark a done task back to not done
- [ ] Tasks (including done/not-done state) persist across app reloads and restarts, using on-device browser storage
- [ ] The app can be added to the iPhone Home Screen (via Safari "Add to Home Screen") and opens full-screen like an app
- [ ] The app remains usable (create, view, mark done) with no internet connection, once it has been loaded at least once
- [ ] Task text is rendered as plain text, never interpreted as HTML/script (no script execution from task content)
- [ ] User can delete a task (done or not done), and it is removed from the visible list
- [ ] A deleted task does not reappear after reloading the app (removed from on-device storage, not just hidden)
- [ ] Deleting a task requires swiping it to reveal a delete control first — a single tap alone never deletes a task
- [ ] User can assign a task one of three urgency levels — red (urgent), yellow (medium), green (chill) — when creating it
- [ ] A task created without an explicit urgency defaults to yellow (medium)
- [ ] User can change a task's urgency at any time after creation
- [ ] Each urgency level is shown with a clearly distinct color (red/yellow/green)
- [ ] Each urgency level is also shown with a distinct icon, so urgency is never conveyed by color alone
- [ ] The task list is sorted by urgency: all red tasks before yellow, all yellow before green
- [ ] Tasks with the same urgency keep a stable relative order (creation order)
- [ ] Urgency and the resulting sort order persist across reloads (on-device storage)
- [ ] User can optionally add a description when creating a task
- [ ] A task's description is hidden (collapsed) by default
- [ ] Tapping/clicking a task with a description expands it, revealing the description
- [ ] Tapping/clicking an expanded task collapses it again
- [ ] A task created without a description shows no expand control and cannot be expanded
- [ ] Description text persists across reloads (on-device storage) and is rendered as plain text, never interpreted as HTML/script

## Out of scope

- Editing a task's text or description after creation
- Undo/recovery after a task is deleted (deletion is immediate and permanent)
- Due dates, reminders, or notifications
- Categories or tags (urgency color is the only classification in scope)
- More than 3 urgency levels, or custom colors
- Sorting/filtering by anything other than urgency (e.g., alphabetical, by done status)
- Screen reader / VoiceOver semantic labeling (deferred; may be added later as its own accessibility pass)
- Multi-user accounts, login, or authentication
- Syncing tasks across multiple devices (each device has its own independent list)
- Any backend server or database
- Android or other non-iOS packaging (only "iPhone via Safari Home Screen" is confirmed as a target)

## Security considerations

- **Data sensitivity:** task text is arbitrary user-entered text. It may incidentally contain personal notes, but the feature does not require or handle credentials, financial data, or other regulated data.
- **Authentication / authorization:** none. This is a single-user, single-device app with no login — anyone with access to the unlocked device (Safari on that iPhone) can read and edit the tasks. This mirrors any other app on the phone and is not treated as a gap here; it is explicitly out of scope to add a device-level lock.
- **Abuse cases:**
  - A hostile task's title or description containing HTML/script tags being executed when rendered (self-XSS via pasted content) → covered by the negative acceptance criteria requiring both fields to render as plain text, never interpreted as HTML/script
  - Someone else picking up the unlocked phone and reading/editing tasks → mitigated by the device's own passcode/biometric lock, which is outside this app's control (documented, not solved, here)

## Dependencies

- **Other specs:** none
- **External systems:** none — no backend, no third-party APIs
- **Libraries:** none required beyond the browser's built-in storage APIs; any framework choice is an implementation decision for `plan.md`

## Constitution adherence

- **Principle 1 (Spec before code):** this spec is written and must be approved before implementation ✓
- **Principle 2 (Tests track behavior):** the acceptance criteria above will be mapped to tests via the `test-generator` skill before implementation is marked complete
- **Principle 3 (Human approval):** HIC mode preserved — implementation waits for explicit approval of this spec, then of `plan.md` and `tasks.md`
- **Principle 6 (Secrets):** no secrets are introduced; on-device storage holds only task text
- **Principle 7 (Atomic changes):** implementation will be split into atomic tasks in `tasks.md`
- **Principle 8 (Fail visibly):** if on-device storage fails to save (e.g., storage quota exceeded), the user must see an error rather than silently losing the task — to be captured as an implementation task

## Identified risks

- **Risk:** iOS Safari can evict on-device (localStorage-type) data during storage pressure or long periods of disuse → **Mitigation:** document this limitation to the user now; a manual export/import safety net can be scoped as a future feature if it becomes a problem
- **Risk:** losing or resetting the phone loses all tasks, since nothing is backed up elsewhere → **Mitigation:** explicitly accepted for v1 (see Out of scope); revisit if the user later wants cross-device sync
