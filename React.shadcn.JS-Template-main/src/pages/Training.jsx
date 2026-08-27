import { useMemo, useState } from "react";
import { Users, CheckCircle2, Video, BookOpen } from "lucide-react";
import { CardTableSkeleton } from "../components/common/TableSkeleton";
import { useGetPublicWebinarsQuery } from "@/store/api/webinarApi";
import { useGetPublicTrainingProgramsQuery } from "@/store/api/siteContentApi";
import { useGetPublicSectionsQuery } from "@/store/api/digitalProgramApi";
import { normalizeCoursesPayload } from "@/lib/normalizeApiPayload";
import { mapWebinarRow, mapExpertTrainingProgramRow } from "@/lib/mapWebinarRow";
import GlobalPagination from "@/components/common/Pagination";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrainingSessionCard } from "@/components/training/TrainingSessionCard";

const TRAINING_BENEFITS = [
  "Direct interaction with industry professionals",
  "Real-world scenarios and case studies",
  "Hands-on labs in live environments",
  "Personalized feedback and guidance",
];

export default function TrainingPage() {
  const [activeTab, setActiveTab] = useState("programs");
  const [pagePrograms, setPagePrograms] = useState(1);
  const [pageWebinars, setPageWebinars] = useState(1);
  const pageSize = 5;

  const { data: sectionsRes } = useGetPublicSectionsQuery(undefined, {
    refetchOnMountOrArgChange: false,
  });
  const cmsByKey = useMemo(() => {
    const list = sectionsRes?.data?.sections || [];
    if (!Array.isArray(list)) return {};
    return Object.fromEntries(list.map((s) => [s.section_key, s]));
  }, [sectionsRes]);

  const expert = cmsByKey.expert_led_training;
  const heroTitle = expert?.title || "Expert-Led Training";
  const heroSubtitle =
    expert?.subtitle ||
    "Live, interactive sessions with industry experts. Get personalized guidance, real-time Q&A, and career-focused training.";

  const { data: progRes, isLoading: progLoading, isFetching: progFetching } = useGetPublicTrainingProgramsQuery(
    { page: pagePrograms, limit: pageSize },
    { skip: activeTab !== "programs" }
  );
  const { data: webinarRes, isLoading: webLoading, isFetching: webFetching } = useGetPublicWebinarsQuery(
    { limit: pageSize, page: pageWebinars },
    { skip: activeTab !== "webinars", refetchOnMountOrArgChange: true }
  );

  const programRows = progRes?.data?.rows || [];
  const programPagination = progRes?.data?.pagination || { page: 1, total_pages: 1 };
  const programs = useMemo(() => programRows.map(mapExpertTrainingProgramRow), [programRows]);

  const { rows: webinarRows } = normalizeCoursesPayload(webinarRes);
  const webinarPagination = webinarRes?.data?.pagination || { page: 1, total_pages: 1 };
  const sessions = useMemo(() => webinarRows.map(mapWebinarRow), [webinarRows]);

  const loadingPrograms = progLoading || (progFetching && programs.length === 0);
  const loadingWebinars = webLoading || (webFetching && sessions.length === 0);

  return (
    <div>
      <main className="pb-16">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <section className="relative overflow-hidden bg-gradient-to-br from-blue-50/95 via-slate-50 to-indigo-100/70 shadow-[0_4px_24px_-6px_rgba(15,23,42,0.08)]">
            <div
              className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-[0.06] motion-reduce:opacity-[0.04]"
              style={{
                backgroundImage:
                  "url('https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=1920&q=80')",
              }}
              aria-hidden
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-blue-50/90 via-white/75 to-indigo-50/60" aria-hidden />

            <div
              className="pointer-events-none absolute -top-16 right-[8%] h-56 w-56 rounded-full bg-blue-400/25 blur-3xl animate-hero-float motion-reduce:animate-none"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute top-1/2 -left-10 h-48 w-48 -translate-y-1/2 rounded-full bg-primary/20 blur-3xl animate-hero-float-slow motion-reduce:animate-none"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute bottom-6 right-[28%] h-44 w-44 rounded-full bg-premium/20 blur-3xl animate-hero-float-delayed motion-reduce:animate-none"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute bottom-2 left-[12%] h-36 w-36 rounded-full bg-indigo-400/15 blur-2xl animate-hero-float motion-reduce:animate-none"
              style={{ animationDelay: "5s" }}
              aria-hidden
            />
            <div
              className="pointer-events-none absolute top-20 right-[38%] h-28 w-28 rounded-full bg-emerald-400/15 blur-2xl animate-hero-float-slow motion-reduce:animate-none"
              style={{ animationDelay: "2s" }}
              aria-hidden
            />

            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-slate-300/60 to-transparent" aria-hidden />

            <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-9 md:py-10 pb-14 md:pb-16">
              <div className="grid lg:grid-cols-10 gap-6 lg:gap-8 items-center">
                <div className="lg:col-span-6 min-w-0 flex flex-col gap-6 md:gap-8">
                  <div className="flex flex-col sm:flex-row gap-4 sm:gap-5 items-start">
                    <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-premium to-orange-500 flex items-center justify-center shrink-0 shadow-md ring-4 ring-premium/10">
                      <Users className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground leading-tight tracking-tight">
                        {heroTitle}
                      </h1>
                      <p className="mt-4 text-sm sm:text-base md:text-lg text-muted-foreground leading-relaxed">
                        {heroSubtitle}
                      </p>
                    </div>
                  </div>

                  <TabsList className="grid w-full max-w-md grid-cols-2 h-10 p-1 bg-white/80 backdrop-blur-sm border border-slate-200/70 shadow-sm">
                    <TabsTrigger
                      value="programs"
                      className="gap-2 font-bold text-muted-foreground data-[state=active]:bg-green-600 data-[state=active]:text-white data-[state=active]:shadow-sm"
                    >
                      <BookOpen className="w-4 h-4" />
                      Published Program
                    </TabsTrigger>
                    <TabsTrigger
                      value="webinars"
                      className="gap-2 font-bold text-muted-foreground data-[state=active]:bg-red-600 data-[state=active]:text-white data-[state=active]:shadow-sm"
                    >
                      <Video className="w-4 h-4" />
                      Live Webinar
                    </TabsTrigger>
                  </TabsList>
                </div>

                <div className="lg:col-span-4 min-w-0 lg:self-center">
                  <div className="rounded-xl bg-gradient-to-br from-primary to-primary-dark text-primary-foreground px-4 py-3.5 md:px-5 md:py-4 shadow-md border border-white/10">
                    <h2 className="text-base md:text-lg font-bold mb-2">Benefits</h2>
                    <ul className="space-y-1.5">
                      {TRAINING_BENEFITS.map((item, index) => (
                        <li key={index} className="flex items-start gap-2 text-xs md:text-sm leading-snug">
                          <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5 text-premium" />
                          <span className="text-primary-foreground/95">{item}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-3 pt-3 border-t border-white/15 flex items-start gap-2.5">
                      <p className="text-xl md:text-2xl font-bold leading-none shrink-0">95%</p>
                      <p className="text-[11px] md:text-xs text-primary-foreground/80 leading-snug">
                        of our students report career advancement after completing training
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <div className="relative z-10 bg-white pt-10 md:pt-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <TabsContent value="webinars" className="mt-0">
              {loadingWebinars ? (
                <CardTableSkeleton rows={3} columns={5} showHeader showActions showCheckbox={false} />
              ) : sessions.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">
                  No upcoming webinars yet. Admins can publish sessions under Digital Programs → Live Webinar.
                </p>
              ) : (
                <>
                  <div className="space-y-4">
                    {sessions.map((training) => (
                      <TrainingSessionCard key={training.id} training={training} />
                    ))}
                  </div>
                  <div className="mt-4 flex justify-end">
                    <GlobalPagination
                      page={webinarPagination.page || pageWebinars}
                      totalPages={webinarPagination.total_pages || 1}
                      onPageChange={setPageWebinars}
                    />
                  </div>
                </>
              )}
            </TabsContent>

            <TabsContent value="programs" className="mt-0">
              {loadingPrograms ? (
                <CardTableSkeleton rows={3} columns={5} showHeader showActions showCheckbox={false} />
              ) : programs.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">
                  No published programs yet. Admins can add them under Digital Programs → Expert-Led Training.
                </p>
              ) : (
                <>
                  <div className="space-y-4">
                    {programs.map((training) => (
                      <TrainingSessionCard key={training.id} training={training} />
                    ))}
                  </div>
                  <div className="mt-4 flex justify-end">
                    <GlobalPagination
                      page={programPagination.page || pagePrograms}
                      totalPages={programPagination.total_pages || 1}
                      onPageChange={setPagePrograms}
                    />
                  </div>
                </>
              )}
            </TabsContent>
            </div>
          </div>
        </Tabs>
      </main>
    </div>
  );
}
