import { useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import {
  ArrowLeft,
  Calendar,
  Clock,
  Users,
  MapPin,
  Link2,
  Globe,
  CheckCircle2,
  Award,
  BookOpen,
  Layers,
  Languages,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import TrainingDetailIcon from "@/components/training/TrainingDetailIcon";
import { useToast } from "@/hooks/use-toast";
import {
  useEnrollTrainingProgramFreeMutation,
  useGetTrainingProgramBySlugQuery,
} from "@/store/api/siteContentApi";
import { mapExpertTrainingProgramRow, formatLabel } from "@/lib/mapWebinarRow";
import { resolveSessionStartAt } from "@/lib/sessionCountdown";
import SessionCountdown from "@/components/training/SessionCountdown";
import { DisplayPrice } from "@/components/common/PriceBadge";
import { checkoutTrainingProgramPayment } from "@/lib/razorpayCheckout";
import { usePlatformSettings } from "@/context/PlatformSettingsContext";
import { CardTableSkeleton } from "@/components/common/TableSkeleton";
import { siteContentApi } from "@/store/api/siteContentApi";
import RichTextContent from "@/components/learning/RichTextContent";
import { sanitizeCourseDescriptionHtml } from "@/lib/sanitizeCourseHtml";
import { stripHtmlToPlain } from "@/lib/stripHtml";

const heroBadgeClass =
  "bg-white/15 text-white text-sm font-bold px-3.5 py-1.5 rounded-full border border-white/20";
const customBadgeClass =
  "bg-orange-500 text-white text-sm font-bold px-3.5 py-1.5 rounded-full";

function ProgramPricingRow({ program }) {
  const { formatPrice } = usePlatformSettings();
  if (program.isFree) {
    return (
      <span className="bg-emerald-500/25 text-emerald-200 text-sm font-bold px-3.5 py-1.5 rounded-full border border-emerald-400/40">
        Free
      </span>
    );
  }

  const hasDiscount =
    program.originalPrice != null &&
    program.originalPrice > program.price &&
    program.price > 0;

  if (!hasDiscount) {
    return (
      <span className="bg-amber-500/25 text-amber-100 text-sm font-bold px-3.5 py-1.5 rounded-full border border-amber-400/40">
        <DisplayPrice price={program.price} currency={program.currency} />
      </span>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-blue-200/70 text-sm line-through decoration-red-400/80 decoration-2">
        {formatPrice(program.originalPrice, program.currency)}
      </span>
      <span className="text-white text-lg font-extrabold">
        {formatPrice(program.price, program.currency)}
      </span>
      {program.discountPercent ? (
        <span className="bg-red-500 text-white text-xs font-bold px-2.5 py-1 rounded-md uppercase tracking-wide">
          {program.discountPercent}% off
        </span>
      ) : null}
    </div>
  );
}

export default function ExpertTrainingProgramDetailPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const dispatch = useDispatch();
  const { siteName } = usePlatformSettings();
  const isAuthenticated = useSelector((s) => s.auth?.isAuthenticated);
  const user = useSelector((s) => s.auth?.user);

  const { data, isLoading, refetch } = useGetTrainingProgramBySlugQuery(slug, { skip: !slug });
  const [enrollFree, { isLoading: enrolling }] = useEnrollTrainingProgramFreeMutation();
  const [paying, setPaying] = useState(false);
  const [instructorImgError, setInstructorImgError] = useState(false);

  const raw = data?.data?.program;
  const isEnrolled = Boolean(data?.data?.isEnrolled);
  const program = useMemo(() => (raw ? mapExpertTrainingProgramRow(raw) : null), [raw]);

  const sessionStartAt = useMemo(() => {
    if (!program) return null;
    return resolveSessionStartAt({
      scheduleStart: program.scheduleStart,
      scheduleSummary: program.date,
      timeSummary: program.time,
    });
  }, [program]);

  const spotsLeft =
    program?.maxCapacity > 0 ? Math.max(0, program.maxCapacity - program.enrolledCount) : null;
  const isFull = spotsLeft === 0;
  const descriptionHtml = useMemo(
    () => sanitizeCourseDescriptionHtml(program?.description || ""),
    [program?.description],
  );
  const hasDescription = Boolean(stripHtmlToPlain(descriptionHtml));
  const courseContentHtml = useMemo(
    () => sanitizeCourseDescriptionHtml(program?.courseContent || ""),
    [program?.courseContent],
  );
  const hasCourseContent = Boolean(stripHtmlToPlain(courseContentHtml));

  const handleEnroll = async () => {
    if (!program?.id) return;
    if (!isAuthenticated) {
      navigate("/auth/login", { state: { from: location } });
      return;
    }
    if (isEnrolled) return;

    if (program.isFree) {
      try {
        await enrollFree(program.id).unwrap();
        await refetch();
        dispatch(siteContentApi.util.invalidateTags([{ type: "MyTrainingPrograms", id: "LIST" }]));
        toast({ title: "Enrolled", description: "You are enrolled in this training program." });
      } catch {
        /* toast from RTK */
      }
      return;
    }

    setPaying(true);
    try {
      await checkoutTrainingProgramPayment({
        programId: program.id,
        programTitle: program.title,
        userEmail: user?.email || user?.user_email || "",
        userName: user?.name || user?.full_name || user?.username || "",
        merchantName: siteName,
      });
      await refetch();
      dispatch(siteContentApi.util.invalidateTags([{ type: "MyTrainingPrograms", id: "LIST" }]));
      toast({ title: "Payment successful", description: "You are enrolled in this training program." });
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || "Payment could not be completed";
      if (msg !== "Payment cancelled") {
        toast({ title: "Payment failed", description: msg, variant: "destructive" });
      }
    } finally {
      setPaying(false);
    }
  };

  if (isLoading) {
    return (
      <div className="pb-16 max-w-7xl mx-auto px-4">
        <CardTableSkeleton rows={4} columns={3} showHeader={false} showActions={false} showCheckbox={false} />
      </div>
    );
  }

  if (!program) {
    return (
      <div className="pb-16 max-w-7xl mx-auto px-4 text-center">
        <p className="text-muted-foreground mb-4">Training program not found or no longer available.</p>
        <Button asChild variant="outline">
          <Link to="/training">Back to training</Link>
        </Button>
      </div>
    );
  }

  const showMeetingLink =
    isEnrolled &&
    program.meetingLink &&
    (program.trainingFormat === "live_online" || program.trainingFormat === "hybrid");
  const showVenue =
    program.venue &&
    (program.trainingFormat === "in_person" || program.trainingFormat === "hybrid");

  return (
    <div className="pb-20">
      {/* ── HERO HEADER (matches lab/course overview band) ── */}
      <div className="bg-gradient-to-br from-[#0f1f3d] via-[#1a3560] to-[#1e4080] w-full min-w-0">
        <div className="max-w-7xl mx-auto w-full min-w-0 px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <Button
            variant="ghost"
            size="sm"
            className="mb-3 -ml-2 h-8 text-blue-100/90 hover:text-white hover:bg-white/10"
            asChild
          >
            <Link to="/training">
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              Back to training
            </Link>
          </Button>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_160px] gap-4 lg:gap-8 items-start">
            <div className="flex flex-col gap-3 min-w-0 w-full">
              <div className="flex flex-wrap items-center gap-2">
                <span className={heroBadgeClass}>{formatLabel(program.trainingFormat)}</span>
                <span className={heroBadgeClass}>{formatLabel(program.level)}</span>
                {program.isFree ? (
                  <span className="bg-emerald-500/25 text-emerald-200 text-sm font-bold px-3.5 py-1.5 rounded-full border border-emerald-400/40">
                    Free
                  </span>
                ) : null}
                {program.certificateAvailable && (
                  <span className={`${heroBadgeClass} inline-flex items-center gap-1.5`}>
                    <Award className="w-3.5 h-3.5" />
                    Certificate
                  </span>
                )}
                {(program.badges || program.topics || []).map((badge, i) => (
                  <span key={i} className={customBadgeClass}>
                    {badge}
                  </span>
                ))}
              </div>

              {!program.isFree ? (
                <div className="pt-0.5">
                  <ProgramPricingRow program={program} />
                </div>
              ) : null}

              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white leading-tight tracking-tight drop-shadow-sm break-words">
                {program.title}
              </h1>

              {hasDescription ? (
                <RichTextContent
                  html={descriptionHtml}
                  showTitle={false}
                  variant="onDark"
                  className="text-base sm:text-lg max-w-3xl leading-relaxed"
                  contentClassName="rich-text-content-detail"
                />
              ) : null}

              <div className="flex flex-wrap items-center gap-3 pt-1">
                {isEnrolled ? (
                  <>
                    <div className="inline-flex items-center gap-2 text-emerald-100 bg-emerald-500/20 border border-emerald-400/30 rounded-lg py-2 px-3 text-sm font-medium">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      You are enrolled
                    </div>
                    {showMeetingLink && (
                      <Button variant="premium" size="sm" className="h-9" asChild>
                        <a href={program.meetingLink} target="_blank" rel="noopener noreferrer">
                          Join live sessions
                        </a>
                      </Button>
                    )}
                  </>
                ) : (
                  <Button
                    variant="premium"
                    size="sm"
                    className="h-9 px-5"
                    disabled={isFull || enrolling || paying}
                    onClick={handleEnroll}
                  >
                    {isFull
                      ? "Program full"
                      : enrolling || paying
                        ? "Processing…"
                        : program.isFree
                          ? "Enroll free"
                          : "Pay & enroll"}
                  </Button>
                )}
                {spotsLeft !== null && !isEnrolled && (
                  <span className="text-sm text-emerald-400 font-semibold">{spotsLeft} Spots Left</span>
                )}
              </div>
            </div>

            {/* Right: profile image + name — centered in column */}
            <div className="flex justify-center items-center w-full lg:w-[160px] mx-auto lg:mx-0">
              <div className="rounded-xl border border-white/15 bg-white/5 backdrop-blur-sm px-4 py-3 flex flex-col items-center gap-2 min-w-[120px]">
                {instructorImgError || !program.instructorImage ? (
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-premium via-orange-500 to-amber-400 flex items-center justify-center ring-2 ring-white/25 shrink-0">
                    <User className="w-9 h-9 text-white" strokeWidth={2} />
                  </div>
                ) : (
                  <img
                    src={program.instructorImage}
                    alt={program.instructor}
                    className="w-20 h-20 rounded-full object-cover ring-2 ring-white/25 shrink-0"
                    onError={() => setInstructorImgError(true)}
                  />
                )}
                <p className="text-sm font-semibold text-white text-center leading-tight max-w-[140px] truncate">
                  {program.instructor}
                </p>
                {program.instructorTitle ? (
                  <p className="text-[11px] text-blue-100/80 text-center leading-tight max-w-[140px] truncate">
                    {program.instructorTitle}
                  </p>
                ) : null}
                <div className="flex items-center justify-center gap-0.5 pt-0.5">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <span
                      key={i}
                      className={
                        i <= Math.round(Number(program.rating || 0))
                          ? "text-yellow-400 text-xs"
                          : "text-white/25 text-xs"
                      }
                    >
                      ★
                    </span>
                  ))}
                  <span className="font-bold text-white text-xs ml-1">
                    {Number(program.rating || 0).toFixed(1)}
                  </span>
                </div>
                {program.instructorProfileUrl ? (
                  <a
                    href={program.instructorProfileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-blue-200 hover:text-white underline text-center"
                  >
                    View profile
                  </a>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-10 pb-16 space-y-6 sm:space-y-8">
        {sessionStartAt && <SessionCountdown startAt={sessionStartAt} />}

        <Card variant="outline" className="h-auto border-border/70 shadow-sm">
          <CardContent className="p-6 sm:p-8 flex-none space-y-5">
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Program details</h2>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
                  <div className="flex items-start gap-4">
                    <TrainingDetailIcon icon={Calendar} tone="blue" />
                    <div>
                      <p className="font-semibold text-foreground">Schedule</p>
                      <p className="text-muted-foreground text-base mt-1">{program.date}</p>
                      <p className="text-muted-foreground text-base">{program.time}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <TrainingDetailIcon icon={Clock} tone="amber" />
                    <div>
                      <p className="font-semibold text-foreground">Duration</p>
                      <p className="text-muted-foreground text-base mt-1">{program.duration}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <TrainingDetailIcon icon={Layers} tone="violet" />
                    <div>
                      <p className="font-semibold text-foreground">Live sessions</p>
                      <p className="text-muted-foreground text-base mt-1">
                        {program.sessionCount} session{program.sessionCount === 1 ? "" : "s"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <TrainingDetailIcon icon={Languages} tone="indigo" />
                    <div>
                      <p className="font-semibold text-foreground">Language</p>
                      <p className="text-muted-foreground text-base mt-1">{program.language}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <TrainingDetailIcon icon={Users} tone="emerald" />
                    <div>
                      <p className="font-semibold text-foreground">Availability</p>
                      <p className="text-muted-foreground text-base mt-1 font-medium text-emerald-600">
                        {spotsLeft !== null ? `${spotsLeft} Spots Left` : "Open registration"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <TrainingDetailIcon icon={Globe} tone="sky" />
                    <div>
                      <p className="font-semibold text-foreground">Format</p>
                      <p className="text-muted-foreground text-base mt-1">{formatLabel(program.trainingFormat)}</p>
                    </div>
                  </div>
                  {showVenue && (
                    <div className="flex items-start gap-3 sm:col-span-2">
                      <TrainingDetailIcon icon={MapPin} tone="rose" />
                      <div>
                        <p className="font-medium">Venue</p>
                        <p className="text-muted-foreground">{program.venue}</p>
                      </div>
                    </div>
                  )}
                  {showMeetingLink && (
                    <div className="flex items-start gap-3 sm:col-span-2">
                      <TrainingDetailIcon icon={Link2} tone="orange" />
                      <div>
                        <p className="font-medium">Join link</p>
                        <a
                          href={program.meetingLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline break-all"
                        >
                          {program.meetingLink}
                        </a>
                      </div>
                    </div>
                  )}
                  {!isEnrolled &&
                    program.trainingFormat !== "in_person" &&
                    program.meetingLink && (
                      <p className="text-xs text-muted-foreground sm:col-span-2">
                        Meeting link is shared after you enroll.
                      </p>
                    )}
                </div>
          </CardContent>
        </Card>

        <div className="space-y-6 sm:space-y-8 min-w-0">
            {program.prerequisites && (
              <Card variant="outline" className="h-auto border-border/70 shadow-sm">
                <CardContent className="p-6 sm:p-8 flex-none">
                  <h2 className="text-xl sm:text-2xl font-bold tracking-tight mb-4 flex items-center gap-3">
                    <TrainingDetailIcon icon={BookOpen} tone="amber" className="h-10 w-10" />
                    Prerequisites
                  </h2>
                  <p className="text-base text-muted-foreground leading-relaxed whitespace-pre-wrap">
                    {program.prerequisites}
                  </p>
                </CardContent>
              </Card>
            )}

            {hasCourseContent && (
              <Card variant="outline" className="h-auto border-border/70 shadow-sm">
                <CardContent className="p-6 sm:p-8 flex-none">
                  <h2 className="text-xl sm:text-2xl font-bold tracking-tight mb-5">Course content</h2>
                  <RichTextContent
                    html={courseContentHtml}
                    showTitle={false}
                    contentClassName="rich-text-content-detail"
                  />
                </CardContent>
              </Card>
            )}

            {program.learningOutcomes.length > 0 && (
              <Card variant="outline" className="h-auto border-border/70 shadow-sm">
                <CardContent className="p-6 sm:p-8 flex-none">
                  <h2 className="text-xl sm:text-2xl font-bold tracking-tight mb-5">Learning outcomes</h2>
                  <ul className="list-disc pl-6 space-y-2.5 text-base text-muted-foreground leading-relaxed">
                    {program.learningOutcomes.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

        </div>
      </div>
    </div>
  );
}
