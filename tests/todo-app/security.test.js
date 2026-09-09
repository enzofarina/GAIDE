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
    // Constitution Principle 10 false-positive suppression, justified here (both lines
    // below): this test asserts a <script> element is ABSENT after rendering PAYLOAD, and
    // that PAYLOAD only ever reaches textContent (a safe read-back). PAYLOAD is never
    // passed to innerHTML, insertAdjacentHTML, or document.write anywhere in app.js
    // (renderTaskRow builds every element via createElement + textContent) — there is no
    // injection sink here for semgrep's script-tag rule to actually be warning about.
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

    // Same Principle 10 false-positive suppression as the C9 test above, same reasoning.
    assert.equal(description.querySelector('script'), null); // nosemgrep: javascript.lang.security.audit.unknown-value-with-script-tag.unknown-value-with-script-tag
    assert.ok(description.textContent.includes(PAYLOAD)); // nosemgrep: javascript.lang.security.audit.unknown-value-with-script-tag.unknown-value-with-script-tag
    assert.equal(window.__xss, undefined);
  });
});
