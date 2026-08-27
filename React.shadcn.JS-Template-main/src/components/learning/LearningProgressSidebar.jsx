import { CheckCircle2, Circle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  BLOCK_TYPE_LABELS,
  CONTENT_KIND_META,
  getBlockDisplayTitle,
  isInteractiveBlock,
} from "@/lib/learningProgress";

const BLOCK_ICON_BG = {
  video: "bg-blue-100 text-blue-700",
  audio: "bg-violet-100 text-violet-700",
  richText: "bg-slate-100 text-slate-700",
  quiz: "bg-yellow-100 text-yellow-800",
  trueFalse: "bg-orange-100 text-orange-800",
  code: "bg-green-100 text-green-800",
  fillBlank: "bg-orange-50 text-orange-700",
  project: "bg-pink-100 text-pink-800",
  codeSnippet: "bg-cyan-100 text-cyan-800",
};

function TaskTypeBadge({ type }) {
  const label = BLOCK_TYPE_LABELS[type] || type;
  return (
    <span className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
      {label}
    </span>
  );
}

export default function LearningProgressSidebar({
  contentKind = "lab",
  contentTitle,
  progressPct = 0,
  tasksDone = 0,
  tasksTotal = 0,
  currentLesson,
  currentInteractiveTasks = [],
  completedTasks,
  activeTaskId,
  onTaskClick,
}) {
  const kindMeta = CONTENT_KIND_META[contentKind] || CONTENT_KIND_META.lab;
  const isLearningLab = contentKind === "lab";
  const showProgressSummary = !isLearningLab;
  const lessonDone = currentInteractiveTasks.filter((t) => completedTasks.has(t.id)).length;
  const lessonTotal = currentInteractiveTasks.length;
  const lessonPct = lessonTotal > 0 ? Math.round((lessonDone / lessonTotal) * 100) : 100;
  const remaining = Math.max(0, tasksTotal - tasksDone);
  const circumference = 2 * Math.PI * 44;
  const dashOffset = circumference - (progressPct / 100) * circumference;

  return (
    <aside className="w-full lg:w-[min(100%,340px)] flex-shrink-0 lg:sticky lg:top-16 lg:h-[calc(100vh-4rem)] flex flex-col bg-slate-50/80 border-l border-slate-200">
      {/* Content identity */}
      <div className="p-4 border-b border-slate-200 bg-white">
        {showProgressSummary && (
          <Badge
            variant="outline"
            className={cn("mb-2 font-semibold text-xs border", kindMeta.className)}
          >
            <span className={cn("inline-block w-2 h-2 rounded-full mr-1.5", kindMeta.dotClass)} />
            {kindMeta.label}
          </Badge>
        )}
        <h2 className="text-sm font-bold text-slate-900 leading-snug line-clamp-2" title={contentTitle}>
          {contentTitle}
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Overall progress — hidden for hands-on learning labs */}
        {showProgressSummary && (
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
            Overall progress
          </h3>
          <div className="flex items-center gap-4">
            <div className="relative flex-shrink-0 w-[100px] h-[100px]">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="44" stroke="#e2e8f0" strokeWidth="10" fill="none" />
                <circle
                  cx="50"
                  cy="50"
                  r="44"
                  stroke="currentColor"
                  className={contentKind === "skill_builder" ? "text-amber-500" : "text-blue-600"}
                  strokeWidth="10"
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={dashOffset}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-bold text-slate-900">{progressPct}%</span>
                <span className="text-[10px] text-slate-500">done</span>
              </div>
            </div>
            <div className="flex-1 space-y-2 min-w-0">
              <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    contentKind === "skill_builder" ? "bg-amber-500" : "bg-blue-600"
                  )}
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="rounded-lg bg-green-50 border border-green-100 py-2 px-1">
                  <p className="text-lg font-bold text-green-800 leading-none">{tasksDone}</p>
                  <p className="text-[10px] text-green-700 mt-0.5">Completed</p>
                </div>
                <div className="rounded-lg bg-slate-50 border border-slate-100 py-2 px-1">
                  <p className="text-lg font-bold text-slate-800 leading-none">{remaining}</p>
                  <p className="text-[10px] text-slate-600 mt-0.5">Remaining</p>
                </div>
              </div>
              <p className="text-[11px] text-slate-500 leading-snug">
                {tasksTotal} interactive task{tasksTotal !== 1 ? "s" : ""} (quizzes & exercises). Videos and
                readings do not count.
              </p>
            </div>
          </div>
        </section>
        )}

        {/* Current lesson + task list */}
        {currentLesson && (
          <section className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col min-h-[200px]">
            <div className="p-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Current lesson
              </p>
              <p className="text-sm font-bold text-slate-900 leading-snug">{currentLesson.title}</p>
              <p className="text-xs text-slate-500 mt-0.5 truncate">{currentLesson.moduleTitle}</p>
              <div className="mt-3 flex items-center gap-2">
                <div className="flex-1 h-1.5 rounded-full bg-slate-200 overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-full transition-all"
                    style={{ width: `${lessonPct}%` }}
                  />
                </div>
                <span className="text-xs font-semibold text-slate-700 whitespace-nowrap">
                  {lessonDone}/{lessonTotal || "—"}
                </span>
              </div>
            </div>

            <div className="p-3 flex-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1 mb-2">
                Lesson tasks
              </p>
              {lessonTotal === 0 ? (
                <p className="text-sm text-slate-500 px-2 py-4 text-center rounded-lg bg-slate-50">
                  This lesson is content only (video, reading, etc.). Continue to the next lesson when
                  ready.
                </p>
              ) : (
                <ul className="space-y-1.5 max-h-[min(50vh,420px)] overflow-y-auto pr-0.5">
                  {currentInteractiveTasks.map((task, index) => {
                    const done = completedTasks.has(task.id);
                    const active = activeTaskId === task.id;
                    const iconBg = BLOCK_ICON_BG[task.type] || "bg-slate-100 text-slate-700";
                    return (
                      <li key={task.id}>
                        <button
                          type="button"
                          onClick={() => onTaskClick(task.id)}
                          className={cn(
                            "w-full flex items-start gap-2.5 p-2.5 rounded-lg border text-left transition-all",
                            active
                              ? "bg-blue-50 border-blue-300 ring-1 ring-blue-200"
                              : done
                                ? "bg-green-50/60 border-green-200 hover:bg-green-50"
                                : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                          )}
                        >
                          <span
                            className={cn(
                              "flex-shrink-0 w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold",
                              iconBg
                            )}
                          >
                            {index + 1}
                          </span>
                          <span className="flex-1 min-w-0 pt-0.5">
                            <span className="block text-sm font-medium text-slate-900 leading-tight line-clamp-2">
                              {getBlockDisplayTitle(task)}
                            </span>
                            <TaskTypeBadge type={task.type} />
                          </span>
                          <span className="flex-shrink-0 pt-1">
                            {done ? (
                              <CheckCircle2 className="w-5 h-5 text-green-600" />
                            ) : active ? (
                              <Circle className="w-5 h-5 text-blue-500 fill-blue-100" />
                            ) : (
                              <Circle className="w-5 h-5 text-slate-300" />
                            )}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </section>
        )}
      </div>
    </aside>
  );
}
