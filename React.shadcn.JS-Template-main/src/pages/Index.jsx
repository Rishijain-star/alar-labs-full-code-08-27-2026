import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { Footer } from "@/components/layout/Footer";
import { LabCard } from "@/components/cards/LabCard";
import { CourseCard } from "@/components/cards/CourseCard";
import AwsLogo from "@/assets/partners/aws.svg";
import AzureLogo from "@/assets/partners/azure.svg";
import GoogleCloudLogo from "@/assets/partners/google-cloud.svg";
import IbmLogo from "@/assets/partners/ibm.svg";
import OracleLogo from "@/assets/partners/oracle.svg";
import RedhatLogo from "@/assets/partners/redhat.svg";
import {
  Beaker,
  GraduationCap,
  Users,
  Award,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Star,
  BookOpen,
  Trophy,
  Target,
  TrendingUp,
  ClipboardCheck,
  Cloud,
  Briefcase,
  Tag,
  Play,
  CheckCircle2,
  Monitor,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { LabCardSkeleton } from "../components/common/LabCardSkeleton";
import { CourseCardSkeleton } from "../components/common/CourseCardSkeleton";
import SEO from "../components/Seo";
import { resolveMediaUrl } from "@/lib/mediaUrl";
import { resolveItemCurrency } from "@/lib/localeFormat";
import { cn } from "@/lib/utils";
import { normalizeCoursesPayload, normalizeLabsPayload } from "@/lib/normalizeApiPayload";
import { mapLabRowForCard } from "@/lib/labDisplayStats";
import { stripHtmlToPlain } from "@/lib/stripHtml";

import { useGetPublicLabsQuery } from "@/store/api/labApi";
import { useGetPublicCoursesQuery } from "@/store/api/courseApi";
import { useGetPublicSectionsQuery } from "@/store/api/digitalProgramApi";
import { useGetPublicBannersQuery } from "@/store/api/siteContentApi";

function formatLabDurationMinutes(minutes) {
  if (minutes == null || minutes === "") return "N/A";
  const n = Number(minutes);
  if (!Number.isFinite(n) || n <= 0) return "N/A";
  if (n >= 120) {
    const h = n / 60;
    const rounded = Math.round(h * 10) / 10;
    return `${String(rounded).replace(/\.0$/, "")} hours`;
  }
  return `${Math.round(n)} min`;
}

function mapPublicLabRow(l) {
  const levelRaw = (l.difficulty || "Intermediate").toString();
  const level =
    levelRaw.charAt(0).toUpperCase() + levelRaw.slice(1).toLowerCase();
  const stats = mapLabRowForCard(l);
  return {
    id: l.id || l._id,
    slug: l.slug,
    title: l.title,
    description: l.description || "",
    thumbnail:
      resolveMediaUrl(l.thumbnail) ||
      "https://images.unsplash.com/photo-1516116216624-53e697fedbea?w=500",
    isFree: l.is_free ?? false,
    price: l.price ?? 0,
    currency: resolveItemCurrency(l),
    duration: formatLabDurationMinutes(l.time_limit_minutes),
    level,
    rating: stats.rating,
    enrolledCount: stats.enrolledCount,
    platform: stats.platform,
    labKind: l.lab_kind || l.labKind || null,
  };
}

const stats = [
  { target: 50000, suffix: "+", label: "Learners Enrolled", icon: Users },
  { target: 500, suffix: "+", label: "Hands-on Labs", icon: Beaker },
  { target: 100, suffix: "+", label: "Courses", icon: BookOpen },
  { target: 25000, suffix: "+", label: "Certifications", icon: Award },
];

const partners = [
  {
    name: "Amazon Web Services",
    logo: AwsLogo,
  },
  {
    name: "Microsoft Azure",
    logo: AzureLogo,
  },
  {
    name: "Google Cloud",
    logo: GoogleCloudLogo,
  },
  {
    name: "IBM Cloud",
    logo: IbmLogo,
  },
  {
    name: "Oracle Cloud",
    logo: OracleLogo,
  },
  {
    name: "Red Hat",
    logo: RedhatLogo,
  },
];

const productSectionsBase = [
  {
    id: "assessment",
    sectionKey: "technology_readiness_assessment",
    title: "Technology Readiness Assessment",
    tagline: "Benchmark Your Brilliance",
    description: "Discover your ideal IT career path with our guided assessment tool.",
    icon: ClipboardCheck,
    href: "/assessment",
    color: "primary",
  },
  {
    id: "training",
    sectionKey: "expert_led_training",
    title: "Expert-Led Technology Training",
    tagline: "Learn From The Masters",
    description: "Live instructor-led sessions with industry experts and mentors.",
    icon: Users,
    href: "/training",
    color: "secondary",
  },
  {
    id: "certification",
    sectionKey: "tech_career_pathways",
    title: "Tech Career Pathways",
    tagline: "Invest In Your Future",
    description: "Your roadmap to a successful tech career — crack interviews and stand out with industry-ready resumes.",
    icon: Briefcase,
    href: "/careers",
    color: "primary",
  },
  {
    id: "cloud-services",
    sectionKey: "cloud_services",
    title: "Cloud Services",
    tagline: "Infrastructure & Catalog",
    description: "Explore multi-cloud sandbox environments, lab instances, and enterprise cloud solutions.",
    icon: Cloud,
    href: "/cloud-services",
    color: "secondary",
  },
  {
    id: "exam-topics",
    sectionKey: "exam_topics",
    title: "Exam Topics",
    tagline: "Practice & Mock Exams",
    description: "Access curated exam topic dumps, practice question sets, and timed mock certification exams.",
    icon: BookOpen,
    href: "/exam-topics",
    color: "primary",
  },
  {
    id: "certifications",
    sectionKey: "certifications",
    title: "Industry Certifications",
    tagline: "Validate Your Skills",
    description: "Earn verified credentials and badges to showcase your cloud expertise.",
    icon: Award,
    href: "/certification",
    color: "secondary",
  },
];

// Counter animation hook - resets and replays every time `visible` toggles on
// Counter animation hook
function useCounter(target, visible, duration = 3000) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!visible) return;

    let startTime;
    let animationFrameId;

    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      // Use easeOutQuart for smoother feeling
      const easeProgress = 1 - Math.pow(1 - progress, 4);
      const currentCount = Math.floor(easeProgress * target);
      setCount(currentCount);

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(animate);
      }
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationFrameId);
  }, [target, duration, visible]);

  return count;
}

// Format number with commas
function formatNumber(num) {
  return num.toLocaleString();
}

// Counter component
function Counter({ target, suffix, visible }) {
  const count = useCounter(target, visible, 3000);
  return <span>{formatNumber(count)}{suffix}</span>;
}

export default function Index() {
  const { data: bannersRes, isLoading: bannersLoading } = useGetPublicBannersQuery(undefined, { refetchOnMountOrArgChange: false });
  const banners = useMemo(() => {
    const list = bannersRes?.data?.banners || [];
    if (!Array.isArray(list)) return [];
    return list.map((b) => ({
      ...b,
      imageUrl: resolveMediaUrl(b.image_url),
    }));
  }, [bannersRes]);
  const heroSlides = banners;
  const [currentHero, setCurrentHero] = useState(0);
  const [prevHero, setPrevHero] = useState(0);
  const [direction, setDirection] = useState("next"); // "next" | "prev"
  const [statsVisible, setStatsVisible] = useState(false);
  const statsRef = useRef(null);

  const labsScrollRef = useRef(null);
  const coursesScrollRef = useRef(null);

  const { data: pubSectionsData } = useGetPublicSectionsQuery(undefined, {
    refetchOnMountOrArgChange: false,
  });
  const cmsSectionByKey = useMemo(() => {
    const list = pubSectionsData?.data?.sections || [];
    if (!Array.isArray(list)) return {};
    return Object.fromEntries(list.map((s) => [s.section_key, s]));
  }, [pubSectionsData]);

  const productSections = useMemo(
    () =>
      productSectionsBase.map((ps) => {
        const cms = cmsSectionByKey[ps.sectionKey];
        const cmsSub = cms?.subtitle;
        const description = (cmsSub && !cmsSub.includes("Role-based")) ? cmsSub : ps.description;
        return {
          ...ps,
          title: cms?.title || ps.title,
          description,
        };
      }),
    [cmsSectionByKey]
  );

  const skillLabsSectionCopy = useMemo(() => {
    return {
      eyebrow: "Practice Makes Perfect",
      title: "Trending Labs",
      subtitle: "Hands-on practice in real cloud environments",
    };
  }, []);

  const digitalProgramsSectionCopy = useMemo(() => {
    return {
      eyebrow: "Master The Tools",
      title: "Trending Courses",
      subtitle: "On-demand digital training for real-world skill building",
    };
  }, []);

  const { data: labsData, isLoading: skillLabsLoading } = useGetPublicLabsQuery(
    { limit: 40, page: 1 },
    { refetchOnMountOrArgChange: false }
  );
  const homeSkillLabs = useMemo(() => {
    const { rows } = normalizeLabsPayload(labsData);
    const mapped = rows.map(mapPublicLabRow);
    const skillBuilder = mapped.filter((l) => l.labKind === "skill_builder");
    const list = skillBuilder.length ? skillBuilder : mapped;
    return list.slice(0, 16);
  }, [labsData]);

  const { data: coursesData, isLoading: coursesLoading } = useGetPublicCoursesQuery(
    { status: "published", limit: 12 },
    { refetchOnMountOrArgChange: false }
  );
  const homeCourses = useMemo(() => {
    const { rows: courseRows } = normalizeCoursesPayload(coursesData);
    const list = courseRows;
    return list.map((c) => ({
      id: c.id || c._id,
      slug: c.slug,
      title: c.title,
      description: stripHtmlToPlain(c.description || c.short_description || ""),
      thumbnail:
        resolveMediaUrl(c.thumbnail || c.image) ||
        "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=500",
      isFree: c.is_free ?? c.isFree ?? false,
      price: c.price ?? 0,
      currency: resolveItemCurrency(c),
      duration: c.duration || "N/A",
      level: (() => {
        const raw = (c.level || "Beginner").toString();
        return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
      })(),
      rating: typeof c.rating === "number" && c.rating > 0 ? c.rating : undefined,
      enrolledCount: c.enrolled_count ?? c.enrolledCount ?? 0,
      modulesCount: c.modules_count ?? c.modulesCount ?? 0,
      labsCount: c.labs_count ?? c.labsCount ?? 0,
      skills: Array.isArray(c.tech_stack)
        ? c.tech_stack
        : Array.isArray(c.techStack)
          ? c.techStack
          : [],
      platform: c.platform || c.vendor_platform || "",
      vendorPlatform: c.platform || c.vendor_platform || "",
    }));
  }, [coursesData]);

  useEffect(() => {
    if (heroSlides.length <= 1) return undefined;
    const interval = setInterval(() => {
      setDirection("next");
      setPrevHero(currentHero);
      setCurrentHero((prev) => (prev + 1) % heroSlides.length);
    }, 7000);
    return () => clearInterval(interval);
  }, [heroSlides.length, currentHero]);

  // Intersection Observer for stats section - toggles visibility on enter AND exit
  // so the counter animation replays every time the section scrolls into view.
  // Intersection Observer for stats section - only set to true once per page load
  // Intersection Observer for stats section - attach only after layout is stable
  useEffect(() => {
    // Wait until all async sections have finished loading so the page
    // height is final before we start observing intersection.
    if (bannersLoading || skillLabsLoading || coursesLoading) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setStatsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );

    if (statsRef.current) {
      observer.observe(statsRef.current);
    }

    return () => observer.disconnect();
  }, [bannersLoading, skillLabsLoading, coursesLoading]);

  const scroll = (ref, direction) => {
    if (ref.current) {
      const scrollAmount = 340;
      ref.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  const goToSlide = (index) => {
    setDirection(index > currentHero ? "next" : "prev");
    setPrevHero(currentHero);
    setCurrentHero(index);
  };
  const nextSlide = () => {
    setDirection("next");
    setPrevHero(currentHero);
    setCurrentHero((prev) => (prev + 1) % heroSlides.length);
  };
  const prevSlide = () => {
    setDirection("prev");
    setPrevHero(currentHero);
    setCurrentHero((prev) => (prev - 1 + heroSlides.length) % heroSlides.length);
  };

  return (
    <div>
      <SEO
        title="Alar Labs — Hands-On Tech Learning Platform"
        description="Master real-world tech skills with Alar Labs. Explore hands-on labs, expert-led courses, and certification programs to accelerate your IT career."
        robots="noindex,nofollow"
      />

      {/* ── Hero ────────────────────────────────────────────────────────────── */}
      {!bannersLoading && heroSlides.length > 0 && (
        <section className="relative isolate w-full overflow-hidden bg-slate-800" style={{ minHeight: "95vh" }}>

          {/* Full-bleed background banner images from backend with fade + directional slide */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
            {heroSlides.map((slide, index) => {
              const isCurrent = index === currentHero;
              const isPrev = index === prevHero && index !== currentHero;

              let opacityClass = "opacity-0";
              let transformClass = "translate-x-0";

              if (isCurrent) {
                opacityClass = "opacity-100";
                transformClass = "translate-x-0";
              } else if (isPrev) {
                // outgoing slide exits in the direction of travel
                transformClass = direction === "next" ? "-translate-x-12" : "translate-x-12";
              } else {
                // all other slides wait off-screen on the opposite side
                transformClass = direction === "next" ? "translate-x-12" : "-translate-x-12";
              }

              return (
                <img
                  key={`hero-bg-${index}`}
                  src={slide.imageUrl}
                  alt=""
                  className={cn(
                    "absolute inset-0 h-full w-full object-cover object-top transition-all duration-500 ease-in-out will-change-transform",
                    opacityClass,
                    transformClass
                  )}
                  loading={index === 0 ? "eager" : "lazy"}
                  decoding="async"
                />
              );
            })}
            {/* Left-to-right gradient: readable left → image visible right */}
            <div className="absolute inset-0 bg-gradient-to-r from-slate-900/80 via-slate-900/40 to-slate-900/20" />
          </div>

          {/* Navigation arrows */}
          {heroSlides.length > 1 && (
            <>
              {/* Prev arrow */}
              <button
                type="button"
                onClick={prevSlide}
                className="absolute left-4 sm:left-8 md:left-12 lg:left-16 z-20 top-1/2 -translate-y-1/2 flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white shadow-lg backdrop-blur-sm transition-all duration-300 hover:bg-white/20 hover:scale-110"
                aria-label="Previous slide"
              >
                <ChevronLeft className="h-7 w-7" />
              </button>

              {/* Next arrow */}
              <button
                type="button"
                onClick={nextSlide}
                className="absolute right-4 sm:right-8 md:right-12 lg:right-16 z-20 top-1/2 -translate-y-1/2 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-white shadow-lg backdrop-blur-sm transition-all duration-300 hover:bg-primary/90 hover:scale-110"
                aria-label="Next slide"
              >
                <ChevronRight className="h-7 w-7" />
              </button>
            </>
          )}

          {/* Inner layout: top padding for navbar, content, dots */}
          <div className="relative z-10 flex flex-col justify-between min-h-[540px] sm:min-h-[620px] lg:min-h-[680px]">

            {/* Content wrapper - centered vertically */}
            <div className="relative mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 flex items-center flex-1 my-auto py-14 sm:py-20 lg:py-24">
              {/* Hero text content */}
              <div
                key={`hero-text-${currentHero}`}
                className="animate-fade-in-up max-w-2xl my-auto"
              >
                {/* Bordered badge style */}
                <Badge
                  variant="outline"
                  className="mb-7 rounded-full border-white/30 bg-white/10 px-4 py-1.5 text-xs sm:text-sm font-semibold tracking-wide text-white shadow-none hover:bg-white/20"
                >
                  ALAR Labs - Learning &amp; Innovation
                </Badge>

                {/* Dynamic heading from banner */}
                <h1 className="mb-7 font-extrabold tracking-tight">
                  <span className="block text-3xl sm:text-4xl md:text-5xl lg:text-[3.25rem] leading-[1.25] text-white">
                    {heroSlides[currentHero].title}
                  </span>
                </h1>

                <p className="mb-9 text-base sm:text-lg leading-relaxed text-white/90 max-w-xl">
                  {heroSlides[currentHero].subtitle}
                </p>

                {/* Button from banner */}
                <div className="flex flex-row items-center gap-4 flex-wrap sm:flex-nowrap">
                  <Link to={heroSlides[currentHero].button_link || "/labs"} className="shrink-0">
                    <Button
                      size="lg"
                      className="h-12 gap-2.5 rounded-xl px-8 font-bold shadow-lg whitespace-nowrap text-sm sm:text-base bg-primary hover:bg-primary/90"
                    >
                      <Monitor className="h-4 sm:h-5 w-4 sm:w-5 shrink-0" /> {heroSlides[currentHero].button_title || "Get Started"}
                    </Button>
                  </Link>
                </div>
              </div>
            </div>

            {/* Slide indicator dots */}
            {heroSlides.length > 1 && (
              <div className="relative z-10 flex justify-center gap-2.5 pb-10">
                {heroSlides.map((_, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => goToSlide(index)}
                    className={cn(
                      "h-2.5 rounded-full transition-all duration-300",
                      index === currentHero ? "w-10 bg-primary" : "w-2.5 bg-white/40"
                    )}
                    aria-label={`Go to slide ${index + 1}`}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Product Sections Overview - White */}
      <section className="py-10 sm:py-12 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 sm:mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Our Learning Solutions</h2>
            <p className="text-muted-foreground text-sm sm:text-base max-w-2xl mx-auto">
              Comprehensive tech education from assessment to career placement
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {productSections.map((section, index) => {
              const Icon = section.icon;
              return (
                <Link key={section.id} to={section.href}>
                  <Card
                    className="h-full card-hover border border-slate-200 dark:border-slate-800 rounded-xl cursor-pointer group transition-all duration-300 hover:border-primary hover:shadow-md hover:-translate-y-0.5"
                    style={{ animationDelay: `${index * 80}ms` }}
                  >
                    <CardContent className="p-5">
                      <div className={`w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform`}>
                        <Icon className={`w-5 h-5 text-primary`} />
                      </div>
                      <div className="text-[11px] font-semibold text-secondary uppercase tracking-wider mb-1">
                        {section.tagline}
                      </div>
                      <h3 className="text-base font-semibold text-foreground mb-1.5">{section.title}</h3>
                      <p className="text-xs text-muted-foreground leading-relaxed">{section.description}</p>
                      <div className="flex items-center gap-1 mt-3 text-primary text-xs font-semibold">
                        Explore <ArrowRight className="w-3.5 h-3.5" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Achievements Section - Light Gray */}
      <section ref={statsRef} className="py-10 sm:py-12 bg-muted">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold mb-1.5 text-foreground">Our Achievements</h2>
            <p className="text-muted-foreground text-sm">Trusted by learners and organizations worldwide</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <div
                  key={index}
                  className="text-center p-4 sm:p-5 rounded-xl animate-fade-in-up"
                  style={{ animationDelay: `${index * 80}ms` }}
                >
                  <Icon className="w-7 h-7 mx-auto mb-2 text-primary" />
                  <div className="text-2xl sm:text-3xl font-extrabold mb-1 text-foreground">
                    <Counter target={stat.target} suffix={stat.suffix} visible={statsVisible} />
                  </div>
                  <div className="text-xs sm:text-sm text-muted-foreground font-medium">{stat.label}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Partners - White */}
      <section className="py-10 sm:py-12 border-b border-border overflow-hidden bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-1.5">Our Partners &amp; Technology Platforms</h2>
          </div>
        </div>
        <div className="relative w-full overflow-hidden">
          <div className="flex gap-16 animate-marquee whitespace-nowrap items-center">
            {[...partners, ...partners, ...partners].map((partner, index) => (
              <div
                key={index}
                className="flex flex-col items-center justify-center min-w-[150px] gap-2.5"
              >
                <img
                  src={partner.logo}
                  alt={partner.name}
                  className="h-12 w-28 object-contain"
                />
                <span className="text-xs font-medium text-foreground">
                  {partner.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Skill Builder Labs - Light Gray */}
      <section className="py-10 sm:py-12 bg-muted" id="labs-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="text-[11px] font-semibold text-secondary uppercase tracking-wider mb-0.5">
                {skillLabsSectionCopy.eyebrow}
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-0.5">{skillLabsSectionCopy.title}</h2>
              <p className="text-muted-foreground text-xs sm:text-sm">{skillLabsSectionCopy.subtitle}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => scroll(labsScrollRef, "left")} className="rounded-full h-8 w-8">
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={() => scroll(labsScrollRef, "right")} className="rounded-full h-8 w-8">
                <ChevronRight className="w-4 h-4" />
              </Button>
              <Link to="/labs">
                <Button variant="ghost" size="sm" className="gap-1 ml-2 text-xs">
                  Explore All Labs <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </div>
          </div>
          <div ref={labsScrollRef} className="scroll-container">
            {skillLabsLoading ? (
              Array.from({ length: 8 }).map((_, index) => (
                <div key={index} className="scroll-item w-[300px] flex flex-col">
                  <LabCardSkeleton />
                </div>
              ))
            ) : homeSkillLabs.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 px-1">
                No published labs yet. Add labs in the catalog to show them here.
              </p>
            ) : (
              homeSkillLabs.map((lab) => {
                const labHref = lab.slug
                  ? `/labs/${encodeURIComponent(lab.slug)}`
                  : undefined;
                return (
                  <div key={lab.id} className="scroll-item w-[300px] flex flex-col">
                    <LabCard {...lab} labHref={labHref} prefetchOverview />
                  </div>
                );
              })
            )}
          </div>
        </div>
      </section>

      {/* Digital Skills Programs - White */}
      <section className="py-10 sm:py-12 bg-background" id="courses-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="text-[11px] font-semibold text-secondary uppercase tracking-wider mb-0.5">
                {digitalProgramsSectionCopy.eyebrow}
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-0.5">{digitalProgramsSectionCopy.title}</h2>
              <p className="text-muted-foreground text-xs sm:text-sm">{digitalProgramsSectionCopy.subtitle}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => scroll(coursesScrollRef, "left")} className="rounded-full h-8 w-8">
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={() => scroll(coursesScrollRef, "right")} className="rounded-full h-8 w-8">
                <ChevronRight className="w-4 h-4" />
              </Button>
              <Link to="/courses">
                <Button variant="ghost" size="sm" className="gap-1 ml-2 text-xs">
                  Explore All Programs <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </div>
          </div>
          <div ref={coursesScrollRef} className="scroll-container">
            {coursesLoading ? (
              Array.from({ length: 8 }).map((_, index) => (
                <div key={index} className="scroll-item w-[300px] flex flex-col">
                  <CourseCardSkeleton />
                </div>
              ))
            ) : homeCourses.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 px-1">
                No published courses yet. Publish courses from the catalog to show them here.
              </p>
            ) : (
              homeCourses.map((course) => (
                <div key={course.id} className="scroll-item w-[300px] flex flex-col">
                  <CourseCard {...course} prefetchOverview />
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Learning Journey - Light Gray */}
      {/* <section className="py-16 bg-muted">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-3">Your Learning Journey</h2>
            <p className="text-muted-foreground">A step-by-step path to mastery</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                title: "Learn Concepts",
                description: "Start with structured courses and video content to build your foundation.",
                icon: BookOpen,
                link: "/courses",
              },
              {
                step: "02",
                title: "Practice Skills",
                description: "Apply knowledge with hands-on labs in real cloud environments.",
                icon: Beaker,
                link: "/labs",
              },
              {
                step: "03",
                title: "Get Certified",
                description: "Validate your skills with industry-recognized certifications.",
                icon: Award,
                link: "/certification",
              },
            ].map((item, index) => {
              const Icon = item.icon;
              return (
                <div key={index} className="relative">
                  <div className="text-6xl font-bold text-muted/50 absolute -top-4 -left-2">
                    {item.step}
                  </div>
                  <Card className="relative z-10 h-full">
                    <CardContent className="p-6 pt-8">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                        <Icon className="w-6 h-6 text-primary" />
                      </div>
                      <h3 className="text-xl font-semibold text-foreground mb-2">{item.title}</h3>
                      <p className="text-muted-foreground mb-4">{item.description}</p>
                      <Link to={item.link}>
                        <Button variant="ghost" size="sm" className="gap-1 p-0 h-auto">
                          Get Started <ArrowRight className="w-4 h-4" />
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                  {index < 2 && (
                    <div className="hidden md:block absolute top-1/2 -right-4 w-8 text-muted-foreground">
                      <ArrowRight className="w-8 h-8" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section> */}
    </div>
  );
}