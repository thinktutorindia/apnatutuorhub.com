"use client";

import { useState } from "react";
import { CalendarDays, UserCheck } from "lucide-react";
import BookingFormModal from "@/components/booking/BookingFormModal";

type Props = {
  purchaseId: string;
  leadId: string;
  tutorProfileId: string;
  tutorName: string;
  subject: string;
  classLevel: string;
  isShortlisted: boolean;
};

export default function BookApplicantButtons({
  purchaseId,
  leadId,
  tutorProfileId,
  tutorName,
  subject,
  classLevel,
  isShortlisted,
}: Props) {
  const [modal, setModal] = useState<"trial" | "hire" | null>(null);

  // Suppress unused purchaseId warning — kept for future analytics tracking
  void purchaseId;

  return (
    <>
      <button
        onClick={() => setModal("trial")}
        className="neu-btn bg-[#E0F2FE] px-4 py-2 text-xs text-[#0369A1]"
        title="Schedule a trial class"
      >
        <CalendarDays size={13} />
        Schedule Trial
      </button>

      {isShortlisted && (
        <button
          onClick={() => setModal("hire")}
          className="neu-btn neu-btn-primary px-4 py-2 text-xs"
          title="Hire this tutor for regular classes"
        >
          <UserCheck size={13} />
          Hire Tutor
        </button>
      )}

      {modal && (
        <BookingFormModal
          leadId={leadId}
          tutorProfileId={tutorProfileId}
          tutorName={tutorName}
          subject={subject}
          classLevel={classLevel}
          defaultIsTrial={modal === "trial"}
          onClose={() => setModal(null)}
        />
      )}
    </>
  );
}
