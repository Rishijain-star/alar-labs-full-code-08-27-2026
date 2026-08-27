import { useWebinarStatus } from "@/lib/webinarStatus";
import { Clock, CheckCircle2 } from "lucide-react";

export function WebinarLiveStatusBadge({ webinar, className = "", showCountdown = true }) {
  const { state, fullText, countdownText } = useWebinarStatus(webinar);

  if (state === "LIVE") {
    return (
      <div
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-600/90 text-white font-bold text-xs uppercase tracking-wider shadow-sm ring-2 ring-red-500/30 animate-pulse ${className}`}
      >
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white"></span>
        </span>
        <span>LIVE</span>
      </div>
    );
  }

  if (state === "UPCOMING") {
    return (
      <div
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 font-semibold text-xs border border-indigo-200 dark:border-indigo-800/60 shadow-sm ${className}`}
      >
        <Clock className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
        <span>{showCountdown ? fullText : "Upcoming"}</span>
      </div>
    );
  }

  if (state === "FINISHED") {
    return (
      <div
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 font-medium text-xs border border-slate-200 dark:border-slate-700 ${className}`}
      >
        <CheckCircle2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
        <span>Finished</span>
      </div>
    );
  }

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 font-medium text-xs ${className}`}
    >
      <Clock className="w-3.5 h-3.5 shrink-0" />
      <span>Scheduled</span>
    </div>
  );
}

export function WebinarStatusHeader({ webinar }) {
  const { state, fullText, countdownText } = useWebinarStatus(webinar);

  if (state === "LIVE") {
    return (
      <div className="w-full rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 shadow-lg border border-red-500/30">
        <div className="flex items-center gap-3">
          <span className="relative flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-white"></span>
          </span>
          <div>
            <h3 className="text-lg font-black tracking-wide uppercase">Webinar is LIVE NOW</h3>
            <p className="text-xs sm:text-sm text-red-100 mt-0.5">
              The live session is in progress. Join now to participate!
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (state === "UPCOMING") {
    return (
      <div className="w-full rounded-xl bg-gradient-to-r from-indigo-900/90 via-blue-900/90 to-slate-900 text-white p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 shadow-md border border-indigo-500/20 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-indigo-500/20 border border-indigo-400/30">
            <Clock className="w-6 h-6 text-indigo-300 animate-pulse" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-white">Upcoming Session</h3>
            <p className="text-xs sm:text-sm text-indigo-200 mt-0.5 font-medium">
              {fullText}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full rounded-xl bg-slate-800/80 text-slate-200 p-4 sm:p-5 flex items-center justify-between gap-4 border border-slate-700">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-lg bg-slate-700/50">
          <CheckCircle2 className="w-5 h-5 text-slate-400" />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-100">Session Finished</h3>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            This webinar session has ended.
          </p>
        </div>
      </div>
    </div>
  );
}
