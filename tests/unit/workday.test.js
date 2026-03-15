'use strict';
const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');
const { createRequire } = require('module');

// ---------------------------------------------------------------------------
// Minimal DOM environment — must be set up BEFORE requiring the platform module
// ---------------------------------------------------------------------------

global.window = global;

// Minimal document stub — querySelector/querySelectorAll return null/[]
global.document = {
  querySelector: function () { return null; },
  querySelectorAll: function () { return []; },
  body: { id: 'body' },
  get title() { return 'Senior Product Marketing Manager – Some Company'; },
};

// ---------------------------------------------------------------------------
// window.JobFill stub namespace with shadowQuery stubs
// ---------------------------------------------------------------------------
before(() => {
  window.JobFill = {
    filler: {
      // shadowQuery stub — returns null (no real shadow DOM in Node)
      shadowQuery: function (root, selector) { return null; },
      // shadowQueryAll stub — returns empty array
      shadowQueryAll: function (root, selector) { return []; },
      fillField: function (el, value) {
        if (el) el.value = value;
        return true;
      },
    },
    events: {
      // dispatchBlur stub — tracks call count
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

  // Attempt to load platforms/workday.js — file does not exist yet in Wave 1.
  // Catch the error so stubs still register and all tests run as todo.
  try {
    const req = createRequire(__filename);
    req('../../platforms/workday');
  } catch (e) {
    // Module not yet implemented — expected in Wave 1 scaffold
  }
});

// ---------------------------------------------------------------------------
// Test stubs — all marked todo; 0 failures expected
// ---------------------------------------------------------------------------

describe('workday', function () {

  it('TEST: matches returns true for myworkdayjobs.com hostname', { todo: true }, function () {});

  it('TEST: matches returns false for greenhouse.io', { todo: true }, function () {});

  it('TEST: fill resolves firstName from shadow DOM fixture', { todo: true }, function () {});

  it('TEST: fill skips field if already has value', { todo: true }, function () {});

  it('TEST: fill skips field if not visible (isVisible guard)', { todo: true }, function () {});

  it('TEST: fill calls dispatchBlur after each filled field', { todo: true }, function () {});

  it('TEST: getJobDetails returns jobTitle from jobPostingHeader and companyName from subdomain', { todo: true }, function () {});

});
