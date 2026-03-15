'use strict';
const { test, describe, before } = require('node:test');
const assert = require('node:assert/strict');

// ---------------------------------------------------------------------------
// Minimal DOM implementation for platform tests
// Supports: querySelector, querySelectorAll, closest, innerHTML (parse),
//           element.value, .name, .type, .placeholder, .getAttribute,
//           .textContent, .parentElement, .children (Array)
// ---------------------------------------------------------------------------

function MockNode(tagName, attrs, text) {
  this.tagName = tagName.toUpperCase();
  this._attrs = attrs || {};
  this._text = text || '';
  this._value = (attrs && attrs.value) || '';
  this.children = [];
  this.parentElement = null;
  // common shortcuts
  this.name = this._attrs.name || '';
  this.type = (this._attrs.type || '').toLowerCase();
  this.placeholder = this._attrs.placeholder || '';
  this.id = this._attrs.id || '';
  this.className = this._attrs.class || '';
  this['data-qa'] = this._attrs['data-qa'] || '';
}

Object.defineProperty(MockNode.prototype, 'value', {
  get: function () { return this._value; },
  set: function (v) { this._value = String(v); },
  configurable: true
});

Object.defineProperty(MockNode.prototype, 'textContent', {
  get: function () {
    var t = this._text;
    this.children.forEach(function (c) { t += c.textContent; });
    return t;
  },
  configurable: true
});

Object.defineProperty(MockNode.prototype, 'innerHTML', {
  get: function () { return ''; },
  set: function (html) {
    this.children = [];
    parseInto(this, html);
  },
  configurable: true
});

MockNode.prototype.getAttribute = function (name) {
  return Object.prototype.hasOwnProperty.call(this._attrs, name)
    ? this._attrs[name]
    : null;
};

MockNode.prototype.querySelector = function (sel) {
  return matchFirst(this, parseSelector(sel));
};

MockNode.prototype.querySelectorAll = function (sel) {
  return matchAll(this, parseSelector(sel));
};

MockNode.prototype.closest = function (sel) {
  var spec = parseSelector(sel);
  var node = this;
  while (node) {
    if (nodeMatches(node, spec)) return node;
    node = node.parentElement;
  }
  return null;
};

// ---------------------------------------------------------------------------
// Minimal CSS selector parser — handles tag, [attr], [attr="val"], [attr*=val i],
// space-separated descendant chains, comma-separated alternatives, and
// compound selectors (tag[attr])
// ---------------------------------------------------------------------------

function parseSelector(sel) {
  // comma → array of alternatives
  var parts = sel.split(',').map(function (s) { return s.trim(); });
  if (parts.length > 1) {
    return { type: 'multi', parts: parts.map(parseSelector) };
  }
  // space → descendant chain
  var tokens = sel.trim().split(/\s+/);
  if (tokens.length > 1) {
    return { type: 'descendant', chain: tokens.map(parseSingle) };
  }
  return parseSingle(sel.trim());
}

function parseSingle(s) {
  // Break compound selector into parts: tag[attr1][attr2]
  var spec = { tag: null, attrs: [] };
  // extract tag (optional)
  var tagMatch = s.match(/^([a-zA-Z][a-zA-Z0-9]*)/);
  if (tagMatch) {
    spec.tag = tagMatch[1].toUpperCase();
    s = s.slice(tagMatch[1].length);
  }
  // extract attribute selectors
  var attrRe = /\[([^\]]+)\]/g;
  var m;
  while ((m = attrRe.exec(s)) !== null) {
    spec.attrs.push(m[1]);
  }
  return spec;
}

function nodeMatches(node, spec) {
  if (!spec) return false;
  if (spec.type === 'multi') {
    return spec.parts.some(function (p) { return nodeMatches(node, p); });
  }
  if (spec.type === 'descendant') {
    // Only check the last token against this node; ancestor checking done in matchFirst/matchAll
    return nodeMatchesSingle(node, spec.chain[spec.chain.length - 1]);
  }
  return nodeMatchesSingle(node, spec);
}

function nodeMatchesSingle(node, spec) {
  if (!spec || !node || !node.tagName) return false;
  if (spec.tag && node.tagName !== spec.tag) return false;
  for (var i = 0; i < spec.attrs.length; i++) {
    if (!attrMatches(node, spec.attrs[i])) return false;
  }
  return true;
}

function attrMatches(node, attrExpr) {
  // [name="value" i]  case-insensitive
  // [name*="value" i] contains, case-insensitive
  // [name*="value"]   contains
  // [name="value"]    exact
  // [name]            presence
  var ciFlag = /\s+i\s*$/.test(attrExpr);
  var expr = attrExpr.replace(/\s+i\s*$/, '').trim();

  var containsMatch = expr.match(/^([^*=\]]+)\*=["']?([^"'\]]*)["']?$/);
  var exactMatch = expr.match(/^([^=\]]+)=["']?([^"'\]]*)["']?$/);
  var presenceMatch = expr.match(/^([^\]=]+)$/);

  var attrName, attrVal, nodeVal;

  if (containsMatch) {
    attrName = containsMatch[1].trim();
    attrVal = containsMatch[2];
    nodeVal = getAttrValue(node, attrName);
    if (nodeVal === null) return false;
    return ciFlag
      ? nodeVal.toLowerCase().includes(attrVal.toLowerCase())
      : nodeVal.includes(attrVal);
  }
  if (exactMatch) {
    attrName = exactMatch[1].trim();
    attrVal = exactMatch[2];
    nodeVal = getAttrValue(node, attrName);
    if (nodeVal === null) return false;
    return ciFlag
      ? nodeVal.toLowerCase() === attrVal.toLowerCase()
      : nodeVal === attrVal;
  }
  if (presenceMatch) {
    attrName = presenceMatch[1].trim();
    return getAttrValue(node, attrName) !== null;
  }
  return false;
}

function getAttrValue(node, name) {
  // Check common mapped properties first
  var prop = node._attrs && Object.prototype.hasOwnProperty.call(node._attrs, name)
    ? node._attrs[name]
    : null;
  if (prop !== null && prop !== undefined) return String(prop);
  // fallback property map
  var map = { name: node.name, type: node.type, placeholder: node.placeholder, id: node.id };
  if (Object.prototype.hasOwnProperty.call(map, name)) {
    return map[name] !== undefined && map[name] !== '' ? String(map[name]) : null;
  }
  return null;
}

function matchFirst(root, spec) {
  for (var i = 0; i < root.children.length; i++) {
    var child = root.children[i];
    if (nodeMatches(child, spec)) return child;
    var found = matchFirst(child, spec);
    if (found) return found;
  }
  return null;
}

function matchAll(root, spec) {
  var results = [];
  function walk(node) {
    for (var i = 0; i < node.children.length; i++) {
      var child = node.children[i];
      if (nodeMatches(child, spec)) results.push(child);
      walk(child);
    }
  }
  walk(root);
  return results;
}

// ---------------------------------------------------------------------------
// Minimal HTML parser — regex-based, handles self-closing tags, nested tags,
// attributes with single/double quotes or no quotes
// ---------------------------------------------------------------------------

var VOID_TAGS = new Set(['input', 'img', 'br', 'hr', 'meta', 'link']);

function parseInto(parent, html) {
  var pos = 0;

  function peek() { return html[pos] || ''; }

  function parseAttrs(str) {
    var attrs = {};
    var re = /([a-zA-Z_:][a-zA-Z0-9_.:\-]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]*)))?/g;
    var m;
    while ((m = re.exec(str)) !== null) {
      attrs[m[1]] = m[2] !== undefined ? m[2]
                  : m[3] !== undefined ? m[3]
                  : m[4] !== undefined ? m[4]
                  : '';
    }
    return attrs;
  }

  function parseTag() {
    // pos is at '<'
    pos++; // skip '<'
    if (html[pos] === '/') {
      // closing tag — skip to '>'
      while (pos < html.length && html[pos] !== '>') pos++;
      pos++; // skip '>'
      return null;
    }
    if (html[pos] === '!' || html[pos] === '?') {
      while (pos < html.length && html[pos] !== '>') pos++;
      pos++;
      return null;
    }
    // read tag name + attributes until '>'
    var start = pos;
    var selfClose = false;
    while (pos < html.length && html[pos] !== '>') pos++;
    var raw = html.slice(start, pos);
    if (raw.endsWith('/')) { selfClose = true; raw = raw.slice(0, -1); }
    pos++; // skip '>'
    var spIdx = raw.search(/\s/);
    var tagName = spIdx === -1 ? raw : raw.slice(0, spIdx);
    var attrStr = spIdx === -1 ? '' : raw.slice(spIdx);
    var attrs = parseAttrs(attrStr);
    var node = new MockNode(tagName, attrs, '');
    node.parentElement = parent;
    parent.children.push(node);
    if (!selfClose && !VOID_TAGS.has(tagName.toLowerCase())) {
      parseChildren(node);
    }
    return node;
  }

  function parseChildren(node) {
    while (pos < html.length) {
      // text node
      if (html[pos] !== '<') {
        var tStart = pos;
        while (pos < html.length && html[pos] !== '<') pos++;
        node._text += html.slice(tStart, pos).replace(/\s+/g, ' ');
        continue;
      }
      // check for closing tag
      if (html.slice(pos, pos + 2) === '</') {
        // skip closing tag
        while (pos < html.length && html[pos] !== '>') pos++;
        pos++;
        return;
      }
      parseTag.call(null); // note: parseTag pushes to current parent
      // re-call with node as parent by resetting parent contextually
      // Actually we need a different approach — recursive descent with parent param
      break;
    }
  }

  // Use a proper recursive descent
  parseHtml(parent, html);
}

function parseHtml(parent, html) {
  var pos = 0;

  function parseNode(currentParent) {
    // skip whitespace text nodes
    while (pos < html.length && html[pos] !== '<') {
      var tStart = pos;
      while (pos < html.length && html[pos] !== '<') pos++;
      var text = html.slice(tStart, pos).replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
      if (text && currentParent._text !== undefined) currentParent._text += (currentParent._text ? ' ' : '') + text;
    }
    if (pos >= html.length) return;
    pos++; // skip '<'
    if (pos >= html.length) return;

    // comment / doctype
    if (html[pos] === '!' || html[pos] === '?') {
      while (pos < html.length && html[pos] !== '>') pos++;
      if (pos < html.length) pos++;
      return;
    }
    // closing tag
    if (html[pos] === '/') {
      while (pos < html.length && html[pos] !== '>') pos++;
      if (pos < html.length) pos++;
      return;
    }

    // opening tag
    var tagStart = pos;
    while (pos < html.length && html[pos] !== '>' && html[pos] !== ' ' && html[pos] !== '\t' && html[pos] !== '\n' && html[pos] !== '\r') pos++;
    var tagName = html.slice(tagStart, pos).trim();
    if (!tagName) { while (pos < html.length && html[pos] !== '>') pos++; pos++; return; }

    // attrs
    var attrStart = pos;
    while (pos < html.length && html[pos] !== '>') pos++;
    var attrStr = html.slice(attrStart, pos);
    var selfClose = attrStr.endsWith('/');
    if (selfClose) attrStr = attrStr.slice(0, -1);
    if (pos < html.length) pos++; // skip '>'

    var attrs = {};
    var re = /([a-zA-Z_:][a-zA-Z0-9_.:\-\[\]]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]*)))?/g;
    var m;
    while ((m = re.exec(attrStr)) !== null) {
      attrs[m[1]] = m[2] !== undefined ? m[2]
                  : m[3] !== undefined ? m[3]
                  : m[4] !== undefined ? m[4]
                  : '';
    }

    var node = new MockNode(tagName, attrs, '');
    node.parentElement = currentParent;
    currentParent.children.push(node);

    var isVoid = VOID_TAGS.has(tagName.toLowerCase()) || selfClose;
    if (!isVoid) {
      // parse children until matching close tag
      var closingTag = '</' + tagName;
      while (pos < html.length) {
        // skip text
        if (html[pos] !== '<') {
          var ts = pos;
          while (pos < html.length && html[pos] !== '<') pos++;
          var txt = html.slice(ts, pos).replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
          var trimmed = txt.trim();
          if (trimmed) node._text += (node._text ? ' ' : '') + trimmed;
          continue;
        }
        // check closing tag for this node
        if (html.slice(pos, pos + closingTag.length).toLowerCase() === closingTag.toLowerCase()) {
          while (pos < html.length && html[pos] !== '>') pos++;
          if (pos < html.length) pos++;
          break;
        }
        // child node
        parseNode(node);
      }
    }
  }

  while (pos < html.length) {
    if (html[pos] !== '<') { pos++; continue; }
    parseNode(parent);
  }
}

// ---------------------------------------------------------------------------
// Global document mock — set up before lever.js loads
// ---------------------------------------------------------------------------

var _docBody = new MockNode('body', {}, '');
_docBody.parentElement = null;

var _document = {
  title: '',
  body: _docBody,
  querySelector: function (sel) { return _docBody.querySelector(sel); },
  querySelectorAll: function (sel) { return _docBody.querySelectorAll(sel); }
};

global.window = global.window || {};
global.document = _document;
global.Array = Array;

// Wire body.innerHTML setter to reparse
Object.defineProperty(_docBody, 'innerHTML', {
  get: function () { return ''; },
  set: function (html) {
    this.children = [];
    this._text = '';
    if (html) parseHtml(this, html);
  },
  configurable: true
});

// ---------------------------------------------------------------------------
// Setup window.JobFill mock BEFORE lever.js loads
// ---------------------------------------------------------------------------

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
    substituteVariables: function (s) { return s; },
    matchDropdownOption: function () { return null; }
  }
};

// ---------------------------------------------------------------------------
// Load module under test
// ---------------------------------------------------------------------------
let lv = null;
try {
  require('../../platforms/lever');
  lv = (window.JobFill && window.JobFill.platforms && window.JobFill.platforms.lever) || null;
} catch (e) {
  console.error('Failed to load lever.js:', e.message);
}

// ---------------------------------------------------------------------------
// Fixture HTML (body content only)
// ---------------------------------------------------------------------------
const FIXTURE = `
  <div class="main-header-logo"><img alt="Acme Corp" src="logo.png"></div>
  <h2>Product Marketing Manager</h2>
  <form id="application-form">
    <div class="application-field"><label>Full Name</label><input name="name" type="text"></div>
    <div class="application-field"><label>Email</label><input name="email" type="email"></div>
    <div class="application-field"><label>Phone</label><input name="phone" type="tel"></div>
    <div class="application-field"><label>LinkedIn Profile</label><input name="urls[LinkedIn]" type="text"></div>
    <div class="application-field"><label>Portfolio</label><input name="urls[Portfolio]" type="text"></div>
    <div class="application-field"><label>Resume</label><input name="resume" type="file"></div>
    <div class="application-field"><label>Cover Letter</label><textarea name="comments" placeholder="Cover letter"></textarea></div>
    <div data-qa="additional-cards-question"><label>Why are you interested?</label><textarea></textarea></div>
  </form>
`;

function loadFixture() {
  document.body.innerHTML = FIXTURE;
}
function clearFixture() {
  document.body.innerHTML = '';
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
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
    loadFixture();
    const results = await lv.fill({
      fullName: 'Adarsh Shankar',
      email: 'test@example.com',
      phone: '+971501234567',
      linkedinUrl: 'https://linkedin.com/in/adarsh',
      portfolioUrl: ''
    }, []);
    clearFixture();
    const r = results.find(r => r.field === 'Full Name');
    assert.ok(r, 'Full Name result must exist');
    assert.strictEqual(r.status, 'filled');
    assert.strictEqual(r.value, 'Adarsh Shankar');
  });

  test('TEST: lever fill — email filled from profile', async () => {
    assert.ok(lv, 'lever module must be loaded');
    loadFixture();
    const results = await lv.fill({
      fullName: 'Adarsh Shankar',
      email: 'test@example.com',
      phone: '+971501234567',
      linkedinUrl: 'https://linkedin.com/in/adarsh',
      portfolioUrl: ''
    }, []);
    clearFixture();
    const r = results.find(r => r.field === 'Email');
    assert.ok(r, 'Email result must exist');
    assert.strictEqual(r.status, 'filled');
    assert.strictEqual(r.value, 'test@example.com');
  });

  test("TEST: lever fill — file input skipped with reason 'resume upload in Phase 11'", async () => {
    assert.ok(lv, 'lever module must be loaded');
    loadFixture();
    const results = await lv.fill({
      fullName: 'Adarsh Shankar',
      email: 'test@example.com',
      phone: '+971501234567',
      linkedinUrl: '',
      portfolioUrl: ''
    }, []);
    clearFixture();
    const r = results.find(r => r.field === 'Resume');
    assert.ok(r, 'Resume result must exist');
    assert.strictEqual(r.status, 'skipped');
    assert.strictEqual(r.reason, 'resume upload in Phase 11');
  });

  test('TEST: lever fill — already-filled field skipped', async () => {
    assert.ok(lv, 'lever module must be loaded');
    loadFixture();
    const phoneEl = document.querySelector('input[name="phone"]');
    phoneEl.value = '+1234';
    const results = await lv.fill({
      fullName: 'Adarsh Shankar',
      email: 'test@example.com',
      phone: '+971501234567',
      linkedinUrl: '',
      portfolioUrl: ''
    }, []);
    clearFixture();
    const r = results.find(r => r.field === 'Phone');
    assert.ok(r, 'Phone result must exist');
    assert.strictEqual(r.status, 'skipped');
    assert.strictEqual(r.reason, 'already has value');
  });

  test('TEST: lever fill — data-qa custom question filled from answer bank', async () => {
    assert.ok(lv, 'lever module must be loaded');
    loadFixture();
    const results = await lv.fill({
      fullName: 'Adarsh Shankar',
      email: 'test@example.com',
      phone: '',
      linkedinUrl: '',
      portfolioUrl: ''
    }, [
      { question: 'Why are you interested?', answer: 'I am passionate about marketing.' }
    ]);
    clearFixture();
    const r = results.find(r => r.status === 'filled' && r.field && r.field.toLowerCase().includes('why'));
    assert.ok(r, 'data-qa custom question must be filled');
    assert.strictEqual(r.status, 'filled');
  });

});
