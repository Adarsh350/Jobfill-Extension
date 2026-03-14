'use strict';
const assert = require('node:assert/strict');
const { describe, it } = require('node:test');
const fs = require('fs');
const { setupGlobals, MockElement, MockMutationObserver } = require('../helpers/dom-mock');

setupGlobals();
global.window = global;
eval(fs.readFileSync('./utils/events.js', 'utf8'));
eval(fs.readFileSync('./utils/filler.js', 'utf8'));
const filler = global.JobFill.filler;

describe('filler.js — fill lock', () => {
  // TEST: NFR-5.1 fill-lock-blocks-concurrent
  it('startFill returns false when fill already in progress', () => {
    filler.endFill(); // ensure clean state
    assert.strictEqual(filler.startFill(), true);
    assert.strictEqual(filler.startFill(), false); // locked
    assert.strictEqual(filler.isFilling(), true);
    filler.endFill();
  });
  // TEST: NFR-5.1 end-fill-releases-lock
  it('endFill releases lock so next startFill returns true', () => {
    filler.endFill(); // ensure clean state
    assert.strictEqual(filler.startFill(), true);
    assert.strictEqual(filler.isFilling(), true);
    filler.endFill();
    assert.strictEqual(filler.isFilling(), false);
    assert.strictEqual(filler.startFill(), true); // lock released
    filler.endFill();
  });
});

describe('filler.js — shadowQuery', () => {
  // TEST: FR-2.2 shadow-query-open-root
  it('finds element inside open shadow root', () => {
    const host   = new MockElement('div', '');
    const shadow = new MockElement('div', '');
    const target = new MockElement('input', 'text');
    target._selector = 'input[type=text]';
    shadow.children  = [target];
    shadow.querySelector   = (sel) => target._selector === sel ? target : null;
    shadow.querySelectorAll = (sel) => shadow.querySelector(sel) ? [target] : [];
    host.shadowRoot = shadow;

    const root = new MockElement('div', '');
    root.querySelectorAll = (sel) => sel === '*' ? [host] : [];
    root.querySelector    = () => null;

    const found = filler.shadowQuery(root, 'input[type=text]');
    assert.strictEqual(found, target);
  });
  // TEST: FR-2.2 shadow-query-not-found
  it('returns null when element not in tree', () => {
    const host   = new MockElement('div', '');
    const shadow = new MockElement('div', '');
    shadow.querySelector    = () => null;
    shadow.querySelectorAll = () => [];
    host.shadowRoot = shadow;

    const root = new MockElement('div', '');
    root.querySelectorAll = (sel) => sel === '*' ? [host] : [];
    root.querySelector    = () => null;

    assert.strictEqual(filler.shadowQuery(root, 'input[type=email]'), null);
  });
});

describe('filler.js — waitForElement', () => {
  // TEST: NFR-3.3 wait-resolves-on-appear
  it('resolves when element appears within timeout', async () => {
    let observerInstance;
    global.MutationObserver = class {
      constructor(cb) { this._cb = cb; observerInstance = this; this._observing = false; }
      observe()     { this._observing = true; }
      disconnect()  { this._observing = false; }
    };

    const mockRoot = new MockElement('div', '');
    let callCount  = 0;
    mockRoot.querySelector = () => {
      callCount++;
      return callCount >= 2 ? new MockElement('input', 'text') : null;
    };

    const p = filler.waitForElement('input', 500, mockRoot);
    observerInstance._cb([]); // trigger mutation
    const el = await p;
    assert.ok(el instanceof MockElement);
    assert.ok(!observerInstance._observing); // disconnected

    // restore
    global.MutationObserver = MockMutationObserver;
  });
  // TEST: NFR-3.3 wait-rejects-on-timeout
  it('rejects after timeout if element never appears', async () => {
    const mockRoot2 = new MockElement('div', '');
    mockRoot2.querySelector = () => null;
    await assert.rejects(
      filler.waitForElement('input', 50, mockRoot2),
      /not found|timed out/
    );
  });
});
