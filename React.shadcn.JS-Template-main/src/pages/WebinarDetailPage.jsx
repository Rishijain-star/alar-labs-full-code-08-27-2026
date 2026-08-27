import { useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import {
  ArrowLeft,
  Calendar,
  Clock,
  Users,
  Video,
  MapPin,
  Link2,
  Globe,
  CheckCircle2,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import TrainingDetailIcon from "@/components/training/TrainingDetailIcon";
import { useToast } from "@/hooks/use-toast";
import { useGetWebinarBySlugQuery, useRegisterWebinarFreeMutation } from "@/store/api/webinarApi";
import { mapWebinarRow } from "@/lib/mapWebinarRow";
import { resolveSessionStartAt } from "@/lib/sessionCountdown";
import SessionCountdown from "@/components/training/SessionCountdown";
import { DisplayPrice } from "@/components/common/PriceBadge";
import { checkoutWebinarPayment } from "@/lib/razorpayCheckout";
import { formatSpotsLeft } from "@/lib/webinarDisplay";
import { usePlatformSettings } from "@/context/PlatformSettingsContext";
import { CardTableSkeleton } from "@/components/common/TableSkeleton";
import { learningApi } from "@/store/api/learningApi";
import RichTextContent from "@/components/learning/RichTextContent";
import { sanitizeCourseDescriptionHtml } from "@/lib/sanitizeCourseHtml";
import { stripHtmlToPlain } from "@/lib/stripHtml";
import { WebinarLiveStatusBadge, WebinarStatusHeader } from "@/components/training/WebinarLiveStatus";

const heroBadgeClass =
  "bg-white/15 text-white text-sm font-bold px-3.5 py-1.5 rounded-full border border-white/20";
const customBadgeClass =
  "bg-orange-500 text-white text-sm font-bold px-3.5 py-1.5 rounded-full";

function WebinarPricingRow({ webinar }) {
  const { formatPrice } = usePlatformSettings();
  if (webinar.isFree) {
    return (
      <span className="bg-emerald-500/25 text-emerald-200 text-sm font-bold px-3.5 py-1.5 rounded-full border border-emerald-400/40">
        Free
      </span>
    );
  }

  const hasDiscount =
    webinar.originalPrice != null &&
    webinar.originalPrice > webinar.price &&
    webinar.price > 0;

  if (!hasDiscount) {
    return (
      <span className="bg-amber-500/25 text-amber-100 text-sm font-bold px-3.5 py-1.5 rounded-full border border-amber-400/40">
        <DisplayPrice price={webinar.price} currency={webinar.currency} />
      </span>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-blue-200/70 text-sm line-through decoration-red-400/80 decoration-2">
        {formatPrice(webinar.originalPrice, webinar.currency)}
      </span>
      <span className="text-white text-lg font-extrabold">
        {formatPrice(webinar.price, webinar.currency)}
      </span>
      {webinar.discountPercent ? (
        <span className="bg-red-500 text-white text-xs font-bold px-2.5 py-1 rounded-md uppercase tracking-wide">
          {webinar.discountPercent}% off
        </span>
      ) : null}
    </div>
  );
}

function deliveryLabel(mode) {
  if (mode === "offline") return "In-person";
  if (mode === "hybrid") return "Hybrid (online + venue)";
  return "Live online";
}

export default function WebinarDetailPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const dispatch = useDispatch();
  const { siteName } = usePlatformSettings();
  const isAuthenticated = useSelector((s) => s.auth?.isAuthenticated);
  const user = useSelector((s) => s.auth?.user);

  const { data, isLoading, refetch } = useGetWebinarBySlugQuery(slug, { skip: !slug });
  const [registerFree, { isLoading: registering }] = useRegisterWebinarFreeMutation();
  const [paying, setPaying] = useState(false);
  const [instructorImgError, setInstructorImgError] = useState(false);

  const raw = data?.data?.webinar;
  const isRegistered = Boolean(data?.data?.isRegistered);
  const webinar = useMemo(() => (raw ? mapWebinarRow(raw) : null), [raw]);

  const sessionStartAt = useMemo(() => {
    if (!webinar) return null;
    return resolveSessionStartAt({
      startsAt: webinar.startsAt,
      scheduleSummary: webinar.date,
      timeSummary: webinar.time,
    });
  }, [webinar]);

  const spotsLeft =
    webinar?.maxCapacity > 0 ? Math.max(0, webinar.maxCapacity - webinar.enrolledCount) : null;
  const isFull = spotsLeft === 0;

  const handleRegister = async () => {
    if (!webinar?.id) return;
    if (!isAuthenticated) {
      navigate("/auth/login", { state: { from: location } });
      return;
    }
    if (isRegistered) return;

    if (webinar.isFree) {
      try {
        await registerFree(webinar.id).unwrap();
        await refetch();
        dispatch(learningApi.util.invalidateTags(["Learning"]));
        toast({ title: "Registered", description: "You are registered for this webinar." });
      } catch {
        /* toast from RTK */
      }
      return;
    }

    setPaying(true);
    try {
      await checkoutWebinarPayment({
        webinarId: webinar.id,
        webinarTitle: webinar.title,
        userEmail: user?.email || user?.user_email || "",
        userName: user?.name || user?.full_name || user?.username || "",
        merchantName: siteName,
      });
      await refetch();
      dispatch(learningApi.util.invalidateTags(["Learning"]));
      toast({ title: "Payment successful", description: "You are registered for this webinar." });
    } catch (err) {
      const msg =
        err?.data?.message ||
        err?.response?.data?.message ||
        err?.message ||
        "Payment could not be completed";
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

  if (!webinar) {
    return (
      <div className="pb-16 max-w-7xl mx-auto px-4 text-center">
        <p className="text-muted-foreground mb-4">Webinar not found or no longer available.</p>
        <Button asChild variant="outline">
          <Link to="/training">Back to training</Link>
        </Button>
      </div>
    );
  }

  const showMeetingLink =
    isRegistered &&
    webinar.meetingLink &&
    (webinar.deliveryMode === "online" || webinar.deliveryMode === "hybrid");
  const showVenue =
    webinar.venue && (webinar.deliveryMode === "offline" || webinar.deliveryMode === "hybrid");

  return (
    <div className="pb-20">
      {/* ── HERO HEADER (matches published program detail band) ── */}
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

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_160px] gap-4 lg:gap-8 items-center">
            <div className="flex flex-col gap-3 min-w-0 w-full">
              <div className="flex flex-wrap items-center gap-2">
                <WebinarLiveStatusBadge webinar={webinar} />
                <span className={heroBadgeClass}>{deliveryLabel(webinar.deliveryMode)}</span>
                {webinar.isFree ? (
                  <span className="bg-emerald-500/25 text-emerald-200 text-sm font-bold px-3.5 py-1.5 rounded-full border border-emerald-400/40">
                    Free
                  </span>
                ) : null}
                {webinar.isRecorded ? (
                  <span className={`${heroBadgeClass} inline-flex items-center gap-1.5`}>
                    <Video className="w-3.5 h-3.5" />
                    Recording included
                  </span>
                ) : null}
                {webinar.duration ? <span className={heroBadgeClass}>{webinar.duration}</span> : null}
                {(webinar.badges || webinar.topics || []).map((badge, i) => (
                  <span key={i} className={customBadgeClass}>
                    {badge}
                  </span>
                ))}
              </div>

              {!webinar.isFree ? (
                <div className="pt-0.5">
                  <WebinarPricingRow webinar={webinar} />
                </div>
              ) : null}

              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white leading-tight tracking-tight drop-shadow-sm break-words">
                {webinar.title}
              </h1>

              {stripHtmlToPlain(webinar.description) ? (
                <RichTextContent
                  html={sanitizeCourseDescriptionHtml(webinar.description)}
                  showTitle={false}
                  variant="onDark"
                  className="text-base sm:text-lg max-w-3xl leading-relaxed"
                  contentClassName="rich-text-content-detail"
                />
              ) : null}

              <div className="flex flex-wrap items-center gap-3 pt-1">
                {isRegistered ? (
                  <>
                    <div className="inline-flex items-center gap-2 text-emerald-100 bg-emerald-500/20 border border-emerald-400/30 rounded-lg py-2 px-3 text-sm font-medium">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      You are registered
                    </div>
                    {showMeetingLink && (
                      <Button variant="premium" size="sm" className="h-9" asChild>
                        <a href={webinar.meetingLink} target="_blank" rel="noopener noreferrer">
                          Join meeting
                        </a>
                      </Button>
                    )}
                  </>
                ) : (
                  <Button
                    variant="premium"
                    size="sm"
                    className="h-9 px-5"
                    disabled={isFull || registering || paying}
                    onClick={handleRegister}
                  >
                    {isFull
                      ? "Webinar full"
                      : registering || paying
                        ? "Processing…"
                        : webinar.isFree
                          ? "Register free"
                          : "Pay & register"}
                  </Button>
                )}
                {spotsLeft !== null && !isRegistered ? (
                  <span className="text-sm text-emerald-400 font-semibold">
                    {spotsLeft} Spots Left
                  </span>
                ) : null}
              </div>
            </div>

            <div className="flex justify-center items-center w-full lg:w-[160px] mx-auto lg:mx-0">
              <div className="rounded-xl border border-white/15 bg-white/5 backdrop-blur-sm px-4 py-3 flex flex-col items-center gap-2 min-w-[120px]">
                {instructorImgError || !webinar.instructorImage ? (
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-premium via-orange-500 to-amber-400 flex items-center justify-center ring-2 ring-white/25 shrink-0">
                    <User className="w-9 h-9 text-white" strokeWidth={2} />
                  </div>
                ) : (
                  <img
                    src={webinar.instructorImage}
                    alt={webinar.instructor}
                    className="w-20 h-20 rounded-full object-contain bg-white/10 p-1 ring-2 ring-white/25 shrink-0"
                    onError={() => setInstructorImgError(true)}
                  />
                )}
                <p className="text-sm font-semibold text-white text-center leading-tight max-w-[140px] truncate">
                  {webinar.instructor}
                </p>
                {webinar.instructorTitle ? (
                  <p className="text-[11px] text-blue-100/80 text-center leading-tight max-w-[140px] truncate">
                    {webinar.instructorTitle}
                  </p>
                ) : null}
                <div className="flex items-center justify-center gap-0.5 pt-0.5">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <span
                      key={i}
                      className={
                        i <= Math.round(Number(webinar.rating || 0))
                          ? "text-yellow-400 text-xs"
                          : "text-white/25 text-xs"
                      }
                    >
                      ★
                    </span>
                  ))}
                  <span className="font-bold text-white text-xs ml-1">
                    {Number(webinar.rating || 0).toFixed(1)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-10 pb-16 space-y-6 sm:space-y-8">
        <WebinarStatusHeader webinar={webinar} />

        <Card variant="outline" className="h-auto border-border/70 shadow-sm">
          <CardContent className="p-6 sm:p-8 flex-none space-y-5">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Session details</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
              <div className="flex items-start gap-4">
                <TrainingDetailIcon icon={Calendar} tone="blue" />
                <div>
                  <p className="font-semibold text-foreground">Date</p>
                  <p className="text-muted-foreground text-base mt-1">{webinar.date}</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <TrainingDetailIcon icon={Clock} tone="amber" />
                <div>
                  <p className="font-semibold text-foreground">Time</p>
                  <p className="text-muted-foreground text-base mt-1">
                    {webinar.time}
                    {webinar.timezone ? ` (${webinar.timezone})` : ""}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <TrainingDetailIcon icon={Video} tone="violet" />
                <div>
                  <p className="font-semibold text-foreground">Duration</p>
                  <p className="text-muted-foreground text-base mt-1">{webinar.duration}</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <TrainingDetailIcon icon={Users} tone="emerald" />
                <div>
                  <p className="font-semibold text-foreground">Availability</p>
                  <p className="text-muted-foreground text-base mt-1 capitalize">
                    {spotsLeft !== null ? formatSpotsLeft(spotsLeft) : "Open registration"}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <TrainingDetailIcon icon={Globe} tone="sky" />
                <div>
                  <p className="font-semibold text-foreground">Format</p>
                  <p className="text-muted-foreground text-base mt-1">{deliveryLabel(webinar.deliveryMode)}</p>
                </div>
              </div>
              {showVenue && (
                <div className="flex items-start gap-4 sm:col-span-2 lg:col-span-3">
                  <TrainingDetailIcon icon={MapPin} tone="rose" />
                  <div>
                    <p className="font-semibold text-foreground">Venue</p>
                    <p className="text-muted-foreground text-base mt-1">{webinar.venue}</p>
                  </div>
                </div>
              )}
              {showMeetingLink && (
                <div className="flex items-start gap-4 sm:col-span-2 lg:col-span-3">
                  <TrainingDetailIcon icon={Link2} tone="orange" />
                  <div>
                    <p className="font-semibold text-foreground">Meeting link</p>
                    <a
                      href={webinar.meetingLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary text-base hover:underline break-all"
                    >
                      {webinar.meetingLink}
                    </a>
                  </div>
                </div>
              )}
              {!isRegistered && webinar.deliveryMode !== "offline" && webinar.meetingLink && (
                <p className="text-sm text-muted-foreground sm:col-span-2 lg:col-span-3">
                  Meeting link is shared after you register.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {stripHtmlToPlain(webinar.aboutContent) ? (
          <Card variant="outline" className="h-auto border-border/70 shadow-sm">
            <CardContent className="p-6 sm:p-8 flex-none">
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight mb-5">About this webinar</h2>
              <RichTextContent
                html={sanitizeCourseDescriptionHtml(webinar.aboutContent)}
                showTitle={false}
                contentClassName="rich-text-content-detail"
              />
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
