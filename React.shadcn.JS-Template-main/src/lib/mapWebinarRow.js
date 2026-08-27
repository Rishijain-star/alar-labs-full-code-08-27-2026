import { resolveMediaUrl } from "@/lib/mediaUrl";
import { resolveItemCurrency } from "@/lib/localeFormat";
import { computeDiscountPercent } from "@/lib/webinarDisplay";
import { parseJsonStringArray } from "@/lib/parseJsonStringArray";

/** Map GET /api/webinars row → Training / dashboard card props */
export function mapWebinarRow(w) {
  const badges = parseJsonStringArray(w.topics);
  const price = Number(w.price ?? 0);
  const originalPrice = w.original_price != null ? Number(w.original_price) : null;
  const isFree = Boolean(w.is_free) || price === 0;
  return {
    id: w.id,
    slug: w.slug,
    title: w.title,
    instructor: w.instructor_name || "Instructor",
    instructorTitle: w.instructor_title || "Lead Instructor",
    instructorImage:
      resolveMediaUrl(w.instructor_image) ||
      "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=150",
    date: w.schedule_summary || "—",
    time: w.time_summary || "—",
    startsAt: w.starts_at || null,
    duration: w.duration_summary || "—",
    price,
    originalPrice,
    discountPercent: computeDiscountPercent(originalPrice, price),
    isFree,
    currency: resolveItemCurrency(w),
    rating: Number(w.rating ?? 0),
    enrolledCount: w.enrolled_count ?? 0,
    maxCapacity: w.max_capacity ?? 0,
    badges,
    topics: badges,
    enrollmentUrl: w.enrollment_url || null,
    deliveryMode: w.delivery_mode || "online",
    meetingLink: w.meeting_link || null,
    venue: w.venue || null,
    timezone: w.timezone || "IST",
    description: w.description || "",
    aboutContent: w.about_content || "",
    isRecorded: Boolean(w.is_recorded),
  };
}

/** Unique instructor cards from webinar rows (first occurrence wins). */
/** Map GET /api/training-programs row → same card shape as webinars */
export function mapExpertTrainingProgramRow(p) {
  const topics = parseJsonStringArray(p.tags);
  const price = Number(p.price ?? 0);
  const isFree = Boolean(p.is_free) || price === 0;
  const start = p.schedule_start ? new Date(p.schedule_start) : null;
  const end = p.schedule_end ? new Date(p.schedule_end) : null;
  let dateStr = "—";
  if (start && end) {
    dateStr = `${start.toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${end.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`;
  } else if (start) {
    dateStr = start.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
  }
  const timeStr =
    start && end
      ? `${start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} - ${end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
      : start
        ? start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        : "—";
  const days =
    start && end ? Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000)) : null;
  const computedDuration =
    p.duration || (days != null ? `${days} day${days === 1 ? "" : "s"}` : "—");
  const outcomes = Array.isArray(p.learning_outcomes) ? p.learning_outcomes : [];
  return {
    id: p.id,
    slug: p.slug || p.id,
    kind: "program",
    title: p.title,
    description: p.description || "",
    instructor: p.instructor_name || "Instructor",
    instructorTitle: p.instructor_title || "Lead Instructor",
    instructorImage: resolveMediaUrl(p.instructor_image_url) || null,
    date: dateStr,
    time: timeStr,
    scheduleStart: p.schedule_start,
    scheduleEnd: p.schedule_end,
    duration: computedDuration,
    sessionCount: p.session_count ?? 1,
    trainingFormat: p.training_format || "live_online",
    level: p.level || "beginner",
    certificateAvailable: Boolean(p.certificate_available),
    language: p.language || "English",
    prerequisites: p.prerequisites || "",
    learningOutcomes: outcomes,
    meetingLink: p.meeting_link || null,
    venue: p.venue || null,
    price,
    originalPrice: p.original_price != null ? Number(p.original_price) : null,
    discountPercent: computeDiscountPercent(p.original_price, price),
    isFree,
    currency: resolveItemCurrency(p),
    rating: Number(p.instructor_rating ?? 4.9),
    courseContent: p.course_content || "",
    instructorProfileUrl: p.instructor_profile_url || null,
    badges: topics,
    enrolledCount: p.enrolled_count ?? 0,
    maxCapacity: p.max_seats ?? 0,
    topics,
    enrollmentUrl: p.enrollment_url || null,
    bannerImage: resolveMediaUrl(p.banner_image_url) || null,
  };
}

export function formatLabel(value) {
  if (!value) return "—";
  return String(value)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function instructorsFromWebinars(mappedRows) {
  const seen = new Set();
  const out = [];
  for (const t of mappedRows) {
    const key = t.instructor;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push({
      name: t.instructor,
      title: t.instructorTitle,
      image: t.instructorImage,
      expertise: (t.topics || []).slice(0, 6),
      experience: t.duration || "",
    });
  }
  return out;
}
