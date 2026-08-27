/** Parse lab metadata from list/detail API rows. */
export function parseLabMetadataLoose(raw) {
  if (raw == null || raw === "") return {};
  if (typeof raw === "object" && !Array.isArray(raw)) return raw;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }
  return {};
}

/** Admin-set rating (1–5) for card / overview display. */
export function resolveLabCardRating(row) {
  if (!row || typeof row !== "object") return null;
  const meta = parseLabMetadataLoose(row.metadata);
  const raw = row.rating ?? meta.rating;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

/** Admin student count shown as enrolled on cards; falls back to real enrollments. */
export function resolveLabCardEnrolledCount(row) {
  if (!row || typeof row !== "object") return 0;
  const meta = parseLabMetadataLoose(row.metadata);
  const adminRaw = meta.studentCount ?? meta.student_count ?? row.studentCount;
  if (adminRaw != null && adminRaw !== "") {
    const admin = Number(adminRaw);
    if (Number.isFinite(admin)) return admin;
  }
  const dbRaw = row.enrolled_count ?? row.enrolledCount;
  if (dbRaw != null && dbRaw !== "") {
    const db = Number(dbRaw);
    if (Number.isFinite(db)) return db;
  }
  return 0;
}

/** Map API lab row → LabCard props (rating, enrolledCount, platform). */
export function mapLabRowForCard(row) {
  return {
    rating: resolveLabCardRating(row),
    enrolledCount: resolveLabCardEnrolledCount(row),
    platform: row.platform || parseLabMetadataLoose(row.metadata).platform || undefined,
  };
}
