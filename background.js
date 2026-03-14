// JobFill — background.js
// MV3 Service Worker — message router + keyboard command handler

// --- Initialization (synchronous, top-level, runs on every SW activation) ---
chrome.storage.session.setAccessLevel(
  { accessLevel: 'TRUSTED_AND_UNTRUSTED_CONTEXTS' },
  () => {
    if (chrome.runtime.lastError) {
      console.warn('[JobFill BG] setAccessLevel failed:', chrome.runtime.lastError.message);
    }
  }
);

chrome.runtime.onMessage.addListener(handleMessage);
chrome.commands.onCommand.addListener(handleCommand);

// --- Message Router (synchronous, NOT async — returns true on all async branches) ---
function handleMessage(msg, sender, sendResponse) {
  switch (msg.type) {
    case 'TRIGGER_FILL':           triggerFill(sendResponse);                    return true;
    case 'GET_STATUS':             getStatus(msg.tabId, sendResponse);           return true;
    case 'EXPORT_DATA':            exportData(sendResponse);                     return true;
    case 'IMPORT_DATA':            importData(msg.payload, sendResponse);        return true;
    case 'RESUME_UPLOAD_FALLBACK': sendResponse({ error: 'Not yet implemented' }); return true;
  }
  // Unknown type — no response needed, do NOT return true
}

// --- Keyboard Command Handler ---
function handleCommand(command) {
  if (command === 'fill-form') {
    triggerFill(() => {}); // fire-and-forget — keyboard shortcut has no response channel
  }
}

// --- Async Handler Functions ---

async function triggerFill(sendResponse) {
  let tab;
  try {
    [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  } catch (err) {
    sendResponse({ error: 'Extension context invalidated — reload the tab.' });
    return;
  }
  if (!tab) {
    sendResponse({ error: 'No active tab found.' });
    return;
  }
  chrome.tabs.sendMessage(tab.id, { type: 'DO_FILL', tabId: tab.id }, (response) => {
    if (chrome.runtime.lastError) {
      const msg = chrome.runtime.lastError.message || '';
      if (msg.includes('invalidated')) {
        sendResponse({ error: 'Extension context invalidated — reload the tab.' });
      } else {
        sendResponse({ error: 'Content script not available on this page.' });
      }
      return;
    }
    sendResponse(response || { error: 'Content script returned no response.' });
  });
}

async function getStatus(tabId, sendResponse) {
  try {
    const r = await chrome.storage.session.get('lastFillStatus');
    const status = r.lastFillStatus || null;
    const result = (status && status.tabId === tabId) ? status : null;
    sendResponse({ status: result });
  } catch (err) {
    sendResponse({ error: err.message });
  }
}

async function exportData(sendResponse) {
  try {
    const { profile } = await chrome.storage.sync.get('profile');
    const { answerBank } = await chrome.storage.sync.get('answerBank');
    sendResponse({
      data: {
        schemaVersion: 1,
        exportedAt: new Date().toISOString(),
        profile: profile || {},
        answerBank: answerBank || [],
        // resume intentionally excluded — FR-5.1
      }
    });
  } catch (err) {
    sendResponse({ error: err.message });
  }
}

async function importData(payload, sendResponse) {
  try {
    if (!payload || typeof payload !== 'object') {
      sendResponse({ error: 'Invalid import: payload must be an object.' });
      return;
    }
    if (payload.schemaVersion !== 1) {
      sendResponse({ error: 'Invalid import: unsupported schema version.' });
      return;
    }
    if (payload.profile && typeof payload.profile === 'object') {
      await chrome.storage.sync.set({ profile: payload.profile });
    }
    if (Array.isArray(payload.answerBank)) {
      const r = await chrome.storage.sync.get('answerBank');
      const existing = r.answerBank || [];
      const merged = mergeAnswerBank(existing, payload.answerBank);
      await chrome.storage.sync.set({ answerBank: merged });
    }
    // payload.resume is intentionally ignored — never write resume to sync storage
    sendResponse({ success: true });
  } catch (err) {
    sendResponse({ error: err.message });
  }
}

function mergeAnswerBank(existing, incoming) {
  const map = {};
  for (const e of existing) map[e.id] = e;
  for (const e of incoming) map[e.id] = e; // incoming wins on id collision
  return Object.values(map);
}
