import {
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Lock,
  Video,
  Code2,
  HelpCircle,
  FileText,
  BookOpen,
  FlaskConical,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getLessonContentLabel, getLessonNavIconType, isInteractiveBlock, isLessonComplete } from "@/lib/learningProgress";

const NAV_ICONS = {
  video: Video,
  code: Code2,
  quiz: HelpCircle,
  article: FileText,
  lesson: BookOpen,
  lab: FlaskConical,
  skill_builder: Zap,
};

function LessonStatusIcon({ done, active, unlocked }) {
  if (!unlocked) {
    return (
      <span className="w-5 h-5 rounded-full border-2 border-slate-200 flex items-center justify-center flex-shrink-0">
        <Lock className="w-3 h-3 text-slate-300" />
      </span>
    );
  }
  if (done) {
    return (
      <span className="w-5 h-5 rounded-full bg-slate-900 flex items-center justify-center flex-shrink-0">
        <CheckCircle2 className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
      </span>
    );
  }
  return (
    <span
      className={cn(
        "w-5 h-5 rounded-full border-2 flex-shrink-0",
        active ? "border-slate-900 bg-white" : "border-slate-300 bg-white"
      )}
    />
  );
}

export default function LearningModuleSidebar({
  contentTitle,
  modules = [],
  contentKind = "lab",
  platform = "",
  expandedModules,
  setExpandedModules,
  currentLessonId,
  completedTasks,
  completedLessons,
  labCompletionByRef = {},
  isLessonUnlocked,
  onSelectLesson,
}) {
  return (
    <aside className="w-full lg:w-[300px] flex-shrink-0 lg:sticky lg:top-16 lg:h-[calc(100vh-4rem)] overflow-y-auto bg-white border-r border-slate-200">
      <div className="p-4 lg:p-5">
        <h2 className="text-base font-bold text-slate-900 leading-snug mb-5 line-clamp-2" title={contentTitle}>
          {contentTitle}
        </h2>

        <div className="space-y-6">
          {modules.map((mod, modIndex) => {
            const expanded = !!expandedModules[mod.id];
            const moduleTitle = (mod.title || `Module ${modIndex + 1}`).toUpperCase();

            return (
              <section key={mod.id}>
                <button
                  type="button"
                  onClick={() => setExpandedModules((p) => ({ ...p, [mod.id]: !expanded }))}
                  className="w-full flex items-center gap-2 text-left group mb-2"
                >
                  {expanded ? (
                    <ChevronDown className="w-4 h-4 text-slate-500 flex-shrink-0" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-slate-500 flex-shrink-0" />
                  )}
                  <span className="text-xs font-bold text-slate-800 tracking-wide uppercase flex-1 truncate">
                    {moduleTitle}
                  </span>
                </button>
                <div className="border-b border-slate-200 mb-2" />

                {expanded && (
                  <ul className="space-y-0.5">
                    {(mod.lessons || []).map((lesson) => {
                      const unlocked = isLessonUnlocked(lesson.id);
                      const active = currentLessonId === lesson.id;
                      const blocks = lesson.blocks || lesson.tasks || [];
                      const lessonInteractive = blocks.filter((t) => isInteractiveBlock(t.type));
                      const done = isLessonComplete(lesson, {
                        completedTasks,
                        completedLessonIds: completedLessons,
                        labCompletionByRef,
                      });
                      const doneCount = lessonInteractive.filter((t) =>
                        completedTasks.has(t.id)
                      ).length;
                      const totalCount = lessonInteractive.length;

                      const iconType = getLessonNavIconType(lesson, blocks);
                      const NavIcon = NAV_ICONS[iconType] || BookOpen;
                      const contentLabel = getLessonContentLabel(lesson, blocks, {
                        platform,
                        contentKind,
                      });

                      return (
                        <li key={lesson.id}>
                          <button
                            type="button"
                            onClick={() => unlocked && onSelectLesson(lesson.id)}
                            disabled={!unlocked}
                            className={cn(
                              "w-full flex items-start gap-3 py-3 px-2 text-left transition-colors relative rounded-r-md",
                              active && "bg-slate-100",
                              !active && unlocked && "hover:bg-slate-50",
                              !unlocked && "opacity-50 cursor-not-allowed"
                            )}
                          >
                            {active && (
                              <span className="absolute left-0 top-1 bottom-1 w-1 bg-slate-900 rounded-r" />
                            )}

                            <NavIcon
                              className={cn(
                                "w-5 h-5 flex-shrink-0 mt-0.5",
                                active ? "text-slate-900" : "text-slate-500"
                              )}
                              strokeWidth={1.75}
                            />

                            <div className="flex-1 min-w-0 pr-1">
                              <p
                                className={cn(
                                  "text-sm font-medium leading-snug",
                                  active ? "text-slate-900" : "text-slate-700"
                                )}
                              >
                                {lesson.title || "Lesson"}
                              </p>
                              <p
                                className={cn(
                                  "text-[11px] leading-snug mt-1 line-clamp-2",
                                  active ? "text-slate-600" : "text-slate-500"
                                )}
                              >
                                {contentLabel}
                              </p>
                              {totalCount > 0 && (
                                <p className="text-[10px] text-slate-400 mt-0.5">
                                  {doneCount}/{totalCount} tasks
                                  {!unlocked && " · Locked"}
                                </p>
                              )}
                            </div>

                            <LessonStatusIcon done={done} active={active} unlocked={unlocked} />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
