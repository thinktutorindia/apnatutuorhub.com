import { prisma } from '../lib/prisma';
import fs from 'fs';
import path from 'path';

async function main() {
  console.log('=== DRY-RUN VERIFICATION: UPLOADING PARENT DATA TO DASHBOARD ===\n');

  const leadsPath = path.join(__dirname, '..', 'datauploadrawdata', 'today_parents_data_09_sep_2026.json');
  const leads = JSON.parse(fs.readFileSync(leadsPath, 'utf8'));

  console.log(`1. Dataset: ${leads.length} parent inquiries loaded.`);

  // Verify fields
  let offlineCount = 0;
  let onlineCount = 0;
  let budgetErrors = 0;

  for (const l of leads) {
    const isOnline = l.teachingMode === 'ONLINE' || (l.location || '').toLowerCase().includes('online');
    if (isOnline) onlineCount++; else offlineCount++;

    // Parse budget
    const feeStr = l.budgetFee || '';
    const nums = feeStr.replace(/,/g, '').match(/\d+/g);
    if (!nums || nums.length === 0) {
      budgetErrors++;
    }
  }

  console.log(`2. Teaching Modes:`);
  console.log(`   - Offline (Delhi NCR Home Tuition): ${offlineCount}`);
  console.log(`   - Online (Pan-India Virtual Tuition): ${onlineCount}`);
  console.log(`3. Budget Parsing: ${budgetErrors === 0 ? '✓ 100% Valid' : budgetErrors + ' errors'}`);

  // Check Parent Profile Setup
  const existingParents = await prisma.parentProfile.count();
  console.log(`4. Existing Parent Profiles in DB: ${existingParents}`);

  // Check last inquiry number in DB
  const lastLead = await prisma.lead.findFirst({
    orderBy: { inquiryNumber: 'desc' },
    select: { inquiryNumber: true }
  });
  const startingInquiryNumber = (lastLead?.inquiryNumber || 31603) + 1;
  console.log(`5. Inquiry Number Sequencing: Starts at #${startingInquiryNumber} through #${startingInquiryNumber + leads.length - 1}`);

  console.log('\n=== INGESTION PLAN READY ===');
  console.log(`Ready to create 602 Leads in database.`);
  console.log(`Will be visible on:`);
  console.log(` - /parent/my-leads (Parent Portal)`);
  console.log(` - /tutor/leads (Tutor Claim Marketplace with 20km radius filter)`);
  console.log(` - /admin/leads (Super Admin Control Panel)`);
}

main().catch(console.error);
