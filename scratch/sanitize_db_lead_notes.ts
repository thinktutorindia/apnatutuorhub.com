import { prisma } from "../lib/prisma";
import { sanitizeLeadNotes } from "../lib/lead-sanitizer";

async function main() {
  console.log("=== STARTING DATABASE LEAD NOTES SANITIZATION ===");

  const leads = await prisma.lead.findMany({
    where: {
      notes: { not: null },
    },
    select: {
      id: true,
      inquiryNumber: true,
      notes: true,
    },
  });

  console.log(`Found ${leads.length} leads with notes in database.`);

  let updatedCount = 0;
  let clearedCount = 0;

  for (const lead of leads) {
    if (!lead.notes) continue;

    const original = lead.notes;
    // Check if it contains batch metadata or contact tags
    const hasBatchOrContact =
      original.includes("[Batch:") ||
      original.includes("Contact:") ||
      original.includes("[Source:") ||
      original.includes("[RefId:") ||
      /\+?91[\s-]?[6-9]\d{4}/.test(original);

    if (hasBatchOrContact) {
      const cleaned = sanitizeLeadNotes(original, true);

      if (cleaned !== original) {
        await prisma.lead.update({
          where: { id: lead.id },
          data: { notes: cleaned },
        });

        if (!cleaned) {
          clearedCount++;
        } else {
          updatedCount++;
        }
      }
    }
  }

  console.log(`\nSanitization Complete:`);
  console.log(`- Cleared empty/batch-only notes to NULL: ${clearedCount}`);
  console.log(`- Preserved legitimate requirement notes (stripped contact): ${updatedCount}`);

  // Verify that NO leads have Contact: or [Batch: in notes anymore
  const remainingBad = await prisma.lead.count({
    where: {
      OR: [
        { notes: { contains: "Contact:" } },
        { notes: { contains: "[Batch:" } },
        { notes: { contains: "[Source:" } },
      ],
    },
  });

  console.log(`Remaining leads with batch/contact in notes: ${remainingBad}`);
  console.assert(remainingBad === 0, "All bad notes should be cleaned!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
