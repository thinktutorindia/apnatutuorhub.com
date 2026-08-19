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
 * Dm on WhatsApp  62307 89155
 * 👑 VIP Membership Plan: https://apnatutorhub.com/tutor/plans
 * 🔗 Unlock on Portal: https://apnatutorhub.com/tutor/leads
 */

export interface LeadTemplateData {
  id?: string | null;
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

export function formatLeadNotifyTemplate(data: LeadTemplateData): string {
  // Format Lead ID code (6 digit or clean identifier)
  const rawId = data.id || "";
  const digitsOnly = rawId.replace(/\D/g, "");
  const leadNum = digitsOnly.length >= 4 
    ? digitsOnly.slice(-6) 
    : rawId.length >= 6 
      ? rawId.slice(-6).toUpperCase() 
      : "210984";

  const clientName = data.clientName?.trim() || "Not Specified";

  // Clean class level string (e.g. "Class 12" -> "12th Std", "Class 5" -> "5th Std")
  let classBase = data.classLevel?.trim() || "5th Std";
  const numMatch = classBase.match(/\b(\d{1,2})\b/);
  if (numMatch) {
    const n = parseInt(numMatch[1], 10);
    const suffix = n === 1 ? "st" : n === 2 ? "nd" : n === 3 ? "rd" : "th";
    classBase = `${n}${suffix} Std`;
  }

  const subjectsStr = data.subjects && data.subjects.length > 0 ? data.subjects.join(", ") : "";
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
  const locationStr = locationParts.join(", ") || data.city || "Delhi NCR";
  const pinStr = data.pincode ? ` (Pin: ${data.pincode})` : "";

  let feesStr = "5000/month";
  if (data.feeMonthly) {
    feesStr = `${data.feeMonthly}/month`;
  } else if (data.budgetMin && data.budgetMax) {
    feesStr = data.budgetMin === data.budgetMax 
      ? `${data.budgetMin}/month` 
      : `${data.budgetMin} - ${data.budgetMax}/month`;
  } else if (data.budgetMin) {
    feesStr = `${data.budgetMin}/month`;
  } else if (data.budgetMax) {
    feesStr = `${data.budgetMax}/month`;
  }

  let genderStr = "Any (Calm and Polite Tutor)";
  if (data.genderPreference) {
    const gUpper = data.genderPreference.toUpperCase();
    if (gUpper.includes("FEMALE")) genderStr = "Female Tutor Required";
    else if (gUpper.includes("MALE")) genderStr = "Male Tutor Required";
    else if (gUpper === "ANY" || !data.genderPreference) genderStr = "Any (Calm and Polite Tutor)";
    else genderStr = data.genderPreference;
  }

  const notesExtra = data.notes && !genderStr.includes(data.notes) ? ` (${data.notes})` : "";
  const genderWithNotes = `${genderStr}${notesExtra}`;

  const scheduleStr = data.schedule || data.timingPreference || "5 Days a Week";
  const whatsappNum = data.contactWhatsApp || "62307 89155";

  if (data.useStandardMarkdown) {
    return [
      `*TUITION ENQUIRY: #${leadNum}*`,
      `*Client Name:* ${clientName}`,
      `*Class:* ${classStr}`,
      `*Mode:* ${modeStr}`,
      `*Location:* ${locationStr}${pinStr}`,
      `*Fees:* ${feesStr}`,
      `*Gender Preference:* ${genderWithNotes}`,
      `*Schedule:* ${scheduleStr}`,
      "",
      `Dm on WhatsApp  ${whatsappNum}`,
      `👑 VIP Membership Plan: https://apnatutorhub.com/tutor/plans`,
      `🔗 Unlock on Portal: https://apnatutorhub.com/tutor/leads`,
    ].join("\n");
  }

  return [
    `𝐓𝐔𝐈𝐓𝐈𝐎𝐍 𝐄𝐍𝐐𝐔𝐈𝐑𝐘: #${leadNum}`,
    `𝐂𝐥𝐢𝐞𝐧𝐭 𝐍𝐚𝐦𝐞: ${clientName}`,
    `𝐂𝐥𝐚𝐬𝐬: ${classStr}`,
    `𝐌𝐨𝐝𝐞: ${modeStr}`,
    `𝐋𝐨𝐜𝐚𝐭𝐢𝐨𝐧: ${locationStr}${pinStr}`,
    `𝐅𝐞𝐞𝐬: ${feesStr}`,
    `𝐆𝐞𝐧𝐝𝐞𝐫 𝐏𝐫𝐞𝐟𝐞𝐫𝐞𝐧𝐜𝐞: ${genderWithNotes}`,
    `𝐒𝐜𝐡𝐞𝐝𝐮𝐥𝐞: ${scheduleStr}`,
    "",
    `Dm on WhatsApp  ${whatsappNum}`,
    `👑 VIP Membership Plan: https://apnatutorhub.com/tutor/plans`,
    `🔗 Unlock on Portal: https://apnatutorhub.com/tutor/leads`,
  ].join("\n");
}
