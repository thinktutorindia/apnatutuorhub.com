# ThinkTutor — Production Runbook

> **Last Updated:** 2026-08-01  
> **Maintained by:** Engineering Team  

---

## 1. Architecture Overview

```
User → Vercel Edge (Next.js 16) → Supabase Postgres (Tokyo)
                                 ↘ Upstash Redis (BullMQ)
                                 ↘ AWS S3 (KYC docs)
                                 ↘ AWS SES (Emails)
                                 ↘ AWS SNS (Web Push)
                                 ↘ Razorpay (Payments)
```

---

## 2. Deployment Procedure (Vercel)

### Normal Deploys
1. Push to `main` branch — Vercel auto-deploys.
2. Confirm build passes in the [Vercel Dashboard](https://vercel.com/dashboard).
3. Check **Sentry** for error spikes post-deploy.
4. Check **PostHog** to confirm page views and key events are tracking.

### Rollback Procedure
```bash
# List recent deployments
vercel list

# Rollback to a specific deployment
vercel rollback <deployment-url>
```

---

## 3. Environment Variables Checklist

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | ✅ | Supabase connection pooler |
| `AUTH_SECRET` | ✅ | JWT signing secret — use `openssl rand -hex 32` |
| `AUTH_URL` | ✅ | Full app URL in production |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | ✅ | Google OAuth |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | ✅ | Razorpay keys |
| `RAZORPAY_WEBHOOK_SECRET` | ✅ | For signature verification |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | ✅ | For S3 & SES |
| `AWS_REGION` | ✅ | `ap-south-1` |
| `AWS_S3_BUCKET_NAME` | ✅ | Private KYC bucket |
| `AWS_SES_SENDER_EMAIL` | ✅ | Verified SES sender |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | ✅ | BullMQ queue |
| `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` | ⚠️ | Sentry project DSN |
| `POSTHOG_API_KEY` / `NEXT_PUBLIC_POSTHOG_KEY` | ⚠️ | PostHog project key |

---

## 4. Health Check

The `/api/health` endpoint returns:

```json
{
  "status": "healthy",
  "timestamp": "2026-08-01T12:00:00.000Z",
  "version": "1.0.0",
  "services": {
    "database": { "status": "ok", "latencyMs": 12 },
    "redis":    { "status": "ok", "latencyMs": 8 }
  },
  "uptime": 3600
}
```

**Status Codes:**
- `200` — `healthy` or `degraded`
- `503` — `unhealthy` (DB or Redis is down)

**Uptime Monitor:** Configure Uptime Robot, Better Uptime, or Vercel's built-in monitors to ping `/api/health` every 60 seconds.

---

## 5. Incident Response Playbook

### DB Connection Failure
1. Check Supabase [Status Page](https://status.supabase.com).
2. Verify `DATABASE_URL` in Vercel env vars.
3. Check pool size limits in Supabase settings.
4. Force redeploy if env vars changed: `vercel deploy --force`.

### Redis / Queue Failure (BullMQ)
1. Check Upstash dashboard for connection errors.
2. Check `UPSTASH_REDIS_REST_URL` / token are valid.
3. Jobs that fail are retried automatically (default 3 retries).
4. For stuck jobs: clear the Bull queue via Upstash console.

### Payment Webhook Failure (Razorpay)
1. Check `RAZORPAY_WEBHOOK_SECRET` matches the Razorpay dashboard secret.
2. Check Vercel logs for `/api/webhooks/razorpay` endpoint errors.
3. Razorpay retries failed webhooks for 24h — trigger manual sync if needed.

### High Error Rate (Sentry)
1. Open the Sentry dashboard.
2. Filter by newest issues — assign to team member.
3. Use Sentry's `release` tag to identify if the error is from latest deploy.
4. Hotfix → PR → merge → auto-deploy.

---

## 6. Database Backup & Recovery

### Supabase PITR (Point-In-Time Recovery)
- Enable PITR in Supabase Dashboard → Project Settings → Database → Enable PITR.
- Retention: 7 days (upgradeable).
- Recovery: Contact Supabase support or use the dashboard restore option.

### Manual Backup via pg_dump
```bash
pg_dump "$DATABASE_URL" -F c -f backup_$(date +%Y%m%d).dump
```

### Restore
```bash
pg_restore -d "$DATABASE_URL" backup_YYYYMMDD.dump
```

### S3 Automated Backup (Optional)
Add this to a cron job or Vercel Cron function:
```bash
pg_dump "$DATABASE_URL" | gzip | aws s3 cp - s3://<bucket>/backups/$(date +%F).dump.gz
```

---

## 7. Security Checklist

- [x] RBAC enforced via `lib/rbac.ts` on all server actions.
- [x] All form inputs validated with Zod schemas before DB writes.
- [x] Atomic Prisma transactions for wallet operations (no double-spend).
- [x] Pre-signed S3 URLs expire after 15 minutes.
- [x] Auth.js JWT sessions with CSRF protection.
- [x] Razorpay webhooks verified via `crypto.timingSafeEqual` signature check.
- [x] HTTP-Only, Secure, SameSite=Lax cookies for auth sessions.
- [x] All admin routes protected by `SUPER_ADMIN`/`SUB_ADMIN` role checks.
- [x] KYC approval required before tutors can unlock leads (`purchaseLeadAction`).
- [x] User `isActive` check on every sign-in.

---

## 8. Performance Targets

| Metric | Target | How to Verify |
|---|---|---|
| Lighthouse Performance | > 90 | `npx lighthouse https://thinktutor.in --view` |
| LCP | < 2.5s | Chrome DevTools → Lighthouse |
| TTI | < 3.5s | Chrome DevTools → Lighthouse |
| API p95 latency | < 500ms | Vercel Analytics / Sentry |
| Lead purchase concurrency | No race conditions | See atomic tx in `purchaseLeadAction` |

---

## 9. Monitoring Dashboard Links

| Tool | URL | Purpose |
|---|---|---|
| Vercel | https://vercel.com/dashboard | Deployments, logs, env vars |
| Sentry | https://sentry.io | Error tracking, performance |
| PostHog | https://app.posthog.com | Product analytics, funnels |
| Supabase | https://supabase.com/dashboard | Database, auth |
| Upstash | https://console.upstash.com | Redis / BullMQ |
| Razorpay | https://dashboard.razorpay.com | Payments, webhooks |
| AWS | https://console.aws.amazon.com | SES, SNS, S3 |
