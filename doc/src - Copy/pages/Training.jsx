import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Users, Calendar, Clock, Star, Award, Video, MessageSquare, CheckCircle2 } from "lucide-react";
import { CardTableSkeleton } from "../components/common/TableSkeleton";
import { useGetPublicWebinarsQuery } from "@/store/api/webinarApi";
import { useGetPublicTrainingProgramsQuery } from "@/store/api/siteContentApi";
import { useGetPublicSectionsQuery } from "@/store/api/digitalProgramApi";
import { normalizeCoursesPayload } from "@/lib/normalizeApiPayload";
import { mapWebinarRow, mapExpertTrainingProgramRow } from "@/lib/mapWebinarRow";
import GlobalPagination from "@/components/common/Pagination";

function TrainingSessionCard({ training }) {
  const spotsLeft =
    training.maxCapacity > 0 ? Math.max(0, training.maxCapacity - training.enrolledCount) : null;
  const rating = Number(training.rating || 0);
  return (
    <Card variant="elevated" className="overflow-hidden">
      <div className="grid md:grid-cols-4 gap-4 sm:gap-6 p-4 sm:p-6">
        <div className="flex items-center gap-4 min-w-0">
          <img
            src={training.instructorImage}
            alt={training.instructor}
            className="w-14 h-14 sm:w-16 sm:h-16 rounded-full object-cover shrink-0"
            onError={(e) => {
              e.currentTarget.src = "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150";
            }}
          />
          <div className="min-w-0">
            <p className="font-semibold text-foreground truncate">{training.instructor}</p>
            <p className="text-sm text-muted-foreground truncate">{training.instructorTitle}</p>
            <div className="flex items-center gap-1 mt-1">
              <Star className="w-3.5 h-3.5 fill-premium text-premium shrink-0" />
              <span className="text-sm font-medium">{rating.toFixed(1)}</span>
            </div>
          </div>
        </div>

        <div className="md:col-span-2 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            {training.isFree ? (
              <Badge variant="free">FREE</Badge>
            ) : (
              <Badge variant="paid">${training.price}</Badge>
            )}
            <Badge variant="outline">{training.duration}</Badge>
          </div>
          <h3 className="text-lg sm:text-xl font-bold mb-2 break-words">{training.title}</h3>
          <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-sm text-muted-foreground mb-3">
            <div className="flex items-center gap-1 min-w-0">
              <Calendar className="w-4 h-4 shrink-0" />
              <span className="truncate">{training.date}</span>
            </div>
            <div className="flex items-center gap-1 min-w-0">
              <Clock className="w-4 h-4 shrink-0" />
              <span className="truncate">{training.time}</span>
            </div>
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4 shrink-0" />
              <span>
                {training.enrolledCount}
                {training.maxCapacity ? `/${training.maxCapacity}` : ""} enrolled
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {(training.topics || []).map((topic, i) => (
              <Badge key={i} variant="level" className="bg-muted">
                {topic}
              </Badge>
            ))}
          </div>
        </div>

        <div className="flex flex-row md:flex-col justify-between md:justify-center items-center md:items-end gap-3 md:gap-3 pt-2 md:pt-0 border-t md:border-t-0 border-border md:border-0">
          <div className="text-left md:text-right">
            {training.isFree ? (
              <p className="text-2xl font-bold text-foreground">Free</p>
            ) : (
              <p className="text-2xl font-bold text-foreground">${training.price}</p>
            )}
            <p className="text-xs text-muted-foreground">per person</p>
          </div>
          {training.enrollmentUrl && /^https?:\/\//i.test(String(training.enrollmentUrl).trim()) ? (
            <Button variant="premium" size="lg" className="w-full sm:w-auto shrink-0" asChild>
              <a href={training.enrollmentUrl.trim()} target="_blank" rel="noopener noreferrer">
                Enroll Now
              </a>
            </Button>
          ) : (
            <Button variant="premium" size="lg" className="w-full sm:w-auto shrink-0" asChild>
              <Link to="/courses">Enroll via courses</Link>
            </Button>
          )}
          {spotsLeft !== null && <p className="text-xs text-muted-foreground md:text-right">{spotsLeft} spots left</p>}
        </div>
      </div>
    </Card>
  );
}

export default function TrainingPage() {
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

  const { data: progRes, isLoading: progLoading, isFetching: progFetching } = useGetPublicTrainingProgramsQuery({
    page: pagePrograms,
    limit: pageSize,
  });
  const { data: webinarRes, isLoading: webLoading, isFetching: webFetching } = useGetPublicWebinarsQuery(
    { limit: pageSize, page: pageWebinars },
    { refetchOnMountOrArgChange: true }
  );

  const programRows = progRes?.data?.rows || [];
  const programPagination = progRes?.data?.pagination || { page: 1, total_pages: 1 };
  const programs = useMemo(() => programRows.map(mapExpertTrainingProgramRow), [programRows]);

  const webinarRows = normalizeCoursesPayload(webinarRes);
  const webinarPagination = webinarRes?.data?.pagination || { page: 1, total_pages: 1 };
  const sessions = useMemo(() => webinarRows.map(mapWebinarRow), [webinarRows]);

  const loadingPrograms = progLoading || (progFetching && programs.length === 0);
  const loadingWebinars = webLoading || (webFetching && sessions.length === 0);

  return (
    <div>
      <main className="pt-24 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-premium to-premium/70 flex items-center justify-center mx-auto mb-6">
              <Users className="w-8 h-8 text-premium-foreground" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">{heroTitle}</h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">{heroSubtitle}</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
            {[
              { icon: Video, title: "Live Sessions", desc: "Real-time interactive training" },
              { icon: MessageSquare, title: "Q&A Support", desc: "Ask questions directly" },
              { icon: Award, title: "Certificate", desc: "Industry-recognized credentials" },
              { icon: Users, title: "Small Groups", desc: "Personalized attention" },
            ].map((feature, index) => (
              <Card key={index} variant="outline" className="text-center">
                <CardContent className="pt-6">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-premium/20 to-premium/5 flex items-center justify-center mx-auto mb-4">
                    <feature.icon className="w-6 h-6 text-premium" />
                  </div>
                  <h3 className="font-semibold mb-1">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <section id="published-programs" className="mb-16 scroll-mt-28">
            <h2 className="text-2xl font-bold mb-8">Published programs</h2>
            {loadingPrograms ? (
              <CardTableSkeleton rows={3} columns={5} showHeader showActions showCheckbox={false} />
            ) : programs.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">
                No published programs yet. Admins can add them under Digital Programs → Expert-Led Training.
              </p>
            ) : (
              <>
                <div className="space-y-6">
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
          </section>

          <section id="live-webinars" className="mb-16 scroll-mt-28">
            <h2 className="text-2xl font-bold mb-8">Live webinars</h2>
            {loadingWebinars ? (
              <CardTableSkeleton rows={3} columns={5} showHeader showActions showCheckbox={false} />
            ) : sessions.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">
                No upcoming webinars yet. Admins can publish sessions under Digital Programs → Live Webinar.
              </p>
            ) : (
              <>
                <div className="space-y-6">
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
          </section>

          <Card className="bg-gradient-to-br from-primary to-primary-dark text-primary-foreground">
            <CardContent className="p-8 md:p-12">
              <div className="grid md:grid-cols-2 gap-8 items-center">
                <div>
                  <h2 className="text-2xl md:text-3xl font-bold mb-4">Why Choose Expert-Led Training?</h2>
                  <ul className="space-y-3">
                    {[
                      "Direct interaction with industry professionals",
                      "Real-world scenarios and case studies",
                      "Networking opportunities with peers",
                      "Hands-on labs in live environments",
                      "Personalized feedback and guidance",
                      "Career advice and mentorship",
                    ].map((item, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="text-center">
                  <div className="text-5xl font-bold mb-2">95%</div>
                  <p className="text-primary-foreground/80 mb-6">
                    of our students report career advancement after completing training
                  </p>
                  <Button size="lg" variant="hero-outline">
                    Browse All Training
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
