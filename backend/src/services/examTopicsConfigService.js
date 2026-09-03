const { ExamTopicsConfig } = require("../models");
const { AppError } = require("../middleware/errorHandler");

const CONFIG_KEY = "exam_topics";

function getDefaultConfig() {
  return {
    learningSets: [],
    exams: [],
  };
}

function canonicalOption(opt) {
  if (!opt || typeof opt !== "object") return null;
  return {
    id: String(opt.id || "").trim(),
    text: String(opt.text || "").trim(),
  };
}

function canonicalQuestion(q) {
  if (!q || typeof q !== "object") return null;
  const options = Array.isArray(q.options)
    ? q.options.map(canonicalOption).filter(Boolean)
    : [];
  
  const rawCorrect = Array.isArray(q.correctOptionIds)
    ? q.correctOptionIds
    : q.correctOptionId
    ? [q.correctOptionId]
    : [];
  const correctOptionIds = Array.from(
    new Set(rawCorrect.map((id) => String(id || "").trim()).filter(Boolean))
  ).sort();

  return {
    id: String(q.id || "").trim(),
    type: String(q.type || "multiple_choice").trim(),
    question: String(q.question || "").trim(),
    options,
    correctOptionIds,
    explanation: String(q.explanation || "").trim(),
  };
}

function setContentFingerprint(set) {
  if (!set || typeof set !== "object") return "";
  const questions = Array.isArray(set.questions)
    ? set.questions.map(canonicalQuestion).filter(Boolean)
    : [];

  return JSON.stringify({
    title: String(set.title || "").trim(),
    description: String(set.description || "").trim(),
    timeLimitMinutes: set.timeLimitMinutes !== undefined && set.timeLimitMinutes !== null ? Number(set.timeLimitMinutes) : null,
    passingPercentage: set.passingPercentage !== undefined && set.passingPercentage !== null ? Number(set.passingPercentage) : null,
    questions,
  });
}

function enrichSetDefaults(set, existing, userId) {
  const incoming = set && typeof set === "object" ? { ...set } : {};

  if (!existing) {
    return {
      ...incoming,
      status: incoming.status || "draft",
      content_approval_status: incoming.content_approval_status ?? null,
      created_by: incoming.created_by || userId || null,
      createdAt: incoming.createdAt || new Date().toISOString(),
      updatedAt: incoming.updatedAt || new Date().toISOString(),
    };
  }

  const existingFingerprint = setContentFingerprint(existing);
  const incomingFingerprint = setContentFingerprint(incoming);
  const draftFingerprint = existing.draft_data ? setContentFingerprint(existing.draft_data) : null;

  const next = {
    ...incoming,
    status: existing.status || incoming.status || "draft",
    content_approval_status: existing.content_approval_status ?? incoming.content_approval_status ?? null,
    created_by: existing.created_by || incoming.created_by || userId || null,
    createdAt: existing.createdAt || existing.created_at || incoming.createdAt || null,
    updatedAt: incoming.updatedAt || new Date().toISOString(),
  };

  // If set is published & approved
  if (existing.status === "published" && existing.content_approval_status === "approved") {
    if (incomingFingerprint === existingFingerprint) {
      // Content matches approved version exactly -> clear draft_data
      next.draft_data = null;
      next.title = existing.title;
      next.description = existing.description;
      next.questions = existing.questions;
      if (existing.timeLimitMinutes !== undefined) next.timeLimitMinutes = existing.timeLimitMinutes;
      if (existing.passingPercentage !== undefined) next.passingPercentage = existing.passingPercentage;
      next.content_approval_status = "approved";
    } else if (draftFingerprint && incomingFingerprint === draftFingerprint) {
      // Content matches existing pending draft -> keep existing draft_data as is
      next.draft_data = existing.draft_data;
      next.title = existing.title;
      next.description = existing.description;
      next.questions = existing.questions;
      if (existing.timeLimitMinutes !== undefined) next.timeLimitMinutes = existing.timeLimitMinutes;
      if (existing.passingPercentage !== undefined) next.passingPercentage = existing.passingPercentage;
      next.content_approval_status = "approved";
    } else {
      // Newly modified content! Save new draft_data for approval
      next.draft_data = {
        title: incoming.title,
        description: incoming.description,
        timeLimitMinutes: incoming.timeLimitMinutes,
        passingPercentage: incoming.passingPercentage,
        questions: incoming.questions,
      };
      next.title = existing.title;
      next.description = existing.description;
      next.questions = existing.questions;
      if (existing.timeLimitMinutes !== undefined) next.timeLimitMinutes = existing.timeLimitMinutes;
      if (existing.passingPercentage !== undefined) next.passingPercentage = existing.passingPercentage;
      next.content_approval_status = "approved";
    }
  } else {
    // Not published/approved yet (e.g. draft)
    next.draft_data = existing.draft_data || null;
  }

  return next;
}

function isSetPublicApproved(set) {
  return (
    set &&
    set.status === "published" &&
    set.content_approval_status === "approved"
  );
}

function filterApprovedSets(config) {
  const approved = (sets) =>
    (sets || []).filter((s) => isSetPublicApproved(s));
  return {
    learningSets: approved(config.learningSets),
    exams: approved(config.exams),
  };
}

function hasAnyApprovedPublicSet(config) {
  const filtered = filterApprovedSets(config);
  return filtered.learningSets.length > 0 || filtered.exams.length > 0;
}

function migrateLegacyConfig(config) {
  const c = config && typeof config === "object" ? { ...config } : {};
  let learningSets = Array.isArray(c.learningSets) ? c.learningSets : [];
  let exams = Array.isArray(c.exams) ? c.exams : [];

  if (!learningSets.length && Array.isArray(c.learning?.questions) && c.learning.questions.length) {
    learningSets = [
      {
        id: `legacy-learning-${Date.now()}`,
        title: c.learning?.title || "Learning Set",
        questions: c.learning.questions,
        updatedAt: new Date().toISOString(),
        status: "draft",
      },
    ];
  }

  if (!exams.length && Array.isArray(c.exam?.questions) && c.exam.questions.length) {
    exams = [
      {
        id: `legacy-exam-${Date.now()}`,
        title: c.exam?.title || "Exam",
        timeLimitMinutes: Number(c.exam?.timeLimitMinutes) > 0 ? Number(c.exam.timeLimitMinutes) : 50,
        questions: c.exam.questions,
        updatedAt: new Date().toISOString(),
        status: "draft",
      },
    ];
  }

  return { learningSets, exams };
}

function normalizeQuestion(q) {
  if (!q || typeof q !== "object") return null;
  const type = q.type || "multiple_choice";
  const correctOptionIds = Array.isArray(q.correctOptionIds)
    ? q.correctOptionIds
    : q.correctOptionId
    ? [q.correctOptionId]
    : [];
  const correctOptionId = q.correctOptionId || correctOptionIds[0] || "";
  const explanation = typeof q.explanation === "string" ? q.explanation : "";
  return {
    ...q,
    type,
    correctOptionId,
    correctOptionIds,
    explanation,
    options: Array.isArray(q.options) ? q.options : [],
  };
}

function normalizeSet(set) {
  if (!set || typeof set !== "object") return null;
  return {
    ...set,
    status: set.status || "draft",
    content_approval_status: set.content_approval_status ?? null,
    created_by: set.created_by || null,
    createdAt: set.createdAt || set.created_at || null,
    updatedAt: set.updatedAt || set.updated_at || null,
    questions: Array.isArray(set.questions)
      ? set.questions.map(normalizeQuestion).filter(Boolean)
      : [],
  };
}

function normalizeConfigRow(row) {
  const obj = typeof row?.toJSON === "function" ? row.toJSON() : { ...row };
  if (typeof obj.config === "string") {
    try {
      obj.config = JSON.parse(obj.config);
    } catch {
      obj.config = getDefaultConfig();
    }
  }
  if (!obj.config || typeof obj.config !== "object") {
    obj.config = getDefaultConfig();
  }
  obj.config = migrateLegacyConfig(obj.config);
  if (!Array.isArray(obj.config.learningSets)) obj.config.learningSets = [];
  if (!Array.isArray(obj.config.exams)) obj.config.exams = [];
  obj.config.learningSets = obj.config.learningSets.map(normalizeSet).filter(Boolean);
  obj.config.exams = obj.config.exams.map(normalizeSet).filter(Boolean);
  return obj;
}

function stripQuestionForPublic(q) {
  if (!q || typeof q !== "object") return null;
  return {
    id: q.id,
    type: q.type || "multiple_choice",
    question: q.question || "",
    correctOptionIds: Array.isArray(q.correctOptionIds) ? q.correctOptionIds : [q.correctOptionId].filter(Boolean),
    explanation: q.explanation || "",
    options: (q.options || []).map((o) => ({
      id: o.id,
      text: o.text || "",
    })),
  };
}

function stripSetForPublic(set, type) {
  if (!set || typeof set !== "object") return null;
  const base = {
    id: set.id,
    title: set.title || "",
    description: set.description || "",
    questions: (set.questions || []).map(stripQuestionForPublic).filter(Boolean),
  };
  if (type === "exam") {
    base.timeLimitMinutes = Number(set.timeLimitMinutes) > 0 ? Number(set.timeLimitMinutes) : 50;
    base.passingPercentage = Number(set.passingPercentage) >= 0 && Number(set.passingPercentage) <= 100 ? Number(set.passingPercentage) : 70;
  }
  return base;
}

function stripConfigForPublic(config) {
  const c = migrateLegacyConfig(config || getDefaultConfig());
  return {
    learningSets: (c.learningSets || []).map((s) => stripSetForPublic(s, "learning")).filter(Boolean),
    exams: (c.exams || []).map((s) => stripSetForPublic(s, "exam")).filter(Boolean),
  };
}

function findQuestionInConfig(config, section, setId, questionId) {
  const sets =
    section === "exam"
      ? config?.exams || []
      : config?.learningSets || [];
  const set = sets.find((s) => s && String(s.id) === String(setId));
  if (!set) return null;
  return (set.questions || []).find((q) => q && String(q.id) === String(questionId)) || null;
}

function getSetArrayKey(type) {
  return type === "exam" ? "exams" : "learningSets";
}

function flattenPendingSets(config, options = {}) {
  const { createdBy = null } = options;
  const rows = [];

  const pushSet = (set, type) => {
    if (!set || set.status !== "published") return;
    const isPending = set.content_approval_status === "pending" || !!set.draft_data;
    if (!isPending) return;
    if (createdBy != null && String(set.created_by) !== String(createdBy)) return;

    const displaySet = set.draft_data ? { ...set, ...set.draft_data } : set;

    rows.push({
      setId: set.id,
      type,
      title: displaySet.title || "Untitled",
      description: displaySet.description || "",
      status: displaySet.status,
      content_approval_status: "pending",
      created_by: displaySet.created_by || null,
      updatedAt: displaySet.updatedAt || null,
      questionCount: (displaySet.questions || []).length,
      timeLimitMinutes: type === "exam" ? displaySet.timeLimitMinutes : null,
    });
  };

  (config.learningSets || []).forEach((s) => pushSet(s, "learning"));
  (config.exams || []).forEach((s) => pushSet(s, "exam"));

  return rows.sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));
}

async function ensureRow() {
  const [row] = await ExamTopicsConfig.findOrCreate({
    where: { config_key: CONFIG_KEY },
    defaults: {
      config: getDefaultConfig(),
      is_published: false,
      is_initialized: false,
    },
  });
  return row;
}

async function saveConfigRow(rowId, config, isInitialized = true) {
  const isPublished = hasAnyApprovedPublicSet(config);
  const jsonStr = JSON.stringify(config);
  const sequelize = ExamTopicsConfig.sequelize;
  await sequelize.query(
    `UPDATE exam_topics_configs SET \`config\` = CAST(? AS JSON), is_initialized = ?, is_published = ? WHERE id = ?`,
    { replacements: [jsonStr, isInitialized ? 1 : 0, isPublished ? 1 : 0, rowId] }
  );
  return normalizeConfigRow(await ExamTopicsConfig.findByPk(rowId));
}

function diffConfigChanges(oldConfig, newConfig) {
  const oldLearningIds = new Set((oldConfig?.learningSets || []).map((s) => s.id));
  const oldExamIds = new Set((oldConfig?.exams || []).map((s) => s.id));
  const newLearningIds = new Set((newConfig?.learningSets || []).map((s) => s.id));
  const newExamIds = new Set((newConfig?.exams || []).map((s) => s.id));

  const removed =
    [...oldLearningIds].filter((id) => !newLearningIds.has(id)).length +
    [...oldExamIds].filter((id) => !newExamIds.has(id)).length;

  const added =
    [...newLearningIds].filter((id) => !oldLearningIds.has(id)).length +
    [...newExamIds].filter((id) => !oldExamIds.has(id)).length;

  let updated = 0;
  for (const id of newLearningIds) {
    if (!oldLearningIds.has(id)) continue;
    const old = oldConfig.learningSets.find((s) => s.id === id);
    const neu = newConfig.learningSets.find((s) => s.id === id);
    if (setContentFingerprint(old) !== setContentFingerprint(neu)) updated += 1;
  }
  for (const id of newExamIds) {
    if (!oldExamIds.has(id)) continue;
    const old = oldConfig.exams.find((s) => s.id === id);
    const neu = newConfig.exams.find((s) => s.id === id);
    if (setContentFingerprint(old) !== setContentFingerprint(neu)) updated += 1;
  }

  return { added, updated, removed };
}

class ExamTopicsConfigService {
  diffConfigChanges(oldConfig, newConfig) {
    return diffConfigChanges(oldConfig, newConfig);
  }

  async getPublishedConfig() {
    const row = await ensureRow();
    const normalized = normalizeConfigRow(row);
    const filtered = filterApprovedSets(normalized.config);
    if (!filtered.learningSets.length && !filtered.exams.length) {
      throw new AppError("Exam Topics not available", 404);
    }
    return {
      ...normalized,
      config: stripConfigForPublic(filtered),
    };
  }

  async getAdminConfig() {
    const row = await ensureRow();
    const normalized = normalizeConfigRow(row);

    const mergeDrafts = (sets) => {
      return (sets || []).map(set => {
        if (set.draft_data) {
          return { ...set, ...set.draft_data, content_approval_status: "pending" };
        }
        return set;
      });
    };

    normalized.config.learningSets = mergeDrafts(normalized.config.learningSets);
    normalized.config.exams = mergeDrafts(normalized.config.exams);

    return normalized;
  }

  async isInitialized() {
    const row = await ExamTopicsConfig.findOne({
      where: { config_key: CONFIG_KEY },
    });
    return !!(row && row.is_initialized);
  }

  async upsertConfig(payload, userId) {
    const row = await ensureRow();
    const normalized = normalizeConfigRow(row);
    const oldConfig = normalized.config;
    const { config } = payload || {};

    if (config !== undefined && typeof config === "object" && config !== null) {
      const migrated = migrateLegacyConfig(config);

      const newConfig = {
        learningSets: (migrated.learningSets || []).map((set) => {
          const enriched = enrichSetDefaults(
            set,
            oldConfig.learningSets?.find((s) => String(s.id) === String(set.id)),
            userId
          );
          if (Array.isArray(enriched.questions)) {
            enriched.questions = enriched.questions.map((q) => ({
              ...q,
              type: q.type || "multiple_choice",
              explanation: typeof q?.explanation === "string" ? q.explanation : "",
              correctOptionIds: Array.isArray(q.correctOptionIds)
                ? q.correctOptionIds
                : q.correctOptionId ? [q.correctOptionId] : [],
            }));
          }
          return enriched;
        }),
        exams: (migrated.exams || []).map((set) => {
          const enriched = enrichSetDefaults(
            set,
            oldConfig.exams?.find((s) => String(s.id) === String(set.id)),
            userId
          );
          if (Array.isArray(enriched.questions)) {
            enriched.questions = enriched.questions.map((q) => ({
              ...q,
              type: q.type || "multiple_choice",
              explanation: typeof q?.explanation === "string" ? q.explanation : "",
              correctOptionIds: Array.isArray(q.correctOptionIds)
                ? q.correctOptionIds
                : q.correctOptionId ? [q.correctOptionId] : [],
            }));
          }
          return enriched;
        }),
      };

      return await saveConfigRow(row.id, newConfig, true);
    }

    return await saveConfigRow(row.id, row.config, true);
  }

  async publishSet(type, setId, userId) {
    const key = getSetArrayKey(type);
    if (!key) throw new AppError("Invalid set type", 400);

    const row = await ensureRow();
    const normalized = normalizeConfigRow(row);
    const sets = normalized.config[key] || [];
    const idx = sets.findIndex((s) => s && String(s.id) === String(setId));
    if (idx < 0) throw new AppError("Set not found", 404);

    const set = sets[idx];
    if (set.status === "published" && set.content_approval_status === "approved" && !set.draft_data) {
      throw new AppError("Set is already published and approved with no pending changes", 400);
    }

    const updated = {
      ...set,
      status: "published",
      published_at: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (set.content_approval_status === "approved" && set.draft_data) {
      updated.content_approval_status = "approved";
    } else {
      updated.content_approval_status = set.content_approval_status === "approved" ? "approved" : "pending";
    }
    if (!updated.created_by && userId) updated.created_by = userId;

    normalized.config[key][idx] = updated;
    const savedRow = await saveConfigRow(row.id, normalized.config, true);
    return { set: updated, config: savedRow.config };
  }

  async setContentApproval(type, setId, status, userId, rejection_reason = null) {
    if (!["approved", "rejected"].includes(status)) {
      throw new AppError("status must be approved or rejected", 400);
    }

    const key = getSetArrayKey(type);
    if (!key) throw new AppError("Invalid set type", 400);

    const row = await ensureRow();
    const normalized = normalizeConfigRow(row);
    const sets = normalized.config[key] || [];
    const idx = sets.findIndex((s) => s && String(s.id) === String(setId));
    if (idx < 0) throw new AppError("Set not found", 404);

    const set = sets[idx];
    if (set.status !== "published") {
      throw new AppError("Only published sets can be approved or rejected", 400);
    }

    const updated = {
      ...set,
      updatedAt: new Date().toISOString(),
    };

    if (status === "approved") {
      if (updated.draft_data) {
        Object.assign(updated, updated.draft_data);
        updated.draft_data = null;
      }
      updated.content_approval_status = "approved";
      updated.content_approved_at = new Date().toISOString();
      updated.content_rejected_at = null;
      updated.rejection_reason = null;
      updated.rejected_at = null;
    } else {
      const reason = rejection_reason || "No reason provided";
      const now = new Date().toISOString();
      updated.content_rejected_at = now;
      updated.rejection_reason = reason;
      updated.rejected_at = now;
      updated.draft_data = null; 
      if (updated.content_approval_status !== "approved") {
        updated.content_approval_status = "rejected";
      }
    }

    normalized.config[key][idx] = updated;
    const savedRow = await saveConfigRow(row.id, normalized.config, true);
    return { set: updated, config: savedRow.config };
  }

  async getPendingSets(options = {}) {
    const row = await ensureRow();
    const normalized = normalizeConfigRow(row);
    return flattenPendingSets(normalized.config, options);
  }

  async getSetForReview(type, setId) {
    const key = getSetArrayKey(type);
    if (!key) throw new AppError("Invalid set type", 400);

    const row = await ensureRow();
    const normalized = normalizeConfigRow(row);
    let set = (normalized.config[key] || []).find(
      (s) => s && String(s.id) === String(setId)
    );
    if (!set) throw new AppError("Set not found", 404);

    if (set.draft_data) {
      set = { ...set, ...set.draft_data };
    }

    return { type, set };
  }

  async verifyAnswer({ section = "learning", setId, questionId, optionId, optionIds, answerText }) {
    const row = await ensureRow();
    const normalized = normalizeConfigRow(row);

    let question = findQuestionInConfig(
      normalized.config,
      section === "exam" ? "exam" : "learning",
      setId,
      questionId
    );

    if (!question) throw new AppError("Question not found", 404);

    const qType = question.type || "multiple_choice";
    let correct = false;

    if (qType === "fill_in_blank") {
      const userText = String(answerText || optionId || "").trim().toLowerCase();
      const validAnswers = (question.options || []).map((o) => String(o.text || "").trim().toLowerCase());
      correct = validAnswers.length > 0 && validAnswers.includes(userText);
    } else if (Array.isArray(question.correctOptionIds) && question.correctOptionIds.length > 1) {
      const submitted = Array.isArray(optionIds)
        ? optionIds.map(String).sort()
        : [String(optionId)].filter(Boolean);
      const target = question.correctOptionIds.map(String).sort();
      correct =
        submitted.length === target.length &&
        submitted.every((val, index) => val === target[index]);
    } else {
      const targetId = question.correctOptionId || (Array.isArray(question.correctOptionIds) ? question.correctOptionIds[0] : null);
      correct = String(targetId) === String(optionId);
    }

    let explanation = (question.explanation || "").trim();
    if (!explanation) {
      if (qType === "fill_in_blank") {
        const expected = (question.options || []).map((o) => o.text).filter(Boolean).join(", ");
        explanation = `The correct answer is: "${expected || "N/A"}".`;
      } else {
        const correctIds = Array.isArray(question.correctOptionIds) && question.correctOptionIds.length
          ? question.correctOptionIds
          : [question.correctOptionId].filter(Boolean);
        const correctTexts = (question.options || [])
          .filter((o) => correctIds.includes(String(o.id)))
          .map((o) => o.text)
          .filter(Boolean);
        if (correctTexts.length > 0) {
          explanation = `Correct answer: ${correctTexts.join(", ")}.`;
        } else {
          explanation = "No detailed explanation provided for this question.";
        }
      }
    }

    return { correct, explanation };
  }

  bulkUploadQuestions(csvContentOrRows) {
    let rows = [];
    if (typeof csvContentOrRows === "string") {
      rows = parseCSV(csvContentOrRows);
    } else if (Array.isArray(csvContentOrRows)) {
      rows = csvContentOrRows;
    } else if (csvContentOrRows && typeof csvContentOrRows === "object") {
      rows = csvContentOrRows.rows || csvContentOrRows.data || [];
    }

    const validatedQuestions = [];
    const errors = [];

    rows.forEach((row, index) => {
      const lineNum = index + 1;
      
      const normalized = {};
      if (row && typeof row === "object") {
        Object.keys(row).forEach((key) => {
          if (key) {
            normalized[key.trim().toLowerCase()] = row[key];
          }
        });
      }

      const questionText = String(
        normalized.question ||
        normalized["question text"] ||
        normalized.prompt ||
        normalized.q ||
        ""
      ).trim();

      if (!questionText) {
        errors.push(`Row ${lineNum}: Missing question text`);
        return;
      }

      let type = String(normalized.type || "multiple_choice").toLowerCase().trim();
      if (type.includes("true") || type.includes("tf")) type = "true_false";
      else if (type.includes("blank") || type.includes("fill")) type = "fill_in_blank";
      else type = "multiple_choice";

      const explanation = String(normalized.explanation || normalized.notes || normalized.hint || "").trim();
      const qId = `q_bulk_${Date.now()}_${index}_${Math.random().toString(36).slice(2, 6)}`;

      if (type === "true_false") {
        const correctVal = String(normalized["correct answer"] || normalized.correct || normalized.answer || "true").toLowerCase();
        const isFalse = correctVal.includes("false") || correctVal.includes("f");
        const correctOptionId = isFalse ? "tf_false" : "tf_true";
        validatedQuestions.push({
          id: qId,
          type: "true_false",
          question: questionText,
          options: [
            { id: "tf_true", text: "True" },
            { id: "tf_false", text: "False" },
          ],
          correctOptionId,
          correctOptionIds: [correctOptionId],
          explanation,
        });
      } else if (type === "fill_in_blank") {
        const correctVal = String(normalized["correct answer"] || normalized.correct || normalized.answer || normalized["option a"] || "").trim();
        const optId = `opt_${Date.now()}_0`;
        validatedQuestions.push({
          id: qId,
          type: "fill_in_blank",
          question: questionText,
          options: [{ id: optId, text: correctVal }],
          correctOptionId: optId,
          correctOptionIds: [optId],
          explanation,
        });
      } else {
        // Multiple Choice
        const optA = String(normalized["option a"] || normalized.option1 || normalized["option 1"] || "").trim();
        const optB = String(normalized["option b"] || normalized.option2 || normalized["option 2"] || "").trim();
        const optC = String(normalized["option c"] || normalized.option3 || normalized["option 3"] || "").trim();
        const optD = String(normalized["option d"] || normalized.option4 || normalized["option 4"] || "").trim();

        const rawOpts = [optA, optB, optC, optD].filter(Boolean);
        if (rawOpts.length < 2 && typeof normalized.options === "string") {
          normalized.options.split("|").forEach(o => rawOpts.push(o.trim()));
        }

        if (rawOpts.length < 2) {
          errors.push(`Row ${lineNum}: Multiple choice questions require at least 2 options`);
          return;
        }

        const options = rawOpts.map((text, i) => ({
          id: `opt_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 5)}`,
          text,
        }));

        const rawCorrect = String(normalized["correct answer"] || normalized.correct || normalized.answer || "a").toLowerCase().trim();
        const correctOptionIds = [];

        options.forEach((opt, i) => {
          const letter = String.fromCharCode(97 + i); // a, b, c, d
          const num = String(i + 1);
          if (
            rawCorrect === letter ||
            rawCorrect === `option ${letter}` ||
            rawCorrect.includes(letter) ||
            rawCorrect === num ||
            rawCorrect === opt.text.toLowerCase()
          ) {
            correctOptionIds.push(opt.id);
          }
        });

        if (!correctOptionIds.length) {
          correctOptionIds.push(options[0].id);
        }

        validatedQuestions.push({
          id: qId,
          type: "multiple_choice",
          question: questionText,
          options,
          correctOptionId: correctOptionIds[0],
          correctOptionIds,
          explanation,
        });
      }
    });

    return {
      questions: validatedQuestions,
      summary: {
        totalRows: rows.length,
        validQuestionsCount: validatedQuestions.length,
        errorsCount: errors.length,
      },
      errors,
    };
  }
}

function parseCSV(csvText) {
  if (!csvText || typeof csvText !== "string") return [];
  
  const rows = [];
  let curCell = "";
  let curRow = [];
  let inQuotes = false;
  
  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        curCell += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      curRow.push(curCell.trim());
      curCell = "";
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') i++;
      curRow.push(curCell.trim());
      if (curRow.some(cell => cell.length > 0)) {
        rows.push(curRow);
      }
      curRow = [];
      curCell = "";
    } else {
      curCell += char;
    }
  }
  if (curCell || curRow.length > 0) {
    curRow.push(curCell.trim());
    if (curRow.some(cell => cell.length > 0)) {
      rows.push(curRow);
    }
  }

  if (rows.length < 2) return [];

  const rawHeaders = rows[0];
  const headers = rawHeaders.map((h) => h.toLowerCase().replace(/^["']|["']$/g, "").trim());
  const resultObjects = [];

  for (let i = 1; i < rows.length; i++) {
    const values = rows[i];
    const rowObj = {};
    headers.forEach((h, idx) => {
      rowObj[h] = values[idx] !== undefined ? values[idx] : "";
    });
    resultObjects.push(rowObj);
  }

  return resultObjects;
}

module.exports = new ExamTopicsConfigService();
