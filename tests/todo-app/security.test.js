// Abuse-case tests from spec.md's Security considerations: a hostile task's
// title or description must render as literal text and never execute.
// Covers spec criteria: C9, C26.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loadApp, submitForm } from './helpers/load-app.js';

const PAYLOAD = '<script>window.__xss = true;</script>';

describe('C9: task text renders as plain text, never interpreted as HTML/script', () => {
  test('a task titled with a script tag renders it literally and does not execute', async () => {
    const window = await loadApp();
    window.document.querySelector('[data-testid="new-task-text"]').value = PAYLOAD;
    submitForm(window.document.querySelector('[data-testid="new-task-form"]'));

    const row = window.document.querySelector('[data-testid="task"]');
    // False positive (both lines below): asserts a <script> element is ABSENT and that
    // PAYLOAD only ever reaches textContent (safe read-back), never innerHTML/document.write
    // — there is no injection sink here for semgrep's script-tag rule to actually be about.
    assert.equal(row.querySelector('script'), null, 'no <script> element should be injected'); // nosemgrep: javascript.lang.security.audit.unknown-value-with-script-tag.unknown-value-with-script-tag
    assert.ok(row.textContent.includes(PAYLOAD), 'the payload should appear as literal text'); // nosemgrep: javascript.lang.security.audit.unknown-value-with-script-tag.unknown-value-with-script-tag
    assert.equal(window.__xss, undefined, 'the payload must never execute');
  });
});

describe('C26: description also renders as plain text, never interpreted as HTML/script', () => {
  test('a description containing a script tag renders it literally and does not execute', async () => {
    const window = await loadApp();
    window.document.querySelector('[data-testid="new-task-text"]').value = 'normal title';
    window.document.querySelector('[data-testid="new-task-description"]').value = PAYLOAD;
    submitForm(window.document.querySelector('[data-testid="new-task-form"]'));

    const row = window.document.querySelector('[data-testid="task"]');
    row.click(); // expand the description
    const description = row.querySelector('[data-testid="description"]');

    // False positive (both lines below), same reasoning as the C9 test above.
    assert.equal(description.querySelector('script'), null); // nosemgrep: javascript.lang.security.audit.unknown-value-with-script-tag.unknown-value-with-script-tag
    assert.ok(description.textContent.includes(PAYLOAD)); // nosemgrep: javascript.lang.security.audit.unknown-value-with-script-tag.unknown-value-with-script-tag
    assert.equal(window.__xss, undefined);
  });
});
