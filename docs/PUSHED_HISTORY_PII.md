# PII in already-pushed history (origin/main) — DO NOT FORCE PUSH

Repo visibility: **PUBLIC** (`thinktutorindia/apnatutuorhub.com`, verified via GitHub API on 2026-11-26).
The files below are reachable from `origin/main`. Removing them from history requires a force push,
which is explicitly blocked. They are documented here only; no history rewrite or push was done.

## High risk — real lead/parent/tutor data
- `exports/presend_leads_all_location_subject.json`
- `exports/presend_leads_ncr.json`
- `exports/presend_leads_other_cities.json`
- `exports/presend_missing_location_reminder.json`
- `exports/presend_tutor_leads_650.json`
- `datauploadrawdata/MASTER_CONSOLIDATED_ALL_LEADS.csv` / `.json`
- `datauploadrawdata/MASTER_TUTORS_ONLY.csv`
- `datauploadrawdata/export.csv`
- `datauploadrawdata/parents data/WhatsApp Chat with all data.txt`
- `datauploadrawdata/staff_performance_mitali_varsha.csv` / `.html` / `.json`
- `public/broadcast-preview.html`
- `public/newsdata_leads_preview.html`
- `public/staff_performance_mitali_varsha.html`

## Real admin/account emails hardcoded in code/docs
- `docs/VIDEO_WALKTHROUGH_GUIDE.md`
- `docs/RAZORPAY_RESOLUTION_SUBMISSION.md`
- `lib/whatsapp-bot/auto-register.ts` (admin email special-case)
- `scripts/clean_users_keep_super_admin.ts`
- `scripts/create_video_test_accounts.ts`
- `scripts/send_test_notification.ts`
- `scripts/send_web_push.ts`
- `scripts/broadcast_4k_geo_leads.ts`
- `scripts/test_send_single_tutor.ts`
- `scripts/update_kyc.ts`
- `scripts/verify_tutor.ts`
- `scripts/walkthrough/check_demo_user.ts`
- `scripts/walkthrough/verify_demo_password.ts`
- `scripts/walkthrough/record_silent_walkthroughs.mjs`

## Lower risk — example/fixture strings only
`AUDIT.md`, `QA/*`, `app/about/page.tsx`, `app/cookies/page.tsx`, `components/admin/*`, `lib/geocoding.ts`,
`lib/lead-utils.ts`, `lib/web-push.ts`, `lib/whatsapp-bot/{CHATBOT_TRAINING.md,ai-agent.ts,engine.ts,strict-rules.ts}`,
`scripts/test-whatsapp-bot.ts`, `docs/bolna-kb-apnatutorhub.txt`.

## Current state
- These files are **untracked going forward** and covered by `.gitignore` (exports/, datauploadrawdata/, public previews).
- HEAD (our rewritten local commits) contains **zero** real payment IDs and zero Acavya identifiers.
- Cleanup from pushed history requires a separate approved force-push — NOT performed.
