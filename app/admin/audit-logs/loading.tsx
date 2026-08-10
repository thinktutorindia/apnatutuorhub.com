import React from "react";
import { PageLoader } from "@/components/ui/LoadingState";

export default function AdminAuditLogsLoading() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <PageLoader
        message="Loading Audit Logs..."
        subtext="Fetching platform security logs, admin action history, and IP trails..."
      />
    </div>
  );
}
