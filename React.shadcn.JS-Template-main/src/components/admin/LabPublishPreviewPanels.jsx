import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  FileText,
  Layers,
  Layout,
  Play,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { stripHtmlToPlain } from "@/lib/stripHtml";
import RichTextContent from "@/components/learning/RichTextContent";
import { sanitizeCourseDescriptionHtml } from "@/lib/sanitizeCourseHtml";
import { getRichTextBlockTitle } from "@/lib/richTextUtils";

export function LabOverviewPreviewPanel({
  lab,
  modules,
  expandedPreviewModules,
  setExpandedPreviewModules,
  expandedPreviewLessons,
  setExpandedPreviewLessons,
  blockTypes,
}) {
  const lessonCount = modules.reduce((acc, m) => acc + m.lessons.length, 0);
  const taskCount = modules.reduce(
    (acc, m) => acc + m.lessons.reduce((a, l) => a + l.blocks.length, 0),
    0
  );

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            {lab.thumbnail && (
              <div className="md:w-64 flex-shrink-0">
                <div className="aspect-video bg-slate-100 rounded-lg overflow-hidden border border-slate-200">
                  <img src={lab.thumbnail} alt={lab.title} className="w-full h-full object-cover" />
                </div>
              </div>
            )}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                {lab.difficulty && <Badge variant="outline" className="text-xs">{lab.difficulty}</Badge>}
                {lab.isFree ? (
                  <Badge className="bg-green-100 text-green-700 hover:bg-green-200 text-xs">Free</Badge>
                ) : (
                  <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-200 text-xs">Paid - ${lab.price}</Badge>
                )}
              </div>
              <h1 className="text-xl font-bold text-slate-900 mb-1">{lab.title || "Untitled Lab"}</h1>
              {stripHtmlToPlain(lab.shortDescription) ? (
                <RichTextContent
                  html={sanitizeCourseDescriptionHtml(lab.shortDescription)}
                  showTitle={false}
                  className="text-sm text-slate-600 mb-3"
                />
              ) : (
                <p className="text-sm text-slate-600 mb-3">No description provided</p>
              )}
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-1.5">
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <span key={i} className={i <= Math.round(lab.rating) ? "text-yellow-400" : "text-slate-300"}>⭐</span>
                    ))}
                  </div>
                  <span className="text-sm text-slate-600">{lab.rating} ({(lab.studentCount || 0).toLocaleString()})</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-600">
                  <Layers className="w-4 h-4" />
                  <span className="text-sm">{modules.length} {modules.length === 1 ? "Module" : "Modules"}</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-600">
                  <BookOpen className="w-4 h-4" />
                  <span className="text-sm">{lessonCount} {lessonCount === 1 ? "Lesson" : "Lessons"}</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-600">
                  <Layout className="w-4 h-4" />
                  <span className="text-sm">{taskCount} Tasks</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 items-start">
        <div className="space-y-4">
          {lab.technologies?.length > 0 && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Technologies</CardTitle></CardHeader>
              <CardContent className="pt-0">
                <div className="flex flex-wrap gap-1.5">
                  {lab.technologies.map((tech, i) => <Badge key={i} className="text-xs">{tech}</Badge>)}
                </div>
              </CardContent>
            </Card>
          )}
          {lab.requirements?.length > 0 && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Requirements</CardTitle></CardHeader>
              <CardContent className="pt-0">
                <ul className="space-y-1.5">
                  {lab.requirements.map((req, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-slate-700">{req}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
          {lab.learningOutcomes?.length > 0 && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">What you&apos;ll learn</CardTitle></CardHeader>
              <CardContent className="pt-0">
                <ul className="space-y-1.5">
                  {lab.learningOutcomes.map((outcome, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <Check className="w-3.5 h-3.5 text-blue-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-slate-700">{outcome}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Lab Content</CardTitle></CardHeader>
          <CardContent className="pt-0 space-y-2">
            {modules.map((mod, mIdx) => {
              const isExpanded = expandedPreviewModules.includes(mod.id);
              return (
                <div key={mod.id} className="border border-slate-200 rounded-lg overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setExpandedPreviewModules(
                      isExpanded ? expandedPreviewModules.filter((id) => id !== mod.id) : [...expandedPreviewModules, mod.id]
                    )}
                    className="w-full bg-slate-50 px-3 py-2.5 flex items-center justify-between hover:bg-slate-100 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold text-sm">{mIdx + 1}</div>
                      <div className="text-left">
                        <p className="font-semibold text-sm text-slate-900">{mod.title || "Untitled Module"}</p>
                        <p className="text-xs text-slate-500">{mod.lessons.length} {mod.lessons.length === 1 ? "Lesson" : "Lessons"}</p>
                      </div>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                  </button>
                  {isExpanded && (
                    <div className="bg-white p-2.5 space-y-1.5 border-t border-slate-100">
                      {mod.lessons.map((lesson) => {
                        const isLessonExpanded = expandedPreviewLessons.includes(lesson.id);
                        return (
                          <div key={lesson.id} className="border border-slate-100 rounded-md overflow-hidden">
                            <button
                              type="button"
                              onClick={() => setExpandedPreviewLessons(
                                isLessonExpanded
                                  ? expandedPreviewLessons.filter((id) => id !== lesson.id)
                                  : [...expandedPreviewLessons, lesson.id]
                              )}
                              className="w-full flex items-center gap-2.5 p-2 hover:bg-slate-50 transition-colors"
                            >
                              <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center ml-10">
                                <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                              </div>
                              <div className="flex-1 min-w-0 text-left">
                                <p className="font-medium text-sm text-slate-900 truncate">{lesson.title || "Untitled Lesson"}</p>
                                <p className="text-xs text-slate-500">{lesson.blocks?.length || 0} blocks</p>
                              </div>
                              <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform ${isLessonExpanded ? "rotate-180" : ""}`} />
                            </button>
                            {isLessonExpanded && lesson.blocks?.length > 0 && (
                              <div className="bg-slate-50 p-2 ml-12 space-y-1.5 border-t border-slate-100">
                                {lesson.blocks.map((block) => {
                                  const typeConfig = blockTypes.find((t) => t.id === block.type);
                                  const IconComponent = typeConfig?.icon || FileText;
                                  return (
                                    <div key={block.id} className="flex items-center gap-2 p-1.5 bg-white rounded border border-slate-200">
                                      <div className={`w-6 h-6 rounded flex items-center justify-center ${typeConfig?.bg || "bg-slate-100"}`}>
                                        <IconComponent className={`w-3.5 h-3.5 ${typeConfig?.color || "text-slate-600"}`} />
                                      </div>
                                      <span className="text-sm text-slate-700 truncate">{block.title || typeConfig?.label || "Untitled Block"}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function LabDetailProgressPreviewPanel({ modules, blockTypes, previewItemIndex, setPreviewItemIndex }) {
  const flatLessons = useMemo(() => {
    const lessons = [];
    modules.forEach((mod, mIdx) => {
      mod.lessons.forEach((lesson, lIdx) => {
        lessons.push({ ...lesson, moduleTitle: mod.title, moduleIndex: mIdx, lessonIndex: lIdx });
      });
    });
    return lessons;
  }, [modules]);

  const current = flatLessons[previewItemIndex] || flatLessons[0];
  const progressPct = flatLessons.length ? Math.round(((previewItemIndex + 1) / flatLessons.length) * 100) : 0;

  if (!flatLessons.length) {
    return (
      <Card className="max-w-4xl mx-auto">
        <CardContent className="p-8 text-center text-slate-500">Add modules and lessons to preview the learner experience.</CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-4">
      <Card className="lg:col-span-1">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Your Progress</CardTitle>
          <p className="text-xs text-slate-500">{progressPct}% complete (preview)</p>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="h-2 bg-slate-100 rounded-full mb-4 overflow-hidden">
            <div className="h-full bg-blue-600 rounded-full transition-all" style={{ width: `${progressPct}%` }} />
          </div>
          <div className="space-y-2 max-h-[420px] overflow-y-auto">
            {modules.map((mod, mIdx) => (
              <div key={mod.id} className="border border-slate-200 rounded-lg p-2">
                <p className="text-xs font-semibold text-slate-700 mb-1.5">Module {mIdx + 1}: {mod.title || "Untitled"}</p>
                {mod.lessons.map((lesson) => {
                  const globalIdx = flatLessons.findIndex((fl) => fl.id === lesson.id);
                  const isActive = globalIdx === previewItemIndex;
                  const isDone = globalIdx < previewItemIndex;
                  return (
                    <button
                      key={lesson.id}
                      type="button"
                      onClick={() => setPreviewItemIndex(globalIdx)}
                      className={cn(
                        "w-full flex items-center gap-2 p-1.5 rounded text-left text-sm",
                        isActive ? "bg-blue-50 text-blue-800" : "hover:bg-slate-50 text-slate-700"
                      )}
                    >
                      {isDone ? (
                        <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                      ) : isActive ? (
                        <Play className="w-4 h-4 text-blue-600 shrink-0" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border border-slate-300 shrink-0" />
                      )}
                      <span className="truncate">{lesson.title || "Untitled"}</span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader className="pb-2 border-b">
          <p className="text-xs text-slate-500">{current?.moduleTitle}</p>
          <CardTitle className="text-lg">{current?.title || "Lesson"}</CardTitle>
        </CardHeader>
        <CardContent className="pt-4 space-y-4 min-h-[360px]">
          {current?.blocks?.length > 0 ? (
            current.blocks.map((block) => {
              const typeConfig = blockTypes.find((t) => t.id === block.type);
              const IconComponent = typeConfig?.icon || FileText;
              return (
                <div key={block.id} className="border border-slate-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-8 h-8 rounded flex items-center justify-center ${typeConfig?.bg || "bg-slate-100"}`}>
                      <IconComponent className={`w-4 h-4 ${typeConfig?.color || "text-slate-600"}`} />
                    </div>
                    <h4 className="font-semibold text-slate-900">
                      {block.type === "richText"
                        ? getRichTextBlockTitle(block)
                        : block.title || typeConfig?.label}
                    </h4>
                  </div>
                  {block.type === "video" && block.videos?.[0]?.url && (
                    <video src={block.videos[0].url} controls className="w-full rounded-lg max-h-48 bg-black" />
                  )}
                  {block.type === "richText" && block.content && (
                    <RichTextContent
                      html={block.content}
                      title={block.title?.trim() || undefined}
                      showTitle={false}
                      className="text-sm max-h-40 overflow-hidden"
                    />
                  )}
                  {block.type === "quiz" && (
                    <p className="text-sm text-slate-500">{block.questions?.length || 0} quiz question(s)</p>
                  )}
                </div>
              );
            })
          ) : (
            <p className="text-sm text-slate-500">No content blocks in this lesson yet.</p>
          )}
        </CardContent>
        <div className="px-6 pb-4 flex justify-end border-t pt-4">
          <Button
            type="button"
            onClick={() => setPreviewItemIndex((i) => Math.min(i + 1, flatLessons.length - 1))}
            disabled={previewItemIndex >= flatLessons.length - 1}
          >
            Next<ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </Card>
    </div>
  );
}
