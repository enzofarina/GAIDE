// Data layer only (Task 3). No top-level window/document reference — must be
// importable in plain Node so tests/todo-app/data-layer.test.js can run it
// without a DOM. Rendering/event wiring (Tasks 5-9, 12) extend this file
// from inside functions called after the module loads, not at load time.

export const STORAGE_KEY = 'gaide-todo-tasks';

const URGENCY_RANK = { red: 0, yellow: 1, green: 2 };

export function createTask({ text, description = '', urgency = 'yellow' } = {}) {
  const trimmedText = typeof text === 'string' ? text.trim() : '';
  if (!trimmedText) return null;

  return {
    id: crypto.randomUUID(),
    text: trimmedText,
    description,
    urgency: urgency || 'yellow',
    done: false,
    createdAt: Date.now(),
  };
}

export function sortTasks(tasks) {
  return [...tasks].sort((a, b) => {
    const rankDiff = URGENCY_RANK[a.urgency] - URGENCY_RANK[b.urgency];
    return rankDiff !== 0 ? rankDiff : a.createdAt - b.createdAt;
  });
}

export function toggleDone(task) {
  return { ...task, done: !task.done };
}

export function setUrgency(task, urgency) {
  return { ...task, urgency };
}

export function deleteTask(tasks, id) {
  return tasks.filter((task) => task.id !== id);
}

export function loadTasks(storage) {
  const raw = storage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveTasks(storage, tasks) {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    return { ok: true };
  } catch (error) {
    return { ok: false, error };
  }
}

// --- Storage-failure UX (Task 10) ---------------------------------------
// Constitution Principle 8: a failed write must be visible, never silent.
// Every mutation funnels through here instead of calling saveTasks directly.
function persistTasks(doc, storage, tasks) {
  const banner = doc.querySelector('[data-testid="storage-error"]');
  const result = saveTasks(storage, tasks);
  banner.hidden = result.ok;
  if (!result.ok) banner.textContent = "Couldn't save your changes. Please try again.";
  return result;
}

// --- Rendering (Task 5) ------------------------------------------------
// Shapes, not just color, distinguish urgency (colorblind-accessible per the
// spec review); CSS layers color on top via .urgency-{level} on the row.
const URGENCY_ICON = { red: '▲', yellow: '■', green: '●' };
const URGENCY_LABEL = { red: 'Red — urgent', yellow: 'Yellow — medium', green: 'Green — chill' };

function updateTask(doc, storage, id, updater) {
  const tasks = loadTasks(storage).map((t) => (t.id === id ? updater(t) : t));
  persistTasks(doc, storage, tasks);
  return tasks;
}

function renderTaskRow(doc, storage, task) {
  const row = doc.createElement('li');
  row.dataset.testid = 'task';
  row.dataset.taskId = task.id;
  row.className = `task urgency-${task.urgency}${task.done ? ' done' : ''}`;

  const doneWrap = doc.createElement('span');
  doneWrap.className = 'task-done';
  const checkbox = doc.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.checked = task.done;
  checkbox.setAttribute('aria-label', 'Mark done');
  // Updates this row in place rather than going through renderTaskList: done
  // never changes sort position, and interactions.test.js holds a reference
  // to this exact <li> across the click, so it must not be replaced.
  checkbox.addEventListener('click', () => {
    updateTask(doc, storage, task.id, toggleDone);
    row.classList.toggle('done', checkbox.checked);
  });
  doneWrap.appendChild(checkbox);
  row.appendChild(doneWrap);

  const icon = doc.createElement('span');
  icon.className = 'urgency-icon';
  icon.setAttribute('aria-hidden', 'true');
  icon.textContent = URGENCY_ICON[task.urgency] ?? URGENCY_ICON.yellow;
  row.appendChild(icon);

  const urgencyPicker = doc.createElement('select');
  urgencyPicker.className = 'urgency-picker';
  urgencyPicker.dataset.testid = 'urgency-picker';
  urgencyPicker.setAttribute('aria-label', 'Change urgency');
  for (const level of ['red', 'yellow', 'green']) {
    const option = doc.createElement('option');
    option.value = level;
    option.textContent = URGENCY_LABEL[level];
    urgencyPicker.appendChild(option);
  }
  urgencyPicker.value = task.urgency;
  // Urgency changes sort position, so this goes through a full re-render
  // (unlike the done-toggle above); interactions.test.js re-queries the DOM
  // afterwards rather than holding a stale row reference across this one.
  urgencyPicker.addEventListener('change', () => {
    const tasks = updateTask(doc, storage, task.id, (t) => setUrgency(t, urgencyPicker.value));
    renderTaskList(doc, storage, tasks);
  });
  row.appendChild(urgencyPicker);

  const text = doc.createElement('span');
  text.className = 'task-text';
  text.textContent = task.text;
  row.appendChild(text);

  // Absent entirely (not just hidden) when there's no description, so a
  // plain task never renders a dead expand control (C25).
  if (task.description) {
    const description = doc.createElement('div');
    description.className = 'description';
    description.dataset.testid = 'description';
    description.hidden = true;
    description.textContent = task.description;
    row.appendChild(description);
  }

  attachSwipeToDelete(doc, storage, task, row);

  // Ignore clicks that originate on an interactive control (checkbox,
  // urgency picker, delete button) — only a tap on the row's own surface
  // toggles the description. A task without one has nothing to toggle.
  // If the delete control is currently revealed, a tap elsewhere on the
  // row dismisses it instead of also toggling the description — otherwise
  // there'd be no way to put it away short of a full reverse swipe.
  row.addEventListener('click', (event) => {
    if (event.target.closest('input, select, button')) return;

    const deleteControl = row.querySelector('[data-testid="delete-control"]');
    if (deleteControl) {
      deleteControl.remove();
      return;
    }

    const description = row.querySelector('[data-testid="description"]');
    if (!description) return;
    description.hidden = !description.hidden;
  });

  return row;
}

// --- Swipe-to-delete (Task 8) -------------------------------------------
const SWIPE_REVEAL_THRESHOLD = 40; // px of leftward drag before the delete control appears

// Real touch events carry event.touches; the DOM has no TouchEvent
// constructor in jsdom, so tests simulate touches via a CustomEvent with
// { detail: { touches } } instead — this reads either shape, so the same
// handler works against a real iPhone and against the test suite.
function touchX(event) {
  const touch = event.touches ? event.touches[0] : event.detail?.touches?.[0];
  return touch ? touch.clientX : null;
}

function createDeleteControl(doc, storage, task, row) {
  const deleteControl = doc.createElement('button');
  deleteControl.type = 'button';
  deleteControl.className = 'delete-control';
  deleteControl.dataset.testid = 'delete-control';
  deleteControl.setAttribute('aria-label', 'Delete task');
  deleteControl.textContent = 'Delete';
  deleteControl.addEventListener('click', () => {
    const tasks = deleteTask(loadTasks(storage), task.id);
    persistTasks(doc, storage, tasks);
    renderTaskList(doc, storage, tasks);
  });
  return deleteControl;
}

function attachSwipeToDelete(doc, storage, task, row) {
  let startX = null;

  row.addEventListener('touchstart', (event) => {
    startX = touchX(event);
  });

  row.addEventListener('touchmove', (event) => {
    if (startX === null) return;
    const currentX = touchX(event);
    if (currentX === null) return;

    // Synced continuously to the current drag, not just "reveal once and
    // never again" — swiping back right past the threshold within the same
    // gesture hides it, matching the standard swipe-to-delete pattern.
    const shouldReveal = startX - currentX >= SWIPE_REVEAL_THRESHOLD;
    const existing = row.querySelector('[data-testid="delete-control"]');
    if (shouldReveal && !existing) {
      row.appendChild(createDeleteControl(doc, storage, task, row));
    } else if (!shouldReveal && existing) {
      existing.remove();
    }
  });

  row.addEventListener('touchend', () => {
    startX = null;
  });
}

export function renderTaskList(doc, storage, tasks) {
  const list = doc.querySelector('[data-testid="task-list"]');
  list.replaceChildren(...sortTasks(tasks).map((task) => renderTaskRow(doc, storage, task)));
}

// --- Create-task form (Task 6) -----------------------------------------

function handleCreateSubmit(event, doc, storage) {
  event.preventDefault();
  const form = event.currentTarget;

  const task = createTask({
    text: form.querySelector('[data-testid="new-task-text"]').value,
    description: form.querySelector('[data-testid="new-task-description"]').value,
    urgency: form.querySelector('[data-testid="new-task-urgency"]').value,
  });
  if (!task) return; // empty/whitespace-only text (C3) — no-op, nothing to save or render

  const tasks = [...loadTasks(storage), task];
  persistTasks(doc, storage, tasks);
  renderTaskList(doc, storage, tasks);
  form.reset();
}

export function initApp(doc, storage) {
  renderTaskList(doc, storage, loadTasks(storage));

  doc
    .querySelector('[data-testid="new-task-form"]')
    .addEventListener('submit', (event) => handleCreateSubmit(event, doc, storage));
}

if (typeof document !== 'undefined' && typeof localStorage !== 'undefined') {
  initApp(document, localStorage);

  // jsdom (this project's test DOM) has no Service Worker API at all, so
  // 'serviceWorker' in navigator is false there — this is a safe no-op
  // under tests, and only registers on an actual browser.
  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
    navigator.serviceWorker.register('service-worker.js').catch(() => {});
  }
}
