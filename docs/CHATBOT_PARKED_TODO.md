# Parked — payment / wallet work (DO NOT TOUCH until bot modules are done)

These are intentionally parked. No code changes, DB writes, sends, or deploys for them while
the WhatsApp bot modules are being built.

- [ ] **Acavya ventures** — `pay_FAKE0000000001`: user manually credited 60 coins, but there is **no `wallet_transaction` row and no payment reference**. Decide whether to add the ledger entry/reference.
- [ ] **Lavanya Gupta** — credited 130 coins; expected 60. Review/adjust only after bot work.
- [ ] **Race-condition hardening** — plan-credit idempotency currently relies on `findFirst` + `@@unique([walletId, referenceId, type])`; consider a DB-level unique constraint on `referenceId` alone.
- [ ] **Razorpay test-mode E2E** — only LIVE keys are available locally; obtain `rzp_test_*` keys, then verify wallet + 180-day validity + message text end-to-end.
- [ ] **Payment deploy checklist** — verify route, webhook, manual UPI approval, golden assertions; do not deploy until reviewed.

Rule: no payment/wallet code edits until modules 1–6 of the chatbot rewrite are complete.
