import React from "react";
import { PageLoader } from "@/components/ui/LoadingState";

export default function TutorAppLoading() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <PageLoader
        message="Loading Student Inquiries / छात्र अनुरोध लोड हो रहे हैं..."
        subtext="Fetching the latest verified student leads & parent contacts / नवीनतम सत्यापित छात्र अनुरोध लोड किए जा रहे हैं..."
      />
    </div>
  );
}
