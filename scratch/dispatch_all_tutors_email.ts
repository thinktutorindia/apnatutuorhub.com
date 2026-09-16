import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

import * as fs from 'fs';
import * as path from 'path';
import { Resend } from 'resend';
import { prisma } from '../lib/prisma';

const resendApiKey = process.env.RESEND_API_KEY;
if (!resendApiKey) {
  console.error('RESEND_API_KEY is missing from environment');
  process.exit(1);
}

const resend = new Resend(resendApiKey);
const FROM = process.env.RESEND_FROM_EMAIL ?? 'ApnaTutorHub <noreply@mail.apnatutorhub.com>';
const SUBJECT = '⚡ New Tuition Inquiry Near You — Class 5th, Anand Niketan (#32202)';

const htmlPath = path.join(__dirname, '../public/lead_email_preview.html');
const templateHtml = fs.readFileSync(htmlPath, 'utf-8');

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Clean recipient name for email greeting
function formatName(rawName: string | null | undefined): string {
  if (!rawName) return 'Tutor';
  const clean = rawName.trim();
  // Remove numbers or brackets like "Tutor (1234)"
  if (/^tutor\b/i.test(clean)) return 'Tutor';
  // Take first name + last initial or up to 2 words
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'Tutor';
  return parts[0]; // e.g. "Rohit"
}

async function prepareRecipients() {
  const tutors = await prisma.user.findMany({
    where: { role: 'TUTOR', isActive: true },
    select: { id: true, name: true, email: true, phone: true }
  });

  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  const typoDomains: Record<string, string> = {
    'gamil.com': 'gmail.com',
    'gmil.com': 'gmail.com',
    'gimale.com': 'gmail.com',
    'gmwil.com': 'gmail.com',
    'gmailo.com': 'gmail.com',
    'gmail.co': 'gmail.com',
  };

  const recipientsMap = new Map<string, { name: string; email: string; phone?: string | null }>();

  // Always include admin/monitoring test accounts so delivery can be confirmed immediately
  recipientsMap.set('youhubteam@gmail.com', { name: 'Rohit', email: 'youhubteam@gmail.com' });
  recipientsMap.set('thinktutorindia@gmail.com', { name: 'Rahul Sir', email: 'thinktutorindia@gmail.com' });

  for (const t of tutors) {
    let email = t.email.trim().toLowerCase();

    // Skip internal dummy/test aliases
    if (email.endsWith('@apnatutorhub.com') || email.endsWith('@athmail.test') || email.includes('example.com') || email.includes('test.com')) {
      continue;
    }

    if (!emailRegex.test(email)) continue;

    const [localPart, domain] = email.split('@');
    if (domain === 'gmail.comdelh' || domain === 'ail.com') continue;

    if (typoDomains[domain]) {
      email = `${localPart}@${typoDomains[domain]}`;
    }

    if (!recipientsMap.has(email)) {
      recipientsMap.set(email, {
        name: formatName(t.name),
        email,
        phone: t.phone,
      });
    }
  }

  return Array.from(recipientsMap.values());
}

async function main() {
  console.log('===========================================================');
  console.log('🚀 APNATUTORHUB: MASS LEAD EMAIL DISPATCH');
  console.log('===========================================================');
  console.log(`From:    ${FROM}`);
  console.log(`Subject: ${SUBJECT}`);
  console.log(`Template: public/lead_email_preview.html\n`);

  const recipients = await prepareRecipients();
  console.log(`📋 Total Verified Clean Recipients to Dispatch: ${recipients.length}\n`);

  const CHUNK_SIZE = 50; // Use chunks of 50 for safety and rate limiting
  let totalSuccess = 0;
  let totalFailed = 0;
  const dispatchLog: any[] = [];

  for (let i = 0; i < recipients.length; i += CHUNK_SIZE) {
    const chunk = recipients.slice(i, i + CHUNK_SIZE);
    const chunkNum = Math.floor(i / CHUNK_SIZE) + 1;
    const totalChunks = Math.ceil(recipients.length / CHUNK_SIZE);

    console.log(`[Batch ${chunkNum}/${totalChunks}] Preparing ${chunk.length} emails (recipients ${i + 1} to ${i + chunk.length})...`);

    const batchPayload = chunk.map((r) => {
      // Personalize greeting
      const personalizedHtml = templateHtml.replace(
        'Hi <strong style="color:#111827;">Rohit Sharma</strong>',
        `Hi <strong style="color:#111827;">${r.name}</strong>`
      );

      return {
        from: FROM,
        to: [r.email],
        subject: SUBJECT,
        html: personalizedHtml,
      };
    });

    try {
      const response = await resend.batch.send(batchPayload);

      if (response.error) {
        console.error(`❌ Batch ${chunkNum} failed with error:`, response.error);
        totalFailed += chunk.length;
        dispatchLog.push({
          batch: chunkNum,
          status: 'ERROR',
          error: response.error,
          recipients: chunk.map((c) => c.email),
        });
      } else {
        const sentCount = response.data?.data?.length ?? chunk.length;
        totalSuccess += sentCount;
        console.log(`✅ Batch ${chunkNum} successfully delivered! Sent: ${sentCount} emails.`);
        dispatchLog.push({
          batch: chunkNum,
          status: 'SUCCESS',
          count: sentCount,
          data: response.data,
        });
      }
    } catch (err: any) {
      console.error(`❌ Exception in Batch ${chunkNum}:`, err.message);
      totalFailed += chunk.length;
      dispatchLog.push({
        batch: chunkNum,
        status: 'EXCEPTION',
        error: err.message,
      });
    }

    // Rate-limit throttle between batch requests
    if (i + CHUNK_SIZE < recipients.length) {
      console.log('   Waiting 2.5s before next batch to prevent rate limiting...');
      await sleep(2500);
    }
  }

  console.log('\n===========================================================');
  console.log('📊 DISPATCH SUMMARY');
  console.log('===========================================================');
  console.log(`Total Attempted:  ${recipients.length}`);
  console.log(`Total Succeeded:  ${totalSuccess}`);
  console.log(`Total Failed:     ${totalFailed}`);
  console.log('===========================================================\n');

  // Save dispatch report
  const reportPath = path.join(__dirname, 'email_dispatch_summary.json');
  fs.writeFileSync(
    reportPath,
    JSON.stringify(
      {
        dispatchedAt: new Date().toISOString(),
        totalRecipients: recipients.length,
        totalSuccess,
        totalFailed,
        batches: dispatchLog,
      },
      null,
      2
    )
  );
  console.log(`Detailed summary saved to ${reportPath}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
