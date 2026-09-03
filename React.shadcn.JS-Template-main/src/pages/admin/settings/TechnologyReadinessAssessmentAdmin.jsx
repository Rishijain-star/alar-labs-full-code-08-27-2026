import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Plus,
  Trash2,
  Save,
  Sparkles,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  CheckCircle2,
} from "lucide-react";
import {
  useGetAdminAssessmentConfigQuery,
  useUpsertAssessmentConfigMutation,
} from "@/store/api/assessmentApi";
import { permissionStore } from "@/utils/permissions";
import {
  validateAssessmentConfig,
  suggestOutcomeForSpecialization,
  normalizeAssessmentConfigForSave,
  toCommaList,
  step3FieldDisplay,
  listFieldDisplay,
} from "@/lib/assessmentConfig";
import CertificationMultiPicker from "@/components/admin/CertificationMultiPicker";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

const STARTER_CONFIG = {
  primaryInterests: [
    { id: "database-admin", label: "Database Administration", icon: "Database" },
    { id: "cloud-devops", label: "Cloud & DevOps", icon: "Cloud" },
    { id: "programming", label: "Programming & Software", icon: "Code" },
  ],
  specializationsByPath: {
    "database-admin": [
      {
        id: "mysql",
        label: "MySQL",
        step3Options: [
          { id: "mysql-admin", label: "MySQL Admin" },
          { id: "mysql-prog", label: "MySQL Programming" },
        ],
      },
      {
        id: "sql",
        label: "SQL",
        step3Options: [
          { id: "sql-tuning", label: "SQL Performance Tuning" },
          { id: "sql-reporting", label: "SQL Reporting" },
        ],
      },
      {
        id: "oracle",
        label: "Oracle",
        step3Options: [
          { id: "oracle-dba", label: "Oracle DBA" },
          { id: "oracle-dev", label: "Oracle PL/SQL" },
        ],
      },
    ],
    "cloud-devops": [
      {
        id: "aws-devops",
        label: "AWS DevOps",
        step3Options: [
          { id: "aws", label: "AWS" },
          { id: "multi", label: "Multi-Cloud" },
        ],
      },
      {
        id: "kubernetes",
        label: "Kubernetes",
        step3Options: [
          { id: "eks", label: "Amazon EKS" },
          { id: "aks", label: "Azure AKS" },
        ],
      },
    ],
    programming: [
      {
        id: "web-dev",
        label: "Full Stack Web",
        step3Options: [
          { id: "react", label: "React focus" },
          { id: "node", label: "Node.js focus" },
        ],
      },
    ],
  },
  outcomesBySpecialization: {
    default: {
      careerTitle: "IT Professional",
      skills: ["Linux", "Git"],
      tools: ["VS Code"],
      certificationTitles: [],
    },
  },
};

const SETUP_TABS = [
  { id: "start", label: "1. Start" },
  { id: "topics", label: "2. Setup quiz" },
  { id: "finish", label: "3. Publish" },
];

import { isStudent, isAdmin, isSuperAdmin } from "@/lib/auth";

export function StudentTRAView() {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Technology Readiness Assessment</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Evaluate your skill level, identify learning gaps, and receive personalized course recommendations.
          </p>
        </div>
        <Button asChild size="sm" className="gap-2">
          <Link to="/assessment">
            <Sparkles className="h-4 w-4 text-amber-400" />
            Take Readiness Quiz
          </Link>
        </Button>
      </div>

      <Card>
        <CardContent className="py-12 flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4 text-primary">
            <Sparkles className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">Personalized Career & Skill Readiness</h3>
          <p className="text-sm text-muted-foreground max-w-md mt-1 mb-6">
            Complete the 3-step interactive assessment to generate a customized tech readiness report and recommended learning tracks.
          </p>
          <Button asChild size="lg">
            <Link to="/assessment">Start Assessment Now</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default function TechnologyReadinessAssessmentAdmin() {
  const canEdit =
    permissionStore.hasPermission("manage_programs") ||
    permissionStore.hasPermission("edit_programs") ||
    permissionStore.hasPermission("create_programs");

  const isStudentUser = isStudent() && !isAdmin() && !isSuperAdmin();

  if (isStudentUser || !canEdit) {
    return <StudentTRAView />;
  }

  return <AdminTRAContent />;
}

function AdminTRAContent() {
  const canEdit =
    permissionStore.hasPermission("manage_programs") ||
    permissionStore.hasPermission("edit_programs") ||
    permissionStore.hasPermission("create_programs");

  const isStudentUser = isStudent() && !isAdmin() && !isSuperAdmin();

  const { data, isLoading, isError, refetch } = useGetAdminAssessmentConfigQuery(undefined, {
    skip: isStudentUser || !canEdit,
  });
  const [upsert, { isLoading: saving }] = useUpsertAssessmentConfigMutation();

  const [config, setConfig] = useState({
    primaryInterests: [],
    specializationsByPath: {},
    cloudOptions: [],
    outcomesBySpecialization: {},
  });
  const [isPublished, setIsPublished] = useState(false);
  const [activeTab, setActiveTab] = useState("start");
  const [openInterestId, setOpenInterestId] = useState(null);

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
    cfg = cfg || {};
    setConfig({
      primaryInterests: cfg.primaryInterests || [],
      specializationsByPath: cfg.specializationsByPath || {},
      cloudOptions: cfg.cloudOptions || [],
      outcomesBySpecialization: cfg.outcomesBySpecialization || {},
    });
    setIsPublished(payload.isPublished);
  }, [data]);

  const validation = useMemo(
    () => validateAssessmentConfig(normalizeAssessmentConfigForSave(config)),
    [config],
  );
  const readyToPublish = validation.valid;

  const handleSave = async () => {
    if (!canEdit) return;
    const payload = normalizeAssessmentConfigForSave(config);
    await upsert({ config: payload, is_published: isPublished }).unwrap();
    setConfig(payload);
    refetch();
  };

  const loadStarter = () => {
    if (!canEdit) return;
    setConfig(JSON.parse(JSON.stringify(STARTER_CONFIG)));
    setActiveTab("topics");
  };

  const addInterest = () => {
    const id = `interest-${Date.now()}`;
    setConfig({
      ...config,
      primaryInterests: [
        ...(config.primaryInterests || []),
        { id, label: "", icon: "HelpCircle" },
      ],
      specializationsByPath: {
        ...config.specializationsByPath,
        [id]: [],
      },
    });
    setOpenInterestId(id);
  };

  const updateInterestLabel = (index, label) => {
    const next = [...(config.primaryInterests || [])];
    next[index] = { ...next[index], label };
    setConfig({ ...config, primaryInterests: next });
  };

  const removeInterest = (index) => {
    const interest = config.primaryInterests[index];
    const next = [...config.primaryInterests];
    next.splice(index, 1);
    const byPath = { ...config.specializationsByPath };
    if (interest?.id) delete byPath[interest.id];
    setConfig({ ...config, primaryInterests: next, specializationsByPath: byPath });
  };

  const addTrack = (interestId) => {
    const specId = `spec-${Date.now()}`;
    const byPath = { ...config.specializationsByPath };
    byPath[interestId] = [
      ...(byPath[interestId] || []),
      { id: specId, label: "", step3Options: [], skills: "", tools: "", certificationIds: [] },
    ];
    setConfig({ ...config, specializationsByPath: byPath });
  };

  const updateTrackField = (interestId, index, patch) => {
    const byPath = { ...config.specializationsByPath };
    const specs = [...(byPath[interestId] || [])];
    specs[index] = { ...specs[index], ...patch };
    byPath[interestId] = specs;
    setConfig({ ...config, specializationsByPath: byPath });
  };

  const updateTrackLabel = (interestId, index, label) => {
    updateTrackField(interestId, index, { label });
  };

  const applyTrackSuggestions = (interestId, index) => {
    const spec = config.specializationsByPath?.[interestId]?.[index];
    if (!spec) return;
    const suggested = suggestOutcomeForSpecialization(spec.label || "", "");
    updateTrackField(interestId, index, {
      skills: toCommaList(suggested.skills),
      tools: toCommaList(suggested.tools),
    });
  };

  const removeTrack = (interestId, index) => {
    const byPath = { ...config.specializationsByPath };
    const specs = [...(byPath[interestId] || [])];
    specs.splice(index, 1);
    byPath[interestId] = specs;
    setConfig({ ...config, specializationsByPath: byPath });
  };

  const setStep3FromComma = (interestId, specIndex, text) => {
    updateTrackField(interestId, specIndex, { step3Text: text });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="mr-2 h-8 w-8 animate-spin" /> Loading…
      </div>
    );
  }

  if (isError) {
    return (
      <p className="text-sm text-destructive">
        Could not load the assessment. Check permissions and that the API is running.
      </p>
    );
  }

  const interests = config.primaryInterests || [];

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-20">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Technology Readiness Assessment</h2>
          <p className="mt-1 text-sm text-muted-foreground max-w-xl">
            Learners pick <strong>Topic → Specialization → Focus</strong> (3 linked steps).
            Step 3 options are set <strong>per track</strong> below.
          </p>
        </div>
        <Button variant="outline" size="sm" asChild className="shrink-0">
          <Link to="/assessment" target="_blank" rel="noopener noreferrer">
            <ExternalLink className="mr-2 h-4 w-4" />
            Preview learner view
          </Link>
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid h-auto w-full grid-cols-3 gap-1">
          {SETUP_TABS.map((tab) => (
            <TabsTrigger key={tab.id} value={tab.id} className="text-xs sm:text-sm">
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Step 1 — Start */}
        <TabsContent value="start" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">How it works</CardTitle>
              <CardDescription>
                You only configure what learners see. Matching courses &amp; labs is automatic.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex gap-3 rounded-lg border bg-muted/30 p-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">1</span>
                <div>
                  <p className="font-medium">Topic (interest)</p>
                  <p className="text-muted-foreground">e.g. Database Administration, Cloud &amp; DevOps.</p>
                </div>
              </div>
              <div className="flex gap-3 rounded-lg border bg-muted/30 p-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">2</span>
                <div>
                  <p className="font-medium">Specialization</p>
                  <p className="text-muted-foreground">Shown only for the topic chosen in step 1 (e.g. MySQL, SQL, Oracle).</p>
                </div>
              </div>
              <div className="flex gap-3 rounded-lg border bg-muted/30 p-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">3</span>
                <div>
                  <p className="font-medium">Focus options</p>
                  <p className="text-muted-foreground">Shown only for the specialization chosen in step 2 (e.g. MySQL Admin, MySQL Programming).</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {interests.length === 0 && canEdit && (
            <Card className="border-dashed border-primary/40 bg-primary/5">
              <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
                <Sparkles className="h-8 w-8 text-primary" />
                <div>
                  <p className="font-medium">Start with sample content</p>
                  <p className="text-sm text-muted-foreground">
                    Loads a Database example: Topic → MySQL/SQL/Oracle → focus options per track.
                  </p>
                </div>
                <Button onClick={loadStarter}>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Load sample setup
                </Button>
              </CardContent>
            </Card>
          )}

          <div className="flex justify-end">
            <Button onClick={() => setActiveTab("topics")}>
              {interests.length === 0 ? "Set up manually" : "Continue to topics"}
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </TabsContent>

        {/* Step 2 — Career topics */}
        <TabsContent value="topics" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-base">Career topics &amp; tracks</CardTitle>
                  <CardDescription>
                    Step 1 = topic. Step 2 = specialization under topic. Step 3 = focus options under each track.
                  </CardDescription>
                </div>
                {canEdit && (
                  <Button type="button" size="sm" onClick={addInterest}>
                    <Plus className="mr-1 h-4 w-4" /> Add topic
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {interests.length === 0 ? (
                <p className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
                  No topics yet. Add one or go back and load the sample setup.
                </p>
              ) : (
                interests.map((interest, i) => {
                  const specs = config.specializationsByPath?.[interest.id] || [];
                  const isOpen = openInterestId === interest.id;
                  return (
                    <Collapsible
                      key={interest.id}
                      open={isOpen}
                      onOpenChange={(open) => setOpenInterestId(open ? interest.id : null)}
                    >
                      <div className="rounded-lg border">
                        <CollapsibleTrigger asChild>
                          <button
                            type="button"
                            className="flex w-full items-center gap-3 p-3 text-left hover:bg-muted/40"
                          >
                            {isOpen ? (
                              <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                            )}
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-xs font-bold text-primary">
                              {i + 1}
                            </span>
                            <span className="flex-1 font-medium truncate">
                              {interest.label || "Untitled topic"}
                            </span>
                            <Badge variant="secondary" className="shrink-0">
                              {specs.length} track{specs.length === 1 ? "" : "s"}
                            </Badge>
                          </button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="border-t px-3 pb-3 pt-3 space-y-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <Label className="sr-only">Topic name</Label>
                            <Input
                              value={interest.label}
                              onChange={(e) => updateInterestLabel(i, e.target.value)}
                              disabled={!canEdit}
                              placeholder="Topic name (e.g. Cloud & DevOps)"
                              className="max-w-sm font-medium"
                            />
                            {canEdit && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="text-destructive"
                                onClick={() => removeInterest(i)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>

                          <div className="space-y-2">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                              Tracks (learner picks one)
                            </p>
                            {specs.map((spec, si) => (
                                <div key={spec.id} className="rounded-md border bg-muted/20 p-3 space-y-3">
                                  <div className="flex items-center gap-2">
                                    <Input
                                      value={spec.label}
                                      onChange={(e) =>
                                        updateTrackLabel(interest.id, si, e.target.value)
                                      }
                                      disabled={!canEdit}
                                      placeholder="Specialization name (e.g. MySQL, SQL, Oracle)"
                                      className="h-9 font-medium"
                                    />
                                    {canEdit && spec.label ? (
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="shrink-0 text-xs"
                                        onClick={() => applyTrackSuggestions(interest.id, si)}
                                      >
                                        <Sparkles className="mr-1 h-3.5 w-3.5" />
                                        Suggest
                                      </Button>
                                    ) : null}
                                    {canEdit && (
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="shrink-0 text-destructive"
                                        onClick={() => removeTrack(interest.id, si)}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    )}
                                  </div>

                                  <div>
                                    <Label className="text-xs text-muted-foreground">
                                      Step 3 options (comma-separated)
                                    </Label>
                                    <Input
                                      value={step3FieldDisplay(spec)}
                                      onChange={(e) =>
                                        setStep3FromComma(interest.id, si, e.target.value)
                                      }
                                      disabled={!canEdit}
                                      placeholder="MySQL Admin, MySQL Programming"
                                      className="h-9 mt-1"
                                    />
                                  </div>

                                  <div>
                                    <Label className="text-xs text-muted-foreground">
                                      Skills to learn (comma-separated)
                                    </Label>
                                    <Input
                                      value={listFieldDisplay(spec.skills)}
                                      onChange={(e) =>
                                        updateTrackField(interest.id, si, {
                                          skills: e.target.value,
                                        })
                                      }
                                      disabled={!canEdit}
                                      placeholder="SQL, MySQL, Database design"
                                      className="h-9 mt-1"
                                    />
                                  </div>

                                  <div>
                                    <Label className="text-xs text-muted-foreground">
                                      Tools &amp; technologies (comma-separated)
                                    </Label>
                                    <Input
                                      value={listFieldDisplay(spec.tools)}
                                      onChange={(e) =>
                                        updateTrackField(interest.id, si, {
                                          tools: e.target.value,
                                        })
                                      }
                                      disabled={!canEdit}
                                      placeholder="MySQL Workbench, DBeaver"
                                      className="h-9 mt-1"
                                    />
                                  </div>

                                  <div>
                                    <Label className="text-xs text-muted-foreground">
                                      Certifications to aim for
                                    </Label>
                                    <div className="mt-1">
                                      <CertificationMultiPicker
                                        value={spec.certificationIds || []}
                                        onChange={(certificationIds) =>
                                          updateTrackField(interest.id, si, { certificationIds })
                                        }
                                        disabled={!canEdit}
                                      />
                                    </div>
                                  </div>
                                </div>
                              ))}
                            {canEdit && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => addTrack(interest.id)}
                              >
                                <Plus className="mr-1 h-3.5 w-3.5" /> Add track
                              </Button>
                            )}
                          </div>
                        </CollapsibleContent>
                      </div>
                    </Collapsible>
                  );
                })
              )}
            </CardContent>
          </Card>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setActiveTab("start")}>Back</Button>
            <Button onClick={() => setActiveTab("finish")}>
              Continue to publish
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </TabsContent>

        {/* Publish & save */}
        <TabsContent value="finish" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Review &amp; publish</CardTitle>
              <CardDescription>Check everything looks good, then save.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {validation.valid ? (
                <p className="flex items-center gap-2 text-sm text-green-700">
                  <CheckCircle2 className="h-4 w-4" />
                  All topics, tracks, and step 3 options are configured.
                </p>
              ) : (
                <ul className="space-y-1.5 text-sm text-amber-900">
                  {validation.issues.map((issue) => (
                    <li key={issue} className="flex gap-2">
                      <span className="text-amber-600">•</span>
                      {issue}
                    </li>
                  ))}
                </ul>
              )}

              {!readyToPublish && (
                <p className="rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-900">
                  Each track needs at least one step 3 option before publishing.
                </p>
              )}

              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <p className="font-medium">Show on public site</p>
                  <p className="text-sm text-muted-foreground">
                    When ON, learners can take the quiz at /assessment
                  </p>
                </div>
                <Switch
                  checked={isPublished}
                  onCheckedChange={setIsPublished}
                  disabled={!canEdit || !readyToPublish}
                />
              </div>

              <Badge variant={isPublished ? "default" : "secondary"}>
                {isPublished ? "Published" : "Draft"}
              </Badge>
            </CardContent>
          </Card>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
            <Button variant="outline" onClick={() => setActiveTab("topics")}>Back</Button>
            {canEdit && (
              <Button size="lg" onClick={handleSave} disabled={saving || !readyToPublish}>
                {saving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save assessment
              </Button>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
