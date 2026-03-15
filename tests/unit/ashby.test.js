'use strict';
const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');
const { createRequire } = require('module');

// ---------------------------------------------------------------------------
// Minimal DOM environment — must be set up BEFORE requiring the platform module
// ---------------------------------------------------------------------------

global.window = global;

// Minimal document stub
global.document = {
  querySelector: function (sel) {
    if (sel === 'h1') return { textContent: 'Senior PM' };
    return null;
  },
  querySelectorAll: function () { return []; },
  get title() { return 'Senior PM at Acme | Ashby'; },
};

// ---------------------------------------------------------------------------
// window.JobFill stub namespace
// ---------------------------------------------------------------------------
before(() => {
  window.JobFill = {
    filler: {
      fillField: function (el, value) {
        if (el) el.value = value;
        return true;
      },
    },
    events: {
      _blurCount: 0,
      dispatchBlur: function (el) {
        window.JobFill.events._blurCount += 1;
      },
    },
    matcher: {
      findBestAnswer: function () { return null; },
      substituteVariables: function (s) { return s; },
      matchDropdownOption: function () { return null; },
    },
    platforms: {},
  };

  // Attempt to load platforms/ashby.js — file does not exist yet in Wave 1.
  // Catch the error so stubs still register and all tests run as todo.
  try {
    const req = createRequire(__filename);
    req('../../platforms/ashby');
  } catch (e) {
    // Module not yet implemented — expected in Wave 1 scaffold
  }
});

// ---------------------------------------------------------------------------
// Test stubs — all marked todo; 0 failures expected
// ---------------------------------------------------------------------------

describe('ashby', function () {

  it('TEST: matches returns true for ashbyhq.com hostname', { todo: true }, function () {});

  it('TEST: matches returns false for greenhouse.io', { todo: true }, function () {});

  it('TEST: fill fills firstName with fillField', { todo: true }, function () {});

  it('TEST: fill skips already-filled fields', { todo: true }, function () {});

  it('TEST: fill scans [data-field-type] custom questions', { todo: true }, function () {});

  it('TEST: getJobDetails extracts company from title and job from h1', { todo: true }, function () {});

});
