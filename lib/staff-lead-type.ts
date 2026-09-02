export type StaffRecordType = "TUTOR" | "PARENT";

export const PARENT_TAG = "[PARENT REQUIREMENT]";
export const TUTOR_TAG = "[TUTOR CANDIDATE]";

export function getStaffRecordType(staffNotes?: string | null): StaffRecordType {
  return staffNotes?.includes(PARENT_TAG) ? "PARENT" : "TUTOR";
}

export function applyStaffRecordType(staffNotes: string | null | undefined, type: StaffRecordType): string {
  const cleaned = (staffNotes ?? "")
    .replaceAll(PARENT_TAG, "")
    .replaceAll(TUTOR_TAG, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  const tag = type === "PARENT" ? PARENT_TAG : TUTOR_TAG;
  return cleaned ? `${tag}\n${cleaned}` : tag;
}

export function staffRecordLabel(type: StaffRecordType) {
  return type === "PARENT" ? "Parent requirement" : "Tutor candidate";
}

export function staffNotesWithoutTypeTags(staffNotes?: string | null): string {
  return (staffNotes ?? "")
    .replaceAll(PARENT_TAG, "")
    .replaceAll(TUTOR_TAG, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function staffNotesFromParsed(lead: {
  leadType?: string | null;
  budgetFee?: string | null;
  appliedCodes?: string[] | null;
  operationalNotes?: string | null;
}): string {
  const extra = [
    lead.budgetFee ? `[BUDGET: ${lead.budgetFee}]` : "",
    lead.appliedCodes && lead.appliedCodes.length > 0 ? `[CODES: ${lead.appliedCodes.join(", ")}]` : "",
    lead.operationalNotes ? `[NOTES: ${lead.operationalNotes}]` : "",
  ]
    .filter(Boolean)
    .join(" | ");
  return applyStaffRecordType(extra || null, lead.leadType === "PARENT_LEAD" ? "PARENT" : "TUTOR");
}
