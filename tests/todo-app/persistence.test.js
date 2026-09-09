// Covers spec criteria: C6, C11, C20, C26 (reload round-trip), plus
// Constitution Principle 8 (fail visibly) via the storage-failure UX check.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loadApp, STORAGE_KEY, submitForm } from './helpers/load-app.js';

describe('C6 + C20: done-state and urgency/sort order survive a reload', () => {
  test('a fresh load reproduces exactly what a prior session left', async () => {
    const seedTasks = [
      { id: '1', text: 'urgent thing', description: '', urgency: 'red', done: false, createdAt: 1 },
      { id: '2', text: 'finished thing', description: '', urgency: 'green', done: true, createdAt: 2 },
    ];
    const window = await loadApp({ seedTasks });

    const rows = [...window.document.querySelectorAll('[data-testid="task"]')];
    assert.equal(rows.length, 2);
    assert.equal(rows[0].textContent.includes('urgent thing'), true);
    assert.equal(rows[0].classList.contains('urgency-red'), true);
    assert.equal(rows[1].querySelector('input[type=checkbox]').checked, true);
  });
});

describe('C11: a deleted task does not come back after reload', () => {
  test('deleting, then reloading against the same storage, keeps it gone', async () => {
    const seedTasks = [
      { id: '1', text: 'to be deleted', description: '', urgency: 'yellow', done: false, createdAt: 1 },
    ];
    const first = await loadApp({ seedTasks });
    const row = first.document.querySelector('[data-testid="task"]');
    const touch = (type, clientX) =>
      row.dispatchEvent(
        new first.CustomEvent(type, { bubbles: true, detail: { touches: [{ clientX, clientY: 10 }] } }),
      );
    touch('touchstart', 200);
    touch('touchmove', 20);
    touch('touchend', 20);
    row.querySelector('[data-testid="delete-control"]').click();

    const persisted = JSON.parse(first.localStorage.getItem(STORAGE_KEY));
    assert.deepEqual(persisted, []);
  });
});

describe('C26: description text persists across reload', () => {
  test('a seeded description reappears on load', async () => {
    const seedTasks = [
      {
        id: '1', text: 'grocery run', description: 'oat milk, not almond',
        urgency: 'yellow', done: false, createdAt: 1,
      },
    ];
    const window = await loadApp({ seedTasks });
    const description = window.document.querySelector('[data-testid="description"]');
    assert.equal(description.textContent, 'oat milk, not almond');
  });
});

describe('Constitution Principle 8: a storage write failure is visible, not silent', () => {
  test('creating a task while storage.setItem throws still shows a visible error', async () => {
    const window = await loadApp();
    // Force the injected storage to fail, the way Task 10's "simulated
    // storage-write failure" scenario in tasks.md describes. Assigning
    // window.localStorage.setItem directly does NOT work in jsdom — its
    // Storage object intercepts plain property assignment and stores it as
    // a literal key/value pair named "setItem" instead of overriding the
    // method. Patching the shared prototype is what actually takes effect.
    Object.getPrototypeOf(window.localStorage).setItem = () => {
      throw new window.DOMException('QuotaExceededError', 'QuotaExceededError');
    };
    window.document.querySelector('[data-testid="new-task-text"]').value = 'will not save';
    submitForm(window.document.querySelector('[data-testid="new-task-form"]'));

    const error = window.document.querySelector('[data-testid="storage-error"]');
    assert.ok(error, 'a visible storage-error element should appear');
    assert.equal(error.hidden, false);
  });
});
