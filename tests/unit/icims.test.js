'use strict';
const { test, describe, before, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// Minimal DOM environment — set up BEFORE requiring the platform module
// ---------------------------------------------------------------------------

global.window = global;

const _domElements = new Map();

function makeElement(tag, attrs) {
  const el = {
    tagName: tag.toUpperCase(),
    type: (attrs.type || '').toLowerCase(),
    id: attrs.id || '',
    name: attrs.name || '',
    autocomplete: attrs.autocomplete || '',
    _value: '',
    _attributes: Object.assign({}, attrs),
    _classes: (attrs.class || '').split(' ').filter(Boolean),
    _ariaLabel: attrs['aria-label'] || '',
    textContent: attrs._labelText || '',
    innerHTML: '',
    options: attrs.options || [],
    selectedIndex: 0,
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

  el.removeAttribute = function (name) {
    delete this._attributes[name];
  };

  el.closest = function () { return null; };
  el.matches = function () { return false; };

  return el;
}

function buildDom() {
  _domElements.clear();

  const els = {
    firstname: makeElement('input', { id: 'firstname', name: 'firstname', type: 'text', autocomplete: 'given-name' }),
    lastname:  makeElement('input', { id: 'lastname',  name: 'lastname',  type: 'text', autocomplete: 'family-name' }),
    email:     makeElement('input', { id: 'email',     name: 'email',     type: 'email' }),
    phone:     makeElement('input', { id: 'phone',     name: 'phone',     type: 'tel' }),
    resume:    makeElement('input', { id: 'resume',    name: 'resume',    type: 'file' }),
  };

  for (const [, el] of Object.entries(els)) {
    if (el.id) _domElements.set(el.id, el);
  }

  return { els };
}

// iCIMS job title element
const _jobTitleEl = { tagName: 'DIV', className: 'iCIMS_JobTitle', textContent: 'Senior Marketing Manager' };

let _currentDom = null;

global.document = {
  querySelector: function (sel) {
    if (!_currentDom) return null;
    const { els } = _currentDom;

    // ID selectors
    if (sel === '#firstname' || sel === 'input#firstname') return els.firstname;
    if (sel === '#lastname'  || sel === 'input#lastname')  return els.lastname;
    if (sel === '#email'     || sel === 'input#email')     return els.email;
    if (sel === '#phone'     || sel === 'input#phone')     return els.phone;
    if (sel === '#resume'    || sel === 'input#resume')    return els.resume;

    // Name selectors
    if (sel === 'input[name="firstname"]' || sel === 'input[name="firstName"]') return els.firstname;
    if (sel === 'input[name="lastname"]'  || sel === 'input[name="lastName"]')  return els.lastname;
    if (sel === 'input[name="email"]')    return els.email;
    if (sel === 'input[name="phone"]')    return els.phone;
    if (sel === 'input[name="phoneNumber"]') return els.phone;
    if (sel === 'input[name="resume"]')   return els.resume;

    // Type selectors
    if (sel === 'input[type="email"]')    return els.email;
    if (sel === 'input[type="tel"]')      return els.phone;
    if (sel === 'input[type="file"]')     return els.resume;

    // Autocomplete selectors
    if (sel === 'input[autocomplete="given-name"]')  return els.firstname;
    if (sel === 'input[autocomplete="family-name"]') return els.lastname;

    // iCIMS-specific
    if (sel === '.iCIMS_JobTitle, h1.iCIMS_Header' || sel === '.iCIMS_JobTitle' || sel === 'div.iCIMS_JobTitle') return _jobTitleEl;
    if (sel === '#iCIMS_MainContent' || sel === 'form#iCIMS_MainContent') return { tagName: 'FORM', id: 'iCIMS_MainContent' };

    // id*= selectors (case-sensitive contains)
    if (sel === 'input[id*="FirstName"]') return els.firstname;
    if (sel === 'input[id*="LastName"]')  return els.lastname;

    return null;
  },

  querySelectorAll: function (sel) {
    if (!_currentDom) return [];
    const { els } = _currentDom;
    if (sel === 'input, textarea, select') {
      return [els.firstname, els.lastname, els.email, els.phone, els.resume];
    }
    if (sel === 'textarea, input[type="text"]') {
      return [els.firstname];
    }
    return [];
  },

  get title() { return 'Senior Marketing Manager | Acme Corp'; },
};

// ---------------------------------------------------------------------------
// Load iCIMS platform module (wrapped so stubs run before file exists)
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
    req('../../platforms/icims');
  } catch (e) { /* file not yet created — stubs still run */ }
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('icims', () => {

  beforeEach(() => {
    _currentDom = buildDom();
    window.JobFill.matcher.findBestAnswer    = function () { return null; };
    window.JobFill.matcher.substituteVariables = function (s) { return s; };
    // Reset window.top to same-origin default (window === window.top means not in iframe)
    var topDesc = Object.getOwnPropertyDescriptor(window, 'top');
    if (topDesc && topDesc.get) {
      delete window.top;
    }
    // Ensure window.top === window so detectCrossOrigin() returns false by default
    if (!('top' in window) || window.top !== window) {
      Object.defineProperty(window, 'top', {
        value: window,
        configurable: true,
        writable: true,
      });
    }
    // chrome stub
    global.chrome = { runtime: { sendMessage: function () {} } };
  });

  function icims() {
    return window.JobFill.platforms && window.JobFill.platforms.icims;
  }

  test('TEST: matches() returns true for icims.com hostname', () => {
    const mod = icims();
    assert.ok(mod, 'platforms/icims.js must be loaded');
    assert.strictEqual(mod.matches('icims.com'), true);
  });

  test('TEST: matches() returns true for careers.icims.com hostname', () => {
    const mod = icims();
    assert.ok(mod, 'platforms/icims.js must be loaded');
    assert.strictEqual(mod.matches('careers.icims.com'), true);
  });

  test('TEST: matches() returns false for non-iCIMS hostname', () => {
    const mod = icims();
    assert.ok(mod, 'platforms/icims.js must be loaded');
    assert.strictEqual(mod.matches('greenhouse.io'), false);
  });

  test('TEST: fill() returns results array with filled status for standard fields', async () => {
    const mod = icims();
    assert.ok(mod, 'platforms/icims.js must be loaded');

    const profile = { firstName: 'Jane', lastName: 'Doe', email: 'jane@doe.com', phone: '5551234' };
    const results = await mod.fill(profile, []);

    assert.ok(Array.isArray(results), 'fill() must return an array');
    const firstNameResult = results.find(r => r.field === 'First Name');
    assert.ok(firstNameResult, 'results must include First Name');
    assert.strictEqual(firstNameResult.status, 'filled');
  });

  test('TEST: fill() skips fields that already have a value', async () => {
    const mod = icims();
    assert.ok(mod, 'platforms/icims.js must be loaded');

    // Pre-fill the firstname element
    _currentDom.els.firstname._value = 'AlreadyFilled';

    const profile = { firstName: 'Jane', lastName: 'Doe', email: 'jane@doe.com', phone: '5551234' };
    const results = await mod.fill(profile, []);

    assert.ok(Array.isArray(results), 'fill() must return an array');
    const firstNameResult = results.find(r => r.field === 'First Name');
    assert.ok(firstNameResult, 'results must include First Name');
    assert.strictEqual(firstNameResult.status, 'skipped');
    assert.strictEqual(firstNameResult.reason, 'already has value');
  });

  test('TEST: fill() detects cross-origin iframe and returns failed result', async () => {
    const mod = icims();
    assert.ok(mod, 'platforms/icims.js must be loaded');

    // Simulate being inside a cross-origin iframe:
    // window !== window.top AND window.top.location throws SecurityError
    const fakeTop = {};
    Object.defineProperty(fakeTop, 'location', {
      get: function () {
        const err = new Error('Blocked a frame with origin');
        err.name = 'SecurityError';
        throw err;
      },
    });
    Object.defineProperty(window, 'top', {
      get: function () { return fakeTop; },
      configurable: true,
    });

    const profile = { firstName: 'Jane' };
    const results = await mod.fill(profile, []);

    // Restore window.top to same-origin default
    delete window.top;
    Object.defineProperty(window, 'top', {
      value: window,
      configurable: true,
      writable: true,
    });

    assert.ok(Array.isArray(results), 'fill() must return an array');
    assert.ok(results.length > 0, 'must have at least one result');
    assert.strictEqual(results[0].status, 'failed');
    assert.ok(
      results[0].reason && results[0].reason.indexOf('cross-origin') !== -1,
      'reason must mention cross-origin'
    );
  });

  test('TEST: getJobDetails() parses job title from iCIMS_JobTitle element', () => {
    const mod = icims();
    assert.ok(mod, 'platforms/icims.js must be loaded');

    _currentDom = buildDom();
    const details = mod.getJobDetails();

    assert.strictEqual(details.jobTitle, 'Senior Marketing Manager');
  });

});
