import React, { useState, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { MOCK_SKILL_BUILDER_LABS } from "@/data/skillBuilderData";
import ContentBlock from "@/components/skill-builder/ContentBlock";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  CheckCircle2,
  BookOpen,
  Menu,
  X
} from "lucide-react";

export default function SkillBuilderLesson() {
  const { labId, lessonId } = useParams();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const lab = MOCK_SKILL_BUILDER_LABS.find((l) => l.id === labId);

  const { currentModule, currentLesson, currentIndex, nextLesson, prevLesson } = useMemo(() => {
    if (!lab) return {};

    let lessonIndex = 0;
    let foundModule = null;
    let foundLesson = null;
    let next = null;
    let prev = null;

    const allLessons = [];
    lab.modules.forEach((mod) => {
      mod.lessons.forEach((les) => {
        allLessons.push({ module: mod, lesson: les });
      });
    });

    for (let i = 0; i < allLessons.length; i++) {
      if (allLessons[i].lesson.id === lessonId) {
        foundModule = allLessons[i].module;
        foundLesson = allLessons[i].lesson;
        lessonIndex = i;
        prev = i > 0 ? allLessons[i - 1] : null;
        next = i < allLessons.length - 1 ? allLessons[i + 1] : null;
        break;
      }
    }

    return {
      currentModule: foundModule,
      currentLesson: foundLesson,
      currentIndex: lessonIndex,
      nextLesson: next,
      prevLesson: prev,
    };
  }, [lab, lessonId]);

  if (!lab) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-700 mb-2">Lab not found</h2>
          <Link to="/skill-builder-labs" className="text-blue-600 hover:underline">
            Back to labs
          </Link>
        </div>
      </div>
    );
  }

  if (!currentLesson) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-700 mb-2">Lesson not found</h2>
          <Link to={`/skill-builder-labs/${labId}`} className="text-blue-600 hover:underline">
            Back to course
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top Bar */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-4 h-16">
            <button
              onClick={() => navigate(`/skill-builder-labs/${labId}`)}
              className="flex items-center gap-2 text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="hidden sm:inline">Back to course</span>
            </button>

            <div className="flex-1 flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2 rounded-lg hover:bg-slate-100"
              >
                {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
              <div className="hidden sm:block">
                <h1 className="font-semibold text-slate-900">{lab.title}</h1>
                <p className="text-sm text-slate-500">
                  {currentModule?.title}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {prevLesson && (
                <Button
                  variant="secondary"
                  onClick={() =>
                    navigate(
                      `/skill-builder-labs/${labId}/lessons/${prevLesson.lesson.id}`
                    )
                  }
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Previous
                </Button>
              )}
              {nextLesson && (
                <Button
                  onClick={() =>
                    navigate(
                      `/skill-builder-labs/${labId}/lessons/${nextLesson.lesson.id}`
                    )
                  }
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Sidebar */}
        {(sidebarOpen || window.innerWidth >= 1024) && (
          <aside className={`${sidebarOpen ? "block" : "hidden"} lg:block w-full lg:w-80 bg-white border-r border-slate-200 h-[calc(100vh-4rem)] sticky top-16 overflow-y-auto`}>
            <div className="p-4 border-b border-slate-200">
              <div className="flex items-center gap-2 text-slate-900 font-semibold mb-2">
                <BookOpen className="w-5 h-5" />
                <span>Course Content</span>
              </div>
            </div>
            <nav className="p-4">
              {lab.modules.map((module, mIndex) => (
                <div key={module.id} className="mb-6">
                  <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                    <span className="w-6 h-6 bg-slate-100 rounded-full flex items-center justify-center text-xs">
                      {mIndex + 1}
                    </span>
                    {module.title}
                  </h3>
                  <ul className="space-y-1">
                    {module.lessons.map((lesson, lIndex) => (
                      <li key={lesson.id}>
                        <Link
                          to={`/skill-builder-labs/${labId}/lessons/${lesson.id}`}
                          className={`flex items-center gap-3 p-3 rounded-lg text-sm transition-colors ${
                            lesson.id === lessonId
                              ? "bg-blue-50 text-blue-700 font-medium border border-blue-100"
                              : "text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          {lesson.id === lessonId ? (
                            <CheckCircle2 className="w-4 h-4 text-blue-600" />
                          ) : (
                            <div className="w-4 h-4 rounded-full border-2 border-slate-300" />
                          )}
                          <span className="flex-1">{lesson.title}</span>
                          <span className="text-xs text-slate-400">
                            {lesson.blocks.length}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </nav>
          </aside>
        )}

        {/* Main Content */}
        <main className="flex-1 min-w-0">
          <div className="container mx-auto px-4 py-8 lg:py-12 max-w-4xl">
            <div className="mb-8">
              <div className="text-sm font-semibold text-blue-600 uppercase tracking-wider mb-2">
                {currentModule?.title}
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
                {currentLesson.title}
              </h1>
              <div className="flex items-center gap-4 text-slate-500">
                <span>{currentLesson.blocks.length} content blocks</span>
              </div>
            </div>

            {/* Blocks */}
            <div className="space-y-2">
              {currentLesson.blocks.map((block, index) => (
                <ContentBlock key={block.id} block={block} />
              ))}
            </div>

            {/* Bottom Navigation */}
            <div className="mt-12 pt-8 border-t border-slate-200">
              <div className="flex justify-between items-center">
                {prevLesson ? (
                  <Button
                    variant="secondary"
                    onClick={() =>
                      navigate(
                        `/skill-builder-labs/${labId}/lessons/${prevLesson.lesson.id}`
                      )
                    }
                    className="flex items-center gap-2"
                  >
                    <ChevronLeft className="w-5 h-5" />
                    <div className="text-left">
                      <div className="text-xs text-slate-500">Previous</div>
                      <div className="font-medium">{prevLesson.lesson.title}</div>
                    </div>
                  </Button>
                ) : (
                  <div />
                )}
                {nextLesson ? (
                  <Button
                    onClick={() =>
                      navigate(
                        `/skill-builder-labs/${labId}/lessons/${nextLesson.lesson.id}`
                      )
                    }
                    className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                  >
                    <div className="text-right">
                      <div className="text-xs text-blue-100">Next</div>
                      <div className="font-medium">{nextLesson.lesson.title}</div>
                    </div>
                    <ChevronRight className="w-5 h-5" />
                  </Button>
                ) : (
                  <div />
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
