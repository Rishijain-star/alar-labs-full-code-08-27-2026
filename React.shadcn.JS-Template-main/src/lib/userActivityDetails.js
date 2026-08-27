/**
 * Maps GET /me/creator/insights payload into the admin user-activity detail shape.
 * Used when GET /owner/users/:id/creator-activity is unavailable (e.g. older remote API).
 */
export function buildActivityFromInsights(apiResponse, userMeta = {}) {
  const raw = apiResponse?.data ?? apiResponse;
  const courses = (raw?.courses ?? []).map((c) => ({
    id: c.id,
    contentType: "course",
    title: c.title,
    slug: c.slug,
    status: c.status,
    isFree: c.isFree,
    price: c.price,
    thumbnail: c.thumbnail,
    level: c.level,
    durationMinutes: c.durationMinutes,
    enrollmentCount: c.enrollments ?? 0,
    purchaseCount: c.purchaseCount ?? 0,
    createdAt: c.createdAt,
  }));

  const labs = (raw?.labs ?? []).map((l) => ({
    id: l.id,
    contentType: "lab",
    title: l.title,
    slug: l.slug,
    status: l.status,
    labType: l.labType,
    labKind: l.labKind,
    isFree: l.isFree,
    price: l.price,
    thumbnail: l.thumbnail,
    enrollmentCount: l.directEnrollments ?? 0,
    purchaseCount: l.purchaseCount ?? 0,
    assignmentCount: l.assignments ?? 0,
    createdAt: l.createdAt,
  }));

  const publishedCourses = courses.filter((c) => c.status === "published");
  const publishedLabs = labs.filter((l) => l.status === "published");
  const publishedContent = [...publishedLabs, ...publishedCourses].sort(
    (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0),
  );

  const sumEnrollments = (items) =>
    items.reduce((s, i) => s + (i.enrollmentCount || 0), 0);
  const sumPurchases = (items) =>
    items.reduce((s, i) => s + (i.purchaseCount || 0), 0);

  return {
    user: {
      id: userMeta.id,
      email: userMeta.email,
      fullName: userMeta.fullName,
      role: userMeta.role,
      joinedAt: userMeta.joinedAt,
    },
    summary: {
      totalPublishedLabs: publishedLabs.length,
      totalPublishedCourses: publishedCourses.length,
      totalPublishedContent: publishedContent.length,
      totalEnrollments: sumEnrollments(publishedContent),
      totalPurchases: sumPurchases(publishedContent),
      totalLabs: labs.length,
      totalCourses: courses.length,
    },
    publishedLabs,
    publishedCourses,
    publishedContent,
    labs,
    courses,
    isFallback: true,
  };
}

export function mapOwnerProfileToUserMeta(profile, userId) {
  if (!profile) return { id: userId };
  const p = profile.profile ?? profile;
  return {
    id: p.user_id ?? p.id ?? userId,
    email: p.email,
    fullName: p.full_name ?? p.fullName,
    role: p.role?.name ?? p.role_name ?? null,
    joinedAt: p.created_at ?? p.createdAt,
  };
}

export function normalizeCreatorActivityPayload(apiResponse) {
  const root = apiResponse?.data ?? apiResponse;
  const payload = root?.user ? root : root?.data ?? root;
  if (!payload?.user) return null;
  return payload;
}
