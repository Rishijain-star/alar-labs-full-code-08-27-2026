import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Save, ExternalLink, BookOpen, GraduationCap, ArrowLeft, Tag, Award, DollarSign } from "lucide-react";
import QuestionEditor from "@/components/exam-topics/QuestionEditor";
import SavedSetsList from "@/components/exam-topics/SavedSetsList";
import QuillRichEditor from "@/components/editor/QuillRichEditor";
import CertificationPicker from "@/components/admin/CertificationPicker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ValidatableField,
  fieldInputClass,
  focusValidationField,
} from "@/components/exam-topics/ValidatableField";
import {
  useGetAdminExamTopicsConfigQuery,
  useUpsertExamTopicsConfigMutation,
  usePublishExamTopicsSetMutation,
} from "@/store/api/examTopicsApi";
import {
  canCreateExamTopics,
  canEditExamTopics,
  canDeleteExamTopics,
  canPublishExamTopics,
  canApproveExamTopics,
} from "@/lib/examTopicsPermissions";
import {
  normalizeExamTopicsConfig,
  collectLearningSetValidationErrors,
  collectExamSetValidationErrors,
  validationErrorsToMap,
  createEmptyLearningSet,
  createEmptyExamSet,
} from "@/lib/examTopicsConfig";
import { cn } from "@/lib/utils";
import AdminContentDates from "@/components/admin/AdminContentDates";
import { useAutoSave } from "@/hooks/useAutoSave";

function useFieldValidation() {
  const [fieldErrors, setFieldErrors] = useState({});
  const [shakeField, setShakeField] = useState(null);

  const clearError = useCallback((fieldId) => {
    setFieldErrors((prev) => {
      if (!prev[fieldId]) return prev;
      const next = { ...prev };
      delete next[fieldId];
      return next;
    });
  }, []);

  const resetValidation = useCallback(() => {
    setFieldErrors({});
    setShakeField(null);
  }, []);

  const applyValidation = useCallback((errors) => {
    if (!errors.length) return true;
    const map = validationErrorsToMap(errors);
    const first = errors[0];
    setFieldErrors(map);
    setShakeField(null);
    requestAnimationFrame(() => {
      setShakeField(first.fieldId);
      focusValidationField(first.fieldId);
    });
    return false;
  }, []);

  return { fieldErrors, shakeField, clearError, resetValidation, applyValidation };
}

import { isStudent, isAdmin, isSuperAdmin } from "@/lib/auth";

export function StudentExamTopicsView() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Exam Topics & Practice</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Access certification exam topic questions, learning sets, and practice exams.
          </p>
        </div>
        <Button asChild size="sm" className="gap-2">
          <Link to="/exam-topics">
            <GraduationCap className="h-4 w-4" />
            Browse Exam Topics
          </Link>
        </Button>
      </div>

      <Card>
        <CardContent className="py-12 flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4 text-primary">
            <BookOpen className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">Practice Certification Exam Topics</h3>
          <p className="text-sm text-muted-foreground max-w-md mt-1 mb-6">
            Prepare for certification exams with curated question sets, practice modes, and immediate answer feedback.
          </p>
          <Button asChild>
            <Link to="/exam-topics">Explore Exam Topics Catalog</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default function ExamTopicsAdmin() {
  const canCreate = canCreateExamTopics();
  const canEdit = canEditExamTopics();
  const canDelete = canDeleteExamTopics();
  const canPublish = canPublishExamTopics();
  const canApprove = canApproveExamTopics();
  const isStudentUser = isStudent() && !isAdmin() && !isSuperAdmin() && !isApprover();

  if (isStudentUser || (!canCreate && !canEdit && !canDelete && !canPublish && !canApprove)) {
    return <StudentExamTopicsView />;
  }

  return <AdminExamTopicsContent />;
}

function AdminExamTopicsContent() {
  const canCreate = canCreateExamTopics();
  const canEdit = canEditExamTopics();
  const canDelete = canDeleteExamTopics();
  const canPublish = canPublishExamTopics();
  const canApprove = canApproveExamTopics();
  const isStudentUser = isStudent() && !isAdmin() && !isSuperAdmin() && !isApprover();

  const { data, isLoading, isError, error, refetch } = useGetAdminExamTopicsConfigQuery(undefined, {
    skip: isStudentUser || (!canCreate && !canEdit && !canPublish && !canApprove),
  });
  const [upsert, { isLoading: saving }] = useUpsertExamTopicsConfigMutation();
  const [publishSet, { isLoading: publishing }] = usePublishExamTopicsSetMutation();

  const [config, setConfig] = useState(normalizeExamTopicsConfig({}));
  const [publishingId, setPublishingId] = useState(null);
  const [activeTab, setActiveTab] = useState("learning");
  const [view, setView] = useState("list");
  const [editingLearningId, setEditingLearningId] = useState(null);
  const [editingExamId, setEditingExamId] = useState(null);
  const [draftLearning, setDraftLearning] = useState(createEmptyLearningSet());
  const [draftExam, setDraftExam] = useState(createEmptyExamSet());

  const learningAutoSave = useAutoSave(
    view === "edit-learning" ? "exam_topic_learning" : null,
    editingLearningId || "new",
    draftLearning,
    (draft) => setDraftLearning(draft)
  );

  const examAutoSave = useAutoSave(
    view === "edit-exam" ? "exam_topic_exam" : null,
    editingExamId || "new",
    draftExam,
    (draft) => setDraftExam(draft)
  );

  const learningValidation = useFieldValidation();
  const examValidation = useFieldValidation();

  useEffect(() => {
    const payload = data?.data ?? data;
    if (!payload) return;
    let cfg = payload.config;
    if (typeof cfg === "string") {
      try {
        cfg = JSON.parse(cfg);
      } catch {
        cfg = {};
      }
    }
    setConfig(normalizeExamTopicsConfig(cfg));
  }, [data]);

  const persistConfig = async (nextConfig) => {
    const normalized = normalizeExamTopicsConfig(nextConfig);
    const result = await upsert({ config: normalized }).unwrap();
    const saved = result?.data ?? result;
    if (saved?.config) {
      setConfig(normalizeExamTopicsConfig(saved.config));
    } else {
      setConfig(normalized);
    }
    return normalized;
  };

  const openCreateLearning = () => {
    learningValidation.resetValidation();
    setDraftLearning(createEmptyLearningSet());
    setEditingLearningId(null);
    setView("edit-learning");
  };

  const openEditLearning = (id) => {
    learningValidation.resetValidation();
    const set = config.learningSets.find((s) => s.id === id);
    if (!set) return;
    setDraftLearning({
      ...set,
      description: set.description || "",
      questions: [...(set.questions || [])],
    });
    setEditingLearningId(id);
    setView("edit-learning");
  };

  const deleteLearning = async (id) => {
    const next = {
      ...config,
      learningSets: config.learningSets.filter((s) => s.id !== id),
    };
    try {
      await persistConfig(next);
    } catch {
      /* api toast */
    }
  };

  const saveLearning = async () => {
    const errors = collectLearningSetValidationErrors(draftLearning);
    if (!learningValidation.applyValidation(errors)) return;

    const existing = editingLearningId
      ? config.learningSets.find((s) => s.id === editingLearningId)
      : null;

    const entry = {
      ...draftLearning,
      status: existing?.status || draftLearning.status || "draft",
      content_approval_status:
        existing?.content_approval_status ?? draftLearning.content_approval_status ?? null,
      created_by: existing?.created_by || draftLearning.created_by || null,
      createdAt: existing?.createdAt || draftLearning.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const learningSets = editingLearningId
      ? config.learningSets.map((s) => (s.id === editingLearningId ? entry : s))
      : [...config.learningSets, entry];

    try {
      await persistConfig({ ...config, learningSets });
      await learningAutoSave.clearDraft();
      learningValidation.resetValidation();
      setView("list");
      setEditingLearningId(null);
    } catch {
      /* api toast */
    }
  };

  const openCreateExam = () => {
    examValidation.resetValidation();
    setDraftExam(createEmptyExamSet());
    setEditingExamId(null);
    setView("edit-exam");
  };

  const openEditExam = (id) => {
    examValidation.resetValidation();
    const set = config.exams.find((s) => s.id === id);
    if (!set) return;
    setDraftExam({
      ...set,
      description: set.description || "",
      questions: [...(set.questions || [])],
    });
    setEditingExamId(id);
    setView("edit-exam");
  };

  const deleteExam = async (id) => {
    const next = {
      ...config,
      exams: config.exams.filter((s) => s.id !== id),
    };
    try {
      await persistConfig(next);
    } catch {
      /* api toast */
    }
  };

  const saveExam = async () => {
    const errors = collectExamSetValidationErrors(draftExam);
    if (!examValidation.applyValidation(errors)) return;

    const existing = editingExamId ? config.exams.find((s) => s.id === editingExamId) : null;

    const entry = {
      ...draftExam,
      status: existing?.status || draftExam.status || "draft",
      content_approval_status:
        existing?.content_approval_status ?? draftExam.content_approval_status ?? null,
      created_by: existing?.created_by || draftExam.created_by || null,
      createdAt: existing?.createdAt || draftExam.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const exams = editingExamId
      ? config.exams.map((s) => (s.id === editingExamId ? entry : s))
      : [...config.exams, entry];

    try {
      await persistConfig({ ...config, exams });
      await examAutoSave.clearDraft();
      examValidation.resetValidation();
      setView("list");
      setEditingExamId(null);
    } catch {
      /* api toast */
    }
  };

  const publishLearningSet = async (setId) => {
    setPublishingId(setId);
    try {
      const result = await publishSet({ type: "learning", setId }).unwrap();
      const saved = result?.data ?? result;
      if (saved?.config) {
        setConfig(normalizeExamTopicsConfig(saved.config));
      } else {
        refetch();
      }
    } catch {
      /* api toast */
    } finally {
      setPublishingId(null);
    }
  };

  const publishExamSet = async (setId) => {
    setPublishingId(setId);
    try {
      const result = await publishSet({ type: "exam", setId }).unwrap();
      const saved = result?.data ?? result;
      if (saved?.config) {
        setConfig(normalizeExamTopicsConfig(saved.config));
      } else {
        refetch();
      }
    } catch {
      /* api toast */
    } finally {
      setPublishingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading Exam Topics…
      </div>
    );
  }

  if (isError) {
    const status = error?.status || error?.data?.status;
    const isDev = import.meta.env.DEV;
    let message = error?.data?.message || error?.message || "Could not load Exam Topics config.";
    if (status === 404) {
      message = isDev
        ? "Exam Topics API not found. Restart the local backend and ensure VITE_DEV_API_PROXY=http://localhost:3005 in .env, then restart the frontend dev server."
        : "Exam Topics API not found on the server. Deploy the latest backend, run database migrations (exam_topics_configs), sync permissions, then restart the API service.";
    } else if (status === 401 || status === 403) {
      message =
        status === 401
          ? "Session expired or not signed in. Log out and log in again."
          : "You do not have permission to view Exam Topics. Ask an admin to enable Exam Topics permissions for your role.";
    }
    return (
      <div className="text-center py-16 space-y-3 px-4">
        <p className="text-muted-foreground">{message}</p>
        <Button variant="outline" onClick={() => refetch()}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-8">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Exam Topics</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Create learning sets and exams. Publish submits each set for content approval before it goes live.
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link to="/exam-topics" target="_blank" rel="noreferrer">
            <ExternalLink className="w-4 h-4 mr-2" />
            Preview learner view
          </Link>
        </Button>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(tab) => {
          setActiveTab(tab);
          setView("list");
          learningValidation.resetValidation();
          examValidation.resetValidation();
        }}
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="learning" className="gap-2">
            <BookOpen className="w-4 h-4" /> Learning
          </TabsTrigger>
          <TabsTrigger value="exam" className="gap-2">
            <GraduationCap className="w-4 h-4" /> Exam
          </TabsTrigger>
        </TabsList>

        <TabsContent value="learning" className="mt-4 space-y-4">
          {view === "list" ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Saved learning sets</CardTitle>
                <CardDescription>
                  {config.learningSets.length} set{config.learningSets.length === 1 ? "" : "s"} saved
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SavedSetsList
                  type="learning"
                  items={config.learningSets}
                  canCreate={canCreate}
                  canEdit={canEdit}
                  canDelete={canDelete}
                  canPublish={canPublish}
                  publishingId={publishing ? publishingId : null}
                  onCreate={openCreateLearning}
                  onEdit={openEditLearning}
                  onDelete={deleteLearning}
                  onPublish={publishLearningSet}
                  emptyLabel="No learning sets yet. Click Create to add questions and save."
                />
              </CardContent>
            </Card>
          ) : (
            <>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="-ml-2"
                onClick={() => {
                  learningValidation.resetValidation();
                  setView("list");
                }}
              >
                <ArrowLeft className="w-4 h-4 mr-1" /> Back to list
              </Button>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    {editingLearningId ? "Edit learning set" : "New learning set"}
                  </CardTitle>
                  {editingLearningId && draftLearning.createdAt ? (
                    <AdminContentDates
                      createdAt={draftLearning.createdAt}
                      updatedAt={draftLearning.updatedAt}
                      className="mt-1"
                    />
                  ) : null}
                </CardHeader>
                <CardContent className="space-y-4">
                  <ValidatableField
                    fieldId="title"
                    error={learningValidation.fieldErrors.title}
                    shake={learningValidation.shakeField === "title"}
                  >
                    <div className="space-y-2">
                      <Label htmlFor="learning-title">Set title</Label>
                      <Input
                        id="learning-title"
                        value={draftLearning.title}
                        onChange={(e) => {
                          learningValidation.clearError("title");
                          setDraftLearning((d) => ({ ...d, title: e.target.value }));
                        }}
                        placeholder="e.g. AWS Fundamentals"
                        disabled={!(editingLearningId ? canEdit : canCreate)}
                        className={fieldInputClass(!!learningValidation.fieldErrors.title)}
                      />
                    </div>
                  </ValidatableField>

                  <ValidatableField
                    fieldId="description"
                    error={learningValidation.fieldErrors.description}
                    shake={learningValidation.shakeField === "description"}
                  >
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <p className="text-xs text-muted-foreground">
                        Brief overview of this learning set for students.
                      </p>
                      <div
                        className={cn(
                          "rounded-md border",
                          learningValidation.fieldErrors.description &&
                          "border-destructive ring-1 ring-destructive/30"
                        )}
                      >
                        <QuillRichEditor
                          editorKey={draftLearning.id || "new-learning"}
                          value={draftLearning.description || ""}
                          onChange={(html) => {
                            learningValidation.clearError("description");
                            setDraftLearning((d) => ({ ...d, description: html }));
                          }}
                          placeholder="Describe what students will learn…"
                          minHeight={140}
                          maxHeight={260}
                        />
                      </div>
                    </div>
                  </ValidatableField>
                  {/* Pricing & Certificate Options */}
                  <div className="grid sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
                    {/* Pricing Mode */}
                    <ValidatableField
                      fieldId="price"
                      error={learningValidation.fieldErrors.price}
                      shake={learningValidation.shakeField === "price"}
                    >
                      <div className="space-y-2">
                        <Label className="flex items-center gap-1.5 font-semibold">
                          <Tag className="w-4 h-4 text-emerald-600" /> Access &amp; Pricing
                        </Label>
                        <div className="flex items-center gap-2">
                          <Select
                            value={draftLearning.is_free ? "free" : "paid"}
                            onValueChange={(val) => {
                              learningValidation.clearError("price");
                              setDraftLearning((d) => ({
                                ...d,
                                is_free: val === "free",
                                price: val === "free" ? 0 : d.price || 499,
                              }));
                            }}
                            disabled={!(editingLearningId ? canEdit : canCreate)}
                          >
                            <SelectTrigger className="w-32 bg-white dark:bg-slate-950">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="free">Free</SelectItem>
                              <SelectItem value="paid">Paid</SelectItem>
                            </SelectContent>
                          </Select>

                          {!draftLearning.is_free && (
                            <div className="relative flex-1">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-semibold">₹</span>
                              <Input
                                type="number"
                                min={0}
                                placeholder="499"
                                value={draftLearning.price || ""}
                                onChange={(e) => {
                                  learningValidation.clearError("price");
                                  setDraftLearning((d) => ({ ...d, price: Number(e.target.value) || 0 }));
                                }}
                                disabled={!(editingLearningId ? canEdit : canCreate)}
                                className={cn("pl-7 bg-white dark:bg-slate-950", fieldInputClass(!!learningValidation.fieldErrors.price))}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </ValidatableField>

                    {/* Certificate Template Picker */}
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1.5 font-semibold">
                        <Award className="w-4 h-4 text-purple-600" /> Completion Certificate
                      </Label>
                      <CertificationPicker
                        value={draftLearning.certificate_id}
                        onChange={(id) => setDraftLearning((d) => ({ ...d, certificate_id: id || "" }))}
                        onSelectItem={(cert) => setDraftLearning((d) => ({ ...d, certificate_title: cert?.title || "" }))}
                        disabled={!(editingLearningId ? canEdit : canCreate)}
                        placeholder="Select Certificate Template (optional)"
                        className="bg-white dark:bg-slate-950"
                      />
                    </div>
                  </div>

                  <QuestionEditor
                    questions={draftLearning.questions}
                    onChange={(questions) => {
                      learningValidation.clearError("questions-empty");
                      setDraftLearning((d) => ({ ...d, questions }));
                    }}
                    disabled={!(editingLearningId ? canEdit : canCreate)}
                    fieldErrors={learningValidation.fieldErrors}
                    shakeField={learningValidation.shakeField}
                    onClearError={learningValidation.clearError}
                  />
                </CardContent>
              </Card>
              {(editingLearningId ? canEdit : canCreate) && (
                <div className="flex justify-between items-center mt-4">
                  <div className="flex items-center gap-3">
                    {learningAutoSave.saveStatus === "saving" && <span className="text-sm text-muted-foreground flex items-center"><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Saving...</span>}
                    {learningAutoSave.saveStatus === "saved" && <span className="text-sm text-green-600">Auto-saved</span>}
                    {learningAutoSave.saveStatus === "error" && <span className="text-sm text-destructive">Auto-save failed</span>}
                    <Button
                      type="button"
                      variant="ghost"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={async () => {
                        if (confirm("Are you sure you want to clear your saved draft? This action will remove your unsaved work.")) {
                          await learningAutoSave.clearDraft();
                          if (editingLearningId) openEditLearning(editingLearningId);
                          else openCreateLearning();
                        }
                      }}
                    >
                      Clear Data
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        learningValidation.resetValidation();
                        setView("list");
                      }}
                    >
                      Cancel
                    </Button>
                  <Button onClick={saveLearning} disabled={saving}>
                    {saving ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    Save learning set
                  </Button>
                </div>
              </div>
            )}
            </>
          )}
        </TabsContent>

        <TabsContent value="exam" className="mt-4 space-y-4">
          {view === "list" ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Saved exams</CardTitle>
                <CardDescription>
                  {config.exams.length} exam{config.exams.length === 1 ? "" : "s"} saved
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SavedSetsList
                  type="exam"
                  items={config.exams}
                  canCreate={canCreate}
                  canEdit={canEdit}
                  canDelete={canDelete}
                  canPublish={canPublish}
                  publishingId={publishing ? publishingId : null}
                  onCreate={openCreateExam}
                  onEdit={openEditExam}
                  onDelete={deleteExam}
                  onPublish={publishExamSet}
                  emptyLabel="No exams yet. Click Create to add questions and save."
                />
              </CardContent>
            </Card>
          ) : (
            <>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="-ml-2"
                onClick={() => {
                  examValidation.resetValidation();
                  setView("list");
                }}
              >
                <ArrowLeft className="w-4 h-4 mr-1" /> Back to list
              </Button>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    {editingExamId ? "Edit exam" : "New exam"}
                  </CardTitle>
                  {editingExamId && draftExam.createdAt ? (
                    <AdminContentDates
                      createdAt={draftExam.createdAt}
                      updatedAt={draftExam.updatedAt}
                      className="mt-1"
                    />
                  ) : null}
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid sm:grid-cols-3 gap-4">
                    <ValidatableField
                      fieldId="title"
                      error={examValidation.fieldErrors.title}
                      shake={examValidation.shakeField === "title"}
                    >
                      <div className="space-y-2">
                        <Label htmlFor="exam-title">Exam title</Label>
                        <Input
                          id="exam-title"
                          value={draftExam.title}
                          onChange={(e) => {
                            examValidation.clearError("title");
                            setDraftExam((d) => ({ ...d, title: e.target.value }));
                          }}
                          placeholder="e.g. AWS Solutions Architect Practice"
                          disabled={!(editingExamId ? canEdit : canCreate)}
                          className={fieldInputClass(!!examValidation.fieldErrors.title)}
                        />
                      </div>
                    </ValidatableField>
                    <ValidatableField
                      fieldId="timeLimitMinutes"
                      error={examValidation.fieldErrors.timeLimitMinutes}
                      shake={examValidation.shakeField === "timeLimitMinutes"}
                    >
                      <div className="space-y-2">
                        <Label htmlFor="exam-time">Time limit (minutes)</Label>
                        <Input
                          id="exam-time"
                          type="number"
                          min={1}
                          max={600}
                          value={draftExam.timeLimitMinutes}
                          onChange={(e) => {
                            examValidation.clearError("timeLimitMinutes");
                            setDraftExam((d) => ({
                              ...d,
                              timeLimitMinutes: Number(e.target.value) || 50,
                            }));
                          }}
                          disabled={!(editingExamId ? canEdit : canCreate)}
                          className={fieldInputClass(!!examValidation.fieldErrors.timeLimitMinutes)}
                        />
                      </div>
                    </ValidatableField>
                    <ValidatableField
                      fieldId="passingPercentage"
                      error={examValidation.fieldErrors.passingPercentage}
                      shake={examValidation.shakeField === "passingPercentage"}
                    >
                      <div className="space-y-2">
                        <Label htmlFor="exam-pass-pct">Passing Percentage (%)</Label>
                        <Input
                          id="exam-pass-pct"
                          type="number"
                          min={0}
                          max={100}
                          value={draftExam.passingPercentage ?? 70}
                          onChange={(e) => {
                            examValidation.clearError("passingPercentage");
                            setDraftExam((d) => ({
                              ...d,
                              passingPercentage: Number(e.target.value),
                            }));
                          }}
                          disabled={!(editingExamId ? canEdit : canCreate)}
                          className={fieldInputClass(!!examValidation.fieldErrors.passingPercentage)}
                        />
                      </div>
                    </ValidatableField>
                  </div>

                  <ValidatableField
                    fieldId="description"
                    error={examValidation.fieldErrors.description}
                    shake={examValidation.shakeField === "description"}
                  >
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <p className="text-xs text-muted-foreground">
                        Brief overview of this exam for students.
                      </p>
                      <div
                        className={cn(
                          "rounded-md border",
                          examValidation.fieldErrors.description &&
                          "border-destructive ring-1 ring-destructive/30"
                        )}
                      >
                        <QuillRichEditor
                          editorKey={draftExam.id || "new-exam"}
                          value={draftExam.description || ""}
                          onChange={(html) => {
                            examValidation.clearError("description");
                            setDraftExam((d) => ({ ...d, description: html }));
                          }}
                          placeholder="Describe this exam…"
                          minHeight={140}
                          maxHeight={260}
                        />
                      </div>
                    </div>
                  </ValidatableField>

                  {/* Pricing & Certificate Options */}
                  <div className="grid sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
                    {/* Pricing Mode */}
                    <ValidatableField
                      fieldId="price"
                      error={examValidation.fieldErrors.price}
                      shake={examValidation.shakeField === "price"}
                    >
                      <div className="space-y-2">
                        <Label className="flex items-center gap-1.5 font-semibold">
                          <Tag className="w-4 h-4 text-emerald-600" /> Access &amp; Pricing
                        </Label>
                        <div className="flex items-center gap-2">
                          <Select
                            value={draftExam.is_free ? "free" : "paid"}
                            onValueChange={(val) => {
                              examValidation.clearError("price");
                              setDraftExam((d) => ({
                                ...d,
                                is_free: val === "free",
                                price: val === "free" ? 0 : d.price || 499,
                              }));
                            }}
                            disabled={!(editingExamId ? canEdit : canCreate)}
                          >
                            <SelectTrigger className="w-32 bg-white dark:bg-slate-950">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="free">Free</SelectItem>
                              <SelectItem value="paid">Paid</SelectItem>
                            </SelectContent>
                          </Select>

                          {!draftExam.is_free && (
                            <div className="relative flex-1">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-semibold">₹</span>
                              <Input
                                type="number"
                                min={0}
                                placeholder="499"
                                value={draftExam.price || ""}
                                onChange={(e) => {
                                  examValidation.clearError("price");
                                  setDraftExam((d) => ({ ...d, price: Number(e.target.value) || 0 }));
                                }}
                                disabled={!(editingExamId ? canEdit : canCreate)}
                                className={cn("pl-7 bg-white dark:bg-slate-950", fieldInputClass(!!examValidation.fieldErrors.price))}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </ValidatableField>

                    {/* Certificate Template Picker */}
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1.5 font-semibold">
                        <Award className="w-4 h-4 text-purple-600" /> Completion Certificate
                      </Label>
                      <CertificationPicker
                        value={draftExam.certificate_id}
                        onChange={(id) => setDraftExam((d) => ({ ...d, certificate_id: id || "" }))}
                        onSelectItem={(cert) => setDraftExam((d) => ({ ...d, certificate_title: cert?.title || "" }))}
                        disabled={!(editingExamId ? canEdit : canCreate)}
                        placeholder="Select Certificate Template (optional)"
                        className="bg-white dark:bg-slate-950"
                      />
                    </div>
                  </div>

                  <QuestionEditor
                    questions={draftExam.questions}
                    onChange={(questions) => {
                      examValidation.clearError("questions-empty");
                      setDraftExam((d) => ({ ...d, questions }));
                    }}
                    disabled={!(editingExamId ? canEdit : canCreate)}
                    fieldErrors={examValidation.fieldErrors}
                    shakeField={examValidation.shakeField}
                    onClearError={examValidation.clearError}
                  />
                </CardContent>
              </Card>
              {(editingExamId ? canEdit : canCreate) && (
                <div className="flex justify-between items-center mt-4">
                  <div className="flex items-center gap-3">
                    {examAutoSave.saveStatus === "saving" && <span className="text-sm text-muted-foreground flex items-center"><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Saving...</span>}
                    {examAutoSave.saveStatus === "saved" && <span className="text-sm text-green-600">Auto-saved</span>}
                    {examAutoSave.saveStatus === "error" && <span className="text-sm text-destructive">Auto-save failed</span>}
                    <Button
                      type="button"
                      variant="ghost"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={async () => {
                        if (confirm("Are you sure you want to clear your saved draft? This action will remove your unsaved work.")) {
                          await examAutoSave.clearDraft();
                          if (editingExamId) openEditExam(editingExamId);
                          else openCreateExam();
                        }
                      }}
                    >
                      Clear Data
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        examValidation.resetValidation();
                        setView("list");
                      }}
                    >
                      Cancel
                    </Button>
                  <Button onClick={saveExam} disabled={saving}>
                    {saving ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    Save exam
                  </Button>
                </div>
              </div>
            )}
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
