import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ClipboardCheck,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Server,
  Code,
  Cloud,
  Shield,
  Database,
  Network,
  TestTube,
  Settings,
  HelpCircle,
  Star,
  BookOpen,
  Award,
  Beaker,
  Loader2,
} from "lucide-react";
import { useGetAssessmentConfigQuery, usePostAssessmentRecommendMutation } from "@/store/api/assessmentApi";
import { useGetPublicSectionsQuery } from "@/store/api/digitalProgramApi";

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

export default function AssessmentPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [selections, setSelections] = useState({});
  const [showResults, setShowResults] = useState(false);
  const [recommendation, setRecommendation] = useState(null);

  const { data: cfgRes, isLoading: cfgLoading, isError: cfgError } = useGetAssessmentConfigQuery();
  const { data: sectionsRes } = useGetPublicSectionsQuery(undefined, { refetchOnMountOrArgChange: false });
  const [postRecommend, { isLoading: recLoading }] = usePostAssessmentRecommendMutation();

  useEffect(() => {
    try {
      const raw = localStorage.getItem(WIZARD_LS);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        if (parsed.selections) setSelections(parsed.selections);
        if (typeof parsed.currentStep === "number") setCurrentStep(parsed.currentStep);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (cfgLoading) return;
    const empty = !selections || Object.keys(selections).length === 0;
    if (empty && currentStep === 0) return;
    try {
      localStorage.setItem(WIZARD_LS, JSON.stringify({ selections, currentStep }));
    } catch {
      /* ignore */
    }
  }, [selections, currentStep, cfgLoading]);

  const wizard = cfgRes?.data?.config;
  const cmsTra = useMemo(() => {
    const list = sectionsRes?.data?.sections || [];
    if (!Array.isArray(list)) return null;
    return list.find((s) => s.section_key === "technology_readiness_assessment") || null;
  }, [sectionsRes]);

  const primaryInterests = wizard?.primaryInterests || [];
  const specializationsByPath = wizard?.specializationsByPath || {};
  const cloudOptions = wizard?.cloudOptions || [];

  const handleSelect = (key, value) => {
    setSelections({ ...selections, [key]: value });
  };

  const handleBack = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1);
  };

  const progress = ((currentStep + 1) / 3) * 100;

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
    if (currentStep < 2) {
      setCurrentStep(currentStep + 1);
      return;
    }
    finishAssessment();
  };

  if (showResults && recommendation) {
    const rec = recommendation;
    return (
      <div>
        <main className="pt-24 pb-16">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-8 animate-fade-in-up">
              <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-success" />
              </div>
              <h1 className="text-3xl font-bold text-foreground mb-2">Your Career Path Recommendation</h1>
              <p className="text-muted-foreground">Based on your selections, here&apos;s your personalized roadmap</p>
            </div>

            <div className="grid gap-6">
              <Card className="animate-fade-in-up" style={{ animationDelay: "100ms" }}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Star className="w-5 h-5 text-secondary" />
                    Recommended Career Path
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-primary">{rec.careerTitle}</div>
                  {rec.cloudPlatform ? (
                    <p className="text-sm text-muted-foreground mt-2">Cloud focus: {rec.cloudPlatform}</p>
                  ) : null}
                </CardContent>
              </Card>

              <div className="grid md:grid-cols-2 gap-6">
                <Card className="animate-fade-in-up" style={{ animationDelay: "200ms" }}>
                  <CardHeader>
                    <CardTitle className="text-lg">Key Skills to Learn</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {(rec.skills || []).map((skill) => (
                        <Badge key={skill} variant="outline">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card className="animate-fade-in-up" style={{ animationDelay: "300ms" }}>
                  <CardHeader>
                    <CardTitle className="text-lg">Tools & Technologies</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {(rec.tools || []).map((tool) => (
                        <Badge key={tool} variant="secondary">
                          {tool}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card className="animate-fade-in-up" style={{ animationDelay: "400ms" }}>
                <CardHeader>
                  <CardTitle className="text-lg">Recommended Certifications</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {(rec.certifications || []).map((cert, i) => (
                      <div key={cert} className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                          {i + 1}
                        </div>
                        <span>{cert}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="animate-fade-in-up bg-primary/5 border-primary/20" style={{ animationDelay: "500ms" }}>
                <CardHeader>
                  <CardTitle className="text-lg">Recommended Next Steps</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid sm:grid-cols-3 gap-4">
                    <Button className="h-auto py-4 flex-col gap-2" asChild>
                      <a href="/courses">
                        <BookOpen className="w-5 h-5" />
                        Start a Course
                      </a>
                    </Button>
                    <Button variant="outline" className="h-auto py-4 flex-col gap-2" asChild>
                      <a href="/labs">
                        <Beaker className="w-5 h-5" />
                        Try a Lab
                      </a>
                    </Button>
                    <Button variant="outline" className="h-auto py-4 flex-col gap-2" asChild>
                      <a href="/certification">
                        <Award className="w-5 h-5" />
                        Certification Prep
                      </a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="text-center mt-8">
              <Button
                variant="ghost"
                onClick={() => {
                  setShowResults(false);
                  setCurrentStep(0);
                  setSelections({});
                  setRecommendation(null);
                  try {
                    localStorage.removeItem(WIZARD_LS);
                  } catch {
                    /* ignore */
                  }
                }}
              >
                <ArrowLeft className="w-4 h-4 mr-2" /> Take Assessment Again
              </Button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (cfgLoading && !wizard) {
    return (
      <main className="pt-24 pb-16 max-w-4xl mx-auto px-4">
        <Skeleton className="h-10 w-64 mx-auto mb-4" />
        <Skeleton className="h-4 w-full mb-8" />
        <Skeleton className="h-64 w-full" />
      </main>
    );
  }

  if (cfgError || !wizard) {
    return (
      <main className="pt-24 pb-16 max-w-4xl mx-auto px-4 text-center text-muted-foreground">
        <p>Assessment configuration could not be loaded. Ensure the API is running and assessment config is seeded.</p>
      </main>
    );
  }

  const specs = specializationsByPath[selections.primaryPath || ""] || [];

  return (
    <div>
      <main className="pt-24 pb-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <ClipboardCheck className="w-6 h-6 text-primary" />
              </div>
            </div>
            <Badge className="mb-3 bg-secondary/10 text-secondary border-secondary/20">
              Benchmark Your Brilliance
            </Badge>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
              {cmsTra?.title || "Technology Readiness Assessment"}
            </h1>
            <p className="text-muted-foreground max-w-xl mx-auto">
              {cmsTra?.subtitle || "Let us guide you to the right career path—step by step."}
            </p>
          </div>

          <div className="mb-8">
            <div className="flex justify-between text-sm text-muted-foreground mb-2">
              <span>Step {currentStep + 1} of 3</span>
              <span>{Math.round(progress)}% Complete</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          <Card className="animate-fade-in">
            <CardContent className="p-6">
              {currentStep === 0 && (
                <div>
                  <h2 className="text-xl font-semibold text-foreground mb-4">Step 1: Choose Your Primary Interest</h2>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {primaryInterests.map((item) => {
                      const Icon = ICON_MAP[item.icon] || HelpCircle;
                      const isSelected = selections.primaryPath === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleSelect("primaryPath", item.id)}
                          className={`p-4 rounded-lg border-2 text-left transition-all ${
                            isSelected
                              ? "border-primary bg-primary/5"
                              : "border-border hover:border-primary/50"
                          }`}
                        >
                          <Icon className={`w-5 h-5 mb-2 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                          <div className={`font-medium ${isSelected ? "text-primary" : "text-foreground"}`}>
                            {item.label}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {currentStep === 1 && (
                <div>
                  <h2 className="text-xl font-semibold text-foreground mb-4">Step 2: Choose Your Specialization</h2>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {specs.map((item) => {
                      const isSelected = selections.specialization === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleSelect("specialization", item.id)}
                          className={`p-4 rounded-lg border-2 text-left transition-all ${
                            isSelected
                              ? "border-primary bg-primary/5"
                              : "border-border hover:border-primary/50"
                          }`}
                        >
                          <div className={`font-medium ${isSelected ? "text-primary" : "text-foreground"}`}>
                            {item.label}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {currentStep === 2 && (
                <div>
                  <h2 className="text-xl font-semibold text-foreground mb-4">Step 3: Cloud Platform Preference</h2>
                  <p className="text-muted-foreground mb-4">Do you want to add Cloud skills to your learning path?</p>
                  <div className="grid sm:grid-cols-3 gap-3">
                    {cloudOptions.map((item) => {
                      const isSelected = selections.cloudPreference === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleSelect("cloudPreference", item.id)}
                          className={`p-4 rounded-lg border-2 text-center transition-all ${
                            isSelected
                              ? "border-primary bg-primary/5"
                              : "border-border hover:border-primary/50"
                          }`}
                        >
                          <div className={`font-medium ${isSelected ? "text-primary" : "text-foreground"}`}>
                            {item.label}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-between mt-6">
            <Button variant="ghost" onClick={handleBack} disabled={currentStep === 0}>
              <ArrowLeft className="w-4 h-4 mr-2" /> Back
            </Button>
            <Button
              onClick={handleNext}
              disabled={
                recLoading ||
                (currentStep === 0 && !selections.primaryPath) ||
                (currentStep === 1 && !selections.specialization) ||
                (currentStep === 2 && !selections.cloudPreference)
              }
            >
              {recLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Working…
                </>
              ) : currentStep === 2 ? (
                <>
                  Get Recommendations <ArrowRight className="w-4 h-4 ml-2" />
                </>
              ) : (
                <>
                  Next <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
