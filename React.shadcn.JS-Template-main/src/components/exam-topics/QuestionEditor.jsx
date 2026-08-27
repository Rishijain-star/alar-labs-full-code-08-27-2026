import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, HelpCircle, CheckSquare, ListFilter, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { createEmptyQuestion, newOptionId } from "@/lib/examTopicsConfig";
import { ValidatableField, fieldInputClass } from "@/components/exam-topics/ValidatableField";

export default function QuestionEditor({
  questions = [],
  onChange,
  disabled = false,
  emptyHint = "No questions yet. Add your first question below.",
  fieldErrors = {},
  shakeField = null,
  onClearError,
}) {
  const updateQuestion = (index, patch) => {
    const next = questions.map((q, i) => (i === index ? { ...q, ...patch } : q));
    onChange(next);
  };

  const handleTypeChange = (qIndex, newType) => {
    const q = questions[qIndex];
    if (q.type === newType) return;
    onClearError?.(`options-${q.id}`);
    onClearError?.(`correct-${q.id}`);

    let options = q.options || [];
    let correctOptionId = q.correctOptionId || "";
    let correctOptionIds = q.correctOptionIds || [];

    if (newType === "true_false") {
      const optTrue = { id: "tf_true", text: "True" };
      const optFalse = { id: "tf_false", text: "False" };
      options = [optTrue, optFalse];
      correctOptionId = "tf_true";
      correctOptionIds = ["tf_true"];
    } else if (newType === "fill_in_blank") {
      const optBlank = { id: newOptionId(), text: options[0]?.text || "" };
      options = [optBlank];
      correctOptionId = optBlank.id;
      correctOptionIds = [optBlank.id];
    } else {
      // Multiple Choice
      if (options.length < 2) {
        const optA = { id: newOptionId(), text: "" };
        const optB = { id: newOptionId(), text: "" };
        options = [optA, optB];
        correctOptionId = optA.id;
        correctOptionIds = [optA.id];
      }
    }

    updateQuestion(qIndex, {
      type: newType,
      options,
      correctOptionId,
      correctOptionIds,
    });
  };

  const updateOption = (qIndex, optIndex, text) => {
    const q = questions[qIndex];
    const opt = q.options?.[optIndex];
    if (opt?.id) onClearError?.(`option-${q.id}-${opt.id}`);
    onClearError?.(`options-${q.id}`);
    onClearError?.(`correct-${q.id}`);
    const options = (q.options || []).map((o, i) =>
      i === optIndex ? { ...o, text } : o
    );
    updateQuestion(qIndex, { options });
  };

  const addOption = (qIndex) => {
    const q = questions[qIndex];
    onClearError?.(`options-${q.id}`);
    const options = [...(q.options || []), { id: newOptionId(), text: "" }];
    updateQuestion(qIndex, { options });
  };

  const removeOption = (qIndex, optIndex) => {
    const q = questions[qIndex];
    const options = (q.options || []).filter((_, i) => i !== optIndex);
    if (options.length < 2) return;

    let correctOptionIds = (q.correctOptionIds || []).filter((id) =>
      options.some((o) => o.id === id)
    );
    if (!correctOptionIds.length && options[0]) {
      correctOptionIds = [options[0].id];
    }
    const correctOptionId = correctOptionIds[0] || "";

    updateQuestion(qIndex, { options, correctOptionId, correctOptionIds });
  };

  const toggleMultiCorrectOption = (qIndex, optId) => {
    const q = questions[qIndex];
    onClearError?.(`correct-${q.id}`);
    let currentIds = Array.isArray(q.correctOptionIds) ? [...q.correctOptionIds] : [];
    if (q.correctOptionId && !currentIds.includes(q.correctOptionId)) {
      currentIds.push(q.correctOptionId);
    }

    let nextIds;
    if (currentIds.includes(optId)) {
      nextIds = currentIds.filter((id) => id !== optId);
    } else {
      nextIds = [...currentIds, optId];
    }

    updateQuestion(qIndex, {
      correctOptionIds: nextIds,
      correctOptionId: nextIds[0] || "",
    });
  };

  const removeQuestion = (index) => {
    onChange(questions.filter((_, i) => i !== index));
    onClearError?.("questions-empty");
  };

  const addQuestion = () => {
    onClearError?.("questions-empty");
    onChange([...questions, createEmptyQuestion("multiple_choice")]);
  };

  const questionsEmptyError = fieldErrors["questions-empty"];

  return (
    <div className="space-y-4">
      {questions.length === 0 && (
        <ValidatableField
          fieldId="questions-empty"
          error={questionsEmptyError}
          shake={shakeField === "questions-empty"}
        >
          <p
            className={cn(
              "text-sm text-muted-foreground text-center py-8 border border-dashed rounded-lg",
              questionsEmptyError && "border-destructive bg-red-50/50 text-destructive"
            )}
          >
            {emptyHint}
          </p>
        </ValidatableField>
      )}

      {questions.map((q, qIndex) => {
        const qId = q.id || `idx-${qIndex}`;
        const qType = q.type || "multiple_choice";
        const questionError = fieldErrors[`question-${qId}`];
        const optionsError = fieldErrors[`options-${qId}`];
        const correctError = fieldErrors[`correct-${qId}`];
        const multiCorrectIds = Array.isArray(q.correctOptionIds) ? q.correctOptionIds : [q.correctOptionId].filter(Boolean);

        return (
          <Card
            key={q.id || qIndex}
            className={cn(
              "border shadow-sm",
              (questionError || optionsError || correctError) && "border-destructive/40"
            )}
          >
            <CardContent className="p-4 sm:p-5 space-y-4">
              {/* Header: Question Number, Type Selector, Delete */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm">Question {qIndex + 1}</span>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <Select
                    value={qType}
                    onValueChange={(val) => handleTypeChange(qIndex, val)}
                    disabled={disabled}
                  >
                    <SelectTrigger className="w-48 text-xs h-8 bg-slate-50 dark:bg-slate-900">
                      <SelectValue placeholder="Select question type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="multiple_choice">
                        <span className="flex items-center gap-1.5 text-xs">
                          <CheckSquare className="w-3.5 h-3.5 text-blue-500" /> Multiple Choice / Options
                        </span>
                      </SelectItem>
                      <SelectItem value="true_false">
                        <span className="flex items-center gap-1.5 text-xs">
                          <ListFilter className="w-3.5 h-3.5 text-amber-500" /> True / False
                        </span>
                      </SelectItem>
                      <SelectItem value="fill_in_blank">
                        <span className="flex items-center gap-1.5 text-xs">
                          <FileText className="w-3.5 h-3.5 text-emerald-500" /> Fill in the Blanks
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>

                  {!disabled && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive shrink-0"
                      onClick={() => removeQuestion(qIndex)}
                      title="Remove question"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Question Text */}
              <ValidatableField
                fieldId={`question-${qId}`}
                error={questionError}
                shake={shakeField === `question-${qId}`}
                className="space-y-2"
              >
                <Label className="text-xs font-semibold">Question Text</Label>
                <Input
                  value={q.question || ""}
                  onChange={(e) => {
                    onClearError?.(`question-${qId}`);
                    updateQuestion(qIndex, { question: e.target.value });
                  }}
                  placeholder={
                    qType === "fill_in_blank"
                      ? "e.g. EC2 stands for Elastic ________ Cloud."
                      : "Enter question prompt here..."
                  }
                  disabled={disabled}
                  className={fieldInputClass(!!questionError)}
                />
              </ValidatableField>

              {/* Options Section per Question Type */}
              <ValidatableField
                fieldId={`options-${qId}`}
                error={optionsError || correctError}
                shake={shakeField === `options-${qId}` || shakeField === `correct-${qId}`}
                className="space-y-3"
              >
                {/* 1. True / False Mode */}
                {qType === "true_false" && (
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground font-medium">
                      Select Correct Answer:
                    </Label>
                    <RadioGroup
                      value={q.correctOptionId || "tf_true"}
                      onValueChange={(val) => {
                        onClearError?.(`correct-${qId}`);
                        updateQuestion(qIndex, {
                          correctOptionId: val,
                          correctOptionIds: [val],
                        });
                      }}
                      disabled={disabled}
                      className="flex gap-4 pt-1"
                    >
                      <div className="flex items-center gap-2 border rounded-lg px-4 py-2.5 bg-slate-50 dark:bg-slate-900 hover:border-blue-400 cursor-pointer">
                        <RadioGroupItem value="tf_true" id={`${qId}-true`} />
                        <Label htmlFor={`${qId}-true`} className="cursor-pointer font-medium text-sm">
                          True
                        </Label>
                      </div>
                      <div className="flex items-center gap-2 border rounded-lg px-4 py-2.5 bg-slate-50 dark:bg-slate-900 hover:border-blue-400 cursor-pointer">
                        <RadioGroupItem value="tf_false" id={`${qId}-false`} />
                        <Label htmlFor={`${qId}-false`} className="cursor-pointer font-medium text-sm">
                          False
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>
                )}

                {/* 2. Fill in the Blanks Mode */}
                {qType === "fill_in_blank" && (
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground font-medium">
                      Correct Answer (expected text):
                    </Label>
                    <Input
                      value={q.options?.[0]?.text || ""}
                      onChange={(e) => updateOption(qIndex, 0, e.target.value)}
                      placeholder="Enter the correct word or phrase"
                      disabled={disabled}
                      className={cn("bg-emerald-50/40 border-emerald-200 focus-visible:ring-emerald-400 font-medium text-sm")}
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Students will type their answer. Matching is case-insensitive.
                    </p>
                  </div>
                )}

                {/* 3. Multiple Choice Mode (Single or Multiple Correct Answers) */}
                {qType === "multiple_choice" && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs text-muted-foreground font-medium">
                        Options — check all options that are correct:
                      </Label>
                      {multiCorrectIds.length > 1 && (
                        <span className="text-[11px] font-semibold text-blue-600 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded border border-blue-200">
                          {multiCorrectIds.length} correct answers selected
                        </span>
                      )}
                    </div>

                    <div className="space-y-2">
                      {(q.options || []).map((opt, optIndex) => {
                        const optError = fieldErrors[`option-${qId}-${opt.id}`];
                        const isChecked = multiCorrectIds.includes(opt.id);

                        return (
                          <ValidatableField
                            key={opt.id || optIndex}
                            fieldId={`option-${qId}-${opt.id}`}
                            error={optError}
                            shake={shakeField === `option-${qId}-${opt.id}`}
                          >
                            <div className="flex items-center gap-2">
                              <Checkbox
                                id={`${qId}-${opt.id}`}
                                checked={isChecked}
                                onCheckedChange={() => toggleMultiCorrectOption(qIndex, opt.id)}
                                disabled={disabled}
                                className="w-4 h-4"
                              />
                              <Input
                                value={opt.text || ""}
                                onChange={(e) => updateOption(qIndex, optIndex, e.target.value)}
                                placeholder={`Option ${optIndex + 1}`}
                                disabled={disabled}
                                className={cn("flex-1", fieldInputClass(!!optError))}
                              />
                              {!disabled && (q.options || []).length > 2 && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="text-muted-foreground hover:text-destructive shrink-0"
                                  onClick={() => removeOption(qIndex, optIndex)}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              )}
                            </div>
                          </ValidatableField>
                        );
                      })}
                    </div>

                    {!disabled && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="mt-1"
                        onClick={() => addOption(qIndex)}
                      >
                        <Plus className="w-3.5 h-3.5 mr-1" /> Add option
                      </Button>
                    )}
                  </div>
                )}
              </ValidatableField>

              {/* 4. Explanation Field (Optional) */}
              <div className="pt-2 border-t space-y-1.5">
                <Label className="text-xs font-semibold flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                  <HelpCircle className="w-3.5 h-3.5 text-blue-500" /> Explanation (Optional)
                </Label>
                <Textarea
                  value={q.explanation || ""}
                  onChange={(e) => updateQuestion(qIndex, { explanation: e.target.value })}
                  placeholder="Explain why the answer is correct or add learning notes for students…"
                  disabled={disabled}
                  rows={2}
                  className="text-xs bg-slate-50/50 dark:bg-slate-900/50 border-slate-200 focus-visible:ring-blue-400"
                />
              </div>
            </CardContent>
          </Card>
        );
      })}

      {!disabled && (
        <Button type="button" variant="outline" onClick={addQuestion} className="w-full">
          <Plus className="w-4 h-4 mr-2" /> Add question
        </Button>
      )}
    </div>
  );
}

