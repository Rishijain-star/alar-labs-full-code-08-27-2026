import { useEffect, useMemo, useState } from "react";

function parseTimeStart(timeSummary) {
  if (!timeSummary) return { hour: 9, minute: 0 };
  const match = String(timeSummary).match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (!match) return { hour: 9, minute: 0 };
  let hour = parseInt(match[1], 10);
  const minute = parseInt(match[2], 10);
  const meridiem = (match[3] || "").toUpperCase();
  if (meridiem === "PM" && hour < 12) hour += 12;
  if (meridiem === "AM" && hour === 12) hour = 0;
  return { hour, minute };
}

/** Best-effort start datetime from API fields or display strings. */
export function resolveSessionStartAt({
  startsAt,
  scheduleStart,
  scheduleSummary,
  timeSummary,
} = {}) {
  if (startsAt) {
    const d = new Date(startsAt);
    if (!Number.isNaN(d.getTime())) return d;
  }
  if (scheduleStart) {
    const d = new Date(scheduleStart);
    if (!Number.isNaN(d.getTime())) return d;
  }
  if (!scheduleSummary) return null;

  const summary = String(scheduleSummary).trim();
  const year = (summary.match(/(\d{4})/) || [])[1];
  const monthDay = summary.match(/([A-Za-z]+)\s+(\d{1,2})/);
  if (!monthDay || !year) return null;

  const { hour, minute } = parseTimeStart(timeSummary);
  const built = new Date(`${monthDay[1]} ${monthDay[2]}, ${year} ${hour}:${String(minute).padStart(2, "0")}:00`);
  return Number.isNaN(built.getTime()) ? null : built;
}

export function formatSessionCountdown(startAt, now = Date.now()) {
  if (!startAt) return null;
  const target = startAt instanceof Date ? startAt.getTime() : new Date(startAt).getTime();
  if (Number.isNaN(target)) return null;

  const diff = target - now;
  if (diff <= 0) return "Session has started";

  const totalMinutes = Math.floor(diff / 60000);
  const days = Math.floor(totalMinutes / (24 * 60));
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
  const minutes = totalMinutes % 60;

  const parts = [];
  if (days > 0) parts.push(`${days} day${days === 1 ? "" : "s"}`);
  if (hours > 0) parts.push(`${hours} hour${hours === 1 ? "" : "s"}`);
  parts.push(`${minutes} min`);

  return `Starts in ${parts.join(", ")}`;
}

export function useSessionCountdown(startAt) {
  const target = useMemo(() => {
    if (!startAt) return null;
    const d = startAt instanceof Date ? startAt : new Date(startAt);
    return Number.isNaN(d.getTime()) ? null : d;
  }, [startAt]);

  const [label, setLabel] = useState(() => (target ? formatSessionCountdown(target) : null));

  useEffect(() => {
    if (!target) {
      setLabel(null);
      return undefined;
    }

    const tick = () => setLabel(formatSessionCountdown(target));
    tick();
    const id = window.setInterval(tick, 60000);
    return () => window.clearInterval(id);
  }, [target]);

  return label;
}
