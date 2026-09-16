import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

// Ensure daily cap in process.env is 500 for this bulk send
process.env.AQUA_WHATSAPP_DAILY_TEST_CAP = '500';

import * as fs from 'fs';
import * as path from 'path';
import { prisma } from '../lib/prisma';
import { sendAquaWhatsAppMessage, normalizeIndiaWhatsApp } from '../lib/aqua-whatsapp';

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isValidPhone(p: string | null | undefined): boolean {
  if (!p) return false;
  const digits = p.replace(/\D/g, '');
  return (digits.length === 10 && /^[6-9]/.test(digits)) || (digits.length === 12 && /^91[6-9]/.test(digits));
}

async function runWhatsAppBroadcast() {
  console.log('===========================================================');
  console.log('🚀 APNATUTORHUB: WHATSAPP TUTOR BROADCAST DISPATCH');
  console.log('===========================================================');
  console.log(`Timestamp: ${new Date().toISOString()}`);

  const activeTutors = await prisma.user.findMany({
    where: { role: 'TUTOR', isActive: true },
    select: { id: true, name: true, phone: true, email: true },
  });

  console.log(`Total active registered tutors: ${activeTutors.length}`);

  // Deduplicate by normalized Indian WhatsApp phone
  const phoneMap = new Map<string, { userId: string; name: string; phone: string }>();

  for (const t of activeTutors) {
    if (!t.phone) continue;
    const normalized = normalizeIndiaWhatsApp(t.phone);
    if (!normalized) continue;
    if (!phoneMap.has(normalized)) {
      phoneMap.set(normalized, {
        userId: t.id,
        name: t.name || 'Tutor',
        phone: normalized,
      });
    }
  }

  // Ensure admin monitoring number is included
  const adminMonitoring = '919311459543';
  if (!phoneMap.has(adminMonitoring)) {
    phoneMap.set(adminMonitoring, {
      userId: 'admin-monitor',
      name: 'Admin',
      phone: adminMonitoring,
    });
  }

  const recipients = Array.from(phoneMap.values());
  console.log(`📋 Total Unique Verified WhatsApp Numbers: ${recipients.length}\n`);

  const placeholders = [
    '32202',                        // 1: Enquiry #
    'Parent',                        // 2: Client Name
    'Class 5th CBSE',               // 3: Class
    'Home Tuition',                 // 4: Mode
    'Anand Niketan, South Delhi',   // 5: Location
    '₹7,000 – ₹9,000 / month',      // 6: Fees
    'Any',                          // 7: Gender Preference
    'Mon–Sat (4:00 PM – 6:00 PM)',  // 8: Schedule
  ];

  let successCount = 0;
  let failedCount = 0;
  const dispatchLogs: any[] = [];

  for (let i = 0; i < recipients.length; i++) {
    const r = recipients[i];
    const progress = `[${i + 1}/${recipients.length}]`;

    try {
      const res = await sendAquaWhatsAppMessage({
        to: r.phone,
        mode: 'template',
        templateId: 'tuition_alert_v2',
        placeholders,
      });

      if (res.ok) {
        successCount++;
        dispatchLogs.push({
          phone: r.phone,
          status: 'SUCCESS',
          messageId: res.providerMessageId,
        });

        // Log delivery record if this user has an existing notification or record
        if ((i + 1) % 25 === 0 || i === recipients.length - 1) {
          console.log(`${progress} Sent to ${r.phone} (Total Succeeded: ${successCount})`);
        }
      } else {
        failedCount++;
        console.warn(`${progress} ❌ Failed for ${r.phone}: ${res.error}`);
        dispatchLogs.push({
          phone: r.phone,
          status: 'FAILED',
          error: res.error,
        });
      }
    } catch (err: any) {
      failedCount++;
      console.error(`${progress} ❌ Exception for ${r.phone}: ${err.message}`);
      dispatchLogs.push({
        phone: r.phone,
        status: 'EXCEPTION',
        error: err.message,
      });
    }

    // Polite delay between sends: 120ms (~8 msgs/sec)
    await sleep(120);
  }

  // Audit Log
  const admin = await prisma.user.findFirst({
    where: { role: 'SUPER_ADMIN' },
    select: { id: true },
  });

  const totalCost = (successCount * 0.147).toFixed(2);

  if (admin) {
    await prisma.auditLog.create({
      data: {
        adminId: admin.id,
        action: 'SEND_WHATSAPP',
        entityType: 'Broadcast',
        details: `Dispatched WhatsApp template (tuition_alert_v2 #32202) to ${successCount} tutors (Failed: ${failedCount}). Estimated cost: ₹${totalCost}`,
      },
    });
  }

  console.log('\n===========================================================');
  console.log('🎉 WHATSAPP BROADCAST DISPATCH COMPLETE');
  console.log('===========================================================');
  console.log(`Total Attempted:         ${recipients.length}`);
  console.log(`Successfully Delivered:  ${successCount}`);
  console.log(`Failed:                  ${failedCount}`);
  console.log(`Total Wallet Cost:       ₹${totalCost}`);
  console.log('===========================================================');

  // Save dispatch report
  const logFile = path.join(__dirname, 'whatsapp_dispatch_summary.json');
  fs.writeFileSync(
    logFile,
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        template: 'tuition_alert_v2',
        inquiryRef: '32202',
        totalRecipients: recipients.length,
        successCount,
        failedCount,
        estimatedCostInr: totalCost,
        logs: dispatchLogs,
      },
      null,
      2
    )
  );
  console.log(`Detailed summary saved to ${logFile}`);
}

runWhatsAppBroadcast()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
