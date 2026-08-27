import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, Star, Users, Lock, BookOpen, Edit, Trash2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { resolveMediaUrl } from "@/lib/mediaUrl";
import { stripHtmlToPlain, formatCount } from "@/lib/stripHtml";
import { LazyImage } from "@/components/ui/lazy-image";
import { useToast } from "@/hooks/use-toast";
import { useDeleteCourseMutation, courseApi } from "@/store/api/courseApi";
import { confirmDelete } from "@/lib/confirmAction";
import { hasPermission } from "@/utils/permissions";
import { WishlistButton } from "@/components/common/WishlistButton";
import { PriceBadge, DEFAULT_STORED_CURRENCY } from "@/components/common/PriceBadge";
import PlatformBadge from "@/components/common/PlatformBadge";
import AdminContentDates from "@/components/admin/AdminContentDates";

const FALLBACK_THUMB =
  "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=500";

export function CourseCard({
  id,
  slug,
  title,
  description,
  thumbnail,
  isFree,
  price,
  currency = DEFAULT_STORED_CURRENCY,
  duration,
  level,
  rating,
  enrolledCount,
  modulesCount,
  labsCount,
  skills = [],
  vendorPlatform,
  platform,
  actionLabel,
  onAction,
  status,
  courseCode,
  version,
  createdAt,
  updatedAt,
  showActions = false,
  showAdminDates = false,
  prefetchOverview = false,
  enrolledView = false,
  progress = 0,
  customHref,
}) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [deleteCourse] = useDeleteCourseMutation();
  const canEditCourse = hasPermission("edit_courses");
  const canDeleteCourse = hasPermission("delete_courses");
  const prefetchCourseOverview = courseApi.usePrefetch("getCourseOverview");
  const handlePrefetch = () => {
    if (safeSlug) prefetchCourseOverview({ slug: safeSlug, params: {} }, { ifOlderThan: 60 });
  };
  const cta = enrolledView ? (progress > 0 ? "Resume" : "Start") : (actionLabel || (isFree ? "Start Now" : "View Details"));
  const safeSlug = typeof slug === "string" && slug.trim() ? slug.trim() : "";
  const href = customHref || (safeSlug ? `/courses/${encodeURIComponent(safeSlug)}` : "/courses");
  const plainDescription = stripHtmlToPlain(description);
  const ratingNum = Number(rating);
  const displayRating = Number.isFinite(ratingNum) ? ratingNum : null;
  const thumbSrc = resolveMediaUrl(thumbnail) || FALLBACK_THUMB;
  const levelLabel =
    typeof level === "string" && level.length
      ? level.charAt(0).toUpperCase() + level.slice(1).toLowerCase()
      : "Beginner";
  const platformLabel = platform || vendorPlatform || "";

  const handleDelete = async () => {
    if (!(await confirmDelete("this course"))) return;
    try {
      await deleteCourse(id).unwrap();
      toast({
        title: "Course deleted",
        description: "The course has been deleted successfully.",
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "Failed to delete the course.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card variant="elevated" className="overflow-hidden group w-full h-full flex flex-col">
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted shrink-0">
        <LazyImage
          src={thumbSrc}
          alt={title}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          wrapperClassName="absolute inset-0 h-full w-full"
        />
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 items-start justify-between w-[calc(100%-1.5rem)]">
          <div className="flex flex-wrap gap-1.5">
            <PlatformBadge platform={platformLabel} className="bg-background/90 backdrop-blur-sm" />
            <PriceBadge isFree={isFree} price={price} currency={currency} />
            {showActions && status && status !== "published" && (
              <Badge className="bg-amber-500 text-white border-0 capitalize">{status}</Badge>
            )}
          </div>
          {showActions && (canEditCourse || canDeleteCourse) && (
            <div className="flex gap-1 ml-auto">
              {canEditCourse && (
                <Button
                  variant="secondary"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (!safeSlug) {
                      toast({
                        title: "Cannot edit",
                        description: "This course has no URL slug.",
                        variant: "destructive",
                      });
                      return;
                    }
                    navigate(`/app/courses/edit/${safeSlug}`);
                  }}
                >
                  <Edit className="w-4 h-4" />
                </Button>
              )}
              {canDeleteCourse && (
                <Button
                  variant="destructive"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleDelete();
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          )}
        </div>
        {!showActions && id ? (
          <div className="absolute top-3 right-3 z-10 flex flex-col items-end gap-1.5">
            <WishlistButton itemType="course" targetId={id} />
            {!isFree && (
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-background/95 shadow-md backdrop-blur-sm">
                <Lock className="w-4 h-4 text-secondary" />
              </div>
            )}
          </div>
        ) : null}
        <div className="absolute bottom-3 right-3">
          <div className="flex items-center gap-1 bg-background/90 backdrop-blur-sm rounded-full px-2.5 py-1 shadow-sm">
            <BookOpen className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-medium">
              {formatCount(modulesCount, "module", "modules")}
            </span>
          </div>
        </div>
        {enrolledView && (
          <div className="absolute bottom-0 left-0 right-0 w-full bg-secondary h-1.5 z-20">
            <div 
              className="bg-primary h-full transition-all duration-500" 
              style={{ width: `${Math.min(100, Math.max(0, progress || 0))}%` }}
            />
          </div>
        )}
      </div>

      <CardHeader className="pb-2">
        <Badge variant="level" className="text-xs w-fit mb-2">
          {levelLabel}
        </Badge>
        <h3 className="text-base font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors leading-tight">
          {title}
        </h3>
        {showActions && (courseCode || version) && (
          <div className="mt-1 flex items-center gap-2 text-[11px] font-medium text-muted-foreground">
            {courseCode && <span className="rounded bg-muted px-1.5 py-0.5 font-mono">{courseCode}</span>}
            {version ? <span>v{version}</span> : null}
          </div>
        )}
        {showAdminDates && (
          <AdminContentDates
            createdAt={createdAt}
            updatedAt={updatedAt}
            className="mt-1.5"
          />
        )}
      </CardHeader>

      <CardContent className="pb-3 flex-1 flex flex-col">
        <p className="text-sm text-muted-foreground line-clamp-2">{plainDescription}</p>

        {Array.isArray(skills) && skills.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {skills.slice(0, 4).map((s) => (
              <Badge key={typeof s === "string" ? s : s.name || s.id} variant="outline" className="text-[10px] font-normal px-2 py-0">
                {typeof s === "string" ? s : s.name || s.label || "Skill"}
              </Badge>
            ))}
            {skills.length > 4 && (
              <span className="text-[10px] text-muted-foreground self-center">+{skills.length - 4}</span>
            )}
          </div>
        )}

        <div className="flex flex-col gap-2 mt-3 text-xs text-muted-foreground flex-1">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 shrink-0" />
              <span>{duration}</span>
            </div>
            <div className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5 shrink-0" />
              <span>{Number(enrolledCount ?? 0).toLocaleString()} enrolled</span>
            </div>
            <div className="flex items-center gap-1">
              <BookOpen className="w-3.5 h-3.5 shrink-0" />
              <span>{formatCount(labsCount, "lab", "labs")}</span>
            </div>
          </div>
          <div
            className="flex items-center gap-1.5 mt-auto pt-1"
            aria-label={displayRating != null ? `Rating ${displayRating} out of 5` : "No rating"}
          >
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star
                  key={i}
                  className={`w-3.5 h-3.5 ${
                    displayRating != null && i <= Math.round(displayRating)
                      ? "fill-secondary text-secondary"
                      : "text-muted-foreground/40"
                  }`}
                />
              ))}
            </div>
            <span className="font-medium text-foreground tabular-nums text-sm">
              {displayRating != null ? displayRating.toFixed(1) : "—"}
            </span>
          </div>
        </div>
      </CardContent>

      <CardFooter className="mt-auto">
        {onAction ? (
          <Button
            variant={isFree ? "success" : "secondary"}
            className="w-full"
            size="sm"
            type="button"
            onClick={() => onAction({ id, slug })}
          >
            {cta}
          </Button>
        ) : (
          <Link to={href} className="w-full" aria-disabled={!slug} onMouseEnter={prefetchOverview ? handlePrefetch : undefined}>
            <Button
              variant={isFree ? "success" : "secondary"}
              className="w-full"
              size="sm"
            >
              {cta}
            </Button>
          </Link>
        )}
      </CardFooter>
    </Card>
  );
}
