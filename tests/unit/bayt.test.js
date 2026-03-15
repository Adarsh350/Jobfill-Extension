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
    _value: '',
    _attributes: Object.assign({}, attrs),
    _classes: (attrs.class || '').split(' ').filter(Boolean),
    _ariaLabel: attrs['aria-label'] || '',
    textContent: '',
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

function makeLabelEl(forAttr, text) {
  return {
    tagName: 'LABEL',
    htmlFor: forAttr,
    textContent: text,
    innerText: text,
  };
}

function buildDom() {
  const els = {
    FirstName:   makeElement('input',    { id: 'FirstName',   name: 'FirstName',   type: 'text' }),
    LastName:    makeElement('input',    { id: 'LastName',    name: 'LastName',    type: 'text' }),
    Email:       makeElement('input',    { id: 'Email',       name: 'Email',       type: 'email' }),
    Phone:       makeElement('input',    { id: 'Phone',       name: 'Phone',       type: 'tel' }),
    CoverLetter: makeElement('textarea', { id: 'CoverLetter', name: 'CoverLetter', type: '' }),
  };

  // Arabic labels — must NOT be used for field identification (RTL safety)
  const labels = {
    FirstName:   makeLabelEl('FirstName',   'الاسم الأول'),
    LastName:    makeLabelEl('LastName',    'الاسم الأخير'),
    Email:       makeLabelEl('Email',       'البريد الإلكتروني'),
    Phone:       makeLabelEl('Phone',       'رقم الهاتف'),
    CoverLetter: makeLabelEl('CoverLetter', 'رسالة التقديم'),
  };

  return { els, labels };
}

let _currentDom = null;
// Toggle to simulate non-Bayt form context
let _isBaytForm = true;

global.document = {
  querySelector: function (sel) {
    if (!_currentDom) return null;
    const { els } = _currentDom;

    // Bayt form detection
    if (sel === '#applyForm' || sel === 'form#applyForm') {
      return _isBaytForm ? { tagName: 'FORM', id: 'applyForm' } : null;
    }
    // Combined selector used by isNativeBaytForm
    if (sel === 'form[action*="bayt.com"], form[id*="apply"], #applyForm') {
      return _isBaytForm ? { tagName: 'FORM', id: 'applyForm' } : null;
    }

    // PascalCase ID selectors
    if (sel === '#FirstName'   || sel === 'input#FirstName')   return els.FirstName;
    if (sel === '#LastName'    || sel === 'input#LastName')    return els.LastName;
    if (sel === '#Email'       || sel === 'input#Email')       return els.Email;
    if (sel === '#Phone'       || sel === 'input#Phone')       return els.Phone;
    if (sel === '#CoverLetter' || sel === 'textarea#CoverLetter') return els.CoverLetter;

    // PascalCase name attribute selectors
    if (sel === 'input[name="FirstName"]') return els.FirstName;
    if (sel === 'input[name="LastName"]')  return els.LastName;
    if (sel === 'input[name="Email"]')     return els.Email;
    if (sel === 'input[name="Phone"]')     return els.Phone;
    if (sel === 'textarea[name="CoverLetter"]') return els.CoverLetter;

    // Type selectors
    if (sel === 'input[type="email"]') return els.Email;
    if (sel === 'input[type="tel"]')   return els.Phone;

    return null;
  },

  querySelectorAll: function (sel) {
    if (!_currentDom) return [];
    const { els } = _currentDom;
    if (sel === 'input, textarea, select') {
      return [els.FirstName, els.LastName, els.Email, els.Phone, els.CoverLetter];
    }
    if (sel === 'textarea') {
      return [els.CoverLetter];
    }
    return [];
  },

  get title() { return 'تقديم طلب | Bayt.com'; },
};

// ---------------------------------------------------------------------------
// Load Bayt platform module (wrapped so stubs run before file exists)
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
    req('../../platforms/bayt');
  } catch (e) { /* file not yet created — stubs still run */ }
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('bayt', () => {

  beforeEach(() => {
    _currentDom = buildDom();
    _isBaytForm = true;
    window.JobFill.matcher.findBestAnswer    = function () { return null; };
    window.JobFill.matcher.substituteVariables = function (s) { return s; };
  });

  function bayt() {
    return window.JobFill.platforms && window.JobFill.platforms.bayt;
  }

  test('TEST: matches() returns true for bayt.com hostname', () => {
    const mod = bayt();
    assert.ok(mod, 'platforms/bayt.js must be loaded');
    assert.strictEqual(mod.matches('www.bayt.com'), true, 'matches www.bayt.com');
    assert.strictEqual(mod.matches('bayt.com'), true, 'matches bayt.com');
    assert.strictEqual(mod.matches('greenhouse.io'), false, 'does not match greenhouse.io');
  });

  test('TEST: fill() fills FirstName using name attribute selector', async () => {
    const mod = bayt();
    assert.ok(mod, 'platforms/bayt.js must be loaded');
    const profile = { firstName: 'Jane', lastName: 'Doe', email: 'jane@example.com', phone: '+1234567890' };
    const results = await mod.fill(profile, []);
    const r = results.find(x => x.field === 'First Name');
    assert.ok(r, 'First Name result must exist');
    assert.strictEqual(r.status, 'filled', 'First Name status must be filled');
    assert.strictEqual(_currentDom.els.FirstName.value, 'Jane', 'FirstName element value must be set');
  });

  test('TEST: fill() fills Email using type=email selector', async () => {
    const mod = bayt();
    assert.ok(mod, 'platforms/bayt.js must be loaded');
    const profile = { firstName: 'Jane', lastName: 'Doe', email: 'jane@example.com', phone: '+1234567890' };
    const results = await mod.fill(profile, []);
    const r = results.find(x => x.field === 'Email');
    assert.ok(r, 'Email result must exist');
    assert.strictEqual(r.status, 'filled', 'Email status must be filled');
  });

  test('TEST: fill() does not use label text for field identification', () => {
    // Source-code audit: reads platforms/bayt.js as text and asserts
    // no selector contains placeholder, aria-label, or Arabic Unicode characters
    const baytPath = path.resolve(__dirname, '../../platforms/bayt.js');
    assert.ok(fs.existsSync(baytPath), 'platforms/bayt.js must exist');
    const src = fs.readFileSync(baytPath, 'utf8');
    assert.ok(!/placeholder\s*\*/i.test(src), 'No selector must reference placeholder');
    assert.ok(!/aria-label/i.test(src), 'No selector must reference aria-label');
    // Ensure no Arabic Unicode characters appear inside selector strings
    // Arabic block: U+0600–U+06FF
    assert.ok(!/[\u0600-\u06FF]/.test(src), 'No Arabic characters in source');
  });

  test('TEST: fill() returns skipped when isNativeBaytForm() returns false', async () => {
    _isBaytForm = false;
    const mod = bayt();
    assert.ok(mod, 'platforms/bayt.js must be loaded');
    const profile = { firstName: 'Jane', lastName: 'Doe', email: 'jane@example.com', phone: '+1234567890' };
    const results = await mod.fill(profile, []);
    assert.strictEqual(results.length, 0, 'fill() must return empty array when not a Bayt form');
  });

  test('TEST: fill() fills Phone using type=tel or name=Phone selector', async () => {
    const mod = bayt();
    assert.ok(mod, 'platforms/bayt.js must be loaded');
    const profile = { firstName: 'Jane', lastName: 'Doe', email: 'jane@example.com', phone: '+1234567890' };
    const results = await mod.fill(profile, []);
    const r = results.find(x => x.field === 'Phone');
    assert.ok(r, 'Phone result must exist');
    assert.strictEqual(r.status, 'filled', 'Phone status must be filled');
  });

});
