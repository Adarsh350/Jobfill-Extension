'use strict';
const { test, describe, before } = require('node:test');
const assert = require('node:assert/strict');

// ---------------------------------------------------------------------------
// Minimal DOM implementation for platform tests
// Matches the pattern established in lever.test.js
// ---------------------------------------------------------------------------

function MockNode(tagName, attrs, text) {
  this.tagName = tagName.toUpperCase();
  this._attrs = attrs || {};
  this._text = text || '';
  this._value = (attrs && attrs.value) || '';
  this.children = [];
  this.parentElement = null;
  this.name = this._attrs.name || '';
  this.type = (this._attrs.type || '').toLowerCase();
  this.placeholder = this._attrs.placeholder || '';
  this.id = this._attrs.id || '';
  this.className = this._attrs.class || '';
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

MockNode.prototype.getAttribute = function (name) {
  return Object.prototype.hasOwnProperty.call(this._attrs, name)
    ? this._attrs[name]
    : null;
};

MockNode.prototype.setAttribute = function (name, val) {
  this._attrs[name] = val;
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
// CSS selector parser — tag, [attr], [attr="val"], [attr*=val i],
// descendant chains, comma alternatives, compound selectors
// ---------------------------------------------------------------------------

function parseSelector(sel) {
  var parts = sel.split(',').map(function (s) { return s.trim(); });
  if (parts.length > 1) {
    return { type: 'multi', parts: parts.map(parseSelector) };
  }
  var tokens = sel.trim().split(/\s+/);
  if (tokens.length > 1) {
    return { type: 'descendant', chain: tokens.map(parseSingle) };
  }
  return parseSingle(sel.trim());
}

function parseSingle(s) {
  var spec = { tag: null, attrs: [] };
  var tagMatch = s.match(/^([a-zA-Z][a-zA-Z0-9]*)/);
  if (tagMatch) {
    spec.tag = tagMatch[1].toUpperCase();
    s = s.slice(tagMatch[1].length);
  }
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
  var ciFlag = /\s+i\s*$/.test(attrExpr);
  var expr = attrExpr.replace(/\s+i\s*$/, '').trim();

  var containsMatch = expr.match(/^([^*=\]]+)\*=["']?([^"'\]]*)["']?$/);
  var exactMatch    = expr.match(/^([^=\]]+)=["']?([^"'\]]*)["']?$/);
  var presenceMatch = expr.match(/^([^\]=]+)$/);

  var attrName, attrVal, nodeVal;

  if (containsMatch) {
    attrName = containsMatch[1].trim();
    attrVal  = containsMatch[2];
    nodeVal  = getAttrValue(node, attrName);
    if (nodeVal === null) return false;
    return ciFlag
      ? nodeVal.toLowerCase().includes(attrVal.toLowerCase())
      : nodeVal.includes(attrVal);
  }
  if (exactMatch) {
    attrName = exactMatch[1].trim();
    attrVal  = exactMatch[2];
    nodeVal  = getAttrValue(node, attrName);
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
  var prop = node._attrs && Object.prototype.hasOwnProperty.call(node._attrs, name)
    ? node._attrs[name]
    : null;
  if (prop !== null && prop !== undefined) return String(prop);
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
// Minimal HTML parser
// ---------------------------------------------------------------------------

var VOID_TAGS = new Set(['input', 'img', 'br', 'hr', 'meta', 'link']);

function parseHtml(parent, html) {
  var pos = 0;

  function parseNode(currentParent) {
    while (pos < html.length && html[pos] !== '<') {
      var tStart = pos;
      while (pos < html.length && html[pos] !== '<') pos++;
      var text = html.slice(tStart, pos)
        .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
      if (text && currentParent._text !== undefined) {
        currentParent._text += (currentParent._text ? ' ' : '') + text;
      }
    }
    if (pos >= html.length) return;
    pos++; // skip '<'
    if (pos >= html.length) return;

    if (html[pos] === '!' || html[pos] === '?') {
      while (pos < html.length && html[pos] !== '>') pos++;
      if (pos < html.length) pos++;
      return;
    }
    if (html[pos] === '/') {
      while (pos < html.length && html[pos] !== '>') pos++;
      if (pos < html.length) pos++;
      return;
    }

    var tagStart = pos;
    while (pos < html.length && html[pos] !== '>' && html[pos] !== ' ' &&
           html[pos] !== '\t' && html[pos] !== '\n' && html[pos] !== '\r') pos++;
    var tagName = html.slice(tagStart, pos).trim();
    if (!tagName) { while (pos < html.length && html[pos] !== '>') pos++; pos++; return; }

    var attrStart = pos;
    while (pos < html.length && html[pos] !== '>') pos++;
    var attrStr = html.slice(attrStart, pos);
    var selfClose = attrStr.endsWith('/');
    if (selfClose) attrStr = attrStr.slice(0, -1);
    if (pos < html.length) pos++;

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
      var closingTag = '</' + tagName;
      while (pos < html.length) {
        if (html[pos] !== '<') {
          var ts = pos;
          while (pos < html.length && html[pos] !== '<') pos++;
          var txt = html.slice(ts, pos)
            .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
          var trimmed = txt.trim();
          if (trimmed) node._text += (node._text ? ' ' : '') + trimmed;
          continue;
        }
        if (html.slice(pos, pos + closingTag.length).toLowerCase() === closingTag.toLowerCase()) {
          while (pos < html.length && html[pos] !== '>') pos++;
          if (pos < html.length) pos++;
          break;
        }
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
// Global document mock
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
// Setup window.JobFill mock BEFORE generic.js loads
// ---------------------------------------------------------------------------

global.window.JobFill = {
  filler: {
    fillField: function (el, val) {
      if (el.type === 'file') return false;
      el.value = val;
      return true;
    }
  },
  events: {},
  matcher: {
    findBestAnswer: function () { return null; },
    substituteVariables: function (s) { return s; },
    matchDropdownOption: function () { return null; }
  }
};

// ---------------------------------------------------------------------------
// Load module under test
// ---------------------------------------------------------------------------

let mod = null;
before(function () {
  try {
    require('../../platforms/generic');
    mod = (global.window.JobFill && global.window.JobFill.platforms && global.window.JobFill.platforms.generic) || null;
  } catch (e) {
    console.error('Failed to load generic.js:', e.message);
  }
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('generic.matches()', function () {
  test('returns true for any hostname — example.com', { todo: true }, function () {});
  test('returns true for empty string', { todo: true }, function () {});
  test('returns true for greenhouse.io (would normally be caught first)', { todo: true }, function () {});
});

describe('generic.getJobDetails()', function () {
  test('extracts jobTitle from h1', { todo: true }, function () {});
  test('extracts companyName from title pipe split', { todo: true }, function () {});
  test('extracts companyName from meta description "at X" pattern', { todo: true }, function () {});
});

describe('generic.fill() — heuristic field discovery', function () {
  test('fills firstName from input with name=first_name', { todo: true }, function () {});
  test('fills email from input with type=email', { todo: true }, function () {});
  test('fills phone from input with type=tel', { todo: true }, function () {});
  test('fills summary from textarea with placeholder containing cover', { todo: true }, function () {});
});

describe('generic.fill() — exclusions', function () {
  test('skips input[type=hidden]', { todo: true }, function () {});
  test('skips input[type=password]', { todo: true }, function () {});
  test('skips input[type=file]', { todo: true }, function () {});
  test('skips CAPTCHA input by name pattern', { todo: true }, function () {});
});

describe('generic.fill() — needs_review policy', function () {
  test('all fill results have status needs_review, never filled', { todo: true }, function () {});
  test('skipped fields have status skipped, not needs_review', { todo: true }, function () {});
});

describe('generic.fill() — already-has-value guard', function () {
  test('skips element that already has a value (FR-2.6)', { todo: true }, function () {});
});

describe('generic.fill() — custom questions', function () {
  test('fills textarea via findBestAnswer when confidence >= 0.75', { todo: true }, function () {});
  test('skips textarea when findBestAnswer returns null', { todo: true }, function () {});
});
