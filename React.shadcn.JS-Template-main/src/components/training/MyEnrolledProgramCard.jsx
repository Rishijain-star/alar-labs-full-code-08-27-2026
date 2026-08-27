import { Link } from "react-router-dom";
import { Calendar, Clock, Star, Users, ExternalLink, GraduationCap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PriceBadge } from "@/components/common/PriceBadge";
import { resolveMediaUrl } from "@/lib/mediaUrl";
import { formatLabel } from "@/lib/mapWebinarRow";

const FALLBACK_THUMB = "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600";

export function MyEnrolledProgramCard({ program }) {
  const rating = Number(program.rating || 4.9);
  const thumbSrc =
    resolveMediaUrl(program.bannerImage || program.thumbnail || program.instructorImage) ||
    FALLBACK_THUMB;
  const programUrl = program.slug ? `/training/program/${encodeURIComponent(program.slug)}` : "/training";

  return (
    <Card className="group relative flex h-full flex-col overflow-hidden border-border/60 bg-card hover:shadow-lg transition-all duration-300">
      {/* Banner & Badges Header */}
      <div className="relative aspect-video w-full overflow-hidden bg-muted">
        <img
          src={thumbSrc}
          alt={program.title}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          onError={(e) => {
            e.currentTarget.src = FALLBACK_THUMB;
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20" />

        {/* Top Badges */}
        <div className="absolute top-3 left-3 right-3 flex items-start justify-between gap-2">
          <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm">
            Enrolled
          </Badge>

          <PriceBadge
            isFree={program.isFree}
            price={program.price}
            currency={program.currency}
            className="shadow-sm"
          />
        </div>

        {/* Bottom Banner Meta */}
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white text-xs font-medium">
          <span className="flex items-center gap-1.5 bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-full">
            <GraduationCap className="w-3.5 h-3.5 text-primary-foreground" />
            {program.trainingFormat ? formatLabel(program.trainingFormat) : "Live Program"}
          </span>
          <span className="flex items-center gap-1 bg-black/40 backdrop-blur-md px-2 py-1 rounded-full">
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            {rating.toFixed(1)}
          </span>
        </div>
      </div>

      {/* Content */}
      <CardContent className="flex flex-1 flex-col gap-3 p-4">
        {/* Level & Instructor */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <Badge variant="outline" className="text-[10px] font-normal uppercase tracking-wider">
            {program.level || "Beginner"}
          </Badge>
          <span className="font-medium text-foreground truncate max-w-[150px]">
            {program.instructor || "Lead Instructor"}
          </span>
        </div>

        {/* Title */}
        <h3 className="line-clamp-2 text-base font-bold text-foreground group-hover:text-primary transition-colors leading-snug">
          {program.title}
        </h3>

        {/* Schedule Info */}
        <div className="space-y-1.5 text-xs text-muted-foreground mt-1">
          {program.date && program.date !== "—" && (
            <div className="flex items-center gap-2 min-w-0">
              <Calendar className="h-3.5 w-3.5 shrink-0 text-primary" />
              <span className="truncate">{program.date}</span>
            </div>
          )}
          {program.time && program.time !== "—" && (
            <div className="flex items-center gap-2 min-w-0">
              <Clock className="h-3.5 w-3.5 shrink-0 text-primary" />
              <span className="truncate">{program.time}</span>
            </div>
          )}
          {program.enrolledCount > 0 && (
            <div className="flex items-center gap-2">
              <Users className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span>{program.enrolledCount} enrolled</span>
            </div>
          )}
        </div>

        {/* Topics */}
        {Array.isArray(program.topics) && program.topics.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-auto pt-2">
            {program.topics.slice(0, 3).map((topic, i) => (
              <Badge key={i} variant="secondary" className="text-[10px] font-normal px-2 py-0.5">
                {topic}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>

      {/* Footer CTA Button */}
      <CardFooter className="p-4 pt-0">
        <Button asChild variant="default" className="w-full gap-2" size="sm">
          <Link to={programUrl}>
            <span>View Program Details</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
