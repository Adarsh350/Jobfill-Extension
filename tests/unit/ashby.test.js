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

  const req = createRequire(__filename);
  req('../../platforms/ashby');
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ashby', function () {

  it('TEST: matches returns true for ashbyhq.com hostname', function () {
    const ashby = window.JobFill.platforms.ashby;
    assert.equal(ashby.matches('jobs.ashbyhq.com/acme'), true);
  });

  it('TEST: matches returns false for greenhouse.io', function () {
    const ashby = window.JobFill.platforms.ashby;
    assert.equal(ashby.matches('boards.greenhouse.io/acme'), false);
  });

  it('TEST: fill fills firstName with fillField', async function () {
    const ashby = window.JobFill.platforms.ashby;

    // Mock an input element for firstName
    const fakeInput = { tagName: 'INPUT', type: 'text', value: '', name: 'firstName' };

    // Override document.querySelector to return fakeInput for firstName selector
    const origQS = global.document.querySelector;
    global.document.querySelector = function (sel) {
      if (sel === 'input[name="firstName"]') return fakeInput;
      if (sel === 'h1') return { textContent: 'Senior PM' };
      return null;
    };

    const profile = { firstName: 'Jane', lastName: 'Doe', email: 'jane@example.com' };
    const results = await ashby.fill(profile, []);

    global.document.querySelector = origQS;

    const firstNameResult = results.find(r => r.field === 'First Name');
    assert.ok(firstNameResult, 'should have a First Name result');
    assert.equal(firstNameResult.status, 'filled');
    assert.equal(fakeInput.value, 'Jane');
  });

  it('TEST: fill skips already-filled fields', async function () {
    const ashby = window.JobFill.platforms.ashby;

    // Pre-filled element
    const fakeInput = { tagName: 'INPUT', type: 'text', value: 'existing@email.com', name: 'email' };

    const origQS = global.document.querySelector;
    global.document.querySelector = function (sel) {
      if (sel === 'input[type="email"]') return fakeInput;
      if (sel === 'h1') return { textContent: 'Senior PM' };
      return null;
    };

    const profile = { email: 'new@example.com' };
    const results = await ashby.fill(profile, []);

    global.document.querySelector = origQS;

    const emailResult = results.find(r => r.field === 'Email');
    assert.ok(emailResult, 'should have an Email result');
    assert.equal(emailResult.status, 'skipped');
    assert.equal(emailResult.reason, 'already has value');
  });

  it('TEST: fill scans [data-field-type] custom questions', async function () {
    const ashby = window.JobFill.platforms.ashby;

    // A custom-question textarea wrapped in [data-field-type]
    const labelEl = { textContent: 'Why do you want to work here?' };
    const fakeTextarea = {
      tagName: 'TEXTAREA',
      type: '',
      value: '',
      placeholder: '',
      closest: function (sel) {
        if (sel === '[data-field-type]') {
          return {
            querySelector: function (s) {
              if (s === 'label') return labelEl;
              return null;
            },
            getAttribute: function () { return 'longText'; },
          };
        }
        return null;
      },
    };

    const origQS = global.document.querySelector;
    const origQSA = global.document.querySelectorAll;

    global.document.querySelector = function (sel) {
      if (sel === 'h1') return { textContent: 'Senior PM' };
      return null;
    };
    global.document.querySelectorAll = function (sel) {
      if (sel === '[data-field-type] textarea, [data-field-type] input[type="text"]') {
        return [fakeTextarea];
      }
      return [];
    };

    // Override matcher to return a match for this question
    const origFindBest = window.JobFill.matcher.findBestAnswer;
    window.JobFill.matcher.findBestAnswer = function (question) {
      if (question.indexOf('Why do you want') !== -1) {
        return { entry: { answer: 'Because I am passionate.' }, score: 0.9 };
      }
      return null;
    };

    const results = await ashby.fill({}, [{ question: 'Why do you want to work here?', answer: 'Because I am passionate.' }]);

    global.document.querySelector = origQS;
    global.document.querySelectorAll = origQSA;
    window.JobFill.matcher.findBestAnswer = origFindBest;

    const customResult = results.find(r => r.field === 'Why do you want to work here?');
    assert.ok(customResult, 'should have result for custom question');
    assert.equal(customResult.status, 'filled');
  });

  it('TEST: getJobDetails extracts company from title and job from h1', function () {
    const ashby = window.JobFill.platforms.ashby;
    // document.title = 'Senior PM at Acme | Ashby', querySelector('h1') returns { textContent: 'Senior PM' }
    const details = ashby.getJobDetails();
    assert.equal(details.jobTitle, 'Senior PM');
    assert.equal(details.companyName, 'Acme');
  });

});
