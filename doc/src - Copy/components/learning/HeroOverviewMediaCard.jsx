import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import HlsVideo from "@/components/media/HlsVideo";
import { cn } from "@/lib/utils";
import { resolveMediaUrl } from "@/lib/mediaUrl";

/**
 * Overview hero: thumbnail as background, optional intro video on top, CTA overlaid.
 */
export default function HeroOverviewMediaCard({
  introVideoUrl,
  thumbnail,
  isEnrolled,
  ctaLabel = "Enroll Now",
  onPrimaryClick,
  className = "",
  hideButton = false,
}) {
  const videoUrl = resolveMediaUrl(introVideoUrl && String(introVideoUrl).trim());
  const thumbUrl = resolveMediaUrl(thumbnail && String(thumbnail).trim());
  const isHls = videoUrl && /\.m3u8($|\?)/i.test(videoUrl);
  const hasMedia = Boolean(videoUrl || thumbUrl);

  return (
    <div
      className={cn(
        "relative aspect-video w-full overflow-hidden rounded-xl shadow-lg border border-white/15",
        className
      )}
    >
      {!hasMedia && (
        <div className="absolute inset-0 bg-gradient-to-br from-slate-800 via-slate-700 to-blue-900" />
      )}

      {thumbUrl && (
        <img
          src={thumbUrl}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          loading="lazy"
        />
      )}

      {videoUrl &&
        (isHls ? (
          <HlsVideo
            src={videoUrl}
            className="absolute inset-0 h-full w-full object-cover"
            style={{ width: "100%", height: "100%", display: "block" }}
            controls={false}
            muted
            autoPlay
            loop
          />
        ) : (
          <video
            className="absolute inset-0 h-full w-full object-cover"
            src={videoUrl}
            poster={thumbUrl || undefined}
            muted
            autoPlay
            loop
            playsInline
          />
        ))}

      {!hideButton && (
        <>
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/35 to-black/25 pointer-events-none" />
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-5">
            <Button
              type="button"
              size="lg"
              className={cn(
                "min-w-[200px] font-bold text-sm h-12 gap-2 rounded-lg shadow-xl border-0",
                isEnrolled
                  ? "bg-green-600 hover:bg-green-700 text-white"
                  : "bg-green-500 hover:bg-green-600 text-white"
              )}
              onClick={onPrimaryClick}
            >
              <Play className="w-5 h-5 fill-current" />
              {isEnrolled ? "Start Now" : ctaLabel}
            </Button>
          </div>
        </>
      )}

      {hideButton && (
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
      )}
    </div>
  );
}
