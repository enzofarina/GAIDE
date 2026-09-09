// DOM/integration tests for per-task controls.
// Covers spec criteria: C4, C5, C10, C11, C12, C15, C23, C24.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loadApp } from './helpers/load-app.js';

function seedOneTask(overrides = {}) {
  return [{
    id: '1', text: 'wash the car', description: '', urgency: 'yellow',
    done: false, createdAt: 1, ...overrides,
  }];
}

describe('C4 + C5: mark a task done, then unmark it', () => {
  test('checking the box marks it done with a visual difference; unchecking reverts it', async () => {
    const window = await loadApp({ seedTasks: seedOneTask() });
    const row = window.document.querySelector('[data-testid="task"]');
    const checkbox = row.querySelector('input[type=checkbox]');

    checkbox.click();
    assert.equal(checkbox.checked, true);
    assert.ok(row.classList.contains('done'), 'row should carry a done state class');

    checkbox.click();
    assert.equal(checkbox.checked, false);
    assert.ok(!row.classList.contains('done'));
  });
});

describe('C15: urgency can be changed after creation, and the list re-sorts', () => {
  test('bumping a yellow task to red moves it above an existing red task\'s peers', async () => {
    const window = await loadApp({
      seedTasks: [
        { id: '1', text: 'already red', description: '', urgency: 'red', done: false, createdAt: 1 },
        { id: '2', text: 'promote me', description: '', urgency: 'yellow', done: false, createdAt: 2 },
      ],
    });
    const rows = () => [...window.document.querySelectorAll('[data-testid="task"]')];
    const target = rows().find((r) => r.textContent.includes('promote me'));
    target.querySelector('[data-testid="urgency-picker"]').value = 'red';
    target
      .querySelector('[data-testid="urgency-picker"]')
      .dispatchEvent(new window.Event('change', { bubbles: true }));

    const updated = rows().find((r) => r.textContent.includes('promote me'));
    assert.ok(updated.classList.contains('urgency-red'));
  });
});

describe('C10, C11, C12: delete requires a swipe-reveal, not a plain tap', () => {
  test('a plain click on the row never deletes it', async () => {
    const window = await loadApp({ seedTasks: seedOneTask() });
    const row = window.document.querySelector('[data-testid="task"]');
    row.click();
    assert.equal(window.document.querySelectorAll('[data-testid="task"]').length, 1);
  });

  test('swiping left reveals the delete control, and tapping it removes the task', async () => {
    const window = await loadApp({ seedTasks: seedOneTask() });
    const row = window.document.querySelector('[data-testid="task"]');

    const touch = (type, clientX) =>
      row.dispatchEvent(
        new window.CustomEvent(type, {
          bubbles: true,
          detail: { touches: [{ clientX, clientY: 10 }] },
        }),
      );
    touch('touchstart', 200);
    touch('touchmove', 40); // well past the swipe threshold, leftward
    touch('touchend', 40);

    const deleteControl = row.querySelector('[data-testid="delete-control"]');
    assert.ok(deleteControl, 'delete control should be revealed after the swipe');

    deleteControl.click();
    assert.equal(window.document.querySelectorAll('[data-testid="task"]').length, 0);
  });

  test('a short/incomplete swipe does not reveal the delete control', async () => {
    const window = await loadApp({ seedTasks: seedOneTask() });
    const row = window.document.querySelector('[data-testid="task"]');
    const touch = (type, clientX) =>
      row.dispatchEvent(
        new window.CustomEvent(type, {
          bubbles: true,
          detail: { touches: [{ clientX, clientY: 10 }] },
        }),
      );
    touch('touchstart', 200);
    touch('touchmove', 195); // 5px — below any reasonable swipe threshold
    touch('touchend', 195);

    assert.equal(row.querySelector('[data-testid="delete-control"]'), null);
  });

  test('swiping back right within the same gesture hides an already-revealed control', async () => {
    const window = await loadApp({ seedTasks: seedOneTask() });
    const row = window.document.querySelector('[data-testid="task"]');
    const touch = (type, clientX) =>
      row.dispatchEvent(
        new window.CustomEvent(type, {
          bubbles: true,
          detail: { touches: [{ clientX, clientY: 10 }] },
        }),
      );
    touch('touchstart', 200);
    touch('touchmove', 40); // reveal it
    assert.ok(row.querySelector('[data-testid="delete-control"]'));

    touch('touchmove', 190); // drag back right, below the threshold again
    touch('touchend', 190);

    assert.equal(row.querySelector('[data-testid="delete-control"]'), null);
  });

  test('a plain tap elsewhere on the row dismisses an already-revealed delete control', async () => {
    const window = await loadApp({ seedTasks: seedOneTask() });
    const row = window.document.querySelector('[data-testid="task"]');
    const touch = (type, clientX) =>
      row.dispatchEvent(
        new window.CustomEvent(type, {
          bubbles: true,
          detail: { touches: [{ clientX, clientY: 10 }] },
        }),
      );
    touch('touchstart', 200);
    touch('touchmove', 40);
    touch('touchend', 40);
    assert.ok(row.querySelector('[data-testid="delete-control"]'), 'should be revealed after the swipe');

    row.click();

    assert.equal(row.querySelector('[data-testid="delete-control"]'), null);
    assert.equal(window.document.querySelectorAll('[data-testid="task"]').length, 1, 'the task itself must survive');
  });
});

describe('C23 + C24: tapping a task toggles its description open, then closed', () => {
  test('first tap expands, second tap collapses', async () => {
    const window = await loadApp({
      seedTasks: seedOneTask({ description: 'wax it too' }),
    });
    const row = window.document.querySelector('[data-testid="task"]');
    const description = () => row.querySelector('[data-testid="description"]');

    row.click();
    assert.equal(description().hidden, false);

    row.click();
    assert.equal(description().hidden, true);
  });
});
