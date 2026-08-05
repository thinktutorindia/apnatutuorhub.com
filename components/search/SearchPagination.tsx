"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

type Props = {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
};

export function SearchPagination({ page, totalPages, onPageChange }: Props) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between border-t border-slate-200 pt-4 text-xs font-bold text-slate-600">
      <p>
        Page <span className="text-[#0F172A]">{page}</span> of {totalPages}
      </p>

      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="neu-btn neu-btn-white flex items-center gap-1 px-3 py-1.5 disabled:opacity-50"
        >
          <ChevronLeft size={14} />
          <span>Previous</span>
        </button>

        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="neu-btn neu-btn-white flex items-center gap-1 px-3 py-1.5 disabled:opacity-50"
        >
          <span>Next</span>
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}
