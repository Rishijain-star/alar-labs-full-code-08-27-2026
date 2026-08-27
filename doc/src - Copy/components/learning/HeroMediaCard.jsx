import { Play } from "lucide-react";
import HlsVideo from "@/components/media/HlsVideo";
import { cn } from "@/lib/utils";
import { resolveMediaUrl } from "@/lib/mediaUrl";

/**
 * Hero card media: intro HLS/MP4 when available, otherwise thumbnail image, else placeholder.
 */
export default function HeroMediaCard({ introVideoUrl, thumbnail, className = "" }) {
  const videoUrl = resolveMediaUrl(introVideoUrl && String(introVideoUrl).trim());
  const thumbUrl = resolveMediaUrl(thumbnail && String(thumbnail).trim());
  const isHls = videoUrl && /\.m3u8($|\?)/i.test(videoUrl);

  if (videoUrl) {
    return (
      <div className={cn("aspect-video bg-slate-950 relative", className)}>
        {isHls ? (
          <HlsVideo
            src={videoUrl}
            className="w-full h-full object-contain"
            style={{ width: "100%", height: "100%", display: "block", background: "#0f172a" }}
          />
        ) : (
          <video
            controls
            playsInline
            poster={thumbUrl || undefined}
            src={videoUrl}
            className="w-full h-full object-contain bg-slate-950"
          />
        )}
      </div>
    );
  }

  if (thumbUrl) {
    return (
      <div className={cn("aspect-video bg-slate-900 relative overflow-hidden", className)}>
        <img src={thumbUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
      </div>
    );
  }

  return (
    <div className={cn("aspect-video bg-gradient-to-br from-slate-800 via-slate-700 to-blue-900 flex items-center justify-center", className)}>
      <div className="w-14 h-14 rounded-full bg-blue-500/20 flex items-center justify-center border-2 border-blue-400/30">
        <Play className="w-6 h-6 text-blue-300" />
      </div>
    </div>
  );
}
