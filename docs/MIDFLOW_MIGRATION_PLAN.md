# Mid-flow session migration plan (read-only — do not execute yet)

## Goal
Move tutors who are in a legacy `whatsapp_sessions.step` into the profile-based flow
without losing collected data and without sending a duplicate welcome.

## Rules
1. **DB is the source of truth.** `loadContext(phone)` supplies the current profile;
   `migrateLegacySession()` maps the legacy step and preserves anything already in session JSON.
2. **No forced field overwrite.** If the legacy session already has a value for the pending
   field, it is kept and only changed through the SAVE GATE with an explicit YES confirmation.
3. **No duplicate welcome.** A registered user (`_registered: true` or `step === "DONE"`) and
   any mid-flow user who already heard a question get `sendWelcome: false`.
4. **Password steps stay dedicated.** `T_PASSWORD` / `UPDATE_PASSWORD` use MANUAL RESET, not
   the profile validators.

## Step mapping (`lib/whatsapp-bot/pipeline/session-migration.ts`)
| Legacy step | New pending field |
|---|---|
| `T_NAME`, `UPDATE_NAME` | `name` |
| `T_EMAIL`, `UPDATE_EMAIL` | `email` |
| `T_AREA`, `UPDATE_AREA`, `T_CITY` | `location` |
| `T_SUBJECTS`, `T_CLASSES`, `UPDATE_SUBJECTS` | `classes_subjects` |
| `WELCOME`, `LANG_SELECT`, `T_CONVO`, `DONE` | profile flow, no forced field |
| `T_PASSWORD`, `UPDATE_PASSWORD`, parent steps | dedicated handler retained |

## Execution plan (future, needs approval)
1. Take a read-only snapshot of all sessions with a legacy step.
2. For each phone, compute `migrateLegacySession()` + `loadContext()` and write a dry-run diff.
3. Verify: zero dropped fields, zero welcomes for registered users, zero password-step changes.
4. Only then update `whatsapp_sessions` in a transaction: new `step`, `pendingQuestion`,
   `pendingAskedAt`, `rollingSummary`; keep `data` JSON intact for rollback.
5. Rollback = restore the original `step` and `data` from the snapshot.

No DB writes are performed by this plan or its tests.
