'use strict';
const { describe, it } = require('node:test');
const { setupGlobals, MockElement } = require('../helpers/dom-mock');

setupGlobals();

// Stub: load events.js against mocked globals is done in Wave 1
// These tests will be implemented after utils/events.js exists

describe('events.js — fillInput', () => {
  // TEST: FR-2.8 native-setter
  it('calls native HTMLInputElement.prototype setter (not direct .value =)', { todo: 'implement in Wave 1' }, () => {});
  // TEST: FR-2.8 input-event-bubbles
  it('dispatches input event with bubbles: true', { todo: 'implement in Wave 1' }, () => {});
  // TEST: FR-2.8 change-event-bubbles
  it('dispatches change event with bubbles: true', { todo: 'implement in Wave 1' }, () => {});
});

describe('events.js — fillSelect', () => {
  // TEST: FR-2.4 select-exact-match
  it('exact match sets value and dispatches change', { todo: 'implement in Wave 1' }, () => {});
  // TEST: FR-2.4 select-case-insensitive
  it('case-insensitive match succeeds when exact fails', { todo: 'implement in Wave 1' }, () => {});
  // TEST: FR-2.4 select-no-match-returns-false
  it('returns false when no option matches', { todo: 'implement in Wave 1' }, () => {});
});

describe('events.js — fillCheckbox', () => {
  // TEST: FR-2.5 checkbox-checked-and-change
  it('sets .checked and dispatches change event', { todo: 'implement in Wave 1' }, () => {});
});

describe('events.js — fillRadio', () => {
  // TEST: FR-2.5 radio-checked-click-change
  it('sets .checked=true, dispatches change, calls .click()', { todo: 'implement in Wave 1' }, () => {});
});

describe('events.js — fillTextarea', () => {
  it('calls native HTMLTextAreaElement.prototype setter and dispatches input+change', { todo: 'implement in Wave 1' }, () => {});
});
