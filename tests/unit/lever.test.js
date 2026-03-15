'use strict';
const { test, describe, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
require('../helpers/dom-mock');

// Load DOM fixture
const fixtureHtml = fs.readFileSync(
  path.join(__dirname, '../fixtures/dom-lever.html'),
  'utf8'
);

// Extract body content from fixture
function getFixtureBody() {
  const m = fixtureHtml.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  return m ? m[1] : fixtureHtml;
}

// Setup window.JobFill mock
before(() => {
  global.window = global.window || {};
  window.JobFill = {
    filler: {
      fillField: function (el, val) {
        if (el.type === 'file') return false;
        el.value = val;
        return true;
      }
    },
    events: {},
    matcher: {
      findBestAnswer: function (q, bank) {
        return bank && bank.length ? { entry: bank[0], confidence: 0.9 } : null;
      },
      substituteVariables: function (s, vars) { return s; },
      matchDropdownOption: function () { return null; }
    }
  };
});

// Load module under test (may not exist yet)
let lv = null;
try {
  require('../../platforms/lever');
  lv = (window.JobFill && window.JobFill.platforms && window.JobFill.platforms.lever) || null;
} catch (e) { /* module not yet implemented */ }

describe('lever', () => {

  test('TEST: lever matches lever.co hostname → true', () => {
    assert.ok(lv, 'lever module must be loaded');
    assert.strictEqual(lv.matches('jobs.lever.co'), true);
  });

  test('TEST: lever does not match greenhouse.io hostname → false', () => {
    assert.ok(lv, 'lever module must be loaded');
    assert.strictEqual(lv.matches('greenhouse.io'), false);
  });

  test('TEST: lever exposes matches, fill, getJobDetails functions', () => {
    assert.ok(lv, 'lever module must be loaded');
    assert.strictEqual(typeof lv.matches, 'function');
    assert.strictEqual(typeof lv.fill, 'function');
    assert.strictEqual(typeof lv.getJobDetails, 'function');
  });

  test('TEST: lever fill — full name filled from profile', async () => {
    assert.ok(lv, 'lever module must be loaded');
    document.body.innerHTML = getFixtureBody();
    const profile = {
      fullName: 'Adarsh Shankar',
      email: 'test@example.com',
      phone: '+971501234567',
      linkedinUrl: 'https://linkedin.com/in/adarsh',
      portfolioUrl: ''
    };
    const results = await lv.fill(profile, []);
    document.body.innerHTML = '';
    const nameResult = results.find(function (r) { return r.field === 'Full Name'; });
    assert.ok(nameResult, 'Full Name result must exist');
    assert.strictEqual(nameResult.status, 'filled');
    assert.strictEqual(nameResult.value, 'Adarsh Shankar');
  });

  test('TEST: lever fill — email filled from profile', async () => {
    assert.ok(lv, 'lever module must be loaded');
    document.body.innerHTML = getFixtureBody();
    const profile = {
      fullName: 'Adarsh Shankar',
      email: 'test@example.com',
      phone: '+971501234567',
      linkedinUrl: 'https://linkedin.com/in/adarsh',
      portfolioUrl: ''
    };
    const results = await lv.fill(profile, []);
    document.body.innerHTML = '';
    const emailResult = results.find(function (r) { return r.field === 'Email'; });
    assert.ok(emailResult, 'Email result must exist');
    assert.strictEqual(emailResult.status, 'filled');
    assert.strictEqual(emailResult.value, 'test@example.com');
  });

  test('TEST: lever fill — file input skipped with reason \'resume upload in Phase 11\'', async () => {
    assert.ok(lv, 'lever module must be loaded');
    document.body.innerHTML = getFixtureBody();
    const profile = {
      fullName: 'Adarsh Shankar',
      email: 'test@example.com',
      phone: '+971501234567',
      linkedinUrl: '',
      portfolioUrl: ''
    };
    const results = await lv.fill(profile, []);
    document.body.innerHTML = '';
    const resumeResult = results.find(function (r) { return r.field === 'Resume'; });
    assert.ok(resumeResult, 'Resume result must exist');
    assert.strictEqual(resumeResult.status, 'skipped');
    assert.strictEqual(resumeResult.reason, 'resume upload in Phase 11');
  });

  test('TEST: lever fill — already-filled field skipped', async () => {
    assert.ok(lv, 'lever module must be loaded');
    document.body.innerHTML = getFixtureBody();
    // Pre-fill the phone field
    const phoneEl = document.querySelector('input[name="phone"]');
    phoneEl.value = '+1234';
    const profile = {
      fullName: 'Adarsh Shankar',
      email: 'test@example.com',
      phone: '+971501234567',
      linkedinUrl: '',
      portfolioUrl: ''
    };
    const results = await lv.fill(profile, []);
    document.body.innerHTML = '';
    const phoneResult = results.find(function (r) { return r.field === 'Phone'; });
    assert.ok(phoneResult, 'Phone result must exist');
    assert.strictEqual(phoneResult.status, 'skipped');
    assert.strictEqual(phoneResult.reason, 'already has value');
  });

  test('TEST: lever fill — data-qa custom question filled from answer bank', async () => {
    assert.ok(lv, 'lever module must be loaded');
    document.body.innerHTML = getFixtureBody();
    const profile = {
      fullName: 'Adarsh Shankar',
      email: 'test@example.com',
      phone: '',
      linkedinUrl: '',
      portfolioUrl: ''
    };
    const answerBank = [
      { question: 'Why are you interested?', answer: 'I am passionate about marketing.' }
    ];
    const results = await lv.fill(profile, answerBank);
    document.body.innerHTML = '';
    const qaResult = results.find(function (r) { return r.status === 'filled' && r.field && r.field.toLowerCase().includes('why'); });
    assert.ok(qaResult, 'data-qa custom question result must be filled');
    assert.strictEqual(qaResult.status, 'filled');
  });

});
