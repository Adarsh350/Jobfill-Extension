// JobFill — utils/events.js
// React/Angular event dispatch helpers — Phase 4
// Exposes: window.JobFill.events
window.JobFill = window.JobFill || {};

window.JobFill.events = (function () {
  'use strict';

  function dispatchInputChange(el) {
    el.dispatchEvent(new Event('input',  { bubbles: true, composed: true }));
    el.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
  }

  function dispatchBlur(el) {
    el.dispatchEvent(new FocusEvent('blur', { bubbles: true }));
  }

  function fillInput(el, value) {
    var nativeSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype, 'value'
    ).set;
    nativeSetter.call(el, value);
    dispatchInputChange(el);
  }

  function fillTextarea(el, value) {
    var nativeSetter = Object.getOwnPropertyDescriptor(
      window.HTMLTextAreaElement.prototype, 'value'
    ).set;
    nativeSetter.call(el, value);
    dispatchInputChange(el);
  }

  function fillSelect(el, value) {
    var matched = Array.from(el.options).find(function (o) {
      return o.value === value || o.text === value;
    });
    if (!matched) {
      var lower = value.toLowerCase();
      matched = Array.from(el.options).find(function (o) {
        return o.value.toLowerCase() === lower || o.text.toLowerCase() === lower;
      });
    }
    if (!matched) return false;
    el.value = matched.value;
    el.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }

  function fillCheckbox(el, checked) {
    el.checked = Boolean(checked);
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function fillRadio(el) {
    el.checked = true;
    el.dispatchEvent(new Event('change', { bubbles: true }));
    el.click();
  }

  return {
    fillInput,
    fillTextarea,
    fillSelect,
    fillCheckbox,
    fillRadio,
    dispatchInputChange,
    dispatchBlur,
  };
})();
