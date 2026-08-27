// src/components/lab/TaskEditor.jsx
import { useState } from "react";
import { GripVertical, ChevronUp, ChevronDown, X, Plus, AlertCircle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FieldLabel } from "@/components/ui/fieldlabel";
import { cn } from "@/lib/utils";

const CODE_LANGS = ["bash", "python", "javascript", "typescript", "yaml", "json", "sql", "dockerfile", "go", "java", "rust", "hcl"];

let _uid = 0;
const uid = () => `id_${++_uid}_${Math.random().toString(36).slice(2, 6)}`;

export const TASK_TYPES = [
    { value: "mcq", label: "Multiple Choice", icon: "🔘", desc: "Single correct answer from options" },
    { value: "multi_select", label: "Multi Select", icon: "☑️", desc: "Multiple correct answers" },
    { value: "fill_blank", label: "Fill in the Blank", icon: "✏️", desc: "Type the missing word/phrase" },
    { value: "code_challenge", label: "Code Challenge", icon: "⚡", desc: "Write or fix code to pass tests" },
    { value: "drag_drop", label: "Drag & Drop", icon: "↕️", desc: "Match or order items correctly" },
    { value: "true_false", label: "True / False", icon: "✅", desc: "Is the statement correct?" },
    { value: "short_answer", label: "Short Answer", icon: "📝", desc: "Free text answer (manual grading)" },
];

export function TaskTypeBadge({ type }) {
    const t = TASK_TYPES.find(t => t.value === type) || TASK_TYPES[0];
    return (
        <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">
            {t.icon} {t.label}
        </span>
    );
}

/**
 * TaskEditor — single skill builder task editor
 *
 * Props:
 *   task      object
 *   index     number
 *   total     number
 *   onUpdate  (updated) => void
 *   onRemove  () => void
 *   onMove    (dir: -1|1) => void
 */
export function TaskEditor({ task, index, total, onUpdate, onRemove, onMove }) {
    const [collapsed, setCollapsed] = useState(false);
    const upd = (f, v) => onUpdate({ ...task, [f]: v });

    const addOption = () => upd("options", [...(task.options || []), { id: uid(), text: "" }]);
    const removeOption = (id) => upd("options", (task.options || []).filter(o => o.id !== id));
    const updateOption = (id, text) => upd("options", (task.options || []).map(o => o.id === id ? { ...o, text } : o));
    const toggleCorrect = (id) => {
        if (task.type === "mcq" || task.type === "true_false") {
            upd("correctOptions", [id]);
        } else {
            const curr = task.correctOptions || [];
            upd("correctOptions", curr.includes(id) ? curr.filter(c => c !== id) : [...curr, id]);
        }
    };

    const addPair = () => upd("pairs", [...(task.pairs || []), { id: uid(), left: "", right: "" }]);
    const removePair = (id) => upd("pairs", (task.pairs || []).filter(p => p.id !== id));
    const updatePair = (id, side, val) => upd("pairs", (task.pairs || []).map(p => p.id === id ? { ...p, [side]: val } : p));

    const typeInfo = TASK_TYPES.find(t => t.value === task.type) || TASK_TYPES[0];

    return (
        <div className="border border-border rounded-xl overflow-hidden mb-3 bg-white shadow-sm">
            {/* Header */}
            <div className="flex items-center gap-2.5 px-4 py-3 bg-muted/20 border-b border-border/50">
                <GripVertical className="w-4 h-4 text-muted-foreground/50 cursor-grab flex-shrink-0" />
                <span className="w-6 h-6 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                    {index + 1}
                </span>
                <TaskTypeBadge type={task.type} />
                <span className="flex-1 text-sm font-medium truncate text-foreground">
                    {task.question?.replace(/<[^>]+>/g, "").slice(0, 60) || "Untitled question"}
                </span>
                {task.points && <Badge variant="outline" className="text-xs flex-shrink-0">{task.points} pts</Badge>}
                <div className="flex items-center gap-0.5 ml-auto">
                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => onMove(-1)} disabled={index === 0}>
                        <ChevronUp className="w-3.5 h-3.5" />
                    </Button>
                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => onMove(1)} disabled={index === total - 1}>
                        <ChevronDown className="w-3.5 h-3.5" />
                    </Button>
                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCollapsed(c => !c)}>
                        {collapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                    </Button>
                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-600" onClick={onRemove}>
                        <X className="w-3.5 h-3.5" />
                    </Button>
                </div>
            </div>

            {!collapsed && (
                <div className="p-4 space-y-4">
                    {/* Type + Points + Time + Toggles */}
                    <div className="grid grid-cols-12 gap-3">
                        <div className="col-span-4">
                            <FieldLabel required>Task Type</FieldLabel>
                            <Select value={task.type} onValueChange={v => upd("type", v)}>
                                <SelectTrigger className="bg-muted/30"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {TASK_TYPES.map(t => (
                                        <SelectItem key={t.value} value={t.value}>
                                            <span className="flex items-center gap-2"><span>{t.icon}</span><span>{t.label}</span></span>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground mt-1">{typeInfo.desc}</p>
                        </div>
                        <div className="col-span-2">
                            <FieldLabel hint="Points for correct answer">Points</FieldLabel>
                            <Input type="number" min="0" value={task.points || ""} onChange={e => upd("points", e.target.value)}
                                placeholder="10" className="bg-muted/30" />
                        </div>
                        <div className="col-span-3">
                            <FieldLabel hint="Time limit for this task">Time Limit</FieldLabel>
                            <Input value={task.timeLimit || ""} onChange={e => upd("timeLimit", e.target.value)}
                                placeholder="e.g. 5 minutes" className="bg-muted/30" />
                        </div>
                        <div className="col-span-3 flex flex-col justify-start">
                            <FieldLabel>Options</FieldLabel>
                            <div className="flex flex-col gap-1.5">
                                <label className="flex items-center gap-2 text-xs cursor-pointer">
                                    <Switch checked={!!task.hasHint} onCheckedChange={v => upd("hasHint", v)} className="scale-75" />
                                    Show hint to learner
                                </label>
                                <label className="flex items-center gap-2 text-xs cursor-pointer">
                                    <Switch checked={!!task.required} onCheckedChange={v => upd("required", v)} className="scale-75" />
                                    Required task
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* Section tag */}
                    <div>
                        <FieldLabel hint="Group tasks (e.g. 'Section 1: AWS Basics')">Section / Group Tag</FieldLabel>
                        <Input value={task.section || ""} onChange={e => upd("section", e.target.value)}
                            placeholder="e.g. Section 1: Introduction" className="bg-muted/30" />
                    </div>

                    {/* Question */}
                    <div>
                        <FieldLabel required>
                            {task.type === "fill_blank" ? "Question (use ___ for blank)" : "Question Text"}
                        </FieldLabel>
                        {task.type === "fill_blank" ? (
                            <div>
                                <Textarea value={task.question || ""} onChange={e => upd("question", e.target.value)}
                                    placeholder="e.g. The command to list all pods is ___"
                                    rows={2} className="bg-muted/30 font-mono text-sm" />
                                <p className="text-xs text-muted-foreground mt-1">
                                    💡 Use <code className="bg-muted px-1 rounded">___</code> to mark blank positions
                                </p>
                            </div>
                        ) : (
                            <Textarea value={task.question || ""} onChange={e => upd("question", e.target.value)}
                                placeholder="Enter your question here..." rows={2} className="bg-muted/30" />
                        )}
                    </div>

                    {/* Context / Code snippet */}
                    <div>
                        <FieldLabel hint="Optional code or scenario shown above the question">Context / Code Snippet (optional)</FieldLabel>
                        <div className="border border-border rounded-lg overflow-hidden">
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/30 border-b border-border">
                                <Select value={task.contextLang || "none"} onValueChange={v => upd("contextLang", v)}>
                                    <SelectTrigger className="h-6 w-28 text-xs bg-white border-border"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">Plain text</SelectItem>
                                        {CODE_LANGS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <textarea value={task.context || ""} onChange={e => upd("context", e.target.value)}
                                placeholder="Optional context or code snippet..."
                                rows={3} className="w-full p-3 text-xs outline-none resize-y bg-white"
                                style={task.contextLang && task.contextLang !== "none"
                                    ? { fontFamily: "monospace", background: "#1e1e2e", color: "#cdd6f4" }
                                    : {}} />
                        </div>
                    </div>

                    {/* ── MCQ / Multi Select ── */}
                    {(task.type === "mcq" || task.type === "multi_select") && (
                        <div>
                            <FieldLabel required hint={task.type === "mcq" ? "Click circle = correct answer" : "Click circles = all correct answers"}>
                                Answer Options
                            </FieldLabel>
                            <div className="space-y-2">
                                {(task.options || []).map((opt, oi) => {
                                    const isCorrect = (task.correctOptions || []).includes(opt.id);
                                    return (
                                        <div key={opt.id} className={cn(
                                            "flex items-center gap-2 p-2 rounded-lg border transition-colors",
                                            isCorrect ? "border-green-300 bg-green-50" : "border-border bg-muted/20"
                                        )}>
                                            <button type="button" onClick={() => toggleCorrect(opt.id)}
                                                className={cn(
                                                    "w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors",
                                                    isCorrect ? "border-green-500 bg-green-500" : "border-muted-foreground/40"
                                                )}>
                                                {isCorrect && <CheckCircle className="w-3 h-3 text-white" />}
                                            </button>
                                            <Input value={opt.text} onChange={e => updateOption(opt.id, e.target.value)}
                                                placeholder={`Option ${oi + 1}`}
                                                className="flex-1 h-8 text-sm border-0 bg-transparent focus-visible:ring-0 p-0" />
                                            {isCorrect && <Badge className="text-xs bg-green-100 text-green-700 border-green-300 flex-shrink-0">✓ Correct</Badge>}
                                            <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-red-500 flex-shrink-0"
                                                onClick={() => removeOption(opt.id)}>
                                                <X className="w-3 h-3" />
                                            </Button>
                                        </div>
                                    );
                                })}
                            </div>
                            <Button type="button" variant="outline" size="sm" className="mt-2 text-primary border-primary/30" onClick={addOption}>
                                <Plus className="w-3.5 h-3.5 mr-1" /> Add Option
                            </Button>
                            {(task.options || []).length > 0 && !(task.correctOptions || []).length && (
                                <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3" /> Click the circle to mark correct answer(s)
                                </p>
                            )}
                        </div>
                    )}

                    {/* ── True / False ── */}
                    {task.type === "true_false" && (
                        <div>
                            <FieldLabel required>Correct Answer</FieldLabel>
                            <div className="flex gap-3">
                                {["true", "false"].map(val => (
                                    <button key={val} type="button" onClick={() => upd("correctAnswer", val)}
                                        className={cn(
                                            "flex-1 py-3 rounded-xl border-2 font-semibold text-sm transition-all",
                                            task.correctAnswer === val
                                                ? val === "true" ? "border-green-500 bg-green-50 text-green-700" : "border-red-400 bg-red-50 text-red-700"
                                                : "border-border text-muted-foreground hover:border-primary/40"
                                        )}>
                                        {val === "true" ? "✅ True" : "❌ False"}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ── Fill in the Blank ── */}
                    {task.type === "fill_blank" && (
                        <div className="space-y-3">
                            <div>
                                <FieldLabel required hint="Add one entry per blank">Correct Answers</FieldLabel>
                                <div className="space-y-2">
                                    {(task.blanks || [{ id: uid(), answer: "", caseSensitive: false }]).map((blank, bi) => (
                                        <div key={blank.id} className="flex items-center gap-2">
                                            <span className="text-xs font-bold text-muted-foreground w-16 flex-shrink-0">Blank {bi + 1}</span>
                                            <Input value={blank.answer}
                                                onChange={e => upd("blanks", (task.blanks || []).map((b, j) => j === bi ? { ...b, answer: e.target.value } : b))}
                                                placeholder="Correct answer" className="bg-muted/30 flex-1 h-8 text-sm" />
                                            <label className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap flex-shrink-0">
                                                <Switch checked={!!blank.caseSensitive}
                                                    onCheckedChange={v => upd("blanks", (task.blanks || []).map((b, j) => j === bi ? { ...b, caseSensitive: v } : b))}
                                                    className="scale-75" />
                                                Case sensitive
                                            </label>
                                        </div>
                                    ))}
                                </div>
                                <Button type="button" variant="outline" size="sm" className="mt-2 text-primary border-primary/30"
                                    onClick={() => upd("blanks", [...(task.blanks || []), { id: uid(), answer: "", caseSensitive: false }])}>
                                    <Plus className="w-3.5 h-3.5 mr-1" /> Add Blank
                                </Button>
                            </div>
                            <div>
                                <FieldLabel hint="Other accepted variations (comma separated)">Accepted Variations</FieldLabel>
                                <Input value={task.variations || ""} onChange={e => upd("variations", e.target.value)}
                                    placeholder="e.g. kubectl get pods, k get pods" className="bg-muted/30" />
                            </div>
                        </div>
                    )}

                    {/* ── Code Challenge ── */}
                    {task.type === "code_challenge" && (
                        <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <FieldLabel required>Language</FieldLabel>
                                    <Select value={task.language || "bash"} onValueChange={v => upd("language", v)}>
                                        <SelectTrigger className="bg-muted/30"><SelectValue /></SelectTrigger>
                                        <SelectContent>{CODE_LANGS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <FieldLabel hint="write / fix / complete">Mode</FieldLabel>
                                    <Select value={task.codeMode || "write"} onValueChange={v => upd("codeMode", v)}>
                                        <SelectTrigger className="bg-muted/30"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="write">✍️ Write from scratch</SelectItem>
                                            <SelectItem value="fix">🐛 Fix broken code</SelectItem>
                                            <SelectItem value="complete">🧩 Complete the code</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div>
                                <FieldLabel hint="Starting / broken code shown in editor">Starter Code</FieldLabel>
                                <textarea value={task.starterCode || ""} onChange={e => upd("starterCode", e.target.value)}
                                    placeholder="# Starter or broken code..." rows={5}
                                    className="w-full rounded-lg p-3 text-xs font-mono resize-y outline-none border border-border"
                                    style={{ background: "#1e1e2e", color: "#cdd6f4" }} />
                            </div>
                            <div>
                                <FieldLabel required hint="Expected correct solution">Solution Code</FieldLabel>
                                <textarea value={task.solutionCode || ""} onChange={e => upd("solutionCode", e.target.value)}
                                    placeholder="# Correct solution..." rows={5}
                                    className="w-full rounded-lg p-3 text-xs font-mono resize-y outline-none border border-border"
                                    style={{ background: "#1a1a2e", color: "#a8ff78" }} />
                            </div>
                            <div>
                                <FieldLabel hint="One per line — strings that must appear in output">Test Cases / Expected Output</FieldLabel>
                                <Textarea value={task.testCases || ""} onChange={e => upd("testCases", e.target.value)}
                                    placeholder={"pod/nginx created\nNAME   READY   STATUS"} rows={3} className="bg-muted/30 font-mono text-xs" />
                            </div>
                        </div>
                    )}

                    {/* ── Drag & Drop ── */}
                    {task.type === "drag_drop" && (
                        <div>
                            <FieldLabel required hint="Left items will be scrambled for the learner">Match Pairs (Left → Right)</FieldLabel>
                            <div className="grid grid-cols-11 gap-2 mb-2">
                                <div className="col-span-5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Left Item</div>
                                <div className="col-span-1" />
                                <div className="col-span-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Matches With</div>
                                <div className="col-span-1" />
                            </div>
                            <div className="space-y-2">
                                {(task.pairs || []).map((pair, pi) => (
                                    <div key={pair.id} className="grid grid-cols-11 gap-2 items-center">
                                        <Input value={pair.left} onChange={e => updatePair(pair.id, "left", e.target.value)}
                                            placeholder={`Item ${pi + 1}`} className="col-span-5 bg-muted/30 h-8 text-sm" />
                                        <div className="col-span-1 flex justify-center">
                                            <span className="text-muted-foreground text-lg">→</span>
                                        </div>
                                        <Input value={pair.right} onChange={e => updatePair(pair.id, "right", e.target.value)}
                                            placeholder={`Match ${pi + 1}`} className="col-span-4 bg-muted/30 h-8 text-sm" />
                                        <Button type="button" variant="ghost" size="icon" className="col-span-1 h-7 w-7 text-red-400 hover:text-red-600"
                                            onClick={() => removePair(pair.id)}>
                                            <X className="w-3 h-3" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                            <Button type="button" variant="outline" size="sm" className="mt-2 text-primary border-primary/30" onClick={addPair}>
                                <Plus className="w-3.5 h-3.5 mr-1" /> Add Pair
                            </Button>
                        </div>
                    )}

                    {/* ── Short Answer ── */}
                    {task.type === "short_answer" && (
                        <div className="space-y-3">
                            <div>
                                <FieldLabel hint="Shown to grader after submission">Sample / Model Answer</FieldLabel>
                                <Textarea value={task.modelAnswer || ""} onChange={e => upd("modelAnswer", e.target.value)}
                                    placeholder="Write the ideal answer here..." rows={3} className="bg-muted/30" />
                            </div>
                            <div>
                                <FieldLabel hint="Keywords for auto-scoring (comma separated)">Auto-score Keywords</FieldLabel>
                                <Input value={task.keywords || ""} onChange={e => upd("keywords", e.target.value)}
                                    placeholder="e.g. idempotent, declarative, stateless" className="bg-muted/30" />
                            </div>
                            <div className="flex items-center gap-3">
                                <FieldLabel>Max word limit</FieldLabel>
                                <Input type="number" value={task.wordLimit || ""} onChange={e => upd("wordLimit", e.target.value)}
                                    placeholder="200" className="bg-muted/30 w-28" />
                            </div>
                        </div>
                    )}

                    {/* Hint */}
                    {task.hasHint && (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                            <FieldLabel hint="Shown when learner clicks 'Show Hint' (−50% points)">💡 Hint Text</FieldLabel>
                            <Textarea value={task.hint || ""} onChange={e => upd("hint", e.target.value)}
                                placeholder="Give a helpful clue without revealing the answer..." rows={2}
                                className="bg-white border-amber-200" />
                        </div>
                    )}

                    {/* Explanation */}
                    <div>
                        <FieldLabel hint="Shown after answering — explains the correct answer">Explanation / Learning Note</FieldLabel>
                        <Textarea value={task.explanation || ""} onChange={e => upd("explanation", e.target.value)}
                            placeholder="Explain why the correct answer is right..." rows={2} className="bg-muted/30" />
                    </div>
                </div>
            )}
        </div>
    );
}

export default TaskEditor;