'use strict';

/**
 * dom-mock.js — Node.js DOM shim for unit testing events.js and filler.js
 * Provides: MockElement, MockEvent, MockFocusEvent, MockMutationObserver, setupGlobals
 */

function MockElement(tag, type) {
  this.tagName = (tag || 'input').toUpperCase();
  this.type = type || '';
  this.checked = false;
  this.value = '';
  this.options = [];
  this.children = [];
  this.shadowRoot = null;
  this.isContentEditable = false;
  this._events = {};
  this._clicked = false;
  this._selector = null;
}

MockElement.prototype.dispatchEvent = function (event) {
  if (!this._events[event.type]) {
    this._events[event.type] = [];
  }
  this._events[event.type].push({ type: event.type, bubbles: event.bubbles });
};

MockElement.prototype.click = function () {
  this._clicked = true;
};

MockElement.prototype.querySelector = function (sel) {
  for (const child of this.children) {
    if (child._selector === sel) return child;
  }
  return null;
};

MockElement.prototype.querySelectorAll = function (sel) {
  return this.children.filter(function (child) {
    return child._selector === sel;
  });
};

function MockEvent(type, options) {
  this.type = type || '';
  this.bubbles = (options && options.bubbles) ? options.bubbles : false;
  this.composed = (options && options.composed) ? options.composed : false;
}

function MockFocusEvent(type, options) {
  this.type = type || '';
  this.bubbles = (options && options.bubbles) ? options.bubbles : false;
  this.composed = (options && options.composed) ? options.composed : false;
}

function MockMutationObserver(callback) {
  this._callback = callback;
  this._observing = false;
  this._target = null;
  this._options = null;
}

MockMutationObserver.prototype.observe = function (target, options) {
  this._target = target;
  this._options = options;
  this._observing = true;
};

MockMutationObserver.prototype.disconnect = function () {
  this._observing = false;
};

MockMutationObserver.prototype._trigger = function () {
  if (this._callback) {
    this._callback([], this);
  }
};

function setupGlobals() {
  global._nativeSetterCallLog = [];

  global.HTMLInputElement = { prototype: { value: '' } };
  Object.defineProperty(global.HTMLInputElement.prototype, 'value', {
    get: function () { return this._value || ''; },
    set: function (v) {
      this._value = v;
      global._nativeSetterCallLog.push({ el: this, value: v });
    },
    configurable: true,
  });

  global.HTMLTextAreaElement = { prototype: { value: '' } };
  Object.defineProperty(global.HTMLTextAreaElement.prototype, 'value', {
    get: function () { return this._value || ''; },
    set: function (v) {
      this._value = v;
      global._nativeSetterCallLog.push({ el: this, value: v });
    },
    configurable: true,
  });

  global.Event = MockEvent;
  global.FocusEvent = MockFocusEvent;
  global.MutationObserver = MockMutationObserver;
}

module.exports = { MockElement, MockEvent, MockFocusEvent, MockMutationObserver, setupGlobals };
