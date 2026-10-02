# ApnaTutorHub — Feature walkthrough recording

## Test accounts (password for all: `Rohit@2927`)

| Role | Email |
|------|--------|
| Parent | `parent.demo@apnatutorhub.com` |
| Tutor (verified, 120 coins) | `tutor.demo@apnatutorhub.com` |
| Tutor (pending KYC) | `tutor.kyc@apnatutorhub.com` |
| Super Admin | `coderrohit2927@gmail.com` |

Re-seed anytime (must use the **same database as production**):

```bash
npx tsx scripts/create_video_test_accounts.ts
```

If login on https://www.apnatutorhub.com says “Invalid password”, your `.env.local` `DATABASE_URL` is not the live DB — point it to production and run the script again.

Site: https://www.apnatutorhub.com

---

## Why Cursor Chrome MCP is not a full MP4 recorder

- **Chrome DevTools MCP** and **Cursor browser** can navigate, click, and take **screenshots** — no microphone, no narrated MP4 export.
- **Antigravity’s video subagent** failed because Playwright driver CDN returned 404 (not your site).
- **Best quality for YouTube/help page:** you record **screen + mic** (Win + Alt + R, OBS, or Loom) while the agent drives Chrome or you follow the script.

---

## Automated silent recording (no voice — agent can run this)

```bash
npx playwright install chromium
node scripts/walkthrough/record_silent_walkthroughs.mjs
```

Output: `public/video-walkthrough/*.webm` (1280×720, **no audio**). Add your narration in CapCut/OBS, or record voice over the WebM.

All **16** tutorials are scripted in `scripts/walkthrough/record_silent_walkthroughs.mjs` (`01`–`16`, output `.webm`). Re-run a subset: `node scripts/walkthrough/record_silent_walkthroughs.mjs --skip "02,05,06"` (quote the list on PowerShell). Single video: `--only 11`.

---

## Recording workflow (one video at a time)

1. Run `scripts/walkthrough/open-recording-chrome.ps1` (opens login + role URLs).
2. Start **Win + Alt + R** (or OBS) **before** clicking.
3. Log in with the account for that video.
4. Follow the **Corrected scripts** section below (matches live product — **no ₹99 starter**; use **₹999 Growth** + coins).
5. Save as `public/video-walkthrough/01_Tutor_....mp4` (or your video folder).
6. Repeat for next file.

---

## Corrected scripts (live product)

### 02 — Tutor: Unlock leads (`tutor.demo@`)

1. Login → **Tutor → Leads**.
2. Show lead cards (class, area, budget; parent contact hidden).
3. Say: “Unlock uses wallet coins; fee depends on class budget.”
4. Click **Unlock** on a lead → confirm coin cost → unlock.
5. Show parent contact / chat — **do not show real parent phone on public video** if using production data; use demo lead only.
6. Mention: **₹999** top-up for more coins, **0% commission** on tuition — not ₹99 packages.

### 03 — Search & filter leads

1. **Leads** page → filters (subject, class, mode, budget).
2. Apply filters → sort if available.
3. Nearby / radius matches tutor profile location (~5 km).

### 05 — Tutor dashboard

1. **Dashboard** → nearby enquiries, wallet balance, notifications.

### 06 — Parent post requirement (`parent.demo@`)

1. Login → post or view requirement **#554914** (demo).
2. Show **My Requirements** / applications.

### 08–15 — Admin (`coderrohit2927@gmail.com`)

1. **Admin** dashboard → Users, Leads, KYC (approve `tutor.kyc@`), payments as available in your admin UI.
2. Settings: show only screens that exist in production (skip fictional “₹99 package editor” from old script).

### 16 — Troubleshooting

- Forgot password on login.
- Tutor not verified → complete KYC.
- Wrong area leads → update **Tutor profile** location.
- Support: **support@apnatutorhub.com**, helpline **08062180653**.

---

## Publish hub (when videos are ready)

Add page `/help/video-tutorials` linking to hosted MP4s (YouTube unlisted or `/public/video-walkthrough/`).
