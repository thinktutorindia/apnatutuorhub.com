import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className = "",
}: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center text-center py-14 px-6 ${className}`}>
      {icon && (
        <div className="mb-4 flex items-center justify-center w-16 h-16 rounded-2xl bg-[#F3F4F6] text-[#6B7280]">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-700 text-[#111827] mb-1.5">{title}</h3>
      {description && (
        <p className="text-sm text-[#6B7280] max-w-xs leading-relaxed mb-5">{description}</p>
      )}
      {action && (
        action.href ? (
          <Link href={action.href} className="at-btn at-btn-primary at-btn-sm">
            {action.label}
          </Link>
        ) : (
          <Button variant="primary" size="sm" onClick={action.onClick}>
            {action.label}
          </Button>
        )
      )}
    </div>
  );
}
