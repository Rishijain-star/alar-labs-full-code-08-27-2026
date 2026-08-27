/**
 * Resolve in-app navigation target from FCM / notification metadata.
 */
export function resolveSupportNotificationUrl(data = {}) {
  const raw = data.url || data.click_action || "";
  if (typeof raw === "string" && raw.startsWith("/")) return raw;
  const ticketId = data.ticketId || data.ticket_id;
  if (!ticketId) return null;
  const eventType = data.eventType || data.event_type || "";
  if (eventType === "support_request_created" || eventType === "support_chat_message") {
    if (String(raw).includes("/app/support") || data.recipientRole === "admin") {
      return `/app/support?ticket=${ticketId}`;
    }
    return `/support/chat/${ticketId}`;
  }
  return `/support/chat/${ticketId}`;
}

export function isSupportNotificationPayload(data = {}) {
  const eventType = String(data.eventType || data.event_type || "");
  return (
    eventType === "support_chat_message" ||
    eventType === "support_request_created" ||
    Boolean(data.ticketId || data.ticket_id)
  );
}
