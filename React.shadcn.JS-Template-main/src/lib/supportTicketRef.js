/**
 * Human-friendly support ticket label, e.g. Ticket-00001.
 */
export function formatSupportTicketLabel(ticketOrRef) {
  const ref =
    typeof ticketOrRef === "string"
      ? ticketOrRef
      : ticketOrRef?.ticket_ref || ticketOrRef?.ticketRef;
  if (!ref) return null;
  const match = String(ref).match(/^TICKET-(\d+)$/i);
  if (match) return `Ticket-${match[1].padStart(5, "0")}`;
  return String(ref).replace(/^TICKET-/i, "Ticket-");
}

export function getSupportTicketLabel(ticketOrRef, fallback = "Ticket") {
  return formatSupportTicketLabel(ticketOrRef) || fallback;
}
