/**
 * Standard Tuition Enquiry Notification & WhatsApp Sharing Template
 *
 * Output format:
 * 𝐓𝐔𝐈𝐓𝐈𝐎𝐍 𝐄𝐍𝐐𝐔𝐈𝐑𝐘: #𝟐𝟏𝟎𝟗𝟖𝟒
 * 𝐂𝐥𝐢𝐞𝐧𝐭 𝐍𝐚𝐦𝐞: 𝐍𝐨𝐭 𝐒𝐩𝐞𝐜𝐢𝐟𝐢𝐞𝐝
 * 𝐂𝐥𝐚𝐬𝐬: 𝟓𝐭𝐡 𝐒𝐭𝐝 (Maths, Science)
 * 𝐌𝐨𝐝𝐞: 𝐇𝐨𝐦𝐞 𝐓𝐮𝐢𝐭𝐢𝐨𝐧 (𝐎𝐟𝐟𝐥𝐢𝐧𝐞)
 * 𝐋𝐨𝐜𝐚𝐭𝐢𝐨𝐧: 𝐒𝐞𝐜𝐭𝐨𝐫 𝟏𝟖𝐁, 𝐃𝐰𝐚𝐫𝐤𝐚, 𝐍𝐞𝐰 𝐃𝐞𝐥𝐡𝐢 (𝐏𝐢𝐧: 𝟏𝟏𝟎𝟎𝟕𝟖)
 * 𝐅𝐞𝐞𝐬: 𝟓𝟎𝟎𝟎/𝐦𝐨𝐧𝐭𝐡
 * 𝐆𝐞𝐧𝐝𝐞𝐫 𝐏𝐫𝐞𝐟𝐞𝐫𝐞𝐧𝐜𝐞: 𝐀𝐧𝐲 (𝐂𝐚𝐥𝐦 𝐚𝐧𝐝 𝐏𝐨𝐥𝐢𝐭𝐞 𝐓𝐮𝐭𝐨𝐫)
 * 𝐒𝐜𝐡𝐞𝐝𝐮𝐥𝐞: 𝟓 𝐃𝐚𝐲𝐬 𝐚 𝐖𝐞𝐞𝐤
 *
 * Dm on WhatsApp  87997 07960
 * 👑 VIP Membership Plan: https://apnatutorhub.com/tutor/plans
 * 🔗 Unlock on Portal: https://apnatutorhub.com/tutor/leads
 */

import { getInquiryDisplayCode } from "@/lib/lead-utils";

export interface LeadTemplateData {
  id?: string | null;
  inquiryNumber?: number | null;
  clientName?: string | null;
  subjects?: string[];
  classLevel?: string | null;
  board?: string | null;
  mode?: string | null;
  area?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  budgetMin?: number | null;
  budgetMax?: number | null;
  feeMonthly?: number | string | null;
  genderPreference?: string | null;
  notes?: string | null;
  timingPreference?: string | null;
  schedule?: string | null;
  contactWhatsApp?: string;
  useStandardMarkdown?: boolean;
}

export type LeadNotifyFields = {
  inquiryNumber: string;
  clientName: string;
  classStr: string;
  modeStr: string;
  locationStr: string;
  feesStr: string;
  genderStr: string;
  scheduleStr: string;
  notes: string | null;
  whatsappNum: string;
};

/** Sample values for Aqua template `tuition_enquiry_alert` ({{1}}–{{8}}). */
export const AQUA_TUITION_ENQUIRY_SAMPLE_PLACEHOLDERS = [
  "210984",
  "Not Specified",
  "10th Std (Mathematics, Science)",
  "Home Tuition (Offline)",
  "Sector 18B, Dwarka, New Delhi (Pin: 110078)",
  "5000/month",
  "Any (Male or Female Tutor)",
  "Evening (4 PM - 7 PM)",
] as const;

export function getLeadNotifyFields(data: LeadTemplateData): LeadNotifyFields {
  const inquiryNumber = getInquiryDisplayCode(data);
  const clientName = data.clientName?.trim() || "Not Specified";

  let classBase = data.classLevel?.trim() || "5th Std";
  const numMatch = classBase.match(/\b(\d{1,2})\b/);
  if (numMatch) {
    const n = parseInt(numMatch[1], 10);
    const suffix = n === 1 ? "st" : n === 2 ? "nd" : n === 3 ? "rd" : "th";
    classBase = `${n}${suffix} Std`;
  }

  const rawSubjects = data.subjects && data.subjects.length > 0 ? data.subjects : [];
  const cleanedSubjects = Array.from(
    new Set(
      rawSubjects
        .map((s) => {
          let clean = s.trim();
          clean = clean.replace(/\bmaths\b/i, "Mathematics");
          clean = clean.replace(
            /\s*(?:for|-|\(|\/|–|—|,)?\s*(?:class|grade|std|standard)\s*(?:[0-9]{1,2}|[ivx]+)(?:\s*(?:to|-|–|&|and)\s*(?:class|grade|std|standard)?\s*(?:[0-9]{1,2}|[ivx]+))?\s*(?:st|nd|rd|th)?\s*\)?/gi,
            ""
          );
          clean = clean.replace(/\s+(?:[0-9]{1,2}|[ivx]+)\s*(?:st|nd|rd|th)?\s*(?:grade|class|std)?$/i, "");
          clean = clean.replace(/\s*\([^)]*(?:class|grade|std|standard|[0-9]{1,2}|[ivx]+)[^)]*\)/gi, "");
          clean = clean.replace(/^[-–—:,/]+|[-–—:,/]+$/g, "").trim();
          return clean || s.trim();
        })
        .filter(Boolean)
    )
  );

  const subjectsStr = cleanedSubjects.join(", ");
  const classStr = [
    classBase,
    subjectsStr ? `(${subjectsStr})` : "",
    data.board ? `[${data.board}]` : "",
  ]
    .filter(Boolean)
    .join(" ");

  const modeStr =
    data.mode === "OFFLINE" || data.mode === "IN_PERSON"
      ? "Home Tuition (Offline)"
      : data.mode === "ONLINE"
        ? "Online Classes"
        : "Home Tuition (Offline) / Online";

  const locationParts = [data.area, data.city, data.state].filter(Boolean);
  const locationBase = locationParts.join(", ") || data.city || "Delhi NCR";
  const locationStr = data.pincode ? `${locationBase} (Pin: ${data.pincode})` : locationBase;

  let feesStr = "5000/month";
  if (data.feeMonthly) {
    feesStr = `${data.feeMonthly}/month`;
  } else if (data.budgetMin && data.budgetMax) {
    feesStr =
      data.budgetMin === data.budgetMax
        ? `${data.budgetMin}/month`
        : `${data.budgetMin} - ${data.budgetMax}/month`;
  } else if (data.budgetMin) {
    feesStr = `${data.budgetMin}/month`;
  } else if (data.budgetMax) {
    feesStr = `${data.budgetMax}/month`;
  }

  let genderStr = "Any (Male or Female Tutor)";
  if (data.genderPreference) {
    const gUpper = data.genderPreference.toUpperCase();
    if (gUpper.includes("FEMALE")) genderStr = "Female Tutor Required";
    else if (gUpper.includes("MALE")) genderStr = "Male Tutor Required";
    else if (gUpper === "ANY" || !data.genderPreference) genderStr = "Any (Male or Female Tutor)";
    else {
      genderStr =
        data.genderPreference.replace(/\s*\[[^\]]+\]\s*/g, "").trim() ||
        "Any (Male or Female Tutor)";
    }
  }

  const rawNotes = (data.notes || "").replace(/\[(?:MONTHLY RATE|HOURLY|DAILY|SYSTEM)\]/gi, "").trim();
  const notes = rawNotes && !genderStr.toLowerCase().includes(rawNotes.toLowerCase()) ? rawNotes : null;

  let scheduleStr = data.schedule || data.timingPreference || "Evening (4 PM - 7 PM)";
  if (/12\s*(?:pm)?\s*[-–]\s*(?:3|4)\s*pm/i.test(scheduleStr)) {
    scheduleStr = "Evening (4 PM - 7 PM)";
  }

  return {
    inquiryNumber,
    clientName,
    classStr,
    modeStr,
    locationStr,
    feesStr,
    genderStr,
    scheduleStr,
    notes,
    whatsappNum: data.contactWhatsApp || "87997 07960",
  };
}

/** Aqua `tuition_enquiry_alert` body vars {{1}}–{{8}} in send order. */
export function buildAquaTuitionEnquiryPlaceholders(data: LeadTemplateData): string[] {
  const fields = getLeadNotifyFields(data);
  return [
    fields.inquiryNumber,
    fields.clientName,
    fields.classStr,
    fields.modeStr,
    fields.locationStr,
    fields.feesStr,
    fields.genderStr,
    fields.scheduleStr,
  ];
}

export function formatLeadNotifyTemplate(data: LeadTemplateData): string {
  const {
    inquiryNumber,
    clientName,
    classStr,
    modeStr,
    locationStr,
    feesStr,
    genderStr,
    scheduleStr,
    notes,
    whatsappNum,
  } = getLeadNotifyFields(data);

  if (data.useStandardMarkdown) {
    return [
      `*TUITION ENQUIRY: #${inquiryNumber}*`,
      `*Client Name:* ${clientName}`,
      `*Class:* ${classStr}`,
      `*Mode:* ${modeStr}`,
      `*Location:* ${locationStr}`,
      `*Fees:* ${feesStr}`,
      `*Gender Preference:* ${genderStr}`,
      notes ? `*Special Notes:* ${notes}` : null,
      `*Schedule:* ${scheduleStr}`,
      "",
      `Dm on WhatsApp  ${whatsappNum}`,
      `👑 VIP Membership Plan: https://apnatutorhub.com/tutor/plans`,
      `🔗 Unlock on Portal: https://apnatutorhub.com/tutor/leads`,
    ]
      .filter(Boolean)
      .join("\n");
  }

  return [
    `𝐓𝐔𝐈𝐓𝐈𝐎𝐍 𝐄𝐍𝐐𝐔𝐈𝐑𝐘: #${inquiryNumber}`,
    `𝐂𝐥𝐢𝐞𝐧𝐭 𝐍𝐚𝐦𝐞: ${clientName}`,
    `𝐂𝐥𝐚𝐬𝐬: ${classStr}`,
    `𝐌𝐨𝐝𝐞: ${modeStr}`,
    `𝐋𝐨𝐜𝐚𝐭𝐢𝐨𝐧: ${locationStr}`,
    `𝐅𝐞𝐞𝐬: ${feesStr}`,
    `𝐆𝐞𝐧𝐝𝐞𝐫 𝐏𝐫𝐞𝐟𝐞𝐫𝐞𝐧𝐜𝐞: ${genderStr}`,
    notes ? `𝐒𝐩𝐞𝐜𝐢𝐚𝐥 𝐍𝐨𝐭𝐞𝐬: ${notes}` : null,
    `𝐒𝐜𝐡𝐞𝐝𝐮𝐥𝐞: ${scheduleStr}`,
    "",
    `Dm on WhatsApp  ${whatsappNum}`,
    `👑 VIP Membership Plan: https://apnatutorhub.com/tutor/plans`,
    `🔗 Unlock on Portal: https://apnatutorhub.com/tutor/leads`,
  ]
    .filter(Boolean)
    .join("\n");
}
