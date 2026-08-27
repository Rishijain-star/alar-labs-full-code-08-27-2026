/**
 * Maps GET /labs/slug/:slug (published lab + instructions.skillBuilder) to the
 * shape used by SkillBuilderDetailPage: { meta, tasks, labId, courseId, slug }.
 */
export function mapPublishedLabToSkillBuilderPage(lab) {
  if (!lab?.id) return null;
  let ins = lab.instructions;
  if (typeof ins === "string") {
    try {
      ins = JSON.parse(ins);
    } catch {
      ins = null;
    }
  }
  const sb = ins?.skillBuilder;
  if (!sb || typeof sb !== "object") return null;

  const metaIn = sb.meta && typeof sb.meta === "object" ? sb.meta : {};
  const settings = sb.settings && typeof sb.settings === "object" ? sb.settings : {};
  const overview = sb.overview && typeof sb.overview === "object" ? sb.overview : {};
  const tasks = Array.isArray(sb.tasks)
    ? sb.tasks.map((t, i) => ({
        ...t,
        id: t.id != null && String(t.id).trim() !== "" ? t.id : `task-${i}`,
      }))
    : [];

  const timerSec =
    typeof metaIn.timerSec === "number" && metaIn.timerSec > 0
      ? metaIn.timerSec
      : lab.time_limit_minutes != null
        ? Number(lab.time_limit_minutes) * 60
        : 2700;

  const durationStr =
    metaIn.duration ||
    (lab.time_limit_minutes != null ? `${Math.round(lab.time_limit_minutes)} minutes` : "—");

  const meta = {
    title: lab.title || metaIn.title || "Skill Builder",
    code: ins?.code || lab.slug || "LAB",
    platform: metaIn.platform || "—",
    level: metaIn.level || lab.difficulty || "Intermediate",
    duration: durationStr,
    credits: metaIn.credits != null && metaIn.credits !== "" ? String(metaIn.credits) : "—",
    timerSec,
    rating: typeof metaIn.rating === "number" ? metaIn.rating : 4.8,
    passingScore: Number(settings.passingScore) || 70,
    maxAttempts: Number(settings.maxAttempts) || 3,
    shuffleOptions: !!settings.shuffleOptions,
    showCorrectAnswers: settings.showCorrectAnswers !== false,
    showExplanations: settings.showExplanations !== false,
    certificateOnPass: !!settings.certificateOnPass,
    passMessage: settings.passMessage || "🎉 Great job!",
    failMessage: settings.failMessage || "Keep practicing — you can try again.",
    skillsTested: Array.isArray(overview.skillsTested) ? overview.skillsTested.filter(Boolean) : [],
  };

  return {
    labId: lab.id,
    courseId: lab.course_id ?? null,
    slug: lab.slug,
    meta,
    tasks,
  };
}
