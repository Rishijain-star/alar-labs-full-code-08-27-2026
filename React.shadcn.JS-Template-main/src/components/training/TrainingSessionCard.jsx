import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Users, Calendar, Clock, Star } from "lucide-react";
import { PriceBadge, DisplayPrice } from "@/components/common/PriceBadge";
import { formatSpotsLeft } from "@/lib/webinarDisplay";
import { WebinarLiveStatusBadge } from "@/components/training/WebinarLiveStatus";

const topicBadgeClass = "bg-slate-100 text-slate-700 border-slate-200 font-medium text-xs";

export function TrainingSessionCard({ training }) {
  const spotsLeft =
    training.maxCapacity > 0 ? Math.max(0, training.maxCapacity - training.enrolledCount) : null;
  const rating = Number(training.rating || 0);
  const [imgFailed, setImgFailed] = useState(false);
  const showPlaceholder = !training.instructorImage || imgFailed;
  const isWebinar = training.kind === "webinar" || Boolean(training.deliveryMode);

  return (
    <Card variant="elevated" className="overflow-hidden h-auto">
      <div className="grid md:grid-cols-4 gap-4 sm:gap-6 p-4 sm:p-6">
        <div className="flex flex-col items-center text-center gap-3 min-w-0">
          {showPlaceholder ? (
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full shrink-0 bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
          ) : (
            <img
              src={training.instructorImage}
              alt={training.instructor}
              className="w-14 h-14 sm:w-16 sm:h-16 rounded-full object-cover shrink-0"
              onError={() => setImgFailed(true)}
            />
          )}
          <div className="min-w-0 w-full">
            <p className="text-base sm:text-lg font-bold text-foreground truncate">{training.instructor}</p>
            <p className="text-sm text-muted-foreground truncate">{training.instructorTitle}</p>
            <div className="flex items-center justify-center gap-1 mt-1">
              <Star className="w-3.5 h-3.5 fill-premium text-premium shrink-0" />
              <span className="text-sm font-medium">{rating.toFixed(1)}</span>
            </div>
          </div>
        </div>

        <div className="md:col-span-2 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            {isWebinar && <WebinarLiveStatusBadge webinar={training} />}
            {training.isFree ? (
              <Badge variant="free">FREE</Badge>
            ) : (
              <PriceBadge isFree={false} price={training.price} currency={training.currency} variant="paid" />
            )}
            <Badge variant="outline">{training.duration}</Badge>
          </div>
          <h3 className="text-lg sm:text-xl font-bold mb-2 break-words">{training.title}</h3>
          <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-sm text-muted-foreground mb-3">
            <div className="flex items-center gap-1 min-w-0">
              <Calendar className="w-4 h-4 shrink-0" />
              <span className="truncate">{training.date}</span>
            </div>
            <div className="flex items-center gap-1 min-w-0">
              <Clock className="w-4 h-4 shrink-0" />
              <span className="truncate">{training.time}</span>
            </div>
            {spotsLeft !== null ? (
              <div className="flex items-center gap-1">
                <Users className="w-4 h-4 shrink-0" />
                <span className="capitalize">{formatSpotsLeft(spotsLeft)}</span>
              </div>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            {(training.badges || training.topics || []).map((badge, i) => (
              <Badge key={i} variant="outline" className={topicBadgeClass}>
                {badge}
              </Badge>
            ))}
          </div>
        </div>

        <div className="flex flex-row md:flex-col justify-between md:justify-center items-center md:items-end gap-3 md:gap-3 pt-2 md:pt-0 border-t md:border-t-0 border-border md:border-0">
          <div className="text-left md:text-right">
            {training.isFree ? (
              <p className="text-2xl font-bold text-foreground">Free</p>
            ) : (
              <p className="text-2xl font-bold text-foreground">
                <DisplayPrice price={training.price} currency={training.currency} />
              </p>
            )}
            <p className="text-xs text-muted-foreground">per person</p>
          </div>
          {training.slug ? (
            <Button variant="premium" size="lg" className="w-full sm:w-auto shrink-0" asChild>
              <Link
                to={
                  training.kind === "program"
                    ? `/training/program/${training.slug}`
                    : `/training/webinar/${training.slug}`
                }
              >
                View details
              </Link>
            </Button>
          ) : training.enrollmentUrl && /^https?:\/\//i.test(String(training.enrollmentUrl).trim()) ? (
            <Button variant="premium" size="lg" className="w-full sm:w-auto shrink-0" asChild>
              <a href={training.enrollmentUrl.trim()} target="_blank" rel="noopener noreferrer">
                Enroll Now
              </a>
            </Button>
          ) : (
            <Button variant="premium" size="lg" className="w-full sm:w-auto shrink-0" disabled>
              Unavailable
            </Button>
          )}
          {spotsLeft !== null ? (
            <p className="text-xs text-muted-foreground md:text-right capitalize">
              {formatSpotsLeft(spotsLeft)}
            </p>
          ) : null}
        </div>
      </div>
    </Card>
  );
}
