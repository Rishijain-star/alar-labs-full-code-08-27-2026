import { useEffect, useRef } from "react";
import Hls from "hls.js";
import { resolveMediaUrl } from "@/lib/mediaUrl";

/**
 * Plays HLS (.m3u8) in browsers that need hls.js (Chrome/Firefox).
 * Pass an absolute URL (e.g. from resolveMediaUrl).
 */
export default function HlsVideo({
  src,
  className = "",
  style,
  controls = true,
  muted = false,
  autoPlay = false,
  loop = false,
}) {
  const ref = useRef(null);

  const toPlayableUrl = (input) => {
    if (!input) return "";
    const s = String(input).trim();
    // Legacy path still returned by some course records:
    // /api/courses/stream/:courseId/:lessonId/master.m3u8
    const legacy = s.match(/\/api\/courses\/stream\/[^/]+\/([^/]+)\/master\.m3u8(?:\?.*)?$/i);
    if (legacy?.[1]) {
      return s.replace(/\/api\/courses\/stream\/[^/]+\/([^/]+)\/master\.m3u8(?:\?.*)?$/i, "/api/stream/play/$1/master.m3u8");
    }
    return s;
  };

  const extractLessonId = (input) => {
    if (!input) return "";
    const s = String(input).trim();
    const play = s.match(/\/api\/stream\/play\/([^/]+)\/master\.m3u8(?:\?.*)?$/i);
    if (play?.[1]) return play[1];
    const legacy = s.match(/\/api\/courses\/stream\/[^/]+\/([^/]+)\/master\.m3u8(?:\?.*)?$/i);
    if (legacy?.[1]) return legacy[1];
    return "";
  };

  useEffect(() => {
    const video = ref.current;
    if (!video || !src) return;
    const playable = resolveMediaUrl(toPlayableUrl(src));
    const lessonId = extractLessonId(src);
    let hls;
    let mounted = true;
    (async () => {
      // Stream router requires cookie init for protected chunk playback.
      if (lessonId) {
        try {
          const u = new URL(playable, window.location.origin);
          const initUrl = `${u.origin}/api/stream/init/${lessonId}`;
          await fetch(initUrl, { credentials: "include" });
        } catch {
          // Keep trying playback even if init fails.
        }
      }
      if (!mounted) return;
      if (Hls.isSupported()) {
        hls = new Hls();
        hls.loadSource(playable);
        hls.attachMedia(video);
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = playable;
      } else {
        video.src = playable;
      }
    })();
    return () => {
      mounted = false;
      if (hls) hls.destroy();
    };
  }, [src]);
  return (
    <video
      ref={ref}
      controls={controls}
      muted={muted}
      autoPlay={autoPlay}
      loop={loop}
      playsInline
      className={className}
      style={style}
    />
  );
}
