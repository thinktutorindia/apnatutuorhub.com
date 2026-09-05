"use client";

import React from "react";
import { SubjectPicker } from "@/components/ui/SubjectPicker";

export interface SubjectTaxonomyPickerProps {
  selectedSubjects?: string[];
  value?: string[];
  onChange: (subjects: string[]) => void;
  maxSelections?: number;
  max?: number;
  title?: string;
  showTitle?: boolean;
  compact?: boolean;
}

/**
 * Standardized bridge component for Staff CRM Calling Desk & Power Dialer.
 * Directly renders the platform-wide centralized SubjectPicker with the official 18-category tree
 * to guarantee 100% hard-pinned taxonomy consistency across the website.
 */
export function SubjectTaxonomyPicker({
  selectedSubjects,
  value,
  onChange,
  maxSelections,
  max,
  title = "Mark Your Skills & Subjects;",
  showTitle = true,
  compact = true,
}: SubjectTaxonomyPickerProps) {
  return (
    <SubjectPicker
      value={value ?? selectedSubjects}
      onChange={onChange}
      max={max ?? maxSelections ?? 50}
      title={title}
      showTitle={showTitle}
      compact={compact}
    />
  );
}
