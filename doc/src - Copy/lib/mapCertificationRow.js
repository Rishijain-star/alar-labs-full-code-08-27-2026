import { resolveMediaUrl } from "@/lib/mediaUrl";

export function mapCertificationRow(c) {
  const price = Number(c.list_price ?? 0);
  const isFree = Boolean(c.is_free) || price === 0;
  return {
    id: c.id,
    title: c.title,
    description: c.description || "",
    thumbnail:
      resolveMediaUrl(c.thumbnail) ||
      "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=500",
    isFree,
    price,
    duration: c.duration_label || "—",
    level: c.level || "—",
    platform: c.vendor_platform || "General",
    enrolledCount: c.enrolled_display ?? 0,
    practiceQuestions: c.practice_question_count ?? 0,
    examSimulations: c.exam_simulation_count ?? 0,
    examPracticeUrl: c.exam_practice_url || null,
  };
}
