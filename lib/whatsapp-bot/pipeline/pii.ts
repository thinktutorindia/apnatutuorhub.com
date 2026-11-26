/** Mask direct identifiers before any text is sent to an external model. */
export function maskForExternal(text: string): string {
  return (text ?? "")
    .replace(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi, "<EMAIL>")
    .replace(/(?:\+?91[\s-]?)?[6-9]\d{9}\b/g, "<PHONE>")
    .replace(/\b(?:pay|order)_[A-Za-z0-9]{8,}\b/g, "<PAYMENT_ID>")
    .replace(/\b\d{12}\b/g, "<UTR>");
}
