import { useEffect, useRef } from "react";
import Hls from "hls.js";
import { resolveMediaUrl } from "@/lib/mediaUrl";
import { cookieUtils } from "@/lib/cookies";

/**
 * Plays HLS (.m3u8) in browsers that need hls.js (Chrome/Firefox).
 * - Lab streams use the cookie-session routes (/api/stream/* + init).
 * - Course streams (or direct Azure URLs) just need the Bearer token attached
 *   to backend requests so the encrypted-key endpoint authenticates.
 */
export default function HlsVideo({
  src,
  className = "",
  style,
  controls = true,
  muted = false,
  autoPlay = false,
  loop = false,
  onError,
}) {
  const ref = useRef(null);

  // A lab stream uses the cookie-session play/init routes; a course stream or a
  // direct Azure URL does not.
  const isLabStream = (s) =>
    /\/api\/(labs\/stream|stream)\//i.test(s) || /\/videos\/labs\//i.test(s);

  const toPlayableUrl = (input) => {
    if (!input) return "";
    let s = String(input).trim();
    // Only rewrite the legacy course-stream path into the lab play route when it
    // is actually a lab stream — course videos are served as-is.
    if (isLabStream(s)) {
      return s.replace(
        /\/api\/courses\/stream\/[^/]+\/([^/]+)\/master\.m3u8(?:\?.*)?$/i,
        "/api/stream/play/$1/master.m3u8"
      );
    }
    // Legacy course videos were stored as the on-disk path
    // "courses/<courseId>/<lessonId>/master.m3u8" instead of the routable
    // "/api/courses/stream/..." URL. By the time it reaches here it may already
    // be absolute ("http://host/courses/.../master.m3u8"). Insert the missing
    // "/api" + "stream/" segment so old rows play without a DB migration.
    // Anchored to "courses/" right after the origin/root, so Azure URLs
    // (".../videos/courses/...") are left untouched.
    s = s.replace(
      /^(https?:\/\/[^/]+)?\/?courses\/([^/]+)\/([^/]+)\/master\.m3u8(\?.*)?$/i,
      (_m, origin, courseId, lessonId, query) =>
        `${origin || ""}/api/courses/stream/${courseId}/${lessonId}/master.m3u8${query || ""}`
    );
    return s;
  };

  const extractLabLessonId = (input) => {
    if (!input) return "";
    const s = String(input).trim();
    if (!isLabStream(s)) return "";
    const play = s.match(/\/api\/stream\/play\/([^/]+)\/master\.m3u8(?:\?.*)?$/i);
    return play?.[1] || "";
  };

  useEffect(() => {
    const video = ref.current;
    if (!video || !src) return;
    const playableSrc = toPlayableUrl(src);
    const playable = resolveMediaUrl(playableSrc);
    const labLessonId = extractLabLessonId(playableSrc);

    let token = null;
    try {
      token = cookieUtils.getToken();
    } catch {
      token = null;
    }

    let hls;
    let mounted = true;

    (async () => {
      // Lab stream needs a signed cookie session before chunk/key playback.
      if (labLessonId) {
        try {
          const u = new URL(playable, window.location.origin);
          await fetch(`${u.origin}/api/stream/init/${labLessonId}`, { credentials: "include" });
        } catch {
          // Keep trying playback even if init fails.
        }
      }
      if (!mounted) return;

      if (Hls.isSupported()) {
        // Backend API origin (e.g. http://localhost:3000) — keys/segments served
        // by our API must hit this host, NOT wherever the playlist is hosted.
        const apiBase = (import.meta.env.VITE_API_BASE_URL || "").trim();
        const apiOrigin = (() => {
          try {
            return new URL(apiBase || window.location.origin).origin;
          } catch {
            return window.location.origin;
          }
        })();

        // When the playlist is on Azure, its key URI ("/api/courses/lesson-key/…")
        // resolves against the Azure origin → 403. Redirect any /api/ resource back
        // to our backend so the encrypted-key request authenticates correctly.
        class ApiRewriteLoader extends Hls.DefaultConfig.loader {
          load(context, config, callbacks) {
            try {
              if (context?.url) {
                const u = new URL(context.url, window.location.href);
                if (/^\/api\//i.test(u.pathname) && u.origin !== apiOrigin) {
                  context.url = `${apiOrigin}${u.pathname}${u.search}`;
                }
              }
            } catch {
              /* leave url as-is */
            }
            super.load(context, config, callbacks);
          }
        }

        hls = new Hls({
          loader: ApiRewriteLoader,
          // Attach auth to OUR backend requests only (key + local segments).
          // Never to Azure (no /api/ in those URLs) — that would break CORS.
          xhrSetup: (xhr, url) => {
            if (/\/api\//i.test(String(url))) {
              xhr.withCredentials = true;
              if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
            }
          },
        });
        // Surface fatal load failures (missing playlist/segments, CORS, etc.) so the
        // caller can fall back to a thumbnail instead of showing a dead black player.
        hls.on(Hls.Events.ERROR, (_evt, data) => {
          if (data?.fatal && typeof onError === "function") onError(data);
        });
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
      onError={() => {
        if (typeof onError === "function") onError();
      }}
    />
  );
}
