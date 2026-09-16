import { prisma } from "../lib/prisma";
import { buildAquaTuitionEnquiryPlaceholders, formatLeadNotifyTemplate, LeadTemplateData } from "../lib/lead-notify-template";

async function main() {
  const leadLalit = await prisma.lead.findUnique({ where: { inquiryNumber: 31694 } });
  const leadRihan = await prisma.lead.findUnique({ where: { inquiryNumber: 31599 } });

  console.log("=== LEAD FOR LALIT ===");
  if (leadLalit) {
    const phLalit = buildAquaTuitionEnquiryPlaceholders(leadLalit as unknown as LeadTemplateData);
    console.log("Placeholders (Lalit):", phLalit);
    console.log("Plain Text Format:\n", formatLeadNotifyTemplate(leadLalit as unknown as LeadTemplateData));
  }

  console.log("\n=== LEAD FOR RIHAN ===");
  if (leadRihan) {
    const phRihan = buildAquaTuitionEnquiryPlaceholders(leadRihan as unknown as LeadTemplateData);
    console.log("Placeholders (Rihan):", phRihan);
    console.log("Plain Text Format:\n", formatLeadNotifyTemplate(leadRihan as unknown as LeadTemplateData));
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
