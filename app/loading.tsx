import React from "react";
import { PageLoader } from "@/components/ui/LoadingState";

export default function GlobalLoading() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <PageLoader
        message="Loading ApnaTutorHub..."
        subtext="Fetching the latest data and setting up your view"
      />
    </div>
  );
}
