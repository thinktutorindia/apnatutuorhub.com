import React from "react";
import { PageLoader } from "@/components/ui/LoadingState";

export default function TutorLoading() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <PageLoader
        message="Just a moment…"
        subtext="Setting up your tutor page"
      />
    </div>
  );
}
