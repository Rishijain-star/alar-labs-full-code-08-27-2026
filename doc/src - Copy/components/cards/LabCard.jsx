import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, Star, Users, Lock } from "lucide-react";
import { Link } from "react-router-dom";
import { resolveMediaUrl } from "@/lib/mediaUrl";
import { stripHtmlToPlain } from "@/lib/stripHtml";
import ContentTypeBadge from "@/components/common/ContentTypeBadge";

const FALLBACK_THUMB =
  "https://images.unsplash.com/photo-1516116216624-53e697fedbea?w=500";

export function LabCard({
  id,
  slug,
  title,
  description,
  thumbnail,
  isFree,
  isLocked,
  price,
  duration,
  level,
  rating,
  enrolledCount,
 
  labKind,
  
  labHref,
}) {
  const showLock =
    typeof isLocked === "boolean"
      ? isLocked
      : !isFree && Number(price) > 0;
  const thumbSrc = resolveMediaUrl(thumbnail) || FALLBACK_THUMB;
  const ratingNum = Number(rating);
  const showRating = Number.isFinite(ratingNum) && ratingNum > 0;
  const typeBadgeKind =
    labKind === "skill_builder" ? "skill_builder" : labKind ? "lab" : null;

  return (
    <Card variant="elevated" className="overflow-hidden group w-full h-full flex flex-col">
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted shrink-0">
        <img
          src={thumbSrc}
          alt={title}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          onError={(e) => {
            if (e.currentTarget.src !== FALLBACK_THUMB) {
              e.currentTarget.src = FALLBACK_THUMB;
            }
          }}
        />
        <div className="absolute top-3 left-3 right-3 flex flex-wrap gap-1.5 items-start">
          {typeBadgeKind ? <ContentTypeBadge kind={typeBadgeKind} /> : null}
          <Badge variant={isFree ? "level" : "paid"}>
            {isFree ? "FREE" : `$${price}`}
          </Badge>
        </div>
        {showLock && (
          <div className="absolute top-3 right-3">
            <div className="w-8 h-8 rounded-full bg-background/90 backdrop-blur-sm flex items-center justify-center shadow-md">
              <Lock className="w-4 h-4 text-secondary" />
            </div>
          </div>
        )}
      </div>

      <CardHeader className="pb-2">
        <div className="flex items-center justify-between mb-2">
          <Badge variant="level" className="text-xs">
            {level}
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
        <p className="text-sm text-muted-foreground line-clamp-2">
          {stripHtmlToPlain(description)}
        </p>

        <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            <span>{duration}</span>
          </div>
          {typeof enrolledCount === "number" && Number.isFinite(enrolledCount) ? (
            <div className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />
              <span>{enrolledCount.toLocaleString()}</span>
            </div>
          ) : null}
        </div>
      </CardContent>

      <CardFooter className="mt-auto">
        <Link
          to={labHref || (slug ? `/labs/${slug}` : "#")}
          className="w-full"
          aria-disabled={!slug && !labHref}
        >
          <Button
            variant={isFree ? "success" : "secondary"}
            className="w-full"
            size="sm"
          >
            {isFree ? "Start Now" : "View Details"}
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
