/** Normalize lab list API payload `{ data: { rows, pagination } }`. */
export function normalizeLabsPayload(payload) {
  if (!payload) return { rows: [], pagination: null };
  const inner = payload?.data && !Array.isArray(payload.data) ? payload.data : payload;
  const rows =
    inner?.rows ||
    payload?.rows ||
    inner?.items ||
    payload?.items ||
    (Array.isArray(payload?.data) ? payload.data : []);
  const pagination = inner?.pagination || payload?.pagination || null;
  return {
    rows: Array.isArray(rows) ? rows : [],
    pagination,
  };
}

/** Normalize list endpoints that return `{ data: { rows } }` or variants. */
export function normalizeCoursesPayload(payload) {
  if (!payload) return [];
  if (Array.isArray(payload?.data)) return payload.data;
  const rows =
    payload?.data?.rows ||
    payload?.rows ||
    payload?.data?.items ||
    payload?.items ||
    [];
  if (!Array.isArray(rows)) return [];
  return rows;
}
