// DOM/integration tests via jsdom loading the real index.html + app.js.
// Covers spec criteria: C2, C16, C17, C18, C22, C25.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loadApp, STORAGE_KEY, submitForm } from './helpers/load-app.js';

describe('C2: a newly created task appears in the list as not done', () => {
  test('submitting the new-task form adds a not-done row', async () => {
    const window = await loadApp();
    const { document } = window;
    document.querySelector('[data-testid="new-task-text"]').value = 'Water the plants';
    submitForm(document.querySelector('[data-testid="new-task-form"]'));

    const rows = document.querySelectorAll('[data-testid="task"]');
    assert.equal(rows.length, 1);
    assert.equal(rows[0].querySelector('input[type=checkbox]').checked, false);
  });
});

describe('C16 + C17: urgency shown with both a distinct color and a distinct icon', () => {
  test('red, yellow, and green tasks each carry a distinct color class and icon content', async () => {
    const window = await loadApp({
      seedTasks: [
        { id: '1', text: 'r', description: '', urgency: 'red', done: false, createdAt: 1 },
        { id: '2', text: 'y', description: '', urgency: 'yellow', done: false, createdAt: 2 },
        { id: '3', text: 'g', description: '', urgency: 'green', done: false, createdAt: 3 },
      ],
    });
    const rows = window.document.querySelectorAll('[data-testid="task"]');
    const colorClasses = [...rows].map(
      (row) => [...row.classList].find((c) => c.startsWith('urgency-')),
    );
    assert.deepEqual(colorClasses, ['urgency-red', 'urgency-yellow', 'urgency-green']);

    const icons = [...rows].map((row) => row.querySelector('.urgency-icon').textContent.trim());
    // Icons must differ per level — color must not be the only distinguishing signal.
    assert.equal(new Set(icons).size, 3);
  });
});

describe('C18: the rendered list order follows urgency (red, then yellow, then green)', () => {
  test('seeded out-of-order tasks render sorted', async () => {
    const window = await loadApp({
      seedTasks: [
        { id: '1', text: 'green one', description: '', urgency: 'green', done: false, createdAt: 1 },
        { id: '2', text: 'red one', description: '', urgency: 'red', done: false, createdAt: 2 },
        { id: '3', text: 'yellow one', description: '', urgency: 'yellow', done: false, createdAt: 3 },
      ],
    });
    const texts = [...window.document.querySelectorAll('[data-testid="task"]')].map(
      (row) => row.textContent,
    );
    assert.ok(texts[0].includes('red one'));
    assert.ok(texts[1].includes('yellow one'));
    assert.ok(texts[2].includes('green one'));
  });
});

describe('C22 + C25: description starts collapsed; no expand control without one', () => {
  test('a task with a description renders it hidden by default', async () => {
    const window = await loadApp({
      seedTasks: [
        {
          id: '1', text: 'has details', description: 'the fine print',
          urgency: 'yellow', done: false, createdAt: 1,
        },
      ],
    });
    const description = window.document.querySelector('[data-testid="description"]');
    assert.ok(description, 'description element should exist');
    assert.equal(description.hidden, true);
  });

  test('a task with no description has no expand control at all', async () => {
    const window = await loadApp({
      seedTasks: [
        { id: '1', text: 'plain task', description: '', urgency: 'yellow', done: false, createdAt: 1 },
      ],
    });
    assert.equal(window.document.querySelector('[data-testid="description"]'), null);
  });
});

// STORAGE_KEY is re-exported from the helper purely so this file's imports
// double as a smoke check that the fixed storage key name stays in sync.
test('sanity: fixed storage key name matches the documented contract', () => {
  assert.equal(STORAGE_KEY, 'gaide-todo-tasks');
});
