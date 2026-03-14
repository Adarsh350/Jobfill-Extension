// JobFill — utils/storage.js
// Storage utility layer — window.JobFill.storage
// Phase 2: Chrome Storage Utility Layer
window.JobFill = window.JobFill || {};

window.JobFill.storage = (function () {

  // --- Profile (chrome.storage.sync, key: "profile") ---

  async function getProfile() {
    const r = await chrome.storage.sync.get('profile');
    return r.profile || null;
  }

  async function saveProfile(data) {
    try {
      await chrome.storage.sync.set({ profile: data });
    } catch (err) {
      console.error('[JobFill] saveProfile quota error:', err.message);
      throw err;
    }
  }

  // --- Answer Bank (chrome.storage.sync, key: "answerBank") ---

  async function getAnswerBank() {
    const r = await chrome.storage.sync.get('answerBank');
    return r.answerBank || [];
  }

  async function saveAnswerBank(entries) {
    try {
      await chrome.storage.sync.set({ answerBank: entries });
    } catch (err) {
      console.error('[JobFill] saveAnswerBank quota error:', err.message);
      throw err;
    }
  }

  // --- Resume (chrome.storage.local — MUST use .local, NOT .sync)
  // Resume is base64 PDF up to 400 KB; sync limit is 8,192 bytes per item.

  async function getResume() {
    const r = await chrome.storage.local.get('resume');
    return r.resume || null;
  }

  async function saveResume(resumeObj) {
    try {
      await chrome.storage.local.set({ resume: resumeObj });
    } catch (err) {
      console.error('[JobFill] saveResume error:', err.message);
      throw err;
    }
  }

  async function clearResume() {
    await chrome.storage.local.remove('resume');
  }

  // --- Settings (chrome.storage.sync, key: "settings") ---

  async function getSettings() {
    const r = await chrome.storage.sync.get('settings');
    return r.settings || {};
  }

  async function saveSettings(settings) {
    try {
      await chrome.storage.sync.set({ settings });
    } catch (err) {
      console.error('[JobFill] saveSettings error:', err.message);
      throw err;
    }
  }

  // --- Fill Status (chrome.storage.session, key: "lastFillStatus") ---

  /**
   * NOTE: Requires Phase 3 (background.js) to call
   * chrome.storage.session.setAccessLevel({ accessLevel: 'TRUSTED_AND_UNTRUSTED_CONTEXTS' })
   * before this function works from content scripts.
   */
  async function getFillStatus(tabId) {
    const r = await chrome.storage.session.get('lastFillStatus');
    const s = r.lastFillStatus || null;
    return (s && s.tabId === tabId) ? s : null;
  }

  async function saveFillStatus(tabId, results) {
    try {
      await chrome.storage.session.set({
        lastFillStatus: {
          tabId,
          timestamp: new Date().toISOString(),
          results,
        }
      });
    } catch (err) {
      console.error('[JobFill] saveFillStatus error:', err.message);
      throw err;
    }
  }

  // --- Quota Monitoring ---
  // Uses callback form — getBytesInUse lacks a reliable Promise API in all Chrome versions.

  function getBytesInUse(key) {
    return new Promise((resolve) => {
      chrome.storage.sync.getBytesInUse(key, (bytes) => {
        resolve({
          used: bytes,
          limit: 8192,
          percentFull: Math.round((bytes / 8192) * 100),
          nearLimit: bytes > 6144,
        });
      });
    });
  }

  return {
    getProfile, saveProfile,
    getAnswerBank, saveAnswerBank,
    getResume, saveResume, clearResume,
    getSettings, saveSettings,
    getFillStatus, saveFillStatus,
    getBytesInUse,
  };

})();
