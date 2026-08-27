import { useEffect, useMemo, useState } from "react";
import { resolveSessionStartAt } from "./sessionCountdown";

/**
 * Parses duration strings like "2 Hours", "90 Minutes", "1h 30m", "1 Day" into milliseconds.
 * Default fallback is 2 hours (7,200,000 ms).
 */
export function parseDurationMs(durationStr) {
  if (!durationStr || typeof durationStr !== "string") {
    return 2 * 60 * 60 * 1000; // 2 hours default
  }

  const str = durationStr.toLowerCase().trim();
  let totalMs = 0;

  // Check days
  const daysMatch = str.match(/(\d+(?:\.\d+)?)\s*(?:day|d)/);
  if (daysMatch) {
    totalMs += parseFloat(daysMatch[1]) * 24 * 60 * 60 * 1000;
  }

  // Check hours
  const hoursMatch = str.match(/(\d+(?:\.\d+)?)\s*(?:hour|hr|h)/);
  if (hoursMatch) {
    totalMs += parseFloat(hoursMatch[1]) * 60 * 60 * 1000;
  }

  // Check minutes
  const minsMatch = str.match(/(\d+(?:\.\d+)?)\s*(?:minute|min|m)/);
  if (minsMatch) {
    totalMs += parseFloat(minsMatch[1]) * 60 * 1000;
  }

  // If no match found but a plain number exists (assume minutes)
  if (totalMs === 0) {
    const numMatch = str.match(/^(\d+(?:\.\d+)?)$/);
    if (numMatch) {
      totalMs = parseFloat(numMatch[1]) * 60 * 1000;
    }
  }

  return totalMs > 0 ? totalMs : 2 * 60 * 60 * 1000;
}

/**
 * Calculates current Webinar Status & Countdown based on Start Time + Duration.
 * @returns {{ state: 'UPCOMING' | 'LIVE' | 'FINISHED' | 'UNKNOWN', label: string, countdownText: string, fullText: string }}
 */
export function getWebinarStatus(webinar, now = Date.now()) {
  if (!webinar) {
    return { state: "UNKNOWN", label: "Scheduled", countdownText: "", fullText: "Scheduled" };
  }

  const startAt = resolveSessionStartAt({
    startsAt: webinar.startsAt || webinar.starts_at,
    scheduleStart: webinar.scheduleStart || webinar.schedule_start,
    scheduleSummary: webinar.scheduleSummary || webinar.date || webinar.schedule_summary,
    timeSummary: webinar.timeSummary || webinar.time || webinar.time_summary,
  });

  if (!startAt || Number.isNaN(startAt.getTime())) {
    return { state: "UNKNOWN", label: "Scheduled", countdownText: "", fullText: "Scheduled" };
  }

  const startMs = startAt.getTime();
  const durationMs = parseDurationMs(webinar.duration || webinar.duration_summary);
  const endMs = startMs + durationMs;

  if (now < startMs) {
    const diffMs = startMs - now;
    const totalMinutes = Math.floor(diffMs / 60000);
    const days = Math.floor(totalMinutes / (24 * 60));
    const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
    const minutes = totalMinutes % 60;
    const seconds = Math.floor((diffMs % 60000) / 1000);

    const parts = [];
    if (days > 0) {
      parts.push(`${days}d`);
      parts.push(`${hours}h`);
    } else if (hours > 0) {
      parts.push(`${hours}h`);
      parts.push(`${minutes}m`);
    } else {
      parts.push(`${minutes}m`);
      parts.push(`${seconds}s`);
    }

    const countdownText = `Starts in ${parts.join(" ")}`;
    return {
      state: "UPCOMING",
      label: "Upcoming",
      countdownText,
      fullText: `Upcoming — ${countdownText}`,
    };
  }

  if (now >= startMs && now <= endMs) {
    return {
      state: "LIVE",
      label: "LIVE",
      countdownText: "",
      fullText: "LIVE",
    };
  }

  return {
    state: "FINISHED",
    label: "Finished",
    countdownText: "",
    fullText: "Finished",
  };
}

/**
 * Hook that returns real-time webinar status updated every second.
 */
export function useWebinarStatus(webinar) {
  const [status, setStatus] = useState(() => getWebinarStatus(webinar));

  useEffect(() => {
    const tick = () => setStatus(getWebinarStatus(webinar));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [
    webinar?.id,
    webinar?.startsAt,
    webinar?.starts_at,
    webinar?.scheduleSummary,
    webinar?.date,
    webinar?.schedule_summary,
    webinar?.timeSummary,
    webinar?.time,
    webinar?.time_summary,
    webinar?.duration,
    webinar?.duration_summary,
  ]);

  return status;
}
