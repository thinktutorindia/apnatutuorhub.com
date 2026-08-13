#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# ApnaTutorHub — Production Deploy Script
# Run this on your server via: bash deploy.sh
# ─────────────────────────────────────────────────────────────────────────────

set -e
echo "🚀 Starting ApnaTutorHub production deployment..."

# 1. Pull latest code
echo "📥 Pulling latest code from git..."
git pull origin main

# 2. Install dependencies (triggers postinstall → prisma generate)
echo "📦 Installing dependencies..."
npm install --production=false

# 3. Push schema changes to production database (creates admin_notes table etc.)
echo "🗄️  Syncing database schema..."
npx prisma db push --accept-data-loss

# 4. Regenerate Prisma Client with latest schema
echo "⚙️  Regenerating Prisma Client..."
npx prisma generate

# 5. Build Next.js production bundle
echo "🔨 Building Next.js app..."
NODE_ENV=production npm run build

# 6. Restart PM2 processes gracefully (zero-downtime)
echo "🔄 Restarting PM2 processes..."
pm2 reload ecosystem.config.js --update-env

echo "✅ Deployment complete! App is live at https://apnatutorhub.com"
