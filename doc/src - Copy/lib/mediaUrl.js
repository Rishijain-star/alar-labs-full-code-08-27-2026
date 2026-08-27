/**
 * Turn backend-relative paths (/uploads/..., /api/...) into absolute URLs.
 * VITE_API_BASE_URL is typically http://host:port/api — static files are on the same host at /uploads.
 * HLS instruction videos are routed through /api/labs/instruction-media (embed-only, not direct tab).
 */
function normalizeInstructionMediaPath(input) {
  const s = String(input).trim();
  if (!s) return s;

  const toApiPath = (mediaId, filename) => `/api/labs/instruction-media/${mediaId}/${filename}`;

  const apiMatch = s.match(/\/api\/labs\/instruction-media\/([0-9a-f-]{36})\/([^?#]+)/i);
  if (apiMatch && /\.(m3u8|ts)$/i.test(apiMatch[2])) {
    return toApiPath(apiMatch[1], apiMatch[2]);
  }

  const uploadMatch = s.match(/\/uploads\/labs\/instruction-media\/([0-9a-f-]{36})\/([^?#]+)/i);
  if (uploadMatch && /\.(m3u8|ts)$/i.test(uploadMatch[2])) {
    return toApiPath(uploadMatch[1], uploadMatch[2]);
  }

  return s;
}

export function resolveMediaUrl(path) {
  if (path == null || path === "") return "";
  const raw = String(path).trim();
  if (!raw) return "";

  const base = import.meta.env.VITE_API_BASE_URL || "";
  const origin = base.replace(/\/?api\/?$/i, "") || (typeof window !== "undefined" ? window.location.origin : "");

  if (/^https?:\/\//i.test(raw)) {
    try {
      const u = new URL(raw);
      const normalizedPath = normalizeInstructionMediaPath(u.pathname);
      if (normalizedPath !== u.pathname) {
        return `${origin}${normalizedPath}`;
      }
    } catch {
      return raw;
    }
    return raw;
  }

  const s = normalizeInstructionMediaPath(raw);
  if (s.startsWith("/")) return `${origin}${s}`;
  return `${origin}/${s}`;
}

/** Route param is a UUID (course id) vs a slug like "my-course" */
export function isUuidParam(value) {
  if (!value || typeof value !== "string") return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value.trim());
}
