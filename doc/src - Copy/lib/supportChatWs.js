/**
 * Support chat WebSocket URL (no JWT in query string — token is sent as first JSON message).
 */
export function buildSupportWebSocketUrl(ticketId) {
  const base = import.meta.env.VITE_API_BASE_URL || "";
  if (!base || !ticketId) return null;
  try {
    const u = new URL(base, typeof window !== "undefined" ? window.location.origin : "http://localhost");
    const wsProto = u.protocol === "https:" ? "wss:" : "ws:";
    const qs = new URLSearchParams({ ticketId });
    return `${wsProto}//${u.host}/api/ws/support?${qs.toString()}`;
  } catch {
    return null;
  }
}
