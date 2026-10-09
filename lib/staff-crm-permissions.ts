/** Blocks CRM → primary DB promotion and bulk contact CSV exports (even for SUPER_ADMIN). */
export const STAFF_DATABASE_EXPORT_DENY_TAG = "tag:deny-staff-database-export";

export type StaffCrmAccessSubject = {
  role?: string | null;
  customPermissions?: string[] | null;
};

export function isStaffDatabaseExportDenied(subject: StaffCrmAccessSubject): boolean {
  return (subject.customPermissions ?? []).includes(STAFF_DATABASE_EXPORT_DENY_TAG);
}

export function canExportStaffDatabase(subject: StaffCrmAccessSubject): boolean {
  return !isStaffDatabaseExportDenied(subject);
}
