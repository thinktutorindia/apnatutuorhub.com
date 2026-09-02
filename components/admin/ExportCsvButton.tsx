"use client";

import { useState, useTransition } from "react";
import { Download, Loader2 } from "lucide-react";
import { downloadCsv } from "@/lib/csv-exporter";

interface ExportCsvButtonProps {
  label: string;
  action: () => Promise<{ csv: string; filename: string } | null>;
  className?: string;
}

export function ExportCsvButton({ label, action, className }: ExportCsvButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleExport() {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result) {
        setError("Export failed");
        return;
      }
      downloadCsv(result.csv, result.filename);
    });
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleExport}
        disabled={isPending}
        className={
          className ??
          "flex items-center gap-1.5 rounded-full px-4 py-2.5 text-xs font-800 bg-[#0F2540] !text-white hover:bg-[#1E3A5F] disabled:opacity-50"
        }
      >
        {isPending ? (
          <Loader2 size={13} className="animate-spin" />
        ) : (
          <Download size={13} />
        )}
        {isPending ? "Exporting…" : label}
      </button>
      {error && <p className="mt-1 text-[10px] text-red-400">{error}</p>}
    </div>
  );
}
