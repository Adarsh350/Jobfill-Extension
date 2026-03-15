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

global.document = {
  querySelector: function (sel) {
    if (!_currentDom) return null;
    const { els } = _currentDom;

    // Modal detection
    if (sel === '.jobs-easy-apply-modal') {
      return _modalPresent ? { tagName: 'DIV', className: 'jobs-easy-apply-modal' } : null;
    }

    // Fields inside modal (scoped by id)
    if (sel === '#firstName'                 || sel === 'input#firstName')                 return els.firstName;
    if (sel === '#lastName'                  || sel === 'input#lastName')                  return els.lastName;
    if (sel === '#email-address'             || sel === 'input#email-address')             return els.email;
    if (sel === '#phoneNumber-nationalNumber' || sel === 'input#phoneNumber-nationalNumber') return els.phone;

    // Autocomplete
    if (sel === 'input[autocomplete="given-name"]')  return els.firstName;
    if (sel === 'input[autocomplete="family-name"]') return els.lastName;

    // Type selectors
    if (sel === 'input[type="email"]') return els.email;
    if (sel === 'input[type="tel"]')   return els.phone;

    // Buttons
    if (sel === 'button[aria-label="Submit application"]') return els.btnSubmit;
    if (sel === 'button[aria-label="Continue to next step"]') return els.btnNext;

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

  test('TEST: matches() returns true for linkedin.com hostname',
    { todo: 'implement platforms/linkedin.js' }, () => {});

  test('TEST: fill() returns empty array when .jobs-easy-apply-modal not present',
    { todo: 'implement platforms/linkedin.js' }, () => {});

  test('TEST: fill() fills phone field inside modal',
    { todo: 'implement platforms/linkedin.js' }, () => {});

  test('TEST: fill() fills firstName and lastName inside modal',
    { todo: 'implement platforms/linkedin.js' }, () => {});

  test('TEST: fill() does not click Submit or Next buttons',
    { todo: 'implement platforms/linkedin.js' }, () => {});

  test('TEST: fill() sets window._jobfillLinkedInObserver on modal',
    { todo: 'implement platforms/linkedin.js' }, () => {});

  test('TEST: fill() skips fields that already have a value',
    { todo: 'implement platforms/linkedin.js' }, () => {});

});
