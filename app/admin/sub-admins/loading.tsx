import React from "react";
import { PageLoader } from "@/components/ui/LoadingState";

export default function AdminSubAdminsLoading() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <PageLoader
        message="Loading Staff Management..."
        subtext="Fetching sub-admin accounts, role permissions, and access controls..."
      />
    </div>
  );
}
