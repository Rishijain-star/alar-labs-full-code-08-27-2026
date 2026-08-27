/** Helpers for Exam Topics admin + student flows */

import { stripHtmlToPlain } from "@/lib/stripHtml";

export function newQuestionId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `q_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function newOptionId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `o_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function newSetId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `set_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function createEmptyQuestion(type = "multiple_choice") {
  if (type === "true_false") {
    const optTrue = { id: "tf_true", text: "True" };
    const optFalse = { id: "tf_false", text: "False" };
    return {
      id: newQuestionId(),
      type: "true_false",
      question: "",
      options: [optTrue, optFalse],
      correctOptionId: optTrue.id,
      correctOptionIds: [optTrue.id],
      explanation: "",
    };
  }

  if (type === "fill_in_blank") {
    const optBlank = { id: newOptionId(), text: "" };
    return {
      id: newQuestionId(),
      type: "fill_in_blank",
      question: "",
      options: [optBlank],
      correctOptionId: optBlank.id,
      correctOptionIds: [optBlank.id],
      explanation: "",
    };
  }

  // Default: Multiple Choice
  const optA = { id: newOptionId(), text: "" };
  const optB = { id: newOptionId(), text: "" };
  return {
    id: newQuestionId(),
    type: "multiple_choice",
    question: "",
    options: [optA, optB],
    correctOptionId: optA.id,
    correctOptionIds: [optA.id],
    explanation: "",
  };
}

export function createEmptyLearningSet() {
  return {
    id: newSetId(),
    title: "",
    description: "",
    is_free: true,
    price: 0,
    currency: "INR",
    certificate_id: "",
    certificate_title: "",
    questions: [],
    updatedAt: new Date().toISOString(),
    status: "draft",
    content_approval_status: null,
  };
}

export function createEmptyExamSet() {
  return {
    id: newSetId(),
    title: "",
    description: "",
    timeLimitMinutes: 50,
    passingPercentage: 70,
    is_free: true,
    price: 0,
    currency: "INR",
    certificate_id: "",
    certificate_title: "",
    questions: [],
    updatedAt: new Date().toISOString(),
    status: "draft",
    content_approval_status: null,
  };
}

/** Migrate legacy single learning/exam shape to sets arrays */
export function normalizeExamTopicsConfig(raw) {
  const base = raw && typeof raw === "object" ? raw : {};
  let learningSets = Array.isArray(base.learningSets) ? [...base.learningSets] : [];
  let exams = Array.isArray(base.exams) ? [...base.exams] : [];

  const legacyLearning = base.learning?.questions;
  if (!learningSets.length && Array.isArray(legacyLearning) && legacyLearning.length) {
    learningSets = [
      {
        id: newSetId(),
        title: base.learning?.title || "Learning Set",
        questions: legacyLearning,
        updatedAt: new Date().toISOString(),
      },
    ];
  }

  const legacyExam = base.exam;
  if (!exams.length && Array.isArray(legacyExam?.questions) && legacyExam.questions.length) {
    exams = [
      {
        id: newSetId(),
        title: legacyExam.title || "Exam",
        timeLimitMinutes: Number(legacyExam.timeLimitMinutes) > 0 ? Number(legacyExam.timeLimitMinutes) : 50,
        questions: legacyExam.questions,
        updatedAt: new Date().toISOString(),
      },
    ];
  }

  const normalizeQuestion = (q) => {
    if (!q || typeof q !== "object") return createEmptyQuestion();
    const type = q.type || "multiple_choice";
    const correctOptionIds = Array.isArray(q.correctOptionIds)
      ? q.correctOptionIds
      : q.correctOptionId
      ? [q.correctOptionId]
      : [];
    const correctOptionId = q.correctOptionId || correctOptionIds[0] || "";
    return {
      id: q.id || newQuestionId(),
      type,
      question: q.question || "",
      options: Array.isArray(q.options) ? q.options : [],
      correctOptionId,
      correctOptionIds,
      explanation: q.explanation || "",
    };
  };

  return {
    learningSets: learningSets.map((s) => ({
      id: s.id || newSetId(),
      title: s.title || "",
      description: s.description || "",
      is_free: s.is_free ?? (s.price !== undefined ? Number(s.price) === 0 : true),
      price: Number(s.price) || 0,
      currency: s.currency || "INR",
      certificate_id: s.certificate_id || "",
      certificate_title: s.certificate_title || "",
      questions: Array.isArray(s.questions) ? s.questions.map(normalizeQuestion) : [],
      status: s.status || "draft",
      content_approval_status: s.content_approval_status ?? null,
      created_by: s.created_by || null,
      createdAt: s.createdAt || s.created_at || null,
      updatedAt: s.updatedAt || s.updated_at || new Date().toISOString(),
    })),
    exams: exams.map((s) => ({
      id: s.id || newSetId(),
      title: s.title || "",
      description: s.description || "",
      timeLimitMinutes: Number(s.timeLimitMinutes) > 0 ? Number(s.timeLimitMinutes) : 50,
      passingPercentage: Number(s.passingPercentage) >= 0 && Number(s.passingPercentage) <= 100 ? Number(s.passingPercentage) : 70,
      is_free: s.is_free ?? (s.price !== undefined ? Number(s.price) === 0 : true),
      price: Number(s.price) || 0,
      currency: s.currency || "INR",
      certificate_id: s.certificate_id || "",
      certificate_title: s.certificate_title || "",
      questions: Array.isArray(s.questions) ? s.questions.map(normalizeQuestion) : [],
      status: s.status || "draft",
      content_approval_status: s.content_approval_status ?? null,
      created_by: s.created_by || null,
      createdAt: s.createdAt || s.created_at || null,
      updatedAt: s.updatedAt || s.updated_at || new Date().toISOString(),
    })),
  };
}

export function getExamTopicSetStatusLabel(set) {
  if (!set || set.status !== "published") return "Draft";
  if (set.content_approval_status === "approved") return "Approved";
  if (set.content_approval_status === "rejected") return "Rejected";
  return "Pending approval";
}

export function getExamTopicSetStatusVariant(set) {
  if (!set || set.status !== "published") return "secondary";
  if (set.content_approval_status === "approved") return "default";
  if (set.content_approval_status === "rejected") return "destructive";
  return "outline";
}

export function collectQuestionValidationErrors(q, qIndex) {
  const errors = [];
  const qId = q?.id || `idx-${qIndex}`;
  const qType = q?.type || "multiple_choice";

  if (!String(q?.question || "").trim()) {
    errors.push({ fieldId: `question-${qId}`, message: "Please fill in this field." });
  }

  const options = Array.isArray(q?.options) ? q.options : [];

  if (qType === "fill_in_blank") {
    if (!options.length || !String(options[0]?.text || "").trim()) {
      errors.push({ fieldId: `correct-${qId}`, message: "Please enter the correct answer." });
    }
  } else if (qType === "true_false") {
    const correctOpt = options.find((o) => o.id === q?.correctOptionId);
    if (!q?.correctOptionId || !correctOpt) {
      errors.push({ fieldId: `correct-${qId}`, message: "Please select True or False." });
    }
  } else {
    // Multiple Choice
    if (options.length < 2) {
      errors.push({ fieldId: `options-${qId}`, message: "Please add at least two options." });
    }

    options.forEach((opt) => {
      if (!String(opt?.text || "").trim()) {
        errors.push({
          fieldId: `option-${qId}-${opt.id}`,
          message: "Please fill in this field.",
        });
      }
    });

    const filled = options.filter((o) => String(o?.text || "").trim());
    if (options.length >= 2 && filled.length < 2) {
      errors.push({ fieldId: `options-${qId}`, message: "Please add at least two options." });
    }

    const multiCorrect = Array.isArray(q?.correctOptionIds) && q.correctOptionIds.length > 0;
    const singleCorrect = !!q?.correctOptionId;

    if (!singleCorrect && !multiCorrect) {
      errors.push({ fieldId: `correct-${qId}`, message: "Please select at least one correct answer." });
    }
  }

  return errors;
}

export function collectLearningSetValidationErrors(set) {
  const errors = [];

  if (!String(set?.title || "").trim()) {
    errors.push({ fieldId: "title", message: "Please fill in this field." });
  }
  if (!stripHtmlToPlain(set?.description || "").trim()) {
    errors.push({ fieldId: "description", message: "Please fill in this field." });
  }
  if (set?.is_free === false && (Number(set?.price) <= 0 || !set?.price)) {
    errors.push({ fieldId: "price", message: "Please specify a valid price for paid set." });
  }

  const questions = set?.questions || [];
  if (!questions.length) {
    errors.push({ fieldId: "questions-empty", message: "Please add at least one question." });
  }

  questions.forEach((q, i) => {
    errors.push(...collectQuestionValidationErrors(q, i));
  });

  return errors;
}

export function collectExamSetValidationErrors(exam) {
  const errors = [];

  if (!String(exam?.title || "").trim()) {
    errors.push({ fieldId: "title", message: "Please fill in this field." });
  }
  if (!stripHtmlToPlain(exam?.description || "").trim()) {
    errors.push({ fieldId: "description", message: "Please fill in this field." });
  }
  if (exam?.is_free === false && (Number(exam?.price) <= 0 || !exam?.price)) {
    errors.push({ fieldId: "price", message: "Please specify a valid price for paid exam." });
  }

  const mins = Number(exam?.timeLimitMinutes);
  if (!Number.isFinite(mins) || mins < 1) {
    errors.push({ fieldId: "timeLimitMinutes", message: "Please fill in this field." });
  }

  const passPct = Number(exam?.passingPercentage);
  if (!Number.isFinite(passPct) || passPct < 0 || passPct > 100) {
    errors.push({ fieldId: "passingPercentage", message: "Enter a valid percentage between 0 and 100." });
  }

  const questions = exam?.questions || [];
  if (!questions.length) {
    errors.push({ fieldId: "questions-empty", message: "Please add at least one question." });
  }

  questions.forEach((q, i) => {
    errors.push(...collectQuestionValidationErrors(q, i));
  });

  return errors;
}

export function validationErrorsToMap(errors = []) {
  const map = {};
  errors.forEach((e) => {
    if (e?.fieldId && !map[e.fieldId]) {
      map[e.fieldId] = e.message;
    }
  });
  return map;
}

export function validateQuestion(q, index) {
  const errors = [];
  const label = `Question ${index + 1}`;
  if (!String(q?.question || "").trim()) {
    errors.push(`${label}: question text is required`);
  }
  const options = Array.isArray(q?.options) ? q.options : [];
  if (options.length < 2) {
    errors.push(`${label}: at least 2 options required`);
  }
  const filled = options.filter((o) => String(o?.text || "").trim());
  if (filled.length < 2) {
    errors.push(`${label}: at least 2 options must have text`);
  }
  if (!q?.correctOptionId || !options.some((o) => o.id === q.correctOptionId)) {
    errors.push(`${label}: select a correct answer`);
  }
  return errors;
}

export function validateLearningSet(set) {
  return collectLearningSetValidationErrors(set).map((e) => e.message);
}

export function validateExamSet(exam) {
  return collectExamSetValidationErrors(exam).map((e) => e.message);
}

export function formatCountdown(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}
