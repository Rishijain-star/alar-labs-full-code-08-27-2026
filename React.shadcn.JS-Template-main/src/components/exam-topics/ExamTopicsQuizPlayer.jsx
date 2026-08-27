import { useCallback, useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { formatCountdown } from "@/lib/examTopicsConfig";
import { Loader2, CheckCircle2, XCircle, Clock, ChevronRight, Lightbulb, Trophy, AlertTriangle, AlertCircle, HelpCircle, RefreshCw, Eye, Award, ChevronDown, ChevronUp } from "lucide-react";
import { useVerifyExamTopicsAnswerMutation } from "@/store/api/examTopicsApi";
import { useAssessmentAutoSave, clearAssessmentAutoSave } from "@/hooks/useAssessmentAutoSave";
import { useSelector } from "react-redux";

/**
 * @param {"learning"|"exam"} mode
 * @param {object} sectionConfig - learning { questions } or exam { title, timeLimitMinutes, questions }
 */
export default function ExamTopicsQuizPlayer({ mode = "learning", sectionConfig, setId, onFinish, onRetake }) {
  const questions = sectionConfig?.questions || [];
  const timeLimitMinutes = Number(sectionConfig?.timeLimitMinutes) || 50;
  const isLearning = mode === "learning";

  const user = useSelector((state) => state.auth?.user);
  
  // Use simple default values for initial render
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [feedback, setFeedback] = useState(null);
  const [checking, setChecking] = useState(false);
  const [finished, setFinished] = useState(false);
  const [examResults, setExamResults] = useState(null);
  const [secondsLeft, setSecondsLeft] = useState(timeLimitMinutes * 60);
  const [expandedQuestions, setExpandedQuestions] = useState({});
  const [showReviewPrompt, setShowReviewPrompt] = useState(false);
  const [reviewMode, setReviewMode] = useState(false);

  const { isInitializing, initialData } = useAssessmentAutoSave({
    userId: user?.id,
    entityType: "exam_progress",
    entityId: `${mode}_${setId}`,
    currentState: { index, answers, feedback, finished, examResults, secondsLeft, expandedQuestions },
  });

  const hasHydrated = useRef(false);

  // Hydrate state when backend draft is loaded
  useEffect(() => {
    if (!isInitializing && !hasHydrated.current) {
      hasHydrated.current = true;
      if (initialData) {
        setIndex(initialData.index ?? 0);
        setAnswers(initialData.answers ?? {});
        setFeedback(initialData.feedback ?? null);
        setFinished(initialData.finished ?? false);
        setExamResults(initialData.examResults ?? null);
        setSecondsLeft(initialData.secondsLeft ?? (timeLimitMinutes * 60));
        setExpandedQuestions(initialData.expandedQuestions ?? {});
        
        // If we resumed a finished exam, notify parent so UI updates (like hiding Cancel button)
        if (initialData.finished) {
          onFinish?.({ 
            score: initialData.examResults?.score || 0, 
            total: initialData.examResults?.total || questions.length 
          });
        }
      } else {
        // Explicitly reset to default if no saved progress
        setIndex(0);
        setAnswers({});
        setFeedback(null);
        setFinished(false);
        setExamResults(null);
        setSecondsLeft(timeLimitMinutes * 60);
        setExpandedQuestions({});
      }
    }
  }, [isInitializing, initialData, timeLimitMinutes, questions.length]); // Intentionally omitting onFinish to prevent infinite hydration loops

  const [verifyAnswer] = useVerifyExamTopicsAnswerMutation();

  const handleRetake = () => {
    // Explicitly wipe the previous attempt from backend/local before restarting
    clearAssessmentAutoSave(user?.id, "exam_progress", `${mode}_${setId}`);
    
    setIndex(0);
    setAnswers({});
    setFeedback(null);
    setChecking(false);
    setFinished(false);
    setExamResults(null);
    setSecondsLeft(timeLimitMinutes * 60);
    setExpandedQuestions({});
    onRetake?.();
  };

  const current = questions[index];
  const qType = current?.type || "multiple_choice";
  const isMultiSelect = qType === "multiple_choice" && Array.isArray(current?.correctOptionIds) && current.correctOptionIds.length > 1;
  const isLast = index >= questions.length - 1;

  const handleFinishExam = useCallback(async () => {
    const results = [];
    for (const q of questions) {
      const userAns = answers[q.id];
      const isSkipped = !userAns || userAns === "SKIPPED" || (Array.isArray(userAns) && !userAns.length);
      try {
        const payload = {
          section: "exam",
          setId,
          questionId: q.id,
        };
        if (!isSkipped) {
          if (Array.isArray(userAns)) {
            payload.optionIds = userAns.map(String);
          } else if (q.type === "fill_in_blank") {
            payload.answerText = String(userAns);
          } else {
            payload.optionId = String(userAns);
          }
        }

        const res = await verifyAnswer(payload).unwrap();
        const resData = res?.data?.data || res?.data || res || {};
        const correct = !!(resData.correct ?? res?.correct);
        const explanation = resData.explanation || res?.explanation || q.explanation || "";
        results.push({
          questionId: q.id,
          correct: isSkipped ? false : correct,
          skipped: isSkipped,
          explanation,
        });
      } catch {
        results.push({
          questionId: q.id,
          correct: false,
          skipped: isSkipped,
          explanation: q.explanation || "",
        });
      }
    }
    const score = results.filter((r) => r.correct).length;
    setExamResults({ score, total: questions.length, results });
    setFinished(true);
    onFinish?.({ score, total: questions.length });
  }, [answers, onFinish, questions, setId, verifyAnswer]);

  useEffect(() => {
    if (isLearning || finished || !questions.length) return undefined;
    if (secondsLeft <= 0) {
      handleFinishExam();
      return undefined;
    }
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [finished, handleFinishExam, isLearning, questions.length, secondsLeft]);

  const handleVerify = async (selectedVal) => {
    if (!current || checking || finished) return;
    const ans = selectedVal ?? answers[current.id];
    if (!ans || (Array.isArray(ans) && !ans.length)) return;

    if (isLearning) {
      setChecking(true);
      try {
        const payload = {
          section: "learning",
          setId,
          questionId: current.id,
        };
        if (Array.isArray(ans)) {
          payload.optionIds = ans;
        } else if (qType === "fill_in_blank") {
          payload.answerText = ans;
        } else {
          payload.optionId = ans;
        }

        const res = await verifyAnswer(payload).unwrap();
        console.log('[QuizPlayer] verifyAnswer raw res:', JSON.stringify(res));
        const resData = res?.data?.data || res?.data || res || {};
        console.log('[QuizPlayer] resData:', JSON.stringify(resData));
        const correct = !!(resData.correct ?? res?.correct);
        const explanation = resData.explanation || res?.explanation || current?.explanation || "";
        console.log('[QuizPlayer] explanation extracted:', JSON.stringify(explanation));
        setFeedback({
          val: ans,
          correct,
          explanation,
        });
      } catch {
        setFeedback({
          val: ans,
          correct: false,
          explanation: current?.explanation || "",
        });
      } finally {
        setChecking(false);
      }
    }
  };

  const getExplanationText = () => {
    if (feedback?.explanation && String(feedback.explanation).trim()) {
      return String(feedback.explanation).trim();
    }
    if (current?.explanation && String(current.explanation).trim()) {
      return String(current.explanation).trim();
    }
    if (!current) return "";
    const type = current.type || "multiple_choice";
    if (type === "fill_in_blank") {
      const ans = current.options?.[0]?.text;
      return ans ? `Correct answer: "${ans}"` : "No detailed explanation provided for this question.";
    }
    const correctIds = Array.isArray(current.correctOptionIds) && current.correctOptionIds.length
      ? current.correctOptionIds
      : [current.correctOptionId].filter(Boolean);
    const correctTexts = (current.options || [])
      .filter((o) => correctIds.includes(String(o.id)))
      .map((o) => o.text)
      .filter(Boolean);
    if (correctTexts.length > 0) {
      return `Correct answer: ${correctTexts.join(", ")}`;
    }
    return "No detailed explanation provided for this question.";
  };

  const handleSelectRadio = (val) => {
    if (!current || checking || (isLearning && feedback)) return;
    setAnswers((prev) => ({ ...prev, [current.id]: val }));
    if (isLearning) {
      handleVerify(val);
    }
  };

  const handleToggleCheckbox = (optId) => {
    if (!current || checking || (isLearning && feedback)) return;
    setAnswers((prev) => {
      const existing = Array.isArray(prev[current.id]) ? prev[current.id] : [];
      const updated = existing.includes(optId)
        ? existing.filter((id) => id !== optId)
        : [...existing, optId];
      return { ...prev, [current.id]: updated };
    });
  };

  const handleTextChange = (text) => {
    if (!current || checking || (isLearning && feedback)) return;
    setAnswers((prev) => ({ ...prev, [current.id]: text }));
  };

  const checkAndFinishExam = () => {
    const skippedOrUnanswered = questions.filter(q => {
      const ans = answers[q.id];
      return !ans || ans === "SKIPPED" || (Array.isArray(ans) && !ans.length);
    });

    if (skippedOrUnanswered.length > 0) {
      setShowReviewPrompt(true);
    } else {
      handleFinishExam();
    }
  };

  const handleSkip = () => {
    if (checking || (isLearning && feedback) || finished) return;
    
    setAnswers((prev) => ({ ...prev, [current.id]: "SKIPPED" }));
    
    if (isLearning) {
      setFeedback({ val: "SKIPPED", correct: false, skipped: true, explanation: current?.explanation || "" });
    } else {
      if (reviewMode) {
        const nextSkipped = questions.findIndex((q, i) => i > index && (!answers[q.id] || answers[q.id] === "SKIPPED" || q.id === current.id));
        if (nextSkipped !== -1 && nextSkipped !== index) {
          setIndex(nextSkipped);
        } else {
          checkAndFinishExam();
        }
      } else if (isLast) {
        const willHaveSkipped = questions.filter(q => {
          const ans = q.id === current.id ? "SKIPPED" : answers[q.id];
          return !ans || ans === "SKIPPED" || (Array.isArray(ans) && !ans.length);
        });
        if (willHaveSkipped.length > 0) {
          setShowReviewPrompt(true);
        } else {
          handleFinishExam();
        }
      } else {
        setIndex((i) => i + 1);
        setFeedback(null);
      }
    }
  };

  const goNext = () => {
    if (reviewMode) {
      const nextSkipped = questions.findIndex((q, i) => i > index && (!answers[q.id] || answers[q.id] === "SKIPPED" || (Array.isArray(answers[q.id]) && !answers[q.id].length)));
      if (nextSkipped !== -1) {
        setIndex(nextSkipped);
      } else {
        checkAndFinishExam();
      }
      return;
    }

    if (isLast) {
      if (isLearning) {
        setFinished(true);
        onFinish?.();
      } else {
        checkAndFinishExam();
      }
      return;
    }
    setIndex((i) => i + 1);
    setFeedback(null);
  };

  const progress = questions.length ? ((index + 1) / questions.length) * 100 : 0;
  const timerUrgent = !isLearning && secondsLeft <= 300;

  if (isInitializing) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Restoring your progress...</span>
        </CardContent>
      </Card>
    );
  }

  if (!questions.length) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          No questions available yet.
        </CardContent>
      </Card>
    );
  }

  if (finished && isLearning) {
    return (
      <Card className="border-green-200 bg-green-50/50">
        <CardContent className="p-8 text-center space-y-4">
          <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto" />
          <h3 className="text-xl font-semibold text-green-900">Learning complete!</h3>
          <p className="text-sm text-green-800">
            You reviewed all {questions.length} questions. Great work!
          </p>
        </CardContent>
      </Card>
    );
  }

  if (finished && !isLearning && examResults) {
    const requiredPct = sectionConfig?.passingPercentage ?? 70;
    const pct = Math.round((examResults.score / examResults.total) * 100) || 0;
    const passed = pct >= requiredPct;
    const correctCount = examResults.score;
    const totalCount = examResults.total;
    const skippedCount = examResults.results.filter((r) => r.skipped).length;
    const incorrectCount = totalCount - correctCount - skippedCount;

    return (
      <div className="space-y-6">
        {/* Overall Status Banner */}
        <Card className={cn(
          "border-2 transition-all duration-300",
          passed 
            ? "border-emerald-200 bg-gradient-to-r from-emerald-50/70 to-teal-50/40 dark:from-emerald-950/20 dark:to-teal-950/10" 
            : "border-rose-200 bg-gradient-to-r from-rose-50/70 to-amber-50/40 dark:from-rose-950/20 dark:to-amber-950/10"
        )}>
          <CardContent className="p-6 md:p-8 flex flex-col md:flex-row items-center gap-6 justify-between">
            <div className="flex items-center gap-4 text-center md:text-left flex-col md:flex-row">
              <div className={cn(
                "p-4 rounded-full",
                passed ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50" : "bg-rose-100 text-rose-700 dark:bg-rose-900/50"
              )}>
                {passed ? <Trophy className="w-10 h-10 animate-bounce" /> : <AlertTriangle className="w-10 h-10" />}
              </div>
              <div>
                <h3 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white">
                  {passed ? "Congratulations! You Passed!" : "Keep Practicing!"}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 max-w-md">
                  {passed 
                    ? `Great job! You have successfully passed the exam with a passing score of ${requiredPct}% or higher.` 
                    : `You didn't reach the passing score of ${requiredPct}% this time, but don't give up! Review the answers below to learn.`}
                </p>
              </div>
            </div>

            <div className="flex flex-col items-center justify-center shrink-0 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 md:p-6 shadow-sm min-w-[140px]">
              <span className={cn(
                "text-4xl font-extrabold tracking-tight",
                passed ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
              )}>
                {pct}%
              </span>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 mt-1">
                Passing: {requiredPct}%
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-slate-50/50 dark:bg-slate-900/50 border-slate-200">
            <CardContent className="p-4 text-center">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider block">Score</span>
              <span className="text-2xl font-bold text-slate-800 dark:text-white mt-1 block">
                {correctCount} / {totalCount}
              </span>
            </CardContent>
          </Card>
          <Card className="bg-emerald-50/30 dark:bg-emerald-950/10 border-emerald-100">
            <CardContent className="p-4 text-center">
              <span className="text-xs font-medium text-emerald-600 uppercase tracking-wider block">Correct</span>
              <span className="text-2xl font-bold text-emerald-700 dark:text-emerald-400 mt-1 block">
                {correctCount}
              </span>
            </CardContent>
          </Card>
          <Card className="bg-rose-50/30 dark:bg-rose-950/10 border-rose-100">
            <CardContent className="p-4 text-center">
              <span className="text-xs font-medium text-rose-600 uppercase tracking-wider block">Incorrect</span>
              <span className="text-2xl font-bold text-rose-700 dark:text-rose-400 mt-1 block">
                {incorrectCount}
              </span>
            </CardContent>
          </Card>
          <Card className="bg-slate-50/40 dark:bg-slate-950/10 border-slate-100">
            <CardContent className="p-4 text-center">
              <span className="text-xs font-medium text-slate-600 uppercase tracking-wider block">Skipped</span>
              <span className="text-2xl font-bold text-slate-700 dark:text-slate-300 mt-1 block">
                {skippedCount}
              </span>
            </CardContent>
          </Card>
        </div>

        {/* Question Review Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <h4 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Eye className="w-5 h-5 text-blue-600" />
              <span>Detailed Question Review</span>
            </h4>
            <span className="text-xs text-slate-500 font-medium">
              Click any question to view full details
            </span>
          </div>

          <div className="space-y-3">
            {questions.map((q, idx) => {
              const resultObj = examResults.results.find((r) => r.questionId === q.id) || {};
              const isCorrect = !!resultObj.correct;
              const isSkipped = !!resultObj.skipped;
              const isExpanded = !!expandedQuestions[q.id];
              const userAns = answers[q.id];

              return (
                <Card 
                  key={q.id} 
                  className={cn(
                    "border transition-all duration-200 overflow-hidden",
                    isCorrect && "border-emerald-100 hover:border-emerald-200",
                    !isCorrect && !isSkipped && "border-rose-100 hover:border-rose-200",
                    isSkipped && "border-slate-200 hover:border-slate-300"
                  )}
                >
                  {/* Collapsible Card Header */}
                  <div 
                    onClick={() => setExpandedQuestions(prev => ({ ...prev, [q.id]: !prev[q.id] }))}
                    className={cn(
                      "p-4 flex items-center justify-between cursor-pointer select-none gap-4",
                      isCorrect && "bg-emerald-50/10 hover:bg-emerald-50/30",
                      !isCorrect && !isSkipped && "bg-rose-50/10 hover:bg-rose-50/30",
                      isSkipped && "bg-slate-50/10 hover:bg-slate-50/30"
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="font-bold text-sm text-slate-500 shrink-0">
                        Q{idx + 1}
                      </span>
                      <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
                        {q.question || "Untitled Question"}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {isCorrect && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400">
                          <CheckCircle2 className="w-3 h-3" /> Correct
                        </span>
                      )}
                      {!isCorrect && !isSkipped && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-400">
                          <XCircle className="w-3 h-3" /> Incorrect
                        </span>
                      )}
                      {isSkipped && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          <HelpCircle className="w-3 h-3" /> Skipped
                        </span>
                      )}
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                    </div>
                  </div>

                  {/* Card Content (Review Details) */}
                  {isExpanded && (
                    <CardContent className="p-5 border-t bg-white dark:bg-slate-900 space-y-4">
                      {/* Full Question Text */}
                      <div>
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                          Question text
                        </span>
                        <p className="text-sm md:text-base font-medium text-slate-800 dark:text-white leading-relaxed font-sans">
                          {q.question}
                        </p>
                      </div>

                      {/* Options / Answers Section */}
                      <div>
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-2">
                          Options & Answers
                        </span>

                        {q.type === "fill_in_blank" ? (
                          <div className="space-y-2 max-w-md">
                            <div className="flex flex-col p-3 rounded-lg border border-slate-100 bg-slate-50/50">
                              <span className="text-xs font-medium text-slate-500">Your Answer:</span>
                              <span className={cn(
                                "text-sm font-semibold mt-0.5",
                                isCorrect ? "text-emerald-600 font-sans" : "text-rose-600 font-sans"
                              )}>
                                {userAns ? `"${userAns}"` : <span className="italic font-normal text-slate-400">Skipped / No response</span>}
                              </span>
                            </div>
                            <div className="flex flex-col p-3 rounded-lg border border-emerald-100 bg-emerald-50/20">
                              <span className="text-xs font-medium text-emerald-700">Acceptable Answers:</span>
                              <span className="text-sm font-semibold text-emerald-800 mt-0.5 font-sans">
                                {(q.options || []).map((o) => `"${o.text}"`).join(" or ") || "None specified"}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {(q.options || []).map((opt) => {
                              const correctIds = Array.isArray(q.correctOptionIds)
                                ? q.correctOptionIds.map(String)
                                : [String(q.correctOptionId || q.correctOptionIds)].filter(Boolean);
                              const isCorrectOption = correctIds.includes(String(opt.id));
                              const isUserSelected = Array.isArray(userAns)
                                ? userAns.map(String).includes(String(opt.id))
                                : String(userAns || "") === String(opt.id);

                              return (
                                <div 
                                  key={opt.id}
                                  className={cn(
                                    "flex items-center gap-3 rounded-lg border px-4 py-3 text-sm font-medium",
                                    isUserSelected && isCorrectOption && "border-emerald-500 bg-emerald-50/80 text-emerald-900 dark:bg-emerald-950/20 dark:text-emerald-300",
                                    isUserSelected && !isCorrectOption && "border-rose-400 bg-rose-50/80 text-rose-900 dark:bg-rose-950/20 dark:text-rose-300",
                                    !isUserSelected && isCorrectOption && "border-emerald-300 bg-emerald-50/20 text-emerald-800 dark:bg-emerald-950/10 dark:text-emerald-400",
                                    !isUserSelected && !isCorrectOption && "border-slate-100 bg-slate-50/30 text-slate-600 dark:border-slate-800 dark:text-slate-400"
                                  )}
                                >
                                  <div className="flex items-center shrink-0">
                                    {isUserSelected && isCorrectOption && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                                    {isUserSelected && !isCorrectOption && <XCircle className="w-4 h-4 text-rose-600" />}
                                    {!isUserSelected && isCorrectOption && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                                    {!isUserSelected && !isCorrectOption && <div className="w-4 h-4 rounded-full border border-slate-300 shrink-0" />}
                                  </div>
                                  <span className="flex-1 font-sans">{opt.text}</span>
                                  {isUserSelected && <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-slate-200/50 text-slate-600">Your choice</span>}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Explanation box */}
                      <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-4 text-slate-800 space-y-1.5 dark:bg-amber-950/30 dark:border-amber-900 dark:text-amber-100">
                        <div className="flex items-center gap-2 font-semibold text-amber-900 dark:text-amber-300 text-sm">
                          <Lightbulb className="w-4.5 h-4.5 text-amber-600 shrink-0" />
                          <span>Explanation & Learning Notes</span>
                        </div>
                        <p className="text-xs sm:text-sm leading-relaxed text-slate-700 dark:text-slate-300 whitespace-pre-wrap font-sans">
                          {resultObj.explanation || q.explanation || "No detailed explanation provided for this question."}
                        </p>
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        </div>

        {/* Retry Button */}
        <div className="flex justify-center pt-2">
          <Button 
            onClick={handleRetake}
            className="bg-blue-600 hover:bg-blue-700 flex items-center gap-2 px-6 py-5 rounded-xl font-bold"
          >
            <RefreshCw className="w-4.5 h-4.5" />
            <span>Retake Exam</span>
          </Button>
        </div>
      </div>
    );
  }

  const currentAnswer = answers[current.id];

  return (
    <div className="space-y-4">
      {!isLearning && (
        <div
          className={cn(
            "flex items-center justify-center gap-2 rounded-lg border px-4 py-3 font-mono text-lg font-semibold transition-colors",
            timerUrgent
              ? "border-red-300 bg-red-50 text-red-700"
              : "border-blue-200 bg-blue-50 text-blue-800"
          )}
        >
          <Clock className="w-5 h-5" />
          {formatCountdown(secondsLeft)}
        </div>
      )}

      <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
        <div
          className="h-full bg-blue-600 transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Question {index + 1} of {questions.length}</span>
        {isMultiSelect && (
          <span className="font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
            Select all that apply
          </span>
        )}
      </div>

      <Card>
        <CardContent className="p-5 sm:p-6 space-y-5">
          <p className="font-semibold text-slate-900 text-base sm:text-lg leading-snug">
            {current.question}
          </p>

          {/* 1. Multiple Choice / Single-Select OR True-False */}
          {(qType === "true_false" || (qType === "multiple_choice" && !isMultiSelect)) && (
            <RadioGroup
              value={typeof currentAnswer === "string" ? currentAnswer : ""}
              onValueChange={handleSelectRadio}
              disabled={checking || (isLearning && !!feedback)}
              className="space-y-2"
            >
              {(current.options || []).map((opt) => {
                const selected = currentAnswer === opt.id;
                const isLearningDone = isLearning && !!feedback;
                
                const correctIds = Array.isArray(current.correctOptionIds)
                  ? current.correctOptionIds.map(String)
                  : [String(current.correctOptionId || current.correctOptionIds)].filter(Boolean);
                const isActuallyCorrectOption = correctIds.includes(String(opt.id));
                
                const isCorrectSelection = isLearningDone && selected && feedback.correct;
                const isWrongSelection = isLearningDone && selected && !feedback.correct;
                const revealCorrect = isLearningDone && !feedback.correct && isActuallyCorrectOption;

                return (
                  <div key={opt.id} className="relative">
                    <Label
                      htmlFor={`play-${current.id}-${opt.id}`}
                      className={cn(
                        "flex items-center gap-3 rounded-lg border px-4 py-3 cursor-pointer transition-all duration-300",
                        !isLearningDone && selected && "border-blue-500 bg-blue-50",
                        !isLearningDone && !selected && "border-slate-200 hover:bg-slate-50",
                        (isCorrectSelection || revealCorrect) && "border-green-500 bg-green-100",
                        isWrongSelection && "border-red-400 bg-red-100",
                        (checking || isLearningDone) && "pointer-events-none"
                      )}
                    >
                      <RadioGroupItem value={opt.id} id={`play-${current.id}-${opt.id}`} />
                      <span className="text-sm flex-1">{opt.text}</span>
                      {(isCorrectSelection || revealCorrect) && <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />}
                      {isWrongSelection && <XCircle className="w-5 h-5 text-red-600 shrink-0" />}
                    </Label>
                  </div>
                );
              })}
            </RadioGroup>
          )}

          {/* 2. Multiple Choice / Multi-Select */}
          {qType === "multiple_choice" && isMultiSelect && (
            <div className="space-y-2">
              {(current.options || []).map((opt) => {
                const checked = Array.isArray(currentAnswer) && currentAnswer.includes(opt.id);
                const isLearningDone = isLearning && !!feedback;
                
                const correctIds = Array.isArray(current.correctOptionIds)
                  ? current.correctOptionIds.map(String)
                  : [String(current.correctOptionId || current.correctOptionIds)].filter(Boolean);
                const isActuallyCorrectOption = correctIds.includes(String(opt.id));
                
                const highlightGreen = isLearningDone && isActuallyCorrectOption;
                const highlightRed = isLearningDone && checked && !isActuallyCorrectOption;

                return (
                  <Label
                    key={opt.id}
                    htmlFor={`play-${current.id}-${opt.id}`}
                    className={cn(
                      "flex items-center gap-3 rounded-lg border px-4 py-3 cursor-pointer transition-all duration-300",
                      !isLearningDone && checked && "border-blue-500 bg-blue-50",
                      !isLearningDone && !checked && "border-slate-200 hover:bg-slate-50",
                      highlightGreen && "border-green-500 bg-green-100",
                      highlightRed && "border-red-400 bg-red-100",
                      (checking || isLearningDone) && "pointer-events-none"
                    )}
                  >
                    <Checkbox
                      id={`play-${current.id}-${opt.id}`}
                      checked={checked}
                      onCheckedChange={() => handleToggleCheckbox(opt.id)}
                      disabled={checking || isLearningDone}
                    />
                    <span className="text-sm flex-1">{opt.text}</span>
                    {highlightGreen && <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />}
                    {highlightRed && <XCircle className="w-5 h-5 text-red-600 shrink-0" />}
                  </Label>
                );
              })}
              {isLearning && !feedback && (
                <Button
                  onClick={() => handleVerify()}
                  disabled={!Array.isArray(currentAnswer) || !currentAnswer.length}
                  size="sm"
                  className="mt-2 bg-blue-600 hover:bg-blue-700"
                >
                  Submit Answer
                </Button>
              )}
            </div>
          )}

          {/* 3. Fill in the Blanks */}
          {qType === "fill_in_blank" && (
            <div className="space-y-3">
              <Input
                value={typeof currentAnswer === "string" ? currentAnswer : ""}
                onChange={(e) => handleTextChange(e.target.value)}
                placeholder="Type your answer here..."
                disabled={checking || (isLearning && !!feedback)}
                className="text-base py-5 border-slate-300 focus-visible:ring-blue-500"
              />
              {isLearning && !feedback && (
                <Button
                  onClick={() => handleVerify()}
                  disabled={!currentAnswer || !String(currentAnswer).trim()}
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Check Answer
                </Button>
              )}
            </div>
          )}

          {/* Learning Feedback Indicator */}
          {isLearning && feedback && (
            <div
              className={cn(
                "rounded-lg px-4 py-3 text-sm font-medium flex items-center gap-2",
                feedback.correct
                  ? "bg-green-100 text-green-800 border border-green-200"
                  : "bg-red-100 text-red-800 border border-red-200"
              )}
            >
              {feedback.correct ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-green-600" /> Correct
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4 text-red-600" /> Incorrect
                </>
              )}
            </div>
          )}

          {/* Explanation Box (Learning Mode) */}
          {isLearning && feedback && (
            <div className="rounded-lg border border-amber-200 bg-amber-50/70 p-4 text-slate-800 space-y-1.5 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-100">
              <div className="flex items-center gap-2 font-semibold text-amber-900 dark:text-amber-300 text-sm">
                <Lightbulb className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Explanation & Learning Notes</span>
              </div>
              <p className="text-xs sm:text-sm leading-relaxed text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                {getExplanationText()}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={handleSkip}
          disabled={checking || (isLearning && feedback)}
          className="border-slate-300 text-slate-700 hover:bg-slate-50"
        >
          Skip
        </Button>

        {isLearning ? (
          <Button
            onClick={goNext}
            disabled={!feedback}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isLast ? "Finish" : "Next"}
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        ) : (
          <Button
            onClick={goNext}
            disabled={(!answers[current.id] && answers[current.id] !== "SKIPPED") || (Array.isArray(answers[current.id]) && !answers[current.id].length)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isLast && !reviewMode ? "Finish exam" : reviewMode ? "Next Skipped" : "Next"}
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        )}
      </div>

      {showReviewPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <Card className="w-full max-w-md shadow-2xl animate-in fade-in zoom-in-95">
            <CardContent className="p-6 text-center space-y-5">
              <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Review Skipped Questions?</h3>
              <p className="text-sm text-slate-600">
                You have {questions.filter(q => !answers[q.id] || answers[q.id] === "SKIPPED" || (Array.isArray(answers[q.id]) && !answers[q.id].length)).length} unanswered or skipped questions. Skipped questions will be marked as incorrect and will lower your final score.
              </p>
              <div className="flex flex-col gap-3 pt-2">
                <Button 
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  onClick={() => {
                    const firstSkipped = questions.findIndex(q => !answers[q.id] || answers[q.id] === "SKIPPED" || (Array.isArray(answers[q.id]) && !answers[q.id].length));
                    if (firstSkipped !== -1) {
                      setIndex(firstSkipped);
                      setReviewMode(true);
                    }
                    setShowReviewPrompt(false);
                  }}
                >
                  Review Skipped Questions
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full text-rose-600 border-rose-200 hover:bg-rose-50"
                  onClick={() => {
                    setShowReviewPrompt(false);
                    handleFinishExam();
                  }}
                >
                  Submit Exam Anyway
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

