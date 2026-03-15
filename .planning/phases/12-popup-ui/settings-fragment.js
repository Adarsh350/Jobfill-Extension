// =============================================================================
// settings-fragment.js — MERGE INTO popup.js AFTER PLAN 12-04 COMPLETES
// =============================================================================
//
// MERGE INSTRUCTIONS:
//
//   1. Append ALL functions below (loadSettings, bindSettings, downloadJSON,
//      showImportStatus, initExport, initImport) to popup.js, after the last
//      function in the file.
//
//   2. Replace the existing DOMContentLoaded handler in popup.js with the
//      FINAL DOMCONTENTLOADED block at the bottom of this file.
//      There must be exactly ONE DOMContentLoaded listener in popup.js after
//      the merge — delete all partial ones left by plans 12-02, 12-03, 12-04.
//
//   3. Verify merge:
//        grep -c "DOMContentLoaded" popup.js   → must return 1
//        grep "EXPORT_DATA\|IMPORT_DATA" popup.js
//        grep "downloadJSON" popup.js
//        grep "loadProfile\|renderAnswerBank" popup.js
//        grep "chrome.runtime.lastError" popup.js
//
// =============================================================================
// ELEMENT IDs (from popup.html — plan 12-01):
//   #settings-autofill-enabled  — checkbox: autofill toggle
//   #btn-export                 — button:   export JSON
//   #import-input               — file input (accept=".json", display:none)
//   #import-status              — p:        shows success/error message
// =============================================================================

// --- Settings Tab ---

async function loadSettings() {
  const settings = await window.JobFill.storage.getSettings();
  const toggle = document.getElementById('settings-autofill-enabled');
  if (toggle) toggle.checked = settings.autofillEnabled !== false; // default true
}

function bindSettings() {
  const toggle = document.getElementById('settings-autofill-enabled');
  if (!toggle) return;
  toggle.addEventListener('change', async () => {
    const settings = await window.JobFill.storage.getSettings();
    settings.autofillEnabled = toggle.checked;
    await window.JobFill.storage.saveSettings(settings);
  });
}

// --- Import / Export ---

function downloadJSON(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function showImportStatus(message, isError) {
  const el = document.getElementById('import-status');
  if (!el) return;
  el.textContent = message;
  el.className = 'import-status ' + (isError ? 'error' : 'success');
  setTimeout(() => { el.textContent = ''; el.className = 'import-status'; }, 4000);
}

function initExport() {
  document.getElementById('btn-export').addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'EXPORT_DATA' }, (response) => {
      if (chrome.runtime.lastError || response.error) {
        showImportStatus('Export failed: ' + (response?.error || 'unknown error'), true);
        return;
      }
      downloadJSON(response.data, 'jobfill-export.json');
    });
  });
}

function initImport() {
  document.getElementById('import-input').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      let parsed;
      try {
        parsed = JSON.parse(evt.target.result);
      } catch {
        showImportStatus('Invalid JSON file.', true);
        return;
      }
      chrome.runtime.sendMessage({ type: 'IMPORT_DATA', payload: parsed }, async (response) => {
        if (chrome.runtime.lastError || response.error) {
          showImportStatus('Import failed: ' + (response?.error || 'unknown error'), true);
          return;
        }
        showImportStatus('Import complete.', false);
        await loadProfile();       // refresh profile tab fields
        await renderAnswerBank();  // refresh answer bank tab
      });
    };
    reader.readAsText(file);
    // Reset input so same file can be re-imported
    e.target.value = '';
  });
}

// =============================================================================
// FINAL DOMCONTENTLOADED — replaces ALL partial handlers from plans 12-02/03/04
// =============================================================================

document.addEventListener('DOMContentLoaded', async () => {
  initTabs();
  initFillButton();

  // Profile tab
  await loadProfile();
  bindProfileAutoSave();

  // Resume tab
  await loadResume();
  bindResumeTab();

  // Answer Bank tab
  await maybeLoadDefaultTemplates();
  await renderAnswerBank();
  bindAnswerBank();

  // Settings + Import/Export
  await loadSettings();
  bindSettings();
  initExport();
  initImport();
});
