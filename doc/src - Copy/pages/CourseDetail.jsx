import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, Link, useNavigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { useEnrollCourseMutation } from "@/store/api/learningApi";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LabCard } from "@/components/cards/LabCard";
import {
  ArrowLeft,
  Clock,
  Star,
  Users,
  Lock,
  Layers,
  Award,
  CheckCircle2,
  BookOpen,
  FlaskConical,
  Zap
} from "lucide-react";
import DetailPageSkeleton from "../components/common/Detailpageskeleton";
import api from "@/lib/axios";
import { showError } from "@/lib/toast-utils";
import { resolveMediaUrl } from "@/lib/mediaUrl";
import { pickCourseDescriptionHtml } from "@/lib/sanitizeCourseHtml";
import HlsVideo from "@/components/media/HlsVideo";

function stripHtmlToPlain(s) {
  if (s == null || s === "") return "";
  return String(s)
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function decodeHtmlEntities(s) {
  if (s == null) return "";
  const str = String(s);
  if (!str.includes("&lt;") && !str.includes("&gt;") && !str.includes("&amp;") && !str.includes("&#")) return str;
  if (typeof document === "undefined") return str;
  const ta = document.createElement("textarea");
  ta.innerHTML = str;
  return ta.value;
}

/** Same idea as backend parseMetadata — API may return JSON as string */
function parseMeta(raw) {
  if (raw == null || raw === "") return {};
  if (typeof raw === "object" && !Array.isArray(raw)) return raw;
  if (typeof raw === "string") {
    try {
      const o = JSON.parse(raw);
      if (typeof o === "string") {
        try {
          const t = JSON.parse(o);
          return typeof t === "object" && t !== null && !Array.isArray(t) ? t : {};
        } catch {
          return {};
        }
      }
      return typeof o === "object" && o !== null && !Array.isArray(o) ? o : {};
    } catch {
      return {};
    }
  }
  return {};
}

/** Maps GET /courses/slug/:slug/view payload to CourseDetail state (detail + lab list). */
function mapCourseDetailPayload(payload) {
  if (!payload || typeof payload !== "object") return null;
  const meta = parseMeta(payload.metadata);
  const learnFromMeta = Array.isArray(meta.learning_outcomes)
    ? meta.learning_outcomes
    : Array.isArray(meta.whatYouLearn)
      ? meta.whatYouLearn
      : [];
  const learn = Array.isArray(payload.whatYouWillLearn) && payload.whatYouWillLearn.length
    ? payload.whatYouWillLearn
    : Array.isArray(payload.whatYouLearn) && payload.whatYouLearn.length
      ? payload.whatYouLearn
      : Array.isArray(payload.learningOutcomes) && payload.learningOutcomes.length
        ? payload.learningOutcomes
        : learnFromMeta;
  const normalizedLearn = learn.map((x) => (typeof x === "string" ? x : x?.text || "")).filter(Boolean);

  const modules =
    Array.isArray(payload.modules) && payload.modules.length
      ? payload.modules
      : Array.isArray(meta.modules)
        ? meta.modules
        : [];
  const requirements =
    Array.isArray(payload.requirements) && payload.requirements.length
      ? payload.requirements
      : Array.isArray(meta.requirements)
        ? meta.requirements
        : [];
  const courseNotes =
    Array.isArray(payload.courseNotes) && payload.courseNotes.length
      ? payload.courseNotes
      : Array.isArray(meta.course_notes)
        ? meta.course_notes
        : Array.isArray(meta.courseNotes)
          ? meta.courseNotes
          : [];
  const techStack =
    Array.isArray(payload.techStack) && payload.techStack.length
      ? payload.techStack
      : Array.isArray(meta.tech_stack)
        ? meta.tech_stack
        : Array.isArray(meta.techStack)
          ? meta.techStack
          : [];

  const headerBlock =
    payload.header && typeof payload.header === "object" ? payload.header : null;

  const heroFromApi =
    (payload.heroHeader && typeof payload.heroHeader === "object" && Object.keys(payload.heroHeader).length
      ? payload.heroHeader
      : null) ||
    (meta.hero_header && typeof meta.hero_header === "object" ? meta.hero_header : null) ||
    (meta.heroHeader && typeof meta.heroHeader === "object" ? meta.heroHeader : null) ||
    headerBlock;

  const introVideoRaw =
    payload.introVideoUrl || meta.intro_video_url || meta.introVideoUrl || "";

  const detail = {
    id: payload.id,
    title: payload.title,
    code: payload.code ?? meta.code,
    slug: payload.slug,
    description: payload.description || "",
    shortDescription: payload.shortDescription ?? meta.short_description,
    fullDescription: payload.fullDescription ?? meta.full_description,
    thumbnail:
      resolveMediaUrl(payload.thumbnail || payload.thumbnailUrl) ||
      "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800",
    category: payload.category,
    platform: payload.platform ?? meta.platform,
    isFree: !!payload.isFree,
    price: payload.price ?? 0,
    currency: payload.currency || "USD",
    duration: payload.duration || "N/A",
    durationMinutes: payload.durationMinutes,
    level: payload.level || "Beginner",
    rating: payload.rating ?? 4.8,
    enrolledCount: payload.enrolledCount ?? 0,
    labsCount:
      payload.labsCount ?? (Array.isArray(payload.includedLabs) ? payload.includedLabs.length : 0),
    isPurchased: !!payload.isPurchased,
    contentLocked: !!payload.contentLocked,
    whatYouWillLearn: normalizedLearn,
    modules,
    requirements,
    courseNotes,
    techStack,
    media: Array.isArray(payload.media) ? payload.media : [],
    completionMessage: payload.completionMessage,
    pricingModel: payload.pricingModel,
    status: payload.status,
    heroHeader: heroFromApi,
    header: headerBlock,
    introVideoUrl: introVideoRaw ? resolveMediaUrl(introVideoRaw) : "",
    heroSubheadline: heroFromApi?.subheadline || meta.subheadline,
  };

  const includedLabs = (payload.includedLabs || []).map((lab) => ({
    ...lab,
    thumbnail: resolveMediaUrl(lab.thumbnail),
  }));

  return { detail, includedLabs };
}

export default function CourseDetailPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isApprovalPreview = location.pathname.startsWith("/approval-preview/");
  const isAuthenticated = useSelector((s) => s.auth?.isAuthenticated);
  const [enrollCourse, { isLoading: enrolling }] = useEnrollCourseMutation();

  const [isLoading, setIsLoading] = useState(true);
  const [groupLabData, setGroupLabData] = useState(null);
  const [includedLabs, setIncludedLabs] = useState([]);
  const [notFound, setNotFound] = useState(false);
  const curriculumRef = useRef(null);
  const previewRef = useRef(null);
  const labsSectionRef = useRef(null);

  const loadCourseDetail = useCallback(async () => {
    if (!slug) return;
    setIsLoading(true);
    try {
      const path = `/courses/slug/${encodeURIComponent(slug)}/view`;
      const res = await api.get(path, { withCredentials: true });
      const raw = res?.data?.data;
      const payload =
        raw && typeof raw === "object" ? (raw.course && !raw.title ? raw.course : raw) : null;
      const mapped = mapCourseDetailPayload(payload);
      if (mapped) {
        setGroupLabData(mapped.detail);
        setIncludedLabs(mapped.includedLabs);
        setNotFound(false);
      } else {
        setGroupLabData(null);
        setIncludedLabs([]);
        setNotFound(true);
      }
    } catch {
      console.error(`Failed to load course detail for: ${slug}`);
      setGroupLabData(null);
      setIncludedLabs([]);
      setNotFound(true);
    } finally {
      setIsLoading(false);
    }
  }, [slug, location.key]);

  useEffect(() => {
    loadCourseDetail();
  }, [loadCourseDetail]);

  const completedLabs = (includedLabs || []).filter(l => l.completed).length;
  const progressPercent = (includedLabs && includedLabs.length)
    ? Math.round((completedLabs / includedLabs.length) * 100)
    : 0;

  const hero = (groupLabData && groupLabData.heroHeader) || {};
  const showHeroPrimary = hero.showCta !== false;
  const showHeroSecondary = hero.showSecondaryCta !== false;
  /** Backend sets isPurchased when the user has an active enrollment row. */
  const isEnrolled = !!groupLabData?.isPurchased;
  /** Same rule as before: free bundles show lab list without paywall; paid requires enrollment/purchase. */
  const hasCourseAccess = !!(groupLabData?.isFree || groupLabData?.isPurchased);

  const previewLessonVideo = (groupLabData?.media || []).find(
    (m) => m.type === "video" && (m.is_preview || m.url)
  );
  const introPlayUrl =
    (groupLabData?.introVideoUrl && String(groupLabData.introVideoUrl).trim()) ||
    (previewLessonVideo?.url ? resolveMediaUrl(previewLessonVideo.url) : "");

  const headerContentHtml = decodeHtmlEntities(groupLabData?.header?.content || "");
  const headerHeadlineHtml = decodeHtmlEntities(groupLabData?.header?.headline || "");
  const headerSubheadlineHtml = decodeHtmlEntities(groupLabData?.header?.subheadline || "");
  const showHeaderBanner = !!(
    !isApprovalPreview &&
    groupLabData?.header?.enabled &&
    (
      String(headerContentHtml).trim() ||
      String(headerHeadlineHtml).trim() ||
      String(headerSubheadlineHtml).trim()
    )
  );
  const showFooterBanner =
    !!(!isApprovalPreview && groupLabData?.footer?.enabled && String(groupLabData?.footer?.content || "").trim());

  const scrollToCurriculum = () => {
    if (curriculumRef.current) {
      curriculumRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      previewRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };
  const scrollToLabs = useCallback(() => {
    labsSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const handleHeroPrimary = useCallback(async () => {
    if (isApprovalPreview) return;
    if (!groupLabData?.id) return;
    if (!isAuthenticated) {
      navigate("/auth/login", { state: { from: location } });
      return;
    }
    if (isEnrolled) {
      scrollToLabs();
      return;
    }
    try {
      await enrollCourse({
        courseId: groupLabData.id,
        confirmPurchase: !groupLabData.isFree,
      }).unwrap();
      await loadCourseDetail();
      setTimeout(() => scrollToLabs(), 150);
    } catch {
      /* Paid checkout / errors — toast from RTK */
    }
  }, [
    groupLabData?.id,
    groupLabData?.isFree,
    isAuthenticated,
    isEnrolled,
    enrollCourse,
    loadCourseDetail,
    navigate,
    location,
    scrollToLabs,
    isApprovalPreview,
  ]);

  const onHeroSecondaryClick = () => {
    scrollToCurriculum();
  };

  const handleDownloadCertificate = async () => {
    if (!groupLabData?.id) return;
    try {
      const res = await api.get(`/me/courses/${groupLabData.id}/certificate`, {
        params: { format: "html" },
        responseType: "text",
        headers: { Accept: "text/html" },
      });
      const html = typeof res.data === "string" ? res.data : "";
      if (!html.trim()) {
        showError("Certificate", "Could not load certificate.");
        return;
      }
      const win = window.open("", "_blank");
      if (!win) {
        showError("Certificate", "Allow pop-ups to print your certificate.");
        return;
      }
      win.document.open();
      win.document.write(html);
      win.document.close();
      setTimeout(() => win.print(), 300);
    } catch (e) {
      const msg =
        e?.response?.data?.message ||
        (typeof e?.response?.data === "string" ? e.response.data : null) ||
        e?.message ||
        "Could not issue certificate.";
      showError("Certificate", String(msg));
    }
  };

  if (isLoading) {
    return <DetailPageSkeleton type="bundle" gridItems={5} />;
  }

  if (!groupLabData || notFound) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
        <div className="text-5xl">🔍</div>
        <h2 className="text-xl font-bold text-foreground">Course not found</h2>
        <Link to="/courses" className="text-primary font-semibold hover:underline flex items-center gap-1.5">
          <ArrowLeft className="w-4 h-4" /> Back to Courses
        </Link>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-background">

      <main className="pt-20">
        {/* Header */}
        <div className="bg-gradient-to-b from-primary/10 to-background border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {showHeaderBanner && (
              <div
                className="mb-5 rounded-xl border px-4 py-3 text-sm"
                style={{
                  background: groupLabData.header.bgColor || "#eff6ff",
                  color: groupLabData.header.textColor || "#1f2937",
                  borderColor: "rgba(0,0,0,.08)",
                }}
              >
                {String(headerContentHtml).trim() ? (
                  <div dangerouslySetInnerHTML={{ __html: headerContentHtml }} />
                ) : (
                  <div>
                    {String(headerHeadlineHtml).trim() && (
                      <h3
                        className="text-base md:text-lg font-semibold leading-snug"
                        dangerouslySetInnerHTML={{ __html: headerHeadlineHtml }}
                      />
                    )}
                    {String(headerSubheadlineHtml).trim() && (
                      <div
                        className="mt-1 text-sm opacity-90 leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: headerSubheadlineHtml }}
                      />
                    )}
                  </div>
                )}
              </div>
            )}
            <Link to="/courses" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors">
              <ArrowLeft className="w-4 h-4" />
              Back to courses
            </Link>

            <div className="grid lg:grid-cols-10 gap-8">
              {/* Main Info */}
              <div className="lg:col-span-7">
                <div className="flex items-center gap-3 mb-4">
                  <Badge variant={groupLabData.isFree ? "free" : "paid"}>
                    {groupLabData.isFree ? "FREE" : `$${groupLabData.price}`}
                  </Badge>
                  <Badge variant="secondary" className="bg-primary text-primary-foreground">
                    <Layers className="w-3 h-3 mr-1" />
                    {groupLabData.labsCount} Labs Bundle
                  </Badge>
                </div>

                <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
                  {groupLabData.title}
                </h1>
                {groupLabData.heroSubheadline && (() => {
                  const heroSubheadlineHtml = decodeHtmlEntities(groupLabData.heroSubheadline);
                  if (/<[a-z][\s\S]*>/i.test(heroSubheadlineHtml)) {
                    return (
                      <p
                        className="text-lg text-muted-foreground mb-4"
                        dangerouslySetInnerHTML={{ __html: heroSubheadlineHtml }}
                      />
                    );
                  }
                  return <p className="text-lg text-muted-foreground mb-4">{heroSubheadlineHtml}</p>;
                })()}
                {(groupLabData.code || groupLabData.category || groupLabData.platform) && (
                  <div className="flex flex-wrap gap-2 mb-4 text-sm text-muted-foreground">
                    {groupLabData.code && <span className="font-mono bg-muted px-2 py-0.5 rounded">{groupLabData.code}</span>}
                    {groupLabData.category && <span>{groupLabData.category}</span>}
                    {groupLabData.platform && <span>· {groupLabData.platform}</span>}
                  </div>
                )}

                {Array.isArray(groupLabData.techStack) && groupLabData.techStack.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {groupLabData.techStack.map((s, i) => (
                      <Badge key={i} variant="secondary" className="text-xs font-normal">
                        {typeof s === "string" ? s : s?.name || s?.label || "Skill"}
                      </Badge>
                    ))}
                  </div>
                )}

                {(() => {
                  const html = decodeHtmlEntities(pickCourseDescriptionHtml(groupLabData));
                  const plainFallback =
                    stripHtmlToPlain(groupLabData.shortDescription) ||
                    stripHtmlToPlain(groupLabData.description) ||
                    "";
                  if (html) {
                    return (
                      <div
                        className="text-lg text-muted-foreground mb-6 prose prose-sm dark:prose-invert max-w-none [&_p]:mb-2"
                        dangerouslySetInnerHTML={{ __html: html }}
                      />
                    );
                  }
                  if (plainFallback) {
                    return (
                      <p className="text-lg text-muted-foreground mb-6 leading-relaxed whitespace-pre-wrap">
                        {plainFallback}
                      </p>
                    );
                  }
                  return null;
                })()}

                {introPlayUrl && (
                  <div className="mb-6 rounded-xl overflow-hidden border bg-muted/30 aspect-video max-w-3xl">
                    {/\.m3u8($|\?)/i.test(introPlayUrl) ? (
                      <HlsVideo
                        src={introPlayUrl}
                        className="w-full h-full min-h-[200px] object-contain bg-black"
                      />
                    ) : (
                      <video className="w-full h-full object-contain bg-black" controls playsInline src={introPlayUrl} />
                    )}
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span>{groupLabData.duration}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 fill-premium text-premium" />
                    <span className="font-medium">{groupLabData.rating}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    <span>{(groupLabData.enrolledCount ?? 0).toLocaleString()} enrolled</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4" />
                    <span>{groupLabData.labsCount} labs included</span>
                  </div>
                </div>

                {/* Enroll button here below content */}
                {(showHeroPrimary || showHeroSecondary) && (
                  <div className="flex flex-wrap gap-3 mt-6">
                    {showHeroPrimary && !isEnrolled && (
                      <Button
                        size="lg"
                        type="button"
                        disabled={enrolling || isApprovalPreview}
                        onClick={handleHeroPrimary}
                      >
                        {isApprovalPreview
                          ? "Approval preview (enroll disabled)"
                          : !isAuthenticated
                            ? "Sign in to enroll"
                            : hero.ctaLabel ||
                            hero.cta_label ||
                            (groupLabData.isFree ? "Start free" : "Enroll now")}
                      </Button>
                    )}
                    {showHeroSecondary && (
                      <Button size="lg" type="button" variant="outline" onClick={isEnrolled ? scrollToLabs : onHeroSecondaryClick}>
                        {isEnrolled ? "Go to Labs" : (hero.ctaSecondaryLabel || hero.cta_secondary_label || "Preview course")}
                      </Button>
                    )}
                  </div>
                )}
              </div>

              {/* Sidebar: 30% width, rounded border, good padding */}
              <div className="lg:col-span-3 w-full self-start">
                <div className="rounded-2xl border-2 border-muted overflow-hidden bg-background p-3">
                  <div className="relative w-full aspect-video overflow-hidden bg-muted/50 rounded-xl shrink-0">
                    <img
                      src={groupLabData.thumbnail}
                      alt={groupLabData.title}
                      className="absolute inset-0 h-full w-full object-cover"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-foreground/40 to-transparent pointer-events-none" />
                    <div className="absolute bottom-3 left-3 right-3">
                      <Badge variant="secondary" className="bg-background/95 text-foreground">
                        <Layers className="w-3 h-3 mr-1" />
                        {groupLabData.labsCount} Labs Bundle
                      </Badge>
                    </div>
                  </div>
                  <div className="p-3">
                    {(groupLabData.isPurchased || groupLabData.isFree) ? (
                      <div className="space-y-3">
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium">Bundle Progress</span>
                            <span className="text-sm text-muted-foreground">{progressPercent}%</span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-500"
                              style={{ width: `${progressPercent}%` }}
                            />
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {completedLabs} of {includedLabs.length} labs completed
                          </p>
                        </div>
                        {progressPercent === 100 && (
                          <Button size="lg" className="w-full" variant="success" onClick={handleDownloadCertificate}>
                            <Award className="w-5 h-5 mr-2" />
                            Download Certificate
                          </Button>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="text-center">
                          <div className="flex items-baseline justify-center gap-2">
                            <span className="text-sm text-muted-foreground line-through">$290</span>
                            <span className="text-3xl font-bold text-foreground">${groupLabData.price}</span>
                          </div>
                          <p className="text-sm text-success font-medium">Save 49%</p>
                        </div>
                        <Button
                          size="lg"
                          className="w-full"
                          variant="premium"
                          disabled={enrolling || isApprovalPreview}
                          onClick={handleHeroPrimary}
                        >
                          <Lock className="w-5 h-5 mr-2" />
                          {isApprovalPreview ? "Approval preview (purchase disabled)" : (groupLabData.isFree ? "Start free" : "Unlock bundle")}
                        </Button>
                        <p className="text-xs text-center text-muted-foreground">
                          Lifetime access to all labs
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Media Gallery */}
        {Array.isArray(groupLabData.media) && groupLabData.media.filter(m => m.type === "image").length > 0 && (
          <Card className="mb-8">
            <CardContent className="p-6">
              <h2 className="text-xl font-bold mb-4">Course Gallery</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {groupLabData.media.filter(m => m.type === "image").slice(0, 4).map((media, index) => (
                  <div key={index} className="relative aspect-square rounded-lg overflow-hidden border bg-muted">
                    <img
                      src={resolveMediaUrl(media.url)}
                      alt={`Course image ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* What You'll Learn */}
          <Card ref={previewRef} className="mb-8 scroll-mt-24">
            <CardContent className="p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-success" />
                What You'll Learn
              </h2>
              <div className="grid sm:grid-cols-2 gap-3">
                {(groupLabData.whatYouWillLearn || []).map((item, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-success mt-0.5 shrink-0" />
                    <span className="text-muted-foreground">{item}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {Array.isArray(groupLabData.modules) && groupLabData.modules.length > 0 && (
            <Card ref={curriculumRef} className="mb-8">
              <CardHeader>
                <CardTitle>Curriculum</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {groupLabData.modules.map((mod, i) => {
                  const items = Array.isArray(mod.items) ? mod.items : (mod.lessons || []);
                  return (
                    <div key={i} className="border-b border-border last:border-0 pb-4 last:pb-0">
                      <h3 className="font-semibold text-foreground mb-2">{mod.title}</h3>
                      <ul className="list-none pl-0 space-y-2">
                        {items.map((item, j) => {
                          let IconComponent = BookOpen;
                          let itemType = "Lesson";
                          let iconColor = "text-blue-500";

                          if (item.type === "normal_lab" || item.type === "lab") {
                            IconComponent = FlaskConical;
                            itemType = "Normal Lab";
                            iconColor = "text-orange-500";
                          } else if (item.type === "skill_builder_lab") {
                            IconComponent = Zap;
                            itemType = "Skill Builder Lab";
                            iconColor = "text-purple-500";
                          }

                          return (
                            <li key={j} className="flex items-start gap-3">
                              <IconComponent className={`w-5 h-5 mt-0.5 shrink-0 ${iconColor}`} />
                              <div className="flex-1">
                                <span className="font-medium text-foreground">{item.title}</span>
                                <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                                  <Badge variant="outline" className="text-[10px] px-1.5 py-0.5">
                                    {itemType}
                                  </Badge>
                                  {item.duration && (
                                    <span className="flex items-center gap-1">
                                      <Clock className="w-3 h-3" />
                                      {item.duration}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {/* Included Labs */}
          <h2 ref={labsSectionRef} className="text-2xl font-bold mb-6 scroll-mt-24">
            Labs Included in This Bundle
          </h2>

          {(groupLabData.isPurchased || groupLabData.isFree) ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {includedLabs.map((lab) => (
                <div key={lab.id} className="relative w-fit">
                  {lab.completed && (
                    <div className="absolute -top-2 -right-2 z-10">
                      <div className="w-8 h-8 rounded-full bg-success flex items-center justify-center shadow-md">
                        <CheckCircle2 className="w-5 h-5 text-success-foreground" />
                      </div>
                    </div>
                  )}
                  <LabCard
                    {...lab}
                    isLocked={lab.isLocked}
                    isFree={lab.isFree}
                    slug={lab.slug}
                    thumbnail={lab.thumbnail}
                    labKind={lab.lab_kind || lab.labKind}
                    labHref={
                      lab.slug
                        ? `/labs/${encodeURIComponent(lab.slug)}/start?fromCourse=${encodeURIComponent(slug)}`
                        : "#"
                    }
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="relative">
              <div className="absolute inset-0 backdrop-blur-sm bg-background/80 z-10 flex items-center justify-center rounded-xl">
                <div className="text-center p-8">
                  <Lock className="w-16 h-16 text-premium mx-auto mb-4" />
                  <h3 className="text-xl font-bold mb-2">Unlock All Labs</h3>
                  <p className="text-muted-foreground mb-6 max-w-md">
                    Get access to all {groupLabData.labsCount} labs and earn your bundle certificate.
                  </p>
                  <Button variant="premium" size="lg">
                    Unlock for ${groupLabData.price}
                  </Button>
                </div>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 opacity-50">
                {includedLabs.map((lab) => (
                  <LabCard key={lab.id} {...lab} isLocked slug={lab.slug} thumbnail={lab.thumbnail} />
                ))}
              </div>
            </div>
          )}

          {/* Bundle Certificate */}
          {(groupLabData.isPurchased || groupLabData.isFree) && (
            <Card className="mt-12 bg-gradient-to-br from-premium/10 to-background border-premium/20">
              <CardContent className="p-8 text-center">
                <Award className="w-16 h-16 text-premium mx-auto mb-4" />
                <h3 className="text-2xl font-bold mb-2">Bundle Certificate</h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  Complete all {groupLabData.labsCount} labs to unlock your AWS Solutions Architect Lab Bundle certificate.
                </p>
                <div className="flex items-center justify-center gap-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-foreground">{completedLabs}</div>
                    <p className="text-sm text-muted-foreground">Completed</p>
                  </div>
                  <div className="w-px h-12 bg-border" />
                  <div className="text-center">
                    <div className="text-3xl font-bold text-muted-foreground">{includedLabs.length - completedLabs}</div>
                    <p className="text-sm text-muted-foreground">Remaining</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {showFooterBanner && (
            <div
              className="mt-8 rounded-xl border px-4 py-3 text-sm"
              style={{
                background: groupLabData.footer.bgColor || "#eff6ff",
                color: groupLabData.footer.textColor || "#1f2937",
                borderColor: "rgba(0,0,0,.08)",
              }}
              dangerouslySetInnerHTML={{ __html: decodeHtmlEntities(groupLabData.footer.content) }}
            />
          )}
        </div>
      </main>
    </div>
  );
}
