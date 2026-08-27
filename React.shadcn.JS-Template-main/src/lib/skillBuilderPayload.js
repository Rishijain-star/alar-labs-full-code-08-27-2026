/**
 * Builds the canonical Skill Builder JSON stored under lab.instructions.skillBuilder
 * and sent as multipart field `skillBuilder` to POST /owner/labs/create-full.
 */
export function buildSkillBuilderPayload({ basic, media, tasks, settings }) {
  const totalPoints = (tasks || []).reduce((s, t) => s + (Number(t.points) || 0), 0);
  return {
    meta: {
      title: basic.title || "",
      code: "(auto)",
      description: basic.description || "",
      platform: basic.platform || "",
      level: basic.level || "",
      category: basic.category || "",
      duration: basic.duration || "",
      credits: basic.credits || "",
      timerSec: Number(basic.timerSec || 2700),
      rating: Number(basic.rating || 4.8),
      isFree: !!basic.isFree,
      price: basic.price ? Number(basic.price) : null,
      thumbnail: media.thumbnail || null,
      enrolledCount: Number(basic.enrolledCount || 0),
    },
    overview: {
      skillsTested: (media.skillsTested || []).filter(Boolean),
      whatYouLearn: (media.whatYouLearn || []).filter(Boolean),
      requirements: (media.requirements || []).filter(Boolean),
    },
    settings: {
      passingScore: Number(settings.passingScore || 70),
      maxAttempts: Number(settings.maxAttempts || 3),
      retryCooldown: Number(settings.retryCooldown || 0),
      isPublished: !!settings.isPublished,
      shuffleQuestions: !!settings.shuffleQuestions,
      shuffleOptions: !!settings.shuffleOptions,
      showCorrectAnswers: !!settings.showCorrectAnswers,
      showExplanations: !!settings.showExplanations,
      allowSkip: !!settings.allowSkip,
      requireSequential: !!settings.requireSequential,
      certificateOnPass: !!settings.certificateOnPass,
      passMessage: settings.passMessage || "",
      failMessage: settings.failMessage || "",
    },
    tasks: (tasks || []).map(({ id: _id, ...t }) => t),
    _meta: { totalPoints, taskCount: (tasks || []).length },
  };
}
