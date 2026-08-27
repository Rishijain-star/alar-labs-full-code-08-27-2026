import { useState, useEffect } from "react";
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
  hideBorderShadow = false,
}) {
  const rawIntro = introVideoUrl && String(introVideoUrl).trim();
  // YouTube/Vimeo links must be embedded via iframe, not played in <video>.
  const ytMatch = rawIntro
    ? rawIntro.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/)
    : null;
  const vimeoMatch = rawIntro ? rawIntro.match(/vimeo\.com\/(?:video\/)?(\d+)/) : null;
  const embedUrl = ytMatch
    ? `https://www.youtube.com/embed/${ytMatch[1]}`
    : vimeoMatch
      ? `https://player.vimeo.com/video/${vimeoMatch[1]}`
      : null;
  const videoUrl = resolveMediaUrl(rawIntro);
  const isHls = videoUrl && /\.m3u8($|\?)/i.test(videoUrl);

  // If the intro video can't be loaded (e.g. the transcoded files are missing on
  // the server), fall back to the thumbnail instead of a dead black player.
  const [videoFailed, setVideoFailed] = useState(false);
  useEffect(() => {
    setVideoFailed(false);
  }, [videoUrl]);
  const showVideo = Boolean(videoUrl) && !videoFailed;
  const hasMedia = Boolean(showVideo || embedUrl || thumbnail);

  return (
    <div
      className={cn(
        "relative w-full h-[300px] overflow-hidden",
        !hideBorderShadow && "rounded-xl shadow-lg border border-white/15",
        className
      )}
    >
      {!hasMedia && (
        <div className="absolute inset-0 bg-gradient-to-br from-slate-800 via-slate-700 to-blue-900" />
      )}

      {thumbnail && (
        <img
          src={thumbnail}
          alt=""
          className="absolute inset-0 h-full w-full object-contain"
          loading="lazy"
        />
      )}

      {embedUrl && (
        <iframe
          src={embedUrl}
          title="Intro video"
          className="absolute inset-0 h-full w-full"
          style={{ border: 0 }}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      )}

      {!embedUrl && showVideo &&
        (isHls ? (
          <HlsVideo
            src={videoUrl}
            className="absolute inset-0 h-full w-full object-contain"
            style={{ width: "100%", height: "100%", display: "block" }}
            controls={false}
            muted
            autoPlay
            loop
            onError={() => setVideoFailed(true)}
          />
        ) : (
          <video
            className="absolute inset-0 h-full w-full object-contain"
            src={videoUrl}
            poster={thumbnail || undefined}
            muted
            autoPlay
            loop
            playsInline
            onError={() => setVideoFailed(true)}
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
