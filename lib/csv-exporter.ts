/**
 * lib/csv-exporter.ts
 * Phase 13 — Generic CSV Export Utility
 */

export type CsvRow = Record<string, string | number | boolean | null | undefined>;

/**
 * Converts an array of objects to CSV string.
 * Handles values with commas / quotes by proper RFC-4180 escaping.
 */
export function toCsvString(rows: CsvRow[]): string {
  if (rows.length === 0) return "";

  const headers = Object.keys(rows[0]);
  const escape = (val: unknown): string => {
    const str =
      val === null || val === undefined
        ? ""
        : typeof val === "boolean"
          ? val ? "Yes" : "No"
          : String(val);
    // Wrap in quotes if it contains comma, double-quote, or newline
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const headerLine = headers.map(escape).join(",");
  const dataLines = rows.map((row) => headers.map((h) => escape(row[h])).join(","));

  return [headerLine, ...dataLines].join("\r\n");
}

/**
 * Triggers a browser download of the given CSV string.
 * Must be called from client-side code.
 */
export function downloadCsv(csvString: string, filename: string) {
  const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/** Formats a date for CSV filename: "2026-08-01" */
export function csvDateStamp(): string {
  return new Date().toISOString().slice(0, 10);
}
