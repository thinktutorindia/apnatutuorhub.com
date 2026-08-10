import React from "react";

type BadgeVariant = "success" | "warning" | "error" | "info" | "primary" | "accent" | "neutral";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  dot?: boolean;
}

export function Badge({
  variant = "neutral",
  dot = false,
  className = "",
  children,
  ...props
}: BadgeProps) {
  const variantClass = {
    success: "at-badge-success",
    warning: "at-badge-warning",
    error: "at-badge-error",
    info: "at-badge-info",
    primary: "at-badge-primary",
    accent: "at-badge-accent",
    neutral: "at-badge-neutral",
  }[variant];

  return (
    <span className={`at-badge ${variantClass} ${className}`} {...props}>
      {dot && (
        <span
          className="inline-block w-1.5 h-1.5 rounded-full"
          style={{ backgroundColor: "currentColor" }}
        />
      )}
      {children}
    </span>
  );
}

// Lead/Booking status badge using LEAD_STATUS_META colors
const LEAD_STATUS_MAP: Record<string, BadgeVariant> = {
  ACTIVE: "success",
  MATCHING: "info",
  APPLICATIONS_RECEIVED: "warning",
  BOOKED: "primary",
  COMPLETED: "success",
  EXPIRED: "neutral",
  CLOSED: "neutral",
};

const LEAD_STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Active",
  MATCHING: "Matching",
  APPLICATIONS_RECEIVED: "Tutors Interested",
  BOOKED: "Booked",
  COMPLETED: "Completed",
  EXPIRED: "Expired",
  CLOSED: "Closed",
};

export function LeadStatusBadge({ status }: { status: string }) {
  const variant = LEAD_STATUS_MAP[status] ?? "neutral";
  const label = LEAD_STATUS_LABEL[status] ?? status;
  return <Badge variant={variant} dot>{label}</Badge>;
}

// Booking status
const BOOKING_STATUS_MAP: Record<string, BadgeVariant> = {
  PENDING: "warning",
  CONFIRMED: "info",
  IN_PROGRESS: "primary",
  COMPLETED: "success",
  CANCELLED: "neutral",
  DECLINED: "error",
};

const BOOKING_STATUS_LABEL: Record<string, string> = {
  PENDING: "Request Sent",
  CONFIRMED: "Confirmed",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  DECLINED: "Declined",
};

export function BookingStatusBadge({ status }: { status: string }) {
  const variant = BOOKING_STATUS_MAP[status] ?? "neutral";
  const label = BOOKING_STATUS_LABEL[status] ?? status;
  return <Badge variant={variant} dot>{label}</Badge>;
}

// KYC status badge
export function KycStatusBadge({ status }: { status: string }) {
  const map: Record<string, { variant: BadgeVariant; label: string }> = {
    APPROVED: { variant: "success", label: "Verified" },
    PENDING: { variant: "warning", label: "Under Review" },
    REJECTED: { variant: "error", label: "Rejected" },
    NOT_SUBMITTED: { variant: "neutral", label: "Not Submitted" },
  };
  const cfg = map[status] ?? { variant: "neutral", label: status };
  return <Badge variant={cfg.variant} dot>{cfg.label}</Badge>;
}
