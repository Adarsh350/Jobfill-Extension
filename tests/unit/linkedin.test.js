'use strict';
const { test, describe, before, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// Minimal DOM environment — set up BEFORE requiring the platform module
// ---------------------------------------------------------------------------

global.window = global;

function makeElement(tag, attrs) {
  const el = {
    tagName: tag.toUpperCase(),
    type: (attrs.type || '').toLowerCase(),
    id: attrs.id || '',
    name: attrs.name || '',
    autocomplete: attrs.autocomplete || '',
    _ariaLabel: attrs['aria-label'] || '',
    _value: '',
    _attributes: Object.assign({}, attrs),
    _classes: (attrs.class || '').split(' ').filter(Boolean),
    textContent: attrs._text || '',
    innerHTML: '',
  };

  Object.defineProperty(el, 'value', {
    get: function () { return this._value; },
    set: function (v) { this._value = String(v); },
    configurable: true,
    enumerable: true,
  });

  el.getAttribute = function (name) {
    if (name === 'aria-label') return this._ariaLabel || null;
    return this._attributes[name] !== undefined ? String(this._attributes[name]) : null;
  };

  el.removeAttribute = function (name) { delete this._attributes[name]; };
  el.closest = function () { return null; };
  el.matches = function () { return false; };

  return el;
}

function makeButton(ariaLabel, text) {
  return {
    tagName: 'BUTTON',
    _ariaLabel: ariaLabel,
    textContent: text,
    _clicked: false,
    getAttribute: function (name) {
      if (name === 'aria-label') return this._ariaLabel || null;
      return null;
    },
    click: function () { this._clicked = true; },
  };
}

function buildDom() {
  const els = {
    firstName:   makeElement('input', { id: 'firstName',                   type: 'text',  autocomplete: 'given-name' }),
    lastName:    makeElement('input', { id: 'lastName',                    type: 'text',  autocomplete: 'family-name' }),
    email:       makeElement('input', { id: 'email-address',               type: 'email' }),
    phone:       makeElement('input', { id: 'phoneNumber-nationalNumber',   type: 'tel' }),
    btnNext:     makeButton('Continue to next step', 'Next'),
    btnSubmit:   makeButton('Submit application', 'Submit application'),
  };

  return { els };
}

let _currentDom = null;
// Track whether modal is present in the simulated DOM
let _modalPresent = true;

// Minimal MutationObserver mock
class MockMutationObserver {
  constructor(cb) {
    this._cb = cb;
    this._observations = [];
  }
  observe(target, options) {
    this._observations.push({ target, options });
  }
  disconnect() {}
}

global.MutationObserver = MockMutationObserver;

global.document = {
  querySelector: function (sel) {
    if (!_currentDom) return null;
    const { els } = _currentDom;

    // Modal detection
    if (sel === '.jobs-easy-apply-modal') {
      return _modalPresent ? { tagName: 'DIV', className: 'jobs-easy-apply-modal' } : null;
    }

    // Modal-scoped selectors (strip the modal prefix for resolution)
    const MODAL_PREFIX = '.jobs-easy-apply-modal ';
    let effectiveSel = sel;
    if (sel.startsWith(MODAL_PREFIX)) {
      effectiveSel = sel.slice(MODAL_PREFIX.length);
    }

    // id-contains selectors
    if (effectiveSel === 'input[id*="phoneNumber"]') return els.phone;
    if (effectiveSel === 'input[id*="email"]') return els.email;
    if (effectiveSel === 'input[id*="firstName"]') return els.firstName;
    if (effectiveSel === 'input[id*="lastName"]') return els.lastName;

    // Autocomplete
    if (effectiveSel === 'input[autocomplete="given-name"]')  return els.firstName;
    if (effectiveSel === 'input[autocomplete="family-name"]') return els.lastName;

    // Type selectors
    if (effectiveSel === 'input[type="email"]') return els.email;
    if (effectiveSel === 'input[type="tel"]')   return els.phone;

    // Exact id selectors
    if (effectiveSel === '#firstName'                 || effectiveSel === 'input#firstName')                 return els.firstName;
    if (effectiveSel === '#lastName'                  || effectiveSel === 'input#lastName')                  return els.lastName;
    if (effectiveSel === '#email-address'             || effectiveSel === 'input#email-address')             return els.email;
    if (effectiveSel === '#phoneNumber-nationalNumber' || effectiveSel === 'input#phoneNumber-nationalNumber') return els.phone;

    // Buttons
    if (effectiveSel === 'button[aria-label="Submit application"]') return els.btnSubmit;
    if (effectiveSel === 'button[aria-label="Continue to next step"]') return els.btnNext;

    return null;
  },

  querySelectorAll: function (sel) {
    if (!_currentDom) return [];
    const { els } = _currentDom;
    if (sel === 'input, textarea, select') {
      return [els.firstName, els.lastName, els.email, els.phone];
    }
    if (sel === 'button[aria-label="Submit application"], button[aria-label="Continue to next step"]') {
      return [els.btnSubmit, els.btnNext];
    }
    return [];
  },

  get title() { return 'LinkedIn Job Search'; },
};

// ---------------------------------------------------------------------------
// Load LinkedIn platform module (wrapped so stubs run before file exists)
// ---------------------------------------------------------------------------

before(() => {
  window.JobFill = {
    filler: {
      fillField: function (el, value) {
        if (el && el.type === 'file') return false;
        if (el) el.value = value;
        return true;
      },
    },
    events: {},
    matcher: {
      findBestAnswer: function () { return null; },
      substituteVariables: function (s) { return s; },
      matchDropdownOption: function () { return null; },
    },
    platforms: {},
  };

  try {
    const { createRequire } = require('module');
    const req = createRequire(__filename);
    req('../../platforms/linkedin');
  } catch (e) { /* file not yet created — stubs still run */ }
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('linkedin', () => {

  beforeEach(() => {
    _currentDom = buildDom();
    _modalPresent = true;
    window._jobfillLinkedInObserver = undefined;
    window.JobFill.matcher.findBestAnswer    = function () { return null; };
    window.JobFill.matcher.substituteVariables = function (s) { return s; };
  });

  function li() {
    return window.JobFill.platforms && window.JobFill.platforms.linkedin;
  }

  test('TEST: matches() returns true for linkedin.com hostname', () => {
    const mod = li();
    assert.ok(mod, 'linkedin platform module must be registered');
    assert.strictEqual(mod.matches('www.linkedin.com'), true);
    assert.strictEqual(mod.matches('linkedin.com'), true);
    assert.strictEqual(mod.matches('greenhouse.io'), false);
  });

  test('TEST: fill() returns empty array when .jobs-easy-apply-modal not present', async () => {
    const mod = li();
    assert.ok(mod, 'linkedin platform module must be registered');
    _modalPresent = false;
    const profile = { phone: '555-1234', email: 'a@b.com', firstName: 'Ada', lastName: 'Lovelace' };
    const results = await mod.fill(profile, []);
    assert.ok(Array.isArray(results), 'fill() must return an array');
    assert.strictEqual(results.length, 0, 'fill() must return empty array when modal absent');
  });

  test('TEST: fill() fills phone field inside modal', async () => {
    const mod = li();
    assert.ok(mod, 'linkedin platform module must be registered');
    const profile = { phone: '555-1234', email: 'a@b.com', firstName: 'Ada', lastName: 'Lovelace' };
    const results = await mod.fill(profile, []);
    const phoneResult = results.find(r => r.field === 'Phone');
    assert.ok(phoneResult, 'Phone result must be present');
    assert.strictEqual(phoneResult.status, 'filled');
  });

  test('TEST: fill() fills firstName and lastName inside modal', async () => {
    const mod = li();
    assert.ok(mod, 'linkedin platform module must be registered');
    const profile = { phone: '555-1234', email: 'a@b.com', firstName: 'Ada', lastName: 'Lovelace' };
    const results = await mod.fill(profile, []);
    const firstNameResult = results.find(r => r.field === 'First Name');
    const lastNameResult  = results.find(r => r.field === 'Last Name');
    assert.ok(firstNameResult, 'First Name result must be present');
    assert.ok(lastNameResult,  'Last Name result must be present');
    assert.strictEqual(firstNameResult.status, 'filled');
    assert.strictEqual(lastNameResult.status,  'filled');
  });

  test('TEST: fill() does not click Submit or Next buttons', async () => {
    const mod = li();
    assert.ok(mod, 'linkedin platform module must be registered');
    const { els } = _currentDom;
    // Reset click tracking
    els.btnSubmit._clicked = false;
    els.btnNext._clicked   = false;
    const profile = { phone: '555-1234', email: 'a@b.com', firstName: 'Ada', lastName: 'Lovelace' };
    await mod.fill(profile, []);
    assert.strictEqual(els.btnSubmit._clicked, false, 'Submit button must NOT be clicked');
    assert.strictEqual(els.btnNext._clicked,   false, 'Next button must NOT be clicked');
  });

  test('TEST: fill() sets window._jobfillLinkedInObserver on modal', async () => {
    const mod = li();
    assert.ok(mod, 'linkedin platform module must be registered');
    const profile = { phone: '555-1234', email: 'a@b.com', firstName: 'Ada', lastName: 'Lovelace' };
    await mod.fill(profile, []);
    assert.ok(window._jobfillLinkedInObserver, '_jobfillLinkedInObserver must be set after fill()');
    assert.ok(
      window._jobfillLinkedInObserver instanceof MockMutationObserver,
      '_jobfillLinkedInObserver must be a MutationObserver instance'
    );
  });

  test('TEST: fill() skips fields that already have a value', async () => {
    const mod = li();
    assert.ok(mod, 'linkedin platform module must be registered');
    // Pre-fill the phone field
    _currentDom.els.phone._value = '999-existing';
    const profile = { phone: '555-1234', email: 'a@b.com', firstName: 'Ada', lastName: 'Lovelace' };
    const results = await mod.fill(profile, []);
    const phoneResult = results.find(r => r.field === 'Phone');
    assert.ok(phoneResult, 'Phone result must be present');
    assert.strictEqual(phoneResult.status, 'skipped');
    assert.ok(phoneResult.reason && phoneResult.reason.includes('already has value'));
  });

});
