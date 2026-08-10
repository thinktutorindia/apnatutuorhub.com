import React from "react";
import { PageLoader } from "@/components/ui/LoadingState";

export default function AdminUsersLoading() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <PageLoader
        message="Loading User Accounts..."
        subtext="Fetching parent, tutor, and admin profile records..."
      />
    </div>
  );
}
