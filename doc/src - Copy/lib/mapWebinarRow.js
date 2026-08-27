import { resolveMediaUrl } from "@/lib/mediaUrl";

/** Map GET /api/webinars row → Training / dashboard card props */
export function mapWebinarRow(w) {
  const topics = Array.isArray(w.topics) ? w.topics : [];
  const price = Number(w.price ?? 0);
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
    duration: w.duration_summary || "—",
    price,
    isFree,
    rating: Number(w.rating ?? 0),
    enrolledCount: w.enrolled_count ?? 0,
    maxCapacity: w.max_capacity ?? 0,
    topics,
    enrollmentUrl: w.enrollment_url || null,
  };
}

/** Unique instructor cards from webinar rows (first occurrence wins). */
/** Map GET /api/training-programs row → same card shape as webinars */
export function mapExpertTrainingProgramRow(p) {
  const topics = Array.isArray(p.tags) ? p.tags : [];
  const price = Number(p.price ?? 0);
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
  return {
    id: p.id,
    slug: p.id,
    kind: "program",
    title: p.title,
    instructor: p.instructor_name || "Instructor",
    instructorTitle: p.instructor_title || "Lead Instructor",
    instructorImage:
      resolveMediaUrl(p.instructor_image_url) ||
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
    date: dateStr,
    time: timeStr,
    duration: days != null ? `${days} day${days === 1 ? "" : "s"}` : "—",
    price,
    isFree: price === 0,
    rating: Number(p.instructor_rating ?? 4.9),
    enrolledCount: p.enrolled_count ?? 0,
    maxCapacity: p.max_seats ?? 0,
    topics,
    enrollmentUrl: p.enrollment_url || null,
  };
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
