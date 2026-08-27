import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Clock, ShoppingCart, Users, BookOpen, Beaker } from "lucide-react";
import { resolveMediaUrl } from "@/lib/mediaUrl";
import { PriceBadge } from "@/components/common/PriceBadge";
import { cn } from "@/lib/utils";

const FALLBACK_LAB =
  "https://images.unsplash.com/photo-1516116216624-53e697fedbea?w=500";
const FALLBACK_COURSE =
  "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=500";

function formatDuration(minutes) {
  const n = Number(minutes);
  if (!Number.isFinite(n) || n <= 0) return null;
  if (n < 60) return `${n} min`;
  const h = Math.floor(n / 60);
  const m = n % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

export default function CreatorPublishedContentCard({ item }) {
  const isLab = item.contentType === "lab";
  const href = isLab ? `/labs/${item.slug}` : `/courses/${item.slug}`;
  const thumb = resolveMediaUrl(item.thumbnail) || (isLab ? FALLBACK_LAB : FALLBACK_COURSE);
  const duration = isLab
    ? formatDuration(item.timeLimitMinutes)
    : formatDuration(item.durationMinutes);
  const levelLabel = isLab ? item.difficulty : item.level;

  return (
    <Card className="overflow-hidden h-full flex flex-col hover:shadow-md transition-shadow">
      <div className="relative aspect-[16/10] bg-muted overflow-hidden">
        <img src={thumb} alt="" className="h-full w-full object-cover" loading="lazy" />
        <div className="absolute top-2 left-2 flex flex-wrap gap-1.5">
          <Badge className={cn(isLab ? "bg-blue-600" : "bg-violet-600")}>
            {isLab ? (
              <>
                <Beaker className="w-3 h-3 mr-1" /> Lab
              </>
            ) : (
              <>
                <BookOpen className="w-3 h-3 mr-1" /> Course
              </>
            )}
          </Badge>
          {item.labKind === "skill_builder" && (
            <Badge className="bg-amber-600">Skill Builder</Badge>
          )}
        </div>
        <div className="absolute top-2 right-2">
          <PriceBadge isFree={item.isFree} price={item.price} currency={item.currency} />
        </div>
      </div>

      <CardHeader className="pb-2 space-y-1">
        <Link to={href} className="font-semibold text-base leading-snug hover:text-primary line-clamp-2">
          {item.title}
        </Link>
        {levelLabel ? (
          <p className="text-xs text-muted-foreground capitalize">{levelLabel}</p>
        ) : null}
      </CardHeader>

      <CardContent className="pb-3 flex-1">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-lg border bg-muted/40 px-3 py-2">
            <div className="flex items-center gap-1.5 text-muted-foreground text-xs mb-0.5">
              <Users className="w-3.5 h-3.5" />
              Enrollments
            </div>
            <p className="font-bold text-foreground">{item.enrollmentCount ?? 0}</p>
          </div>
          <div className="rounded-lg border bg-muted/40 px-3 py-2">
            <div className="flex items-center gap-1.5 text-muted-foreground text-xs mb-0.5">
              <ShoppingCart className="w-3.5 h-3.5" />
              Purchases
            </div>
            <p className="font-bold text-foreground">{item.purchaseCount ?? 0}</p>
          </div>
        </div>
        {isLab && item.assignmentCount > 0 ? (
          <p className="text-xs text-muted-foreground mt-2">
            +{item.assignmentCount} admin assignment{item.assignmentCount === 1 ? "" : "s"}
          </p>
        ) : null}
      </CardContent>

      <CardFooter className="pt-0 text-xs text-muted-foreground flex items-center justify-between gap-2 border-t bg-muted/20 py-3">
        {duration ? (
          <span className="inline-flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {duration}
          </span>
        ) : (
          <span />
        )}
        <Link to={href} className="text-primary font-medium hover:underline shrink-0">
          View public page
        </Link>
      </CardFooter>
    </Card>
  );
}
