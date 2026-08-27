/** Strip answer keys and empty hints/explanations for enrolled learning view */
function sanitizeBlockForLearning(block) {
    const b = { ...block };
    if (b.type === "quiz") {
        delete b.correctAnswer;
        if (!b.explanation || !String(b.explanation).trim()) delete b.explanation;
    } else if (b.type === "fillBlank") {
        delete b.answer;
        if (!b.explanation || !String(b.explanation).trim()) delete b.explanation;
        if (!b.hint || !String(b.hint).trim()) delete b.hint;
    } else if (b.type === "trueFalse") {
        delete b.correctAnswer;
        if (!b.explanation || !String(b.explanation).trim()) delete b.explanation;
    } else if (b.type === "code") {
        delete b.solution;
        if (Array.isArray(b.hints)) {
            const hints = b.hints.filter((h) => h != null && String(h).trim());
            if (hints.length) b.hints = hints;
            else delete b.hints;
        }
    }
    return b;
}

function sanitizeModulesForLearning(modules) {
    return (modules || []).map((mod) => ({
        ...mod,
        lessons: (mod.lessons || []).map((lesson) => ({
            ...lesson,
            blocks: (lesson.blocks || []).map(sanitizeBlockForLearning),
        })),
    }));
}

function parseLabInstructions(raw) {
    if (!raw) return {};
    if (typeof raw === "object") return raw;
    try {
        return JSON.parse(raw);
    } catch {
        return {};
    }
}

function mapLessonForLearning(lesson, labId) {
    const blocks = (lesson.blocks || []).map((b) => ({
        ...sanitizeBlockForLearning(b),
        _labId: labId,
    }));
    return {
        ...lesson,
        type: lesson.type || "lesson",
        reference_id: labId,
        lab_id: labId,
        blocks,
        tasks: blocks,
    };
}

module.exports = {
    sanitizeBlockForLearning,
    sanitizeModulesForLearning,
    parseLabInstructions,
    mapLessonForLearning,
};
