import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  ClipboardCheck,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Check,
  Server,
  Code,
  Cloud,
  Shield,
  Database,
  Network,
  TestTube,
  Settings,
  HelpCircle,
  Sparkles,
  Layers,
  BookOpen,
  Award,
  Beaker,
  Wrench,
  Loader2,
  RotateCcw,
} from "lucide-react";
import {
  useGetAssessmentConfigQuery,
  usePostAssessmentRecommendMutation,
} from "@/store/api/assessmentApi";
import { useGetPublicSectionsQuery } from "@/store/api/digitalProgramApi";
import {
  getSpecializationsForInterest,
  getStep3Options,
  findSpecialization,
  sanitizeAssessmentSelections,
} from "@/lib/assessmentConfig";

const WIZARD_LS = "alar_assessment_wizard_v1";

const ICON_MAP = {
  Server,
  Code,
  Cloud,
  Shield,
  Database,
  Network,
  TestTube,
  Settings,
  HelpCircle,
};

const STEP_META = [
  {
    key: "primaryPath",
    title: "Choose your primary interest",
    subtitle: "What area excites you most?",
    icon: ClipboardCheck,
    stepLabel: "Interest",
  },
  {
    key: "specialization",
    title: "Pick a specialization",
    subtitle: "Narrow it down under your interest.",
    icon: Layers,
    stepLabel: "Specialization",
  },
  {
    key: "cloudPreference",
    title: "Choose your focus",
    subtitle: "Options based on your specialization.",
    icon: Cloud,
    stepLabel: "Focus",
  },
];

/** A large, selectable option tile. */
function OptionTile({ selected, onClick, icon: Icon, label, centered }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group relative flex w-full rounded-xl border-2 p-4 text-left transition-all",
        centered ? "flex-col items-center text-center" : "items-center gap-3",
        selected
          ? "border-primary bg-primary/5 shadow-sm"
          : "border-border hover:border-primary/50 hover:bg-muted/40",
      )}
    >
      {selected && (
        <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Check className="h-3 w-3" />
        </span>
      )}
      {Icon && (
        <span
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors",
            selected
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground group-hover:text-primary",
          )}
        >
          <Icon className="h-5 w-5" />
        </span>
      )}
      <span
        className={cn(
          "font-medium",
          selected ? "text-primary" : "text-foreground",
        )}
      >
        {label}
      </span>
    </button>
  );
}

function EmptyStep({ message }) {
  return (
    <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
      {message}
    </div>
  );
}

export default function AssessmentPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [selections, setSelections] = useState({});
  const [showResults, setShowResults] = useState(false);
  const [recommendation, setRecommendation] = useState(null);

  const {
    data: cfgRes,
    isLoading: cfgLoading,
    isError: cfgError,
  } = useGetAssessmentConfigQuery();
  const { data: sectionsRes } = useGetPublicSectionsQuery(undefined, {
    refetchOnMountOrArgChange: false,
  });
  const [postRecommend, { isLoading: recLoading }] =
    usePostAssessmentRecommendMutation();

  useEffect(() => {
    try {
      const raw = localStorage.getItem(WIZARD_LS);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        if (parsed.selections) setSelections(parsed.selections);
        if (typeof parsed.currentStep === "number")
          setCurrentStep(parsed.currentStep);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const wizard = useMemo(() => {
    let cfg = cfgRes?.data?.config;
    if (typeof cfg === "string") {
      try { cfg = JSON.parse(cfg); } catch { cfg = null; }
    }
    return cfg || null;
  }, [cfgRes]);

  /** Clear stale interest/track/focus ids after admin re-saves config. */
  useEffect(() => {
    if (!wizard) return;
    setSelections((prev) => {
      const cleaned = sanitizeAssessmentSelections(wizard, prev);
      if (JSON.stringify(cleaned) !== JSON.stringify(prev)) {
        setCurrentStep(0);
        setShowResults(false);
        setRecommendation(null);
        return cleaned;
      }
      return prev;
    });
  }, [wizard]);

  useEffect(() => {
    if (cfgLoading) return;
    const empty = !selections || Object.keys(selections).length === 0;
    if (empty && currentStep === 0) return;
    try {
      localStorage.setItem(
        WIZARD_LS,
        JSON.stringify({ selections, currentStep }),
      );
    } catch {
      /* ignore */
    }
  }, [selections, currentStep, cfgLoading]);

  const cmsTra = useMemo(() => {
    const list = sectionsRes?.data?.sections || [];
    if (!Array.isArray(list)) return null;
    return (
      list.find((s) => s.section_key === "technology_readiness_assessment") ||
      null
    );
  }, [sectionsRes]);

  const primaryInterests = wizard?.primaryInterests || [];
  const specs = getSpecializationsForInterest(wizard, selections.primaryPath);
  const selectedSpec = findSpecialization(
    wizard,
    selections.primaryPath,
    selections.specialization,
  );
  const step3Options = getStep3Options(
    wizard,
    selections.primaryPath,
    selections.specialization,
  );

  const handleSelect = (key, value) =>
    setSelections((prev) => ({ ...prev, [key]: value }));
  const handleBack = () => currentStep > 0 && setCurrentStep((s) => s - 1);

  const finishAssessment = async () => {
    try {
      const res = await postRecommend({
        primaryPath: selections.primaryPath,
        specialization: selections.specialization,
        cloudPreference: selections.cloudPreference,
      }).unwrap();
      const rec = res?.data?.recommendation;
      if (rec) {
        setRecommendation(rec);
        setShowResults(true);
        try {
          localStorage.removeItem(WIZARD_LS);
        } catch {
          /* ignore */
        }
      }
    } catch {
      /* toast from axios */
    }
  };

  const handleNext = () => {
    if (currentStep < 2) setCurrentStep((s) => s + 1);
    else finishAssessment();
  };

  const resetWizard = () => {
    setShowResults(false);
    setCurrentStep(0);
    setSelections({});
    setRecommendation(null);
    try {
      localStorage.removeItem(WIZARD_LS);
    } catch {
      /* ignore */
    }
  };

  // ── Results screen ──────────────────────────────────────────────────────────
  if (showResults && recommendation) {
    const rec = recommendation;
    // Carry the recommended skills so the Courses/Labs pages can filter to relevant content.
    const recSkills = Array.isArray(rec.skills) ? rec.skills.filter(Boolean) : [];
    const recQuery = recSkills.length
      ? `?skills=${encodeURIComponent(recSkills.join(","))}`
      : "";
    return (
      <main className="pb-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
              <CheckCircle2 className="h-8 w-8 text-success" />
            </div>
            <h1 className="mb-2 text-3xl font-bold text-foreground">
              Your personalized learning plan
            </h1>
            <p className="text-muted-foreground">
              Based on your answers, here&apos;s what to learn next.
            </p>
          </div>

          {/* Career hero */}
          <div className="mb-8 overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-6 sm:p-8">
            <div className="flex flex-wrap items-center gap-2 text-sm font-medium text-primary">
              <Sparkles className="h-4 w-4" /> Recommended path
            </div>
            <h2 className="mt-1 text-3xl font-bold text-foreground">
              {rec.careerTitle}
            </h2>
            {rec.focus || rec.cloudPlatform ? (
              <p className="mt-2 text-sm text-muted-foreground">
                Your focus:{" "}
                <span className="font-medium text-foreground">
                  {rec.focus || rec.cloudPlatform}
                </span>
              </p>
            ) : null}
          </div>

          {/* Skills — what to learn */}
          {(rec.skills?.length > 0 || rec.tools?.length > 0) && (
            <section className="mb-8 grid gap-6 md:grid-cols-2">
              <Card>
                <CardContent className="p-5">
                  <div className="mb-3 flex items-center gap-2 font-semibold text-foreground">
                    <Sparkles className="h-4 w-4 text-secondary" /> Skills to
                    learn
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(rec.skills || []).map((skill) => (
                      <Badge key={skill} variant="outline" className="text-sm">
                        {skill}
                      </Badge>
                    ))}
                    {(rec.skills || []).length === 0 && (
                      <p className="text-sm text-muted-foreground">—</p>
                    )}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-5">
                  <div className="mb-3 flex items-center gap-2 font-semibold text-foreground">
                    <Wrench className="h-4 w-4 text-secondary" /> Tools &amp;
                    technologies
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(rec.tools || []).map((tool) => (
                      <Badge key={tool} variant="secondary" className="text-sm">
                        {tool}
                      </Badge>
                    ))}
                    {(rec.tools || []).length === 0 && (
                      <p className="text-sm text-muted-foreground">—</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </section>
          )}

          {/* Courses */}
          {Array.isArray(rec.courses) && rec.courses.length > 0 && (
            <section className="mb-8">
              <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold text-foreground">
                <BookOpen className="h-5 w-5 text-primary" /> Courses you should
                take
              </h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {rec.courses.map((course) => (
                  <a
                    key={course.id}
                    href={`/courses/${course.slug}`}
                    className="flex items-center gap-3 rounded-xl border p-4 transition-all hover:border-primary/50 hover:bg-primary/5"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <BookOpen className="h-5 w-5 text-primary" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-foreground">
                        {course.title}
                      </span>
                      {course.level ? (
                        <span className="block text-xs capitalize text-muted-foreground">
                          {course.level}
                        </span>
                      ) : null}
                    </span>
                  </a>
                ))}
              </div>
            </section>
          )}

          {/* Labs */}
          {Array.isArray(rec.labs) && rec.labs.length > 0 && (
            <section className="mb-8">
              <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold text-foreground">
                <Beaker className="h-5 w-5 text-secondary" /> Labs to practice
              </h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {rec.labs.map((lab) => (
                  <a
                    key={lab.id}
                    href={`/labs/${lab.slug}`}
                    className="flex items-center gap-3 rounded-xl border p-4 transition-all hover:border-primary/50 hover:bg-primary/5"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary/10">
                      <Beaker className="h-5 w-5 text-secondary" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-foreground">
                        {lab.title}
                      </span>
                      {lab.difficulty ? (
                        <span className="block text-xs capitalize text-muted-foreground">
                          {lab.difficulty}
                        </span>
                      ) : null}
                    </span>
                  </a>
                ))}
              </div>
            </section>
          )}

          {/* Certifications */}
          {Array.isArray(rec.certifications) &&
            rec.certifications.length > 0 && (
              <section className="mb-8">
                <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold text-foreground">
                  <Award className="h-5 w-5 text-primary" /> Certifications to
                  aim for
                </h3>
                <div className="grid gap-2 sm:grid-cols-2">
                  {rec.certifications.map((cert, i) => {
                    const title = typeof cert === "string" ? cert : cert?.title;
                    const certId = typeof cert === "object" && cert?.id ? cert.id : null;
                    const inner = (
                      <>
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                          {i + 1}
                        </span>
                        <span className="text-sm">{title}</span>
                      </>
                    );
                    return certId ? (
                      <Link
                        key={certId}
                        to={`/certification/${certId}`}
                        className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:border-primary/50 hover:bg-primary/5"
                      >
                        {inner}
                      </Link>
                    ) : (
                      <div
                        key={`${title}-${i}`}
                        className="flex items-center gap-3 rounded-lg border p-3"
                      >
                        {inner}
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

          {/* CTA + retake */}
          <div className="flex flex-col items-center gap-4 border-t pt-8">
            <div className="grid w-full max-w-2xl gap-3 sm:grid-cols-3">
              <Button className="h-auto flex-col gap-2 py-4" asChild>
                <Link to={`/courses${recQuery}`}>
                  <BookOpen className="h-5 w-5" /> Browse Courses
                </Link>
              </Button>
              <Button
                variant="outline"
                className="h-auto flex-col gap-2 py-4"
                asChild
              >
                <Link to={`/labs${recQuery}`}>
                  <Beaker className="h-5 w-5" /> Try a Lab
                </Link>
              </Button>
              <Button
                variant="outline"
                className="h-auto flex-col gap-2 py-4"
                asChild
              >
                <Link to="/certification">
                  <Award className="h-5 w-5" /> Certifications
                </Link>
              </Button>
            </div>
            <Button variant="ghost" onClick={resetWizard}>
              <RotateCcw className="mr-2 h-4 w-4" /> Retake assessment
            </Button>
          </div>
        </div>
      </main>
    );
  }

  // ── Loading / error ─────────────────────────────────────────────────────────
  if (cfgLoading && !wizard) {
    return (
      <main className="mx-auto max-w-3xl px-4 pb-16">
        <Skeleton className="mx-auto mb-4 h-10 w-64" />
        <Skeleton className="mb-8 h-4 w-full" />
        <Skeleton className="h-64 w-full" />
      </main>
    );
  }

  if (cfgError || !wizard) {
    return (
      <main className="mx-auto max-w-3xl px-4 pb-16 text-center text-muted-foreground">
        <p>
          Assessment configuration could not be loaded. Ensure the API is
          running and the assessment is configured.
        </p>
      </main>
    );
  }

  const step = STEP_META[currentStep];
  const StepIcon = step.icon;
  const progress = ((currentStep + 1) / STEP_META.length) * 100;
  const step3Title = selectedSpec?.label
    ? `Choose your ${selectedSpec.label} focus`
    : step.title;
  const step3Subtitle = selectedSpec?.label
    ? `Pick the option that best matches your goal in ${selectedSpec.label}.`
    : step.subtitle;
  const canContinue =
    (currentStep === 0 && selections.primaryPath) ||
    (currentStep === 1 && selections.specialization) ||
    (currentStep === 2 && selections.cloudPreference);

  return (
    <main className="pb-16">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
            <ClipboardCheck className="h-6 w-6 text-primary" />
          </div>
          <Badge className="mb-3 border-secondary/20 bg-secondary/10 text-secondary">
            Benchmark Your Brilliance
          </Badge>
          <h1 className="mb-2 text-3xl font-bold text-foreground md:text-4xl">
            {cmsTra?.title || "Technology Readiness Assessment"}
          </h1>
          <p className="mx-auto max-w-xl text-muted-foreground">
            {cmsTra?.subtitle ||
              "Answer 3 quick questions and get a tailored plan of courses, labs and skills."}
          </p>
        </div>

        {/* Stepper */}
        <div className="mb-6 flex items-center">
          {STEP_META.map((s, i) => {
            const Ico = s.icon;
            const active = currentStep === i;
            const done = currentStep > i;
            return (
              <div
                key={s.key}
                className="flex flex-1 items-center last:flex-none"
              >
                <button
                  type="button"
                  onClick={() => i <= currentStep && setCurrentStep(i)}
                  disabled={i > currentStep}
                  className="flex items-center gap-2"
                >
                  <span
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-sm font-semibold transition-colors",
                      active
                        ? "border-primary bg-primary text-primary-foreground"
                        : done
                          ? "border-primary/40 bg-primary/10 text-primary"
                          : "border-muted-foreground/30 text-muted-foreground",
                    )}
                  >
                    {done ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Ico className="h-4 w-4" />
                    )}
                  </span>
                  <span
                    className={cn(
                      "hidden text-sm font-medium sm:block",
                      active ? "text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {STEP_META[i].stepLabel}
                  </span>
                </button>
                {i < STEP_META.length - 1 && (
                  <div
                    className={cn(
                      "mx-2 h-px flex-1",
                      done ? "bg-primary/40" : "bg-border",
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>

        <p className="mb-6 text-right text-xs text-muted-foreground">
          {Math.round(progress)}% complete
        </p>

        {/* Step panel */}
        <Card>
          <CardContent className="p-6">
            <div className="mb-5 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <StepIcon className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  Step {currentStep + 1}:{" "}
                  {currentStep === 2 ? step3Title : step.title}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {currentStep === 2 ? step3Subtitle : step.subtitle}
                </p>
              </div>
            </div>

            {currentStep === 0 &&
              (primaryInterests.length === 0 ? (
                <EmptyStep message="No interests are configured yet. Please check back soon." />
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {primaryInterests.map((item) => (
                    <OptionTile
                      key={item.id}
                      icon={ICON_MAP[item.icon] || HelpCircle}
                      label={item.label}
                      selected={selections.primaryPath === item.id}
                      onClick={() => {
                        // Changing interest resets the dependent specialization.
                        setSelections((prev) => ({
                          ...prev,
                          primaryPath: item.id,
                          specialization: undefined,
                          cloudPreference: undefined,
                        }));
                      }}
                    />
                  ))}
                </div>
              ))}

            {currentStep === 1 &&
              (specs.length === 0 ? (
                <EmptyStep message="No specializations are set up for this interest yet." />
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {specs.map((item) => (
                    <OptionTile
                      key={item.id}
                      label={item.label}
                      selected={selections.specialization === item.id}
                      onClick={() =>
                        setSelections((prev) => ({
                          ...prev,
                          specialization: item.id,
                          cloudPreference: undefined,
                        }))
                      }
                    />
                  ))}
                </div>
              ))}

            {currentStep === 2 &&
              (!selections.specialization ? (
                <EmptyStep message="Go back and pick a specialization first." />
              ) : step3Options.length === 0 ? (
                <EmptyStep message="No focus options are set up for this specialization yet." />
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {step3Options.map((item) => (
                    <OptionTile
                      key={item.id}
                      centered
                      icon={Cloud}
                      label={item.label}
                      selected={selections.cloudPreference === item.id}
                      onClick={() => handleSelect("cloudPreference", item.id)}
                    />
                  ))}
                </div>
              ))}
          </CardContent>
        </Card>

        {/* Footer nav */}
        <div className="mt-6 flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={handleBack}
            disabled={currentStep === 0}
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <Button onClick={handleNext} disabled={recLoading || !canContinue}>
            {recLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Building your
                plan…
              </>
            ) : currentStep === 2 ? (
              <>
                Get my plan <ArrowRight className="ml-2 h-4 w-4" />
              </>
            ) : (
              <>
                Next <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </div>
    </main>
  );
}
