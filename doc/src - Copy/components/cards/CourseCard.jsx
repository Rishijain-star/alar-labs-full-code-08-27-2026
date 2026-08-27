import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, Star, Users, Lock, BookOpen } from "lucide-react";
import { Link } from "react-router-dom";
import { resolveMediaUrl } from "@/lib/mediaUrl";
import { stripHtmlToPlain, formatCount } from "@/lib/stripHtml";
import { LazyImage } from "@/components/ui/lazy-image";

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
  duration,
  level,
  rating,
  enrolledCount,
  modulesCount,
  labsCount,
  skills = [],
  vendorPlatform,
  actionLabel,
  onAction,
}) {
  const cta = actionLabel || (isFree ? "Start Now" : "View Details");
  const safeSlug = typeof slug === "string" && slug.trim() ? slug.trim() : "";
  const href = safeSlug ? `/courses/${encodeURIComponent(safeSlug)}` : "/courses";
  const plainDescription = stripHtmlToPlain(description);
  const ratingNum = Number(rating);
  const showRating = Number.isFinite(ratingNum) && ratingNum > 0;
  const thumbSrc = resolveMediaUrl(thumbnail) || FALLBACK_THUMB;
  const levelLabel =
    typeof level === "string" && level.length
      ? level.charAt(0).toUpperCase() + level.slice(1).toLowerCase()
      : "Beginner";

  return (
    <Card variant="elevated" className="overflow-hidden group w-full h-full flex flex-col">
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted shrink-0">
        <LazyImage
          src={thumbSrc}
          alt={title}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          wrapperClassName="absolute inset-0 h-full w-full"
        />
        <div className="absolute top-3 left-3">
          <Badge variant={isFree ? "free" : "paid"}>
            {isFree ? "FREE" : `$${price}`}
          </Badge>
        </div>
        {!isFree && (
          <div className="absolute top-3 right-3">
            <div className="w-8 h-8 rounded-full bg-background/90 backdrop-blur-sm flex items-center justify-center shadow-md">
              <Lock className="w-4 h-4 text-secondary" />
            </div>
          </div>
        )}
        <div className="absolute bottom-3 right-3">
          <div className="flex items-center gap-1 bg-background/90 backdrop-blur-sm rounded-full px-2.5 py-1 shadow-sm">
            <BookOpen className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-medium">
              {formatCount(modulesCount, "module", "modules")}
            </span>
          </div>
        </div>
      </div>

      <CardHeader className="pb-2">
        <div className="flex items-center justify-between mb-2">
          <Badge variant="level" className="text-xs">
            {levelLabel}
          </Badge>
          {showRating ? (
            <div className="flex items-center gap-1 text-sm">
              <Star className="w-4 h-4 fill-secondary text-secondary" />
              <span className="font-medium text-foreground">{ratingNum.toFixed(1)}</span>
            </div>
          ) : null}
        </div>
        <h3 className="text-base font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors leading-tight">
          {title}
        </h3>
      </CardHeader>

      <CardContent className="pb-3 flex-1">
        <p className="text-sm text-muted-foreground line-clamp-2">{plainDescription}</p>
        {vendorPlatform ? (
          <p className="text-xs text-muted-foreground mt-2">
            Platform: <span className="font-medium text-foreground">{vendorPlatform}</span>
          </p>
        ) : null}

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

        <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            <span>{duration}</span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="w-3.5 h-3.5" />
            <span>{Number(enrolledCount ?? 0).toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-1">
            <BookOpen className="w-3.5 h-3.5" />
            <span>{formatCount(labsCount, "lab", "labs")}</span>
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
          <Link to={href} className="w-full" aria-disabled={!slug}>
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
