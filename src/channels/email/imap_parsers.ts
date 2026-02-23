/**
 * IMAP header and body parsing helpers.
 *
 * Extracts From, Subject, Date, and body text from raw
 * IMAP FETCH response data.
 *
 * @module
 */

/** Parse the From address from IMAP header lines. */
export function parseImapFrom(headerLines: string): string {
  const match = headerLines.match(/From:\s*(?:.*<)?([^>\s]+)>?/i);
  return match ? match[1] : "unknown";
}

/** Parse the Subject from IMAP header lines. */
export function parseImapSubject(headerLines: string): string {
  const match = headerLines.match(/Subject:\s*(.+)/i);
  return match ? match[1].trim() : "(no subject)";
}

/** Parse the Date from IMAP header lines, falling back to now. */
export function parseImapDate(headerLines: string): Date {
  const match = headerLines.match(/Date:\s*(.+)/i);
  if (match) {
    const d = new Date(match[1].trim());
    if (!isNaN(d.getTime())) return d;
  }
  return new Date();
}

/** Extract the plain-text body from a combined FETCH response. */
export function extractImapBodyText(combined: string): string {
  const bodyMatch = combined.match(
    /BODY\[TEXT\]\s*\{?\d*\}?\r?\n?([\s\S]*?)(?:\)\s*$|\*\s|A\d+)/,
  );
  return bodyMatch ? bodyMatch[1].trim() : "";
}
