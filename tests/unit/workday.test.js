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

  // Load platforms/workday.js
  const req = createRequire(__filename);
  req('../../platforms/workday');
});

// ---------------------------------------------------------------------------
// Tests — all real assertions, 0 todo
// ---------------------------------------------------------------------------

describe('workday', function () {

  it('TEST: matches returns true for myworkdayjobs.com hostname', function () {
    var wd = window.JobFill.platforms.workday;
    assert.equal(wd.matches('acme.myworkdayjobs.com'), true);
  });

  it('TEST: matches returns false for greenhouse.io', function () {
    var wd = window.JobFill.platforms.workday;
    assert.equal(wd.matches('greenhouse.io'), false);
  });

  it('TEST: fill resolves firstName from shadow DOM fixture', async function () {
    var wd = window.JobFill.platforms.workday;

    // Override shadowQuery to return a mock firstName input for the primary selector
    var mockEl = { value: '', offsetParent: {}, tagName: 'INPUT' };
    window.JobFill.filler.shadowQuery = function (root, selector) {
      if (selector === '[data-automation-id="legalNameSection_firstName"]') return mockEl;
      return null;
    };

    var profile = { firstName: 'Jane', lastName: 'Doe', email: 'jane@example.com' };
    var results = await wd.fill(profile, []);

    var firstNameResult = results.find(function (r) { return r.field === 'First Name'; });
    assert.ok(firstNameResult, 'should have a First Name result');
    assert.equal(firstNameResult.status, 'filled');

    // Restore stub
    window.JobFill.filler.shadowQuery = function () { return null; };
  });

  it('TEST: fill skips field if already has value', async function () {
    var wd = window.JobFill.platforms.workday;

    // Element already has a value
    var mockEl = { value: 'existing@email.com', offsetParent: {}, tagName: 'INPUT' };
    window.JobFill.filler.shadowQuery = function (root, selector) {
      if (selector === '[data-automation-id="email"]') return mockEl;
      return null;
    };

    var profile = { email: 'new@email.com' };
    var results = await wd.fill(profile, []);

    var emailResult = results.find(function (r) { return r.field === 'Email'; });
    assert.ok(emailResult, 'should have an Email result');
    assert.equal(emailResult.status, 'skipped');
    assert.equal(emailResult.reason, 'already has value');

    // Restore stub
    window.JobFill.filler.shadowQuery = function () { return null; };
  });

  it('TEST: fill skips field if not visible (isVisible guard)', async function () {
    var wd = window.JobFill.platforms.workday;

    // offsetParent === null means not visible
    var mockEl = { value: '', offsetParent: null, tagName: 'INPUT' };
    window.JobFill.filler.shadowQuery = function (root, selector) {
      if (selector === '[data-automation-id="phone-number"]') return mockEl;
      return null;
    };

    var profile = { phone: '555-1234' };
    var results = await wd.fill(profile, []);

    var phoneResult = results.find(function (r) { return r.field === 'Phone'; });
    assert.ok(phoneResult, 'should have a Phone result');
    assert.equal(phoneResult.status, 'skipped');
    assert.equal(phoneResult.reason, 'not visible');

    // Restore stub
    window.JobFill.filler.shadowQuery = function () { return null; };
  });

  it('TEST: fill calls dispatchBlur after each filled field', async function () {
    var wd = window.JobFill.platforms.workday;

    // Reset blur count
    window.JobFill.events._blurCount = 0;

    var mockEl = { value: '', offsetParent: {}, tagName: 'INPUT' };
    window.JobFill.filler.shadowQuery = function (root, selector) {
      if (selector === '[data-automation-id="legalNameSection_lastName"]') return mockEl;
      return null;
    };

    var profile = { lastName: 'Smith' };
    await wd.fill(profile, []);

    assert.ok(
      window.JobFill.events._blurCount >= 1,
      'dispatchBlur should have been called at least once'
    );

    // Restore stub
    window.JobFill.filler.shadowQuery = function () { return null; };
    window.JobFill.events._blurCount = 0;
  });

  it('TEST: getJobDetails returns jobTitle from jobPostingHeader and companyName from subdomain', function () {
    var wd = window.JobFill.platforms.workday;

    // Mock shadowQuery to return h2 element with textContent
    var mockH2 = { textContent: 'Senior Product Marketing Manager' };
    window.JobFill.filler.shadowQuery = function (root, selector) {
      if (selector === 'h2[data-automation-id="jobPostingHeader"]') return mockH2;
      return null;
    };

    // Mock window.location for subdomain extraction
    var origLocation = global.location;
    global.location = { hostname: 'acme.myworkdayjobs.com' };

    var details = wd.getJobDetails();

    assert.equal(details.jobTitle, 'Senior Product Marketing Manager');
    assert.equal(details.companyName, 'acme');

    // Restore
    window.JobFill.filler.shadowQuery = function () { return null; };
    if (origLocation !== undefined) global.location = origLocation;
    else delete global.location;
  });

});
