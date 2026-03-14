'use strict';
const fs = require('fs');
const assert = require('node:assert/strict');
const { describe, it, before } = require('node:test');
const { setupGlobals, MockElement } = require('../helpers/dom-mock');

setupGlobals();
global.window = global; // events.js references window.JobFill and window.HTMLInputElement

eval(fs.readFileSync('./utils/events.js', 'utf8'));
const events = global.JobFill.events;

describe('events.js — fillInput', () => {
  // TEST: FR-2.8 native-setter
  it('calls native HTMLInputElement.prototype setter (not direct .value =)', () => {
    global._nativeSetterCallLog = [];
    const el = new MockElement('input', 'text');
    events.fillInput(el, 'hello');
    assert.strictEqual(global._nativeSetterCallLog.length, 1);
    assert.strictEqual(global._nativeSetterCallLog[0].value, 'hello');
  });

  // TEST: FR-2.8 input-event-bubbles
  it('dispatches input event with bubbles: true', () => {
    const el = new MockElement('input', 'text');
    events.fillInput(el, 'x');
    assert.ok(el._events['input'] && el._events['input'][0].bubbles === true);
  });

  // TEST: FR-2.8 change-event-bubbles
  it('dispatches change event with bubbles: true', () => {
    const el = new MockElement('input', 'text');
    events.fillInput(el, 'x');
    assert.ok(el._events['change'] && el._events['change'][0].bubbles === true);
  });
});

describe('events.js — fillSelect', () => {
  function makeSelect(options) {
    const el = new MockElement('select');
    el.options = options.map(function (o) {
      return { value: o.value, text: o.text };
    });
    el.value = '';
    return el;
  }

  // TEST: FR-2.4 select-exact-match
  it('exact match sets value and dispatches change', () => {
    const el = makeSelect([
      { value: 'ae', text: 'United Arab Emirates' },
      { value: 'us', text: 'United States' },
    ]);
    const result = events.fillSelect(el, 'ae');
    assert.strictEqual(result, true);
    assert.strictEqual(el.value, 'ae');
    assert.ok(el._events['change'] && el._events['change'][0].bubbles === true);
  });

  // TEST: FR-2.4 select-case-insensitive
  it('case-insensitive match succeeds when exact fails', () => {
    const el = makeSelect([
      { value: 'ae', text: 'United Arab Emirates' },
    ]);
    const result = events.fillSelect(el, 'united arab emirates');
    assert.strictEqual(result, true);
    assert.strictEqual(el.value, 'ae');
  });

  // TEST: FR-2.4 select-no-match-returns-false
  it('returns false when no option matches', () => {
    const el = makeSelect([
      { value: 'ae', text: 'United Arab Emirates' },
    ]);
    const result = events.fillSelect(el, 'zzz-no-match');
    assert.strictEqual(result, false);
    assert.strictEqual(Object.keys(el._events).length, 0);
  });
});

describe('events.js — fillCheckbox', () => {
  // TEST: FR-2.5 checkbox-checked-and-change
  it('sets .checked and dispatches change event', () => {
    const el = new MockElement('input', 'checkbox');
    events.fillCheckbox(el, true);
    assert.strictEqual(el.checked, true);
    assert.ok(el._events['change'] && el._events['change'][0].bubbles === true);
  });
});

describe('events.js — fillRadio', () => {
  // TEST: FR-2.5 radio-checked-click-change
  it('sets .checked=true, dispatches change, calls .click()', () => {
    const el = new MockElement('input', 'radio');
    events.fillRadio(el);
    assert.strictEqual(el.checked, true);
    assert.ok(el._events['change'] && el._events['change'][0].bubbles === true);
    assert.strictEqual(el._clicked, true);
  });
});

describe('events.js — fillTextarea', () => {
  it('calls native HTMLTextAreaElement.prototype setter and dispatches input+change', () => {
    global._nativeSetterCallLog = [];
    const el = new MockElement('textarea');
    events.fillTextarea(el, 'cover letter text');
    assert.strictEqual(global._nativeSetterCallLog.length, 1);
    assert.strictEqual(global._nativeSetterCallLog[0].value, 'cover letter text');
    assert.ok(el._events['input'] && el._events['input'][0].bubbles === true);
    assert.ok(el._events['change'] && el._events['change'][0].bubbles === true);
  });
});
