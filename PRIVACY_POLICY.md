# Privacy Policy for JobFill Extension

**Effective Date:** March 15, 2026

## Overview

JobFill is a free, privacy-first Chrome extension that autofills job application forms. This Privacy Policy explains what data we collect, how we use it, and your rights.

## Data Collection & Storage

### Personal Information You Provide
JobFill collects the following information **only when you explicitly enter it** in the extension popup:
- Full name
- Email address
- Phone number
- Location (city/state/country)
- Work authorization status
- LinkedIn profile URL
- Years of experience
- Willing to relocate (yes/no)
- Education details (school, field of study, graduation year)
- Work experience (job titles, companies, descriptions)
- Skills
- Custom answers to job application questions
- Resume file (PDF/DOCX)

### How We Store Data
- **All data is stored exclusively in your browser** using Chrome's `chrome.storage.sync` and `chrome.storage.local` APIs
- **No data is sent to any external server** — this is 100% offline-first
- **No data is shared** with third parties
- **No analytics or tracking** — we don't collect usage data, error logs, or behavioral metrics
- **No telemetry** — we don't monitor what job sites you visit or what jobs you apply to
- **No cookies** are set
- **No external requests** are made except to the job application sites you visit

### Data You Control
You have complete control:
- **Import/Export** — download your profile data as JSON at any time
- **Delete** — clear all stored data from Chrome storage immediately
- **Privacy** — your data never leaves your device
- **Switching browsers** — your data stays on your machine; if you uninstall the extension, all data can be purged

## How We Use Your Data

Your data is used exclusively to:
1. **Auto-fill job application forms** on supported ATS platforms (Greenhouse, Lever, Workday, Ashby, iCIMS, LinkedIn, Bayt)
2. **Auto-attach your resume** to file inputs in job forms
3. **Match your saved answers** to application questions using local keyword matching (powered by Levenshtein distance algorithm)

**We do not use your data for:**
- Marketing or advertising
- Selling or trading to third parties
- Profiling or targeting
- Machine learning or AI training
- Any purpose other than autofilling the forms on the job sites you choose to visit

## Technical Details

### Chrome Permissions Explained
The extension requests the following Chrome permissions:

- **`storage`** — Required to store your profile data locally in your browser
- **`scripting`** — Required to inject autofill logic into job application pages
- **`activeTab`** — Required to know which tab is currently active
- **`tabs`** — Required to access tab information for form detection

### Host Permissions
The extension requests access to these job application domains:
- `https://*.greenhouse.io/*` — Greenhouse ATS
- `https://*.lever.co/*` — Lever ATS
- `https://*.myworkdayjobs.com/*` — Workday
- `https://*.ashbyhq.com/*` — Ashby ATS
- `https://*.icims.com/*` — iCIMS ATS
- `https://www.linkedin.com/jobs/*` — LinkedIn Jobs
- `https://www.bayt.com/*` — Bayt.com

These permissions are necessary because the extension must run JavaScript on these sites to detect and fill job application forms.

### Content Security Policy
The extension implements a strict Content Security Policy (`script-src 'self'; object-src 'none'`) to prevent injection attacks and ensure security.

## Data Deletion

You can delete your data at any time by:
1. Clicking the JobFill extension icon
2. Going to the **Settings** tab
3. Clicking **Clear All Data** (if available)
4. Or simply uninstalling the extension — all data is automatically deleted

## Security

- Your data is protected by the same security measures Chrome uses to protect browser data
- No data is encrypted in transit (because it never leaves your computer)
- No data is stored on any server we control
- We cannot access your data — it's only accessible to your Chrome profile on your device

## Third-Party Services

JobFill does **not** use any third-party analytics, crash reporting, or tracking services. We do not use:
- Google Analytics
- Sentry or similar error tracking
- Hotjar or session recording
- Mixpanel or event tracking
- Any cookies or tracking pixels

## Children's Privacy

JobFill is not intended for children under 13. We do not knowingly collect personal information from children. If we become aware that a child under 13 has provided us with personal information, we will delete such information immediately.

## Changes to This Policy

We may update this Privacy Policy from time to time. When we do, we will post the updated policy on GitHub and update the "Effective Date" at the top. Your continued use of the extension after such modifications constitutes acceptance of the updated Privacy Policy.

## Contact

For questions about this Privacy Policy or our privacy practices, contact:
- **Email:** [Support email]
- **GitHub:** https://github.com/Adarsh350/jobfill-extension

## Summary

**In plain English:** JobFill stores everything you put into it on your computer, nowhere else. We don't see your data, we don't use it for anything other than filling forms on job sites you choose to visit, and we don't share it with anyone. If you delete the extension, your data is gone.
