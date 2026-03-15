// Resume Tab Fragment — to be merged into popup.js by plan 12-04
// Implements: formatBytes, showResumeInfo, clearResumeUI, loadResume, bindResumeTab
// Element IDs: #resume-input, #resume-info, #resume-filename, #resume-size, #resume-clear, #resume-empty
// Storage API: window.JobFill.storage.getResume / saveResume / clearResume

// --- Resume Tab ---

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function showResumeInfo(resumeObj) {
  document.getElementById('resume-info').style.display = 'flex';
  document.getElementById('resume-empty').style.display = 'none';
  document.getElementById('resume-filename').textContent = resumeObj.name;
  document.getElementById('resume-size').textContent = formatBytes(resumeObj.size);
}

function clearResumeUI() {
  document.getElementById('resume-info').style.display = 'none';
  document.getElementById('resume-empty').style.display = 'block';
  document.getElementById('resume-input').value = '';
}

async function loadResume() {
  const resume = await window.JobFill.storage.getResume();
  if (resume) {
    showResumeInfo(resume);
  } else {
    clearResumeUI();
  }
}

function bindResumeTab() {
  document.getElementById('resume-input').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Size guard: reject files over 5 MB
    if (file.size > 5 * 1024 * 1024) {
      const errEl = document.getElementById('resume-empty');
      if (errEl) errEl.textContent = 'File too large (max 5 MB). Please choose a smaller file.';
      e.target.value = '';
      return;
    }

    // FileReader is callback-based — do NOT use async/await here
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const resumeObj = {
        name: file.name,
        dataUrl: evt.target.result,  // base64 data URL
        mimeType: file.type,
        size: file.size,
      };
      await window.JobFill.storage.saveResume(resumeObj);
      showResumeInfo(resumeObj);
    };
    reader.readAsDataURL(file);
  });

  document.getElementById('resume-clear').addEventListener('click', async () => {
    await window.JobFill.storage.clearResume();
    clearResumeUI();
  });
}

// --- DOMContentLoaded additions (to be merged by 12-04) ---
// Replace the placeholder comment in popup.js DOMContentLoaded with:
//
//   await loadResume();
//   bindResumeTab();
//
// Full merged DOMContentLoaded will look like:
//
// document.addEventListener('DOMContentLoaded', async () => {
//   initTabs();
//   initFillButton();
//   await loadProfile();
//   bindProfileAutoSave();
//   await loadResume();       // ← added by 12-03
//   bindResumeTab();          // ← added by 12-03
//   // Plans 04–05 will add: initAnswerBank(), loadSettings(), initImportExport()
// });
