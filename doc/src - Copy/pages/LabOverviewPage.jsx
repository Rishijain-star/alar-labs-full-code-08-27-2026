import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, Link, useNavigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { useEnrollLabMutation } from "@/store/api/learningApi";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowLeft,
  Clock,
  Star,
  Users,
  Lock,
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

function mapLabDetailPayload(payload) {
  if (!payload || typeof payload !== "object") return null;
  const meta = parseMeta(payload.metadata);
  const learnFromMeta = Array.isArray(meta.learning_outcomes)
    ? meta.learning_outcomes
    : Array.isArray(meta.whatYouLearn)
      ? meta.whatYouLearn
      : [];
  const learn = Array.isArray(payload.learningOutcomes) && payload.learningOutcomes.length
    ? payload.learningOutcomes
    : Array.isArray(payload.whatYouWillLearn) && payload.whatYouWillLearn.length
      ? payload.whatYouWillLearn
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
  const techStack =
    Array.isArray(payload.technologies) && payload.technologies.length
      ? payload.technologies
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
    slug: payload.slug,
    description: payload.description || "",
    shortDescription: payload.shortDescription ?? meta.short_description,
    fullDescription: payload.fullDescription ?? meta.full_description,
    thumbnail:
      resolveMediaUrl(payload.thumbnail) ||
      "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800",
    category: payload.category,
    isFree: !!payload.isFree,
    price: payload.price ?? 0,
    duration: payload.duration || "N/A",
    durationMinutes: payload.durationMinutes,
    level: payload.level || "Beginner",
    rating: payload.rating ?? 4.8,
    enrolledCount: payload.studentCount ?? 0,
    isPurchased: !!payload.isPurchased,
    contentLocked: !!payload.contentLocked,
    whatYouWillLearn: normalizedLearn,
    modules,
    requirements,
    techStack,
    heroHeader: heroFromApi,
    header: headerBlock,
    introVideoUrl: introVideoRaw ? resolveMediaUrl(introVideoRaw) : "",
  };

  return detail;
}

export default function LabDetailPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isAuthenticated = useSelector((s) => s.auth?.isAuthenticated);
  const [enrollLab, { isLoading: enrolling }] = useEnrollLabMutation();

  const [isLoading, setIsLoading] = useState(true);
  const [groupLabData, setGroupLabData] = useState(null);
  const [notFound, setNotFound] = useState(false);

  const loadLabDetail = useCallback(async () => {
    if (!slug) return;
    setIsLoading(true);
    try {
      const path = `/labs/slug/${encodeURIComponent(slug)}/view`;
      const res = await api.get(path, { withCredentials: true });
      const raw = res?.data?.data;
      const payload =
        raw && typeof raw === "object" ? (raw.lab && !raw.title ? raw.lab : raw) : null;
      const mapped = mapLabDetailPayload(payload);
      if (mapped) {
        setGroupLabData(mapped);
        setNotFound(false);
      } else {
        setGroupLabData(null);
        setNotFound(true);
      }
    } catch {
      console.error(`Failed to load lab detail for: ${slug}`);
      setGroupLabData(null);
      setNotFound(true);
    } finally {
      setIsLoading(false);
    }
  }, [slug, location.key]);

  useEffect(() => {
    loadLabDetail();
  }, [loadLabDetail]);

  const hero = (groupLabData && groupLabData.heroHeader) || {};
  const showHeroPrimary = hero.showCta !== false;
  const showHeroSecondary = hero.showSecondaryCta !== false;
  const isEnrolled = !!groupLabData?.isPurchased;
  const hasLabAccess = !!(groupLabData?.isFree || groupLabData?.isPurchased);

  const introPlayUrl =
    (groupLabData?.introVideoUrl && String(groupLabData.introVideoUrl).trim()) ||
    "";

  const headerContentHtml = decodeHtmlEntities(groupLabData?.header?.content || "");
  const headerHeadlineHtml = decodeHtmlEntities(groupLabData?.header?.headline || "");
  const headerSubheadlineHtml = decodeHtmlEntities(groupLabData?.header?.subheadline || "");
  const showHeaderBanner = !!(
    groupLabData?.header?.enabled &&
    (
      String(headerContentHtml).trim() ||
      String(headerHeadlineHtml).trim() ||
      String(headerSubheadlineHtml).trim()
    )
  );

  const handleHeroPrimary = useCallback(async () => {
    if (!groupLabData?.id) return;
    if (!isAuthenticated) {
      navigate("/auth/login", { state: { from: location } });
      return;
    }
    if (isEnrolled) {
      navigate(`/labs/${encodeURIComponent(slug)}/start`);
      return;
    }
    try {
      await enrollLab({
        labId: groupLabData.id,
        confirmPurchase: !groupLabData.isFree,
        orderId: undefined,
      }).unwrap();
      await loadLabDetail();
      setTimeout(() => navigate(`/labs/${encodeURIComponent(slug)}/start`), 150);
    } catch {
      /* Paid checkout / errors — toast from RTK */
    }
  }, [
    groupLabData?.id,
    groupLabData?.isFree,
    isAuthenticated,
    isEnrolled,
    enrollLab,
    loadLabDetail,
    navigate,
    location,
    slug,
  ]);

  const onHeroSecondaryClick = () => {
    document.getElementById("what-you-learn")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (isLoading) {
    return <DetailPageSkeleton type="lab" gridItems={5} />;
  }

  if (!groupLabData || notFound) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
        <div className="text-5xl">🔍</div>
        <h2 className="text-xl font-bold text-foreground">Lab not found</h2>
        <Link to="/labs" className="text-primary font-semibold hover:underline flex items-center gap-1.5">
          <ArrowLeft className="w-4 h-4" /> Back to Labs
        </Link>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-background">

      <main className="pt-20">
        <div className="relative border-b">
          {/* Thumbnail as Background */}
          <div className="absolute inset-0">
            <img
              src={groupLabData.thumbnail}
              alt=""
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/80 to-background/60" />
          </div>
          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            {showHeaderBanner && (
              <div
                className="mb-5 rounded-xl border px-4 py-3 text-sm backdrop-blur-sm"
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
            <Link to="/labs" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors">
              <ArrowLeft className="w-4 h-4" />
              Back to labs
            </Link>

            <div className="grid lg:grid-cols-12 gap-8">
              <div className="lg:col-span-8">
                <div className="flex items-center gap-3 mb-4">
                  <Badge variant={groupLabData.isFree ? "free" : "paid"}>
                    {groupLabData.isFree ? "FREE" : `$${groupLabData.price}`}
                  </Badge>
                  <Badge variant="secondary" className="bg-primary text-primary-foreground">
                    <FlaskConical className="w-3 h-3 mr-1" />
                    Lab
                  </Badge>
                </div>

                <h1 className="text-3xl md:text-5xl font-bold text-foreground mb-3">
                  {groupLabData.title}
                </h1>

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
                  const plainFallback =
                    stripHtmlToPlain(groupLabData.shortDescription) ||
                    stripHtmlToPlain(groupLabData.description) ||
                    "";
                  if (plainFallback) {
                    return (
                      <p className="text-lg text-muted-foreground mb-6 leading-relaxed whitespace-pre-wrap max-w-3xl">
                        {plainFallback}
                      </p>
                    );
                  }
                  return null;
                })()}

                {introPlayUrl && (
                  <div className="mb-8 rounded-xl overflow-hidden border bg-muted/30 aspect-video w-full">
                    {/\.m3u8($|\?)/i.test(introPlayUrl) ? (
                      <HlsVideo
                        src={introPlayUrl}
                        className="w-full h-full object-contain bg-black"
                      />
                    ) : (
                      <video className="w-full h-full object-contain bg-black" controls playsInline src={introPlayUrl} />
                    )}
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground mb-6">
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
                </div>

                {(showHeroPrimary || showHeroSecondary) && (
                  <div className="flex flex-wrap gap-3">
                    {showHeroPrimary && !isEnrolled && (
                      <Button
                        size="lg"
                        type="button"
                        disabled={enrolling}
                        onClick={handleHeroPrimary}
                      >
                        {!isAuthenticated
                          ? "Sign in to enroll"
                          : hero.ctaLabel ||
                            hero.cta_label ||
                            (groupLabData.isFree ? "Start free" : "Enroll now")}
                      </Button>
                    )}
                    {showHeroSecondary && (
                      <Button size="lg" type="button" variant="outline" onClick={isEnrolled ? (() => navigate(`/labs/${encodeURIComponent(slug)}/start`)) : onHeroSecondaryClick}>
                        {isEnrolled ? "Start Lab" : (hero.ctaSecondaryLabel || hero.cta_secondary_label || "Preview lab")}
                      </Button>
                    )}
                  </div>
                )}
              </div>

              <div className="lg:col-span-4 w-full self-start">
                <Card variant="elevated" className="overflow-hidden h-auto max-w-full backdrop-blur-sm">
                  <CardContent className="p-6">
                    {(groupLabData.isPurchased || groupLabData.isFree) ? (
                      <div className="space-y-4">
                        <Button
                          size="lg"
                          className="w-full"
                          onClick={() => navigate(`/labs/${encodeURIComponent(slug)}/start`)}
                        >
                          <FlaskConical className="w-5 h-5 mr-2" />
                          Start Lab
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="text-center">
                          <div className="flex items-baseline justify-center gap-2">
                            <span className="text-sm text-muted-foreground line-through">$99</span>
                            <span className="text-3xl font-bold text-foreground">${groupLabData.price}</span>
                          </div>
                        </div>
                        <Button
                          size="lg"
                          className="w-full"
                          variant="premium"
                          disabled={enrolling}
                          onClick={handleHeroPrimary}
                        >
                          <Lock className="w-5 h-5 mr-2" />
                          {groupLabData.isFree ? "Start free" : "Unlock lab"}
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card id="what-you-learn" className="mb-8 scroll-mt-24">
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
            <Card className="mb-8">
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
                            itemType = "Lab";
                            iconColor = "text-orange-500";
                          } else if (item.type === "skill_builder_lab") {
                            IconComponent = Zap;
                            itemType = "Skill Builder";
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

          {Array.isArray(groupLabData.requirements) && groupLabData.requirements.length > 0 && (
            <Card className="mb-8">
              <CardContent className="p-6">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <Lock className="w-5 h-5 text-primary" />
                  Requirements
                </h2>
                <ul className="list-disc pl-5 space-y-2">
                  {(groupLabData.requirements || []).map((item, index) => (
                    <li key={index} className="text-muted-foreground">{item}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {groupLabData.certificate && (
            <Card className="mt-12 bg-gradient-to-br from-premium/10 to-background border-premium/20">
              <CardContent className="p-8 text-center">
                <Award className="w-16 h-16 text-premium mx-auto mb-4" />
                <h3 className="text-2xl font-bold mb-2">Lab Certificate</h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  Complete this lab to earn your certificate.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
