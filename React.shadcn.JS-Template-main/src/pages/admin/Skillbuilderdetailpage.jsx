// src/pages/SkillBuilderDetailPage.jsx
// ─────────────────────────────────────────────────────────────────────────────
// User-facing Skill Builder page — same 3-column layout as LabDetailPage
// Interactive quiz engine: MCQ, Multi-Select, True/False, Fill-Blank,
// Drag-Drop, Code Challenge, Short Answer
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { toast } from "@/lib/toast";
import api from "@/lib/axios";
import { mapPublishedLabToSkillBuilderPage } from "@/lib/mapSkillBuilderPageLab";
import { DEMO_SKILL_BUILDER_META, DEMO_SKILL_BUILDER_TASKS } from "@/lib/demoSkillBuilderContent";
import { useSubmitSkillBuilderMutation, useGetLabEnrollmentQuery } from "@/store/api/learningApi";

/* ════════════════════════════════════════════════════
   MOCK DATA — shared with /skill-labs/demo via LabDetail + demoSkillBuilderContent
════════════════════════════════════════════════════ */
const MOCK_LAB = {
    meta: DEMO_SKILL_BUILDER_META,
    tasks: DEMO_SKILL_BUILDER_TASKS,
};

/* ════════════════════════════════════════════════════
   HELPERS
════════════════════════════════════════════════════ */
function formatTime(s) {
    const h = String(Math.floor(s / 3600)).padStart(2, "0");
    const m = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
    const sc = String(s % 60).padStart(2, "0");
    return `${h}:${m}:${sc}`;
}

function StarRating({ value = 4 }) {
    return (
        <span style={{ display: "inline-flex", gap: 2, verticalAlign: "middle" }}>
            {[1, 2, 3, 4, 5].map(i => (
                <svg key={i} width="14" height="14" viewBox="0 0 20 20">
                    <polygon points="10,1 12.9,7 19.5,7.6 14.7,11.9 16.2,18.5 10,15 3.8,18.5 5.3,11.9 0.5,7.6 7.1,7"
                        fill={i <= Math.round(value) ? "#f59e0b" : "#e5e7eb"} />
                </svg>
            ))}
        </span>
    );
}

const TASK_TYPE_LABELS = {
    mcq: { label: "Multiple Choice", icon: "🔘", color: "#1a73e8", bg: "#e8f0fe" },
    multi_select: { label: "Multi Select", icon: "☑️", color: "#0f9d58", bg: "#e6f4ea" },
    true_false: { label: "True / False", icon: "✅", color: "#e37400", bg: "#fef3e2" },
    fill_blank: { label: "Fill in Blank", icon: "✏️", color: "#7b2d8b", bg: "#f3e8fd" },
    drag_drop: { label: "Drag & Drop", icon: "↕️", color: "#c5221f", bg: "#fce8e6" },
    code_challenge: { label: "Code Challenge", icon: "⚡", color: "#e37400", bg: "#fef3e2" },
    short_answer: { label: "Short Answer", icon: "📝", color: "#137333", bg: "#e6f4ea" },
};

const NAVBAR_H = 64;
const FOOTER_H = 0;

/* ════════════════════════════════════════════════════
   TASK COMPONENTS
════════════════════════════════════════════════════ */

/* MCQ */
function TaskMCQ({ task, answer, onChange, submitted, showAnswers }) {
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {task.options.map(opt => {
                const isSelected = answer === opt.id;
                const isCorrect = task.correctOptions.includes(opt.id);
                const showResult = submitted && showAnswers;
                const bg = showResult
                    ? isCorrect ? "#f0fdf4" : (isSelected && !isCorrect ? "#fef2f2" : "#fff")
                    : isSelected ? "#e8f0fe" : "#fff";
                const border = showResult
                    ? isCorrect ? "2px solid #16a34a" : (isSelected && !isCorrect ? "2px solid #dc2626" : "1px solid #e0e0e0")
                    : isSelected ? "2px solid #1a73e8" : "1px solid #e0e0e0";
                return (
                    <label key={opt.id} style={{
                        display: "flex", alignItems: "center", gap: 12,
                        padding: "12px 16px", borderRadius: 8, border, background: bg,
                        cursor: submitted ? "default" : "pointer",
                        transition: "all .15s", userSelect: "none",
                    }}>
                        <input type="radio" name={task.id} value={opt.id} checked={isSelected}
                            disabled={submitted} onChange={() => onChange(opt.id)}
                            style={{ accentColor: "#1a73e8", width: 16, height: 16 }} />
                        <span style={{ fontSize: 14, color: "#202124", lineHeight: 1.5 }}>{opt.text}</span>
                        {showResult && isCorrect && <span style={{ marginLeft: "auto", color: "#16a34a", fontWeight: 700, fontSize: 13 }}>✓ Correct</span>}
                        {showResult && isSelected && !isCorrect && <span style={{ marginLeft: "auto", color: "#dc2626", fontWeight: 700, fontSize: 13 }}>✗ Wrong</span>}
                    </label>
                );
            })}
        </div>
    );
}

/* Multi Select */
function TaskMultiSelect({ task, answer = [], onChange, submitted, showAnswers }) {
    const toggle = (id) => {
        if (submitted) return;
        onChange(answer.includes(id) ? answer.filter(x => x !== id) : [...answer, id]);
    };
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <p style={{ fontSize: 12, color: "#5f6368", margin: "0 0 4px", fontStyle: "italic" }}>Select all that apply</p>
            {task.options.map(opt => {
                const isSelected = answer.includes(opt.id);
                const isCorrect = task.correctOptions.includes(opt.id);
                const showResult = submitted && showAnswers;
                const bg = showResult
                    ? isCorrect ? "#f0fdf4" : (isSelected && !isCorrect ? "#fef2f2" : "#fff")
                    : isSelected ? "#e8f0fe" : "#fff";
                const border = showResult
                    ? isCorrect ? "2px solid #16a34a" : (isSelected && !isCorrect ? "2px solid #dc2626" : "1px solid #e0e0e0")
                    : isSelected ? "2px solid #1a73e8" : "1px solid #e0e0e0";
                return (
                    <label key={opt.id} onClick={() => toggle(opt.id)} style={{
                        display: "flex", alignItems: "center", gap: 12,
                        padding: "12px 16px", borderRadius: 8, border, background: bg,
                        cursor: submitted ? "default" : "pointer", transition: "all .15s", userSelect: "none",
                    }}>
                        <div style={{
                            width: 18, height: 18, borderRadius: 4, flexShrink: 0,
                            border: isSelected ? "none" : "2px solid #9aa0a6",
                            background: isSelected ? "#1a73e8" : "transparent",
                            display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                            {isSelected && <span style={{ color: "#fff", fontSize: 12, fontWeight: 700 }}>✓</span>}
                        </div>
                        <span style={{ fontSize: 14, color: "#202124", lineHeight: 1.5 }}>{opt.text}</span>
                        {showResult && isCorrect && <span style={{ marginLeft: "auto", color: "#16a34a", fontWeight: 700, fontSize: 12 }}>✓ Correct</span>}
                        {showResult && isSelected && !isCorrect && <span style={{ marginLeft: "auto", color: "#dc2626", fontWeight: 700, fontSize: 12 }}>✗ Wrong</span>}
                    </label>
                );
            })}
        </div>
    );
}

/* True / False */
function TaskTrueFalse({ task, answer, onChange, submitted, showAnswers }) {
    return (
        <div style={{ display: "flex", gap: 12 }}>
            {["true", "false"].map(val => {
                const isSelected = answer === val;
                const isCorrect = task.correctAnswer === val;
                const showResult = submitted && showAnswers;
                const bg = showResult
                    ? isCorrect ? "#f0fdf4" : (isSelected && !isCorrect ? "#fef2f2" : "#fff")
                    : isSelected ? "#e8f0fe" : "#fff";
                const border = showResult
                    ? isCorrect ? "2px solid #16a34a" : (isSelected && !isCorrect ? "2px solid #dc2626" : "1px solid #e0e0e0")
                    : isSelected ? "2px solid #1a73e8" : "1px solid #e0e0e0";
                return (
                    <button key={val} onClick={() => !submitted && onChange(val)} style={{
                        flex: 1, padding: "16px", borderRadius: 10, border, background: bg,
                        cursor: submitted ? "default" : "pointer", fontSize: 15, fontWeight: 600,
                        color: isSelected ? "#1a73e8" : "#202124", transition: "all .15s",
                    }}>
                        {val === "true" ? "✅ True" : "❌ False"}
                        {showResult && isCorrect && <div style={{ fontSize: 11, color: "#16a34a", marginTop: 4 }}>Correct Answer</div>}
                    </button>
                );
            })}
        </div>
    );
}

/* Fill in the Blank */
function TaskFillBlank({ task, answer = {}, onChange, submitted, showAnswers }) {
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <p style={{ fontSize: 13.5, lineHeight: 1.7, color: "#3c4043", margin: 0 }}>
                {task.question.split(/___+/).map((part, i, arr) => {
                    const blank = task.blanks[i];
                    if (i === arr.length - 1) return <span key={i}>{part}</span>;
                    const userVal = answer[blank?.id] || "";
                    const isCorrect = submitted && showAnswers && blank &&
                        (blank.caseSensitive ? userVal === blank.answer : userVal.toLowerCase() === blank.answer.toLowerCase());
                    const isWrong = submitted && showAnswers && !isCorrect;
                    return (
                        <span key={i}>
                            {part}
                            <input value={userVal} disabled={submitted}
                                onChange={e => onChange({ ...answer, [blank.id]: e.target.value })}
                                style={{
                                    display: "inline-block", width: 120, margin: "0 6px",
                                    padding: "4px 10px", borderRadius: 5, fontSize: 13,
                                    border: submitted && showAnswers
                                        ? isCorrect ? "2px solid #16a34a" : "2px solid #dc2626"
                                        : "2px solid #1a73e8",
                                    background: submitted && showAnswers ? (isCorrect ? "#f0fdf4" : "#fef2f2") : "#fff",
                                    outline: "none", fontFamily: "monospace", fontWeight: 600,
                                    color: isCorrect ? "#15803d" : isWrong ? "#dc2626" : "#1a73e8",
                                }}
                                placeholder="type answer…"
                            />
                        </span>
                    );
                })}
            </p>
            {submitted && showAnswers && (
                <div style={{ fontSize: 12.5, color: "#5f6368", marginTop: 4 }}>
                    Correct answers: {task.blanks.map(b => <strong key={b.id} style={{ color: "#16a34a", marginRight: 12 }}>{b.answer}</strong>)}
                </div>
            )}
        </div>
    );
}

/* Drag and Drop (match pairs) */
function TaskDragDrop({ task, answer = {}, onChange, submitted, showAnswers }) {
    const [dragging, setDragging] = useState(null);
    const rights = task.pairs.map(p => p.right);

    const handleDrop = (leftId, rightText) => {
        if (submitted) return;
        const newAns = { ...answer };
        // Remove previous mapping to this right value
        Object.keys(newAns).forEach(k => { if (newAns[k] === rightText) delete newAns[k]; });
        newAns[leftId] = rightText;
        onChange(newAns);
    };

    return (
        <div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                {/* Left column */}
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: "#5f6368", textTransform: "uppercase", letterSpacing: 0.5, margin: "0 0 4px" }}>Term</p>
                    {task.pairs.map(pair => {
                        const matched = answer[pair.id];
                        const correct = task.pairs.find(p => p.id === pair.id)?.right;
                        const isCorrect = submitted && showAnswers && matched === correct;
                        const isWrong = submitted && showAnswers && matched && matched !== correct;
                        return (
                            <div key={pair.id}
                                onDragOver={e => e.preventDefault()}
                                onDrop={e => { e.preventDefault(); if (dragging) handleDrop(pair.id, dragging); }}
                                style={{
                                    padding: "12px 14px", borderRadius: 8, minHeight: 48,
                                    border: isCorrect ? "2px solid #16a34a" : isWrong ? "2px solid #dc2626" : "2px dashed #dadce0",
                                    background: isCorrect ? "#f0fdf4" : isWrong ? "#fef2f2" : matched ? "#e8f0fe" : "#f8faff",
                                    display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
                                }}>
                                <span style={{ fontSize: 13.5, fontWeight: 700, color: "#1a1a2e" }}>{pair.left}</span>
                                {matched ? (
                                    <span style={{ fontSize: 12.5, color: isCorrect ? "#15803d" : isWrong ? "#dc2626" : "#1a73e8", fontStyle: "italic" }}>
                                        {matched}
                                        {!submitted && <button onClick={() => onChange({ ...answer, [pair.id]: undefined })}
                                            style={{ marginLeft: 6, background: "none", border: "none", cursor: "pointer", color: "#5f6368", fontSize: 14 }}>×</button>}
                                    </span>
                                ) : (
                                    <span style={{ fontSize: 12, color: "#9aa0a6", fontStyle: "italic" }}>drop here…</span>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Right column — draggable items */}
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: "#5f6368", textTransform: "uppercase", letterSpacing: 0.5, margin: "0 0 4px" }}>Definition</p>
                    {rights.map((right, i) => {
                        const alreadyUsed = Object.values(answer).includes(right);
                        return (
                            <div key={i}
                                draggable={!submitted && !alreadyUsed}
                                onDragStart={() => setDragging(right)}
                                onDragEnd={() => setDragging(null)}
                                style={{
                                    padding: "12px 14px", borderRadius: 8,
                                    border: alreadyUsed ? "1px dashed #dadce0" : "1px solid #dadce0",
                                    background: alreadyUsed ? "#f8f9fa" : dragging === right ? "#fff9c4" : "#fff",
                                    cursor: submitted || alreadyUsed ? "default" : "grab",
                                    fontSize: 13, color: alreadyUsed ? "#9aa0a6" : "#3c4043",
                                    opacity: alreadyUsed ? 0.5 : 1, transition: "all .15s",
                                    userSelect: "none",
                                }}>
                                ≡ {right}
                            </div>
                        );
                    })}
                </div>
            </div>
            {submitted && showAnswers && (
                <div style={{ marginTop: 12, padding: "10px 14px", background: "#fffbeb", borderRadius: 8, border: "1px solid #fde68a" }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: "#92400e", margin: "0 0 4px" }}>Correct matches:</p>
                    {task.pairs.map(p => (
                        <p key={p.id} style={{ fontSize: 12.5, color: "#374151", margin: "2px 0" }}>
                            <strong>{p.left}</strong> → {p.right}
                        </p>
                    ))}
                </div>
            )}
        </div>
    );
}

/* Code Challenge */
function TaskCodeChallenge({ task, answer = "", onChange, submitted, showAnswers }) {
    return (
        <div>
            <div style={{ background: "#1e1e2e", borderRadius: 8, overflow: "hidden", border: "1px solid #313244" }}>
                <div style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "6px 14px", background: "#181825", borderBottom: "1px solid #313244",
                }}>
                    <span style={{ fontSize: 11, color: "#89b4fa", fontFamily: "monospace", textTransform: "uppercase", letterSpacing: 1 }}>
                        {task.language}
                    </span>
                    {!submitted && <span style={{ fontSize: 11, color: "#6e738d" }}>Fill in the blanks (______)</span>}
                </div>
                <textarea
                    value={submitted ? (showAnswers ? task.solutionCode : (answer || task.starterCode)) : (answer || task.starterCode)}
                    onChange={e => !submitted && onChange(e.target.value)}
                    disabled={submitted}
                    rows={task.starterCode.split("\n").length + 2}
                    spellCheck={false}
                    style={{
                        width: "100%", border: "none", outline: "none", resize: "vertical",
                        background: "transparent", color: "#cdd6f4",
                        fontFamily: "'JetBrains Mono','Fira Code',monospace",
                        fontSize: 13, lineHeight: 1.7, padding: "14px 18px",
                        boxSizing: "border-box",
                    }}
                />
            </div>
            {submitted && showAnswers && (
                <div style={{ marginTop: 10 }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: "#5f6368", margin: "0 0 6px" }}>✅ Reference Solution:</p>
                    <div style={{ background: "#1e1e2e", borderRadius: 8, padding: "14px 18px", overflow: "auto" }}>
                        <pre style={{ margin: 0, color: "#a6e3a1", fontFamily: "'JetBrains Mono',monospace", fontSize: 12.5, lineHeight: 1.65 }}>
                            <code>{task.solutionCode}</code>
                        </pre>
                    </div>
                </div>
            )}
        </div>
    );
}

/* Short Answer */
function TaskShortAnswer({ task, answer = "", onChange, submitted, showAnswers }) {
    const words = answer.trim() ? answer.trim().split(/\s+/).length : 0;
    const overLimit = task.wordLimit && words > task.wordLimit;
    return (
        <div>
            <textarea
                value={answer} disabled={submitted}
                onChange={e => !submitted && onChange(e.target.value)}
                rows={5} placeholder="Type your answer here…"
                style={{
                    width: "100%", padding: "12px 16px", borderRadius: 8, fontSize: 14, lineHeight: 1.7,
                    border: overLimit ? "2px solid #dc2626" : "1px solid #dadce0",
                    outline: "none", resize: "vertical", color: "#202124", background: submitted ? "#f8f9fa" : "#fff",
                    boxSizing: "border-box", fontFamily: "inherit",
                }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: overLimit ? "#dc2626" : "#5f6368", marginTop: 4 }}>
                <span>{words} words{task.wordLimit ? ` / ${task.wordLimit} max` : ""}</span>
                {task.keywords?.length > 0 && <span>Keywords to include: {task.keywords.join(", ")}</span>}
            </div>
            {submitted && showAnswers && (
                <div style={{ marginTop: 12, padding: "12px 16px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8 }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: "#15803d", margin: "0 0 6px" }}>Model Answer:</p>
                    <p style={{ fontSize: 13.5, color: "#166534", lineHeight: 1.7, margin: 0 }}>{task.modelAnswer}</p>
                </div>
            )}
        </div>
    );
}

/* ════════════════════════════════════════════════════
   TASK CARD wrapper
════════════════════════════════════════════════════ */
function TaskCard({ task, index, answer, onChange, submitted, showAnswers, showExplanations, points }) {
    const [showHint, setShowHint] = useState(false);
    const meta = TASK_TYPE_LABELS[task.type] || TASK_TYPE_LABELS.mcq;

    const isAnswered = (() => {
        if (!answer && answer !== false) return false;
        if (task.type === "multi_select") return Array.isArray(answer) && answer.length > 0;
        if (task.type === "drag_drop") return typeof answer === "object" && Object.keys(answer).length > 0;
        if (task.type === "fill_blank") return typeof answer === "object" && Object.values(answer).some(v => v?.trim());
        return String(answer).trim().length > 0;
    })();

    // Score this task
    const taskScore = (() => {
        if (!submitted) return null;
        const pts = Number(task.points) || 0;
        if (task.type === "mcq") return answer === task.correctOptions[0] ? pts : 0;
        if (task.type === "true_false") return answer === task.correctAnswer ? pts : 0;
        if (task.type === "multi_select") {
            const correct = new Set(task.correctOptions);
            const given = new Set(Array.isArray(answer) ? answer : []);
            const allRight = [...correct].every(x => given.has(x)) && [...given].every(x => correct.has(x));
            return allRight ? pts : 0;
        }
        if (task.type === "fill_blank") {
            const allFilled = task.blanks.every(b => {
                const val = answer?.[b.id] || "";
                return b.caseSensitive ? val === b.answer : val.toLowerCase() === b.answer.toLowerCase();
            });
            return allFilled ? pts : 0;
        }
        if (task.type === "drag_drop") {
            const allMatch = task.pairs.every(p => answer?.[p.id] === p.right);
            return allMatch ? pts : 0;
        }
        // code_challenge & short_answer — partial credit assumed (user self-marks)
        return null;
    })();

    return (
        <div id={`task-${task.id}`} style={{ scrollMarginTop: 16, marginBottom: 20 }}>
            <div style={{
                border: "1px solid #e5eaf3", borderRadius: 12, overflow: "hidden",
                background: "#fafbff", boxShadow: "0 1px 4px rgba(0,0,0,.04)",
                transition: "box-shadow .2s",
            }}>
                {/* Task header */}
                <div style={{
                    display: "flex", alignItems: "center", gap: 10, padding: "14px 20px",
                    borderBottom: "1px solid #eef0f6", background: "#fff",
                }}>
                    <div style={{
                        display: "inline-flex", alignItems: "center", justifyContent: "center",
                        width: 28, height: 28, borderRadius: "50%",
                        background: submitted ? (taskScore === null ? "#fef3e2" : taskScore > 0 ? "#f0fdf4" : "#fef2f2") : "#1a73e8",
                        color: "#fff", fontSize: 12, fontWeight: 700, flexShrink: 0,
                    }}>
                        {submitted ? (taskScore === null ? "?" : taskScore > 0 ? "✓" : "✗") : index + 1}
                    </div>
                    <div style={{ flex: 1 }}>
                        {task.section && (
                            <div style={{ fontSize: 10.5, fontWeight: 700, color: "#9aa0a6", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 2 }}>
                                {task.section}
                            </div>
                        )}
                        <span style={{
                            display: "inline-flex", alignItems: "center", gap: 5,
                            fontSize: 11.5, fontWeight: 700, color: meta.color,
                            background: meta.bg, padding: "2px 8px", borderRadius: 20,
                        }}>
                            {meta.icon} {meta.label}
                        </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                        {submitted && taskScore !== null && (
                            <span style={{
                                fontSize: 13, fontWeight: 700,
                                color: taskScore > 0 ? "#15803d" : "#dc2626",
                                background: taskScore > 0 ? "#f0fdf4" : "#fef2f2",
                                padding: "3px 10px", borderRadius: 20, border: `1px solid ${taskScore > 0 ? "#bbf7d0" : "#fecaca"}`,
                            }}>
                                {taskScore}/{task.points} pts
                            </span>
                        )}
                        {!submitted && (
                            <span style={{ fontSize: 12, color: "#5f6368" }}>{task.points} pts</span>
                        )}
                        {!submitted && !isAnswered && (
                            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#dadce0", display: "inline-block" }} />
                        )}
                        {!submitted && isAnswered && (
                            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#34a853", display: "inline-block" }} />
                        )}
                    </div>
                </div>

                {/* Question */}
                <div style={{ padding: "18px 20px 14px" }}>
                    <p style={{ fontSize: 15, lineHeight: 1.65, color: "#1a1a2e", fontWeight: 500, margin: "0 0 16px" }}>
                        {task.question}
                    </p>

                    {/* Answer input */}
                    {task.type === "mcq" && <TaskMCQ task={task} answer={answer} onChange={onChange} submitted={submitted} showAnswers={showAnswers} />}
                    {task.type === "multi_select" && <TaskMultiSelect task={task} answer={answer} onChange={onChange} submitted={submitted} showAnswers={showAnswers} />}
                    {task.type === "true_false" && <TaskTrueFalse task={task} answer={answer} onChange={onChange} submitted={submitted} showAnswers={showAnswers} />}
                    {task.type === "fill_blank" && <TaskFillBlank task={task} answer={answer} onChange={onChange} submitted={submitted} showAnswers={showAnswers} />}
                    {task.type === "drag_drop" && <TaskDragDrop task={task} answer={answer} onChange={onChange} submitted={submitted} showAnswers={showAnswers} />}
                    {task.type === "code_challenge" && <TaskCodeChallenge task={task} answer={answer} onChange={onChange} submitted={submitted} showAnswers={showAnswers} />}
                    {task.type === "short_answer" && <TaskShortAnswer task={task} answer={answer} onChange={onChange} submitted={submitted} showAnswers={showAnswers} />}

                    {/* Hint */}
                    {!submitted && task.hint && (
                        <div style={{ marginTop: 12 }}>
                            <button onClick={() => setShowHint(h => !h)} style={{
                                fontSize: 12, color: "#1a73e8", background: "none", border: "none",
                                cursor: "pointer", padding: 0, display: "flex", alignItems: "center", gap: 4,
                            }}>
                                💡 {showHint ? "Hide hint" : "Show hint"}
                            </button>
                            {showHint && (
                                <div style={{
                                    marginTop: 8, padding: "10px 14px", background: "#f5f3ff",
                                    border: "1px solid #c4b5fd", borderRadius: 8, fontSize: 13, color: "#5b21b6",
                                }}>
                                    {task.hint}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Explanation after submit */}
                    {submitted && showExplanations && task.explanation && (
                        <div style={{
                            marginTop: 14, padding: "12px 16px",
                            background: "#eff6ff", border: "1px solid #bfdbfe",
                            borderRadius: 8, fontSize: 13.5, color: "#1e40af", lineHeight: 1.65,
                        }}>
                            <strong>📚 Explanation: </strong>{task.explanation}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

/* ════════════════════════════════════════════════════
   RESULTS PANEL
════════════════════════════════════════════════════ */
function ResultsPanel({ lab, answers, onRetry, onDownloadCert, backHref = "/labs", backLabel = "← Back to Labs" }) {
    const { meta, tasks } = lab;

    let earned = 0, total = 0;
    tasks.forEach(t => {
        const pts = Number(t.points) || 0;
        total += pts;
        const ans = answers[t.id];
        if (t.type === "mcq") { if (ans === t.correctOptions[0]) earned += pts; }
        else if (t.type === "true_false") { if (ans === t.correctAnswer) earned += pts; }
        else if (t.type === "multi_select") {
            const s = new Set(t.correctOptions), g = new Set(Array.isArray(ans) ? ans : []);
            if ([...s].every(x => g.has(x)) && [...g].every(x => s.has(x))) earned += pts;
        }
        else if (t.type === "fill_blank") {
            if (t.blanks.every(b => {
                const v = ans?.[b.id] || "";
                return b.caseSensitive ? v === b.answer : v.toLowerCase() === b.answer.toLowerCase();
            })) earned += pts;
        }
        else if (t.type === "drag_drop") {
            if (t.pairs.every(p => ans?.[p.id] === p.right)) earned += pts;
        }
        // code_challenge / short_answer: not auto-graded
    });

    const pct = total > 0 ? Math.round((earned / total) * 100) : 0;
    const pass = pct >= (meta.passingScore || 70);

    return (
        <div style={{ fontFamily: "'Google Sans','Segoe UI',sans-serif" }}>
            {/* Hero result */}
            <div style={{
                textAlign: "center", padding: "52px 40px 40px",
                background: pass ? "linear-gradient(135deg,#f0fdf4,#dcfce7)" : "linear-gradient(135deg,#fef2f2,#fee2e2)",
                borderRadius: 16, border: `1px solid ${pass ? "#bbf7d0" : "#fecaca"}`, marginBottom: 28,
            }}>
                <div style={{ fontSize: 64, marginBottom: 12 }}>{pass ? "🏆" : "📚"}</div>
                <h2 style={{ fontSize: 30, fontWeight: 700, color: pass ? "#15803d" : "#dc2626", margin: "0 0 10px" }}>
                    {pass ? "Lab Passed!" : "Keep Practicing!"}
                </h2>
                <p style={{ fontSize: 16, color: pass ? "#166534" : "#991b1b", margin: "0 0 24px" }}>
                    {pass ? meta.passMessage : meta.failMessage}
                </p>

                {/* Score ring */}
                <div style={{
                    display: "inline-flex", flexDirection: "column", alignItems: "center",
                    background: "#fff", borderRadius: "50%", width: 120, height: 120,
                    boxShadow: `0 0 0 8px ${pass ? "#bbf7d0" : "#fecaca"}`,
                    justifyContent: "center", marginBottom: 24,
                }}>
                    <span style={{ fontSize: 32, fontWeight: 800, color: pass ? "#15803d" : "#dc2626" }}>{pct}%</span>
                    <span style={{ fontSize: 11, color: "#5f6368" }}>Score</span>
                </div>

                <div style={{ display: "flex", justifyContent: "center", gap: 32, fontSize: 13, color: "#374151" }}>
                    <div><div style={{ fontWeight: 700, fontSize: 20, color: "#1a1a2e" }}>{earned}/{total}</div><div>Points Earned</div></div>
                    <div><div style={{ fontWeight: 700, fontSize: 20, color: "#1a73e8" }}>{meta.passingScore}%</div><div>Pass Mark</div></div>
                    <div><div style={{ fontWeight: 700, fontSize: 20, color: "#e37400" }}>{tasks.length}</div><div>Tasks</div></div>
                </div>
            </div>

            {/* CTA buttons */}
            <div style={{ display: "flex", gap: 12, justifyContent: "center", marginBottom: 32 }}>
                {pass && meta.certificateOnPass && (
                    <button onClick={onDownloadCert} style={{
                        padding: "13px 28px", borderRadius: 8, border: "none", cursor: "pointer",
                        background: "#1a73e8", color: "#fff", fontWeight: 700, fontSize: 14,
                        display: "flex", alignItems: "center", gap: 8,
                    }}>
                        🎓 Download Certificate
                    </button>
                )}
                <button onClick={onRetry} style={{
                    padding: "13px 28px", borderRadius: 8,
                    border: "2px solid #dadce0", cursor: "pointer",
                    background: "#fff", color: "#202124", fontWeight: 600, fontSize: 14,
                }}>
                    ↺ Try Again
                </button>
                <Link to={backHref} style={{
                    padding: "13px 28px", borderRadius: 8, border: "2px solid #dadce0",
                    textDecoration: "none", color: "#202124", fontWeight: 600, fontSize: 14,
                    background: "#fff",
                }}>
                    {backLabel}
                </Link>
            </div>

            {/* Per-task breakdown */}
            <h3 style={{ fontSize: 16, fontWeight: 600, color: "#202124", marginBottom: 12 }}>Task Breakdown</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {tasks.map((t, i) => {
                    const ans = answers[t.id];
                    let correct = null;
                    if (t.type === "mcq") correct = ans === t.correctOptions[0];
                    if (t.type === "true_false") correct = ans === t.correctAnswer;
                    if (t.type === "multi_select") {
                        const s = new Set(t.correctOptions), g = new Set(Array.isArray(ans) ? ans : []);
                        correct = [...s].every(x => g.has(x)) && [...g].every(x => s.has(x));
                    }
                    if (t.type === "fill_blank") {
                        correct = t.blanks.every(b => { const v = ans?.[b.id] || ""; return b.caseSensitive ? v === b.answer : v.toLowerCase() === b.answer.toLowerCase(); });
                    }
                    if (t.type === "drag_drop") correct = t.pairs.every(p => ans?.[p.id] === p.right);
                    const auto = t.type !== "code_challenge" && t.type !== "short_answer";
                    const tm = TASK_TYPE_LABELS[t.type] || TASK_TYPE_LABELS.mcq;
                    return (
                        <div key={t.id} style={{
                            display: "flex", alignItems: "center", gap: 12, padding: "12px 16px",
                            borderRadius: 8, border: "1px solid #e5eaf3", background: "#fafbff",
                        }}>
                            <div style={{
                                width: 24, height: 24, borderRadius: "50%", flexShrink: 0, fontSize: 12,
                                display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700,
                                background: auto ? (correct ? "#f0fdf4" : "#fef2f2") : "#fef3e2",
                                color: auto ? (correct ? "#15803d" : "#dc2626") : "#92400e",
                            }}>{auto ? (correct ? "✓" : "✗") : "?"}</div>
                            <span style={{ fontSize: 12, color: tm.color, background: tm.bg, padding: "2px 8px", borderRadius: 20, fontWeight: 700, flexShrink: 0 }}>{tm.icon} {tm.label}</span>
                            <span style={{ fontSize: 13.5, flex: 1, color: "#3c4043", lineHeight: 1.4 }} className="truncate">{t.question.slice(0, 80)}{t.question.length > 80 ? "…" : ""}</span>
                            <span style={{ fontSize: 12, fontWeight: 700, flexShrink: 0, color: auto ? (correct ? "#15803d" : "#dc2626") : "#92400e" }}>
                                {auto ? (correct ? t.points : 0) : "?"}/{t.points} pts
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

/* ════════════════════════════════════════════════════
   MAIN PAGE (loaded by SkillBuilderDetailPage after lab fetch)
════════════════════════════════════════════════════ */
function SkillBuilderExperience({ resolvedLab, slug, fromCourse, isAuthenticated }) {
    const [submitSkillBuilder] = useSubmitSkillBuilderMutation();

    const lab = { meta: resolvedLab.meta, tasks: resolvedLab.tasks };
    const { meta, tasks } = lab;

    const backHref = fromCourse ? `/courses/${encodeURIComponent(fromCourse)}` : "/labs";
    const backLabel = fromCourse ? "← Back to course" : "← Back to Labs";

    const { data: enrollmentPayload } = useGetLabEnrollmentQuery(resolvedLab?.labId, {
        skip: !isAuthenticated || !resolvedLab?.labId,
    });
    const enrollment = enrollmentPayload?.data?.enrollment ?? enrollmentPayload?.enrollment;

    useEffect(() => {
        if (slug && meta?.title) document.title = `${meta.title} · ${slug}`;
    }, [slug, meta?.title]);

    const [answers, setAnswers] = useState({});
    const answersRef = useRef(answers);
    useEffect(() => {
        answersRef.current = answers;
    }, [answers]);

    const [submitted, setSubmitted] = useState(false);
    const [showResults, setShowResults] = useState(false);
    const [timerSec, setTimerSec] = useState(meta.timerSec);
    const [running, setRunning] = useState(false);
    const [started, setStarted] = useState(false);
    const [activeId, setActiveId] = useState(`task-${tasks[0]?.id}`);
    const [setupOpen, setSetupOpen] = useState(false);

    useEffect(() => {
        setTimerSec(meta.timerSec);
    }, [meta.timerSec]);

    const handleSubmit = useCallback(() => {
        setRunning(false);
        setSubmitted(true);
        setShowResults(true);
        window.scrollTo({ top: 0, behavior: "smooth" });
        const labId = resolvedLab?.labId;
        const ans = answersRef.current;
        if (labId && isAuthenticated) {
            submitSkillBuilder({ labId, answers: ans })
                .unwrap()
                .then((payload) => {
                    const passed = payload?.data?.passed;
                    toast.success(
                        passed
                            ? "Passed — progress saved to your learning and course (if applicable)"
                            : "Attempt saved"
                    );
                })
                .catch((err) => {
                    toast.error(err?.data?.message || err?.message || "Could not save progress");
                });
        } else if (labId && !isAuthenticated) {
            toast.info("Sign in to save your score to your profile.");
        }
    }, [resolvedLab?.labId, isAuthenticated, submitSkillBuilder]);

    // Countdown
    useEffect(() => {
        if (!running) return;
        const t = setInterval(() => setTimerSec(s => {
            if (s <= 1) { clearInterval(t); handleSubmit(); return 0; }
            return s - 1;
        }), 1000);
        return () => clearInterval(t);
    }, [running, handleSubmit]);

    // Scrollspy
    useEffect(() => {
        const obs = new IntersectionObserver(entries => {
            const vis = entries.filter(e => e.isIntersecting);
            if (!vis.length) return;
            const top = vis.reduce((a, b) => a.boundingClientRect.top < b.boundingClientRect.top ? a : b);
            setActiveId(top.target.id);
        }, { rootMargin: "-5% 0px -85% 0px", threshold: 0 });
        tasks.forEach(t => {
            const el = document.getElementById(`task-${t.id}`);
            if (el) obs.observe(el);
        });
        return () => obs.disconnect();
    }, [tasks, submitted]);

    const scrollTo = (sid) => {
        document.getElementById(sid)?.scrollIntoView({ behavior: "smooth", block: "start" });
        setActiveId(sid);
    };

    const handleRetry = () => {
        setAnswers({});
        setSubmitted(false);
        setShowResults(false);
        setTimerSec(meta.timerSec);
        setRunning(false);
        setStarted(false);
    };

    const answeredCount = Object.keys(answers).filter(k => {
        const a = answers[k];
        if (Array.isArray(a)) return a.length > 0;
        if (typeof a === "object" && a !== null) return Object.values(a).some(v => v?.trim?.() || v);
        return String(a || "").trim().length > 0;
    }).length;

    const totalPts = tasks.reduce((s, t) => s + Number(t.points || 0), 0);
    const timerRed = timerSec < 300;

    // Grouped sections for TOC
    const sections = [...new Set(tasks.map(t => t.section).filter(Boolean))];

    return (
        <>
            {/* Score badge */}
            <div style={{
                position: "fixed", top: NAVBAR_H + 12, right: 16, zIndex: 900,
                background: "#f9ab00", color: "#fff", fontWeight: 700, fontSize: 14,
                padding: "7px 18px", borderRadius: 5, boxShadow: "0 2px 10px rgba(0,0,0,.25)",
            }}>
                {answeredCount}/{tasks.length} Answered
            </div>

            <div style={{
                display: "flex",
                height: `calc(100vh - ${NAVBAR_H}px - ${FOOTER_H}px)`,
                marginTop: NAVBAR_H,
                fontFamily: "'Google Sans','Segoe UI',sans-serif",
                fontSize: 14, color: "#202124", background: "#fff", overflow: "hidden",
            }}>

                {/* ══ LEFT SIDEBAR ══ */}
                <aside style={{
                    width: 252, minWidth: 252, flexShrink: 0,
                    background: "#fff", borderRight: "1px solid #e0e0e0",
                    display: "flex", flexDirection: "column", gap: 14,
                    padding: "18px 14px", overflowY: "auto",
                }}>
                    {/* Skills tested */}
                    <button onClick={() => setSetupOpen(o => !o)} style={{
                        display: "flex", justifyContent: "space-between", alignItems: "flex-start",
                        padding: "11px 13px", background: "#f1f3f4", borderRadius: 8,
                        border: "none", cursor: "pointer", fontSize: 12.5, fontWeight: 600,
                        color: "#202124", width: "100%", textAlign: "left", lineHeight: 1.5,
                    }}>
                        <span>Skills being tested</span>
                        <span style={{ fontSize: 16, marginLeft: 6, color: "#5f6368" }}>{setupOpen ? "▾" : "›"}</span>
                    </button>
                    {setupOpen && (
                        <div style={{ fontSize: 12.5, color: "#3c4043", padding: "0 4px" }}>
                            {(meta.skillsTested || []).map((s, i) => (
                                <p key={i} style={{ margin: "4px 0", display: "flex", alignItems: "center", gap: 6 }}>
                                    <span style={{ color: "#1a73e8" }}>⚡</span>{s}
                                </p>
                            ))}
                        </div>
                    )}

                    <hr style={{ border: "none", borderTop: "1px solid #e0e0e0", margin: "2px 0" }} />

                    {/* Timer */}
                    <div style={{ textAlign: "center", padding: "6px 0" }}>
                        <div style={{
                            fontSize: 34, fontWeight: 700, letterSpacing: 3,
                            color: timerRed ? "#d93025" : "#202124",
                            fontFamily: "'Roboto Mono','Courier New',monospace",
                            transition: "color .3s",
                        }}>{formatTime(timerSec)}</div>
                        <div style={{ fontSize: 11, color: "#5f6368", marginTop: 3 }}>
                            {started ? (running ? "⏱ Time remaining" : "⏸ Paused") : "⏱ Time limit"}
                        </div>
                    </div>

                    {/* Start / Pause button */}
                    {!submitted && (
                        <button
                            onClick={started ? () => setRunning(r => !r) : () => { setStarted(true); setRunning(true); }}
                            style={{
                                padding: "11px 0", borderRadius: 5, fontWeight: 700, fontSize: 14,
                                cursor: "pointer", width: "100%", border: "none",
                                background: started ? (running ? "#ea4335" : "#34a853") : "#1a73e8",
                                color: "#fff",
                            }}>
                            {started ? (running ? "⏸  Pause" : "▶  Resume") : "▶  Start Lab"}
                        </button>
                    )}

                    {/* Progress bar */}
                    <div>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, color: "#5f6368", marginBottom: 5 }}>
                            <span>Progress</span><span>{answeredCount}/{tasks.length} tasks</span>
                        </div>
                        <div style={{ height: 8, background: "#e8eaed", borderRadius: 4, overflow: "hidden" }}>
                            <div style={{
                                height: "100%", borderRadius: 4, transition: "width .4s",
                                background: answeredCount === tasks.length ? "#34a853" : "#1a73e8",
                                width: `${(answeredCount / tasks.length) * 100}%`,
                            }} />
                        </div>
                    </div>

                    <hr style={{ border: "none", borderTop: "1px solid #e0e0e0", margin: "2px 0" }} />

                    {/* Submit button */}
                    {started && !submitted && (
                        <button onClick={handleSubmit} style={{
                            padding: "11px 0", borderRadius: 5, fontWeight: 700, fontSize: 14,
                            cursor: "pointer", width: "100%",
                            border: "2px solid #34a853", background: "#f0fdf4", color: "#15803d",
                            transition: "all .2s",
                        }}>
                            ✓ Submit Lab
                        </button>
                    )}

                    {submitted && (
                        <button onClick={handleRetry} style={{
                            padding: "11px 0", borderRadius: 5, fontWeight: 600, fontSize: 13,
                            cursor: "pointer", width: "100%",
                            border: "1px solid #dadce0", background: "#fff", color: "#5f6368",
                        }}>
                            ↺ Retry Lab
                        </button>
                    )}

                    <hr style={{ border: "none", borderTop: "1px solid #e0e0e0", margin: "2px 0" }} />

                    {/* Lab meta */}
                    {enrollment && resolvedLab?.labId && (
                        <div style={{ fontSize: 11.5, color: "#137333", background: "#e6f4ea", padding: "8px 10px", borderRadius: 8, lineHeight: 1.45 }}>
                            {enrollment.status === "completed"
                                ? "✓ Recorded as complete in your learning"
                                : `Saved progress: ${enrollment.progress ?? 0}% best score`}
                        </div>
                    )}

                    <div style={{ fontSize: 12.5, color: "#5f6368", lineHeight: 2.1 }}>
                        <div>🧠 Skill Builder · {meta.credits}</div>
                        <div>⏱ {meta.duration}</div>
                        <div>📈 {meta.level}</div>
                        <div>☁️ {meta.platform}</div>
                        <div>🎯 Pass: {meta.passingScore}%</div>
                        <div>🏆 {tasks.length} tasks · {totalPts} pts</div>
                        <div style={{ marginTop: 4 }}><StarRating value={meta.rating} /></div>
                    </div>
                </aside>

                {/* ══ CENTER CONTENT ══ */}
                <main style={{ flex: 1, overflowY: "auto", padding: "32px 52px 72px" }}>
                    {/* Lab header */}
                    {!showResults && (
                        <div style={{ marginBottom: 28 }}>
                            <h1 style={{ fontSize: 30, fontWeight: 400, lineHeight: 1.25, color: "#202124", margin: "0 0 14px" }}>
                                {meta.title}
                            </h1>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 18, alignItems: "center", fontSize: 13, color: "#3c4043", marginBottom: 14 }}>
                                <span>🧠 Skill Builder</span>
                                <span>⏱ {meta.duration}</span>
                                <span>💳 {meta.credits}</span>
                                <span>📈 {meta.level}</span>
                                <span>☁️ {meta.platform}</span>
                                <span>🎯 Pass: {meta.passingScore}%</span>
                            </div>
                            <StarRating value={meta.rating} />
                            <div style={{ marginTop: 14 }}>
                                <div style={{
                                    background: "#f5f3ff", border: "1px solid #c4b5fd", borderRadius: 8,
                                    padding: "10px 15px", display: "flex", gap: 10, fontSize: 13.5, color: "#5b21b6",
                                }}>
                                    <span>🧠</span>
                                    <span>Complete all tasks to validate your skills. Auto-graded tasks show results immediately after submission. Code challenges and short answers are self-assessed.</span>
                                </div>
                            </div>
                            <div style={{ marginTop: 10, fontWeight: 700, fontSize: 15, color: "#202124" }}>{meta.code}</div>
                            <div style={{ fontSize: 13, color: "#5f6368" }}>ALAR Cloud Training Labs · Skill Builder</div>
                            <hr style={{ border: "none", borderTop: "1px solid #e0e0e0", margin: "24px 0" }} />
                        </div>
                    )}

                    {/* Results panel */}
                    {showResults && (
                        <ResultsPanel
                            lab={lab}
                            answers={answers}
                            onRetry={handleRetry}
                            onDownloadCert={() => alert("Generating certificate… (connect to your backend)")}
                            backHref={backHref}
                            backLabel={backLabel}
                        />
                    )}

                    {/* Task cards */}
                    {!showResults && (
                        <>
                            {sections.length > 0 && tasks.some(t => t.section) && (
                                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
                                    {sections.map(sec => (
                                        <span key={sec} style={{
                                            fontSize: 12, fontWeight: 700, color: "#1a73e8",
                                            background: "#e8f0fe", padding: "4px 12px", borderRadius: 20,
                                        }}>📂 {sec}</span>
                                    ))}
                                </div>
                            )}

                            {tasks.map((task, i) => (
                                <TaskCard
                                    key={task.id}
                                    task={task}
                                    index={i}
                                    answer={answers[task.id]}
                                    onChange={val => setAnswers(prev => ({ ...prev, [task.id]: val }))}
                                    submitted={submitted}
                                    showAnswers={meta.showCorrectAnswers}
                                    showExplanations={meta.showExplanations}
                                />
                            ))}

                            {/* Submit footer */}
                            {started && !submitted && (
                                <div style={{
                                    marginTop: 20, padding: "20px 24px",
                                    background: "#f8faff", border: "1px solid #e5eaf3", borderRadius: 12,
                                    display: "flex", alignItems: "center", justifyContent: "space-between",
                                }}>
                                    <div style={{ fontSize: 13.5, color: "#5f6368" }}>
                                        {answeredCount}/{tasks.length} tasks answered
                                        {answeredCount < tasks.length && (
                                            <span style={{ color: "#e37400", marginLeft: 8 }}>
                                                · {tasks.length - answeredCount} unanswered
                                            </span>
                                        )}
                                    </div>
                                    <button onClick={handleSubmit} style={{
                                        padding: "12px 28px", borderRadius: 8, border: "none", cursor: "pointer",
                                        background: "#1a73e8", color: "#fff", fontWeight: 700, fontSize: 14,
                                    }}>
                                        ✓ Submit Lab
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </main>

                {/* ══ RIGHT TOC ══ */}
                <nav style={{
                    width: 232, minWidth: 232, flexShrink: 0,
                    borderLeft: "1px solid #e0e0e0", overflowY: "auto", padding: "0 0 20px",
                }}>
                    <div style={{
                        fontSize: 10.5, fontWeight: 700, color: "#1a73e8",
                        letterSpacing: 0.8, textTransform: "uppercase",
                        padding: "16px 18px 12px", borderBottom: "1px solid #e0e0e0", marginBottom: 6,
                    }}>
                        Tasks
                    </div>
                    {tasks.map((task, i) => {
                        const sid = `task-${task.id}`;
                        const isActive = activeId === sid;
                        const isAnswered = (() => {
                            const a = answers[task.id];
                            if (!a && a !== false) return false;
                            if (Array.isArray(a)) return a.length > 0;
                            if (typeof a === "object") return Object.values(a).some(v => v?.trim?.() || v);
                            return String(a).trim().length > 0;
                        })();
                        const tm = TASK_TYPE_LABELS[task.type] || TASK_TYPE_LABELS.mcq;
                        return (
                            <button key={sid} onClick={() => scrollTo(sid)} style={{
                                display: "flex", alignItems: "center", gap: 8, width: "100%",
                                textAlign: "left", padding: "8px 18px",
                                background: isActive ? "#e8f0fe" : "transparent",
                                borderRight: isActive ? "3px solid #1a73e8" : "3px solid transparent",
                                border: "none", cursor: "pointer", transition: "all .15s",
                            }}>
                                <div style={{
                                    width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
                                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700,
                                    background: submitted
                                        ? "#f0fdf4"
                                        : isAnswered ? "#34a853" : "#e8eaed",
                                    color: submitted ? "#15803d" : isAnswered ? "#fff" : "#5f6368",
                                }}>
                                    {submitted ? "✓" : i + 1}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: 10, color: tm.color, fontWeight: 700, marginBottom: 1 }}>{tm.icon} {tm.label}</div>
                                    <div style={{
                                        fontSize: 12, fontWeight: isActive ? 700 : 400,
                                        color: isActive ? "#1a73e8" : "#3c4043", lineHeight: 1.35,
                                        overflow: "hidden", display: "-webkit-box",
                                        WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
                                    }}>
                                        {task.question.slice(0, 55)}{task.question.length > 55 ? "…" : ""}
                                    </div>
                                </div>
                            </button>
                        );
                    })}

                    {/* Points summary in TOC */}
                    <div style={{ margin: "16px 14px 0", padding: "12px 14px", background: "#f8faff", borderRadius: 8, border: "1px solid #e5eaf3" }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: "#5f6368", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>Total Points</div>
                        <div style={{ fontSize: 22, fontWeight: 700, color: "#1a1a2e" }}>{totalPts}</div>
                        <div style={{ fontSize: 11, color: "#5f6368" }}>Pass: {meta.passingScore}% ({Math.ceil(totalPts * meta.passingScore / 100)} pts)</div>
                    </div>
                </nav>
            </div>
        </>
    );
}

export default function SkillBuilderDetailPage() {
    const { slug } = useParams();
    const [searchParams] = useSearchParams();
    const fromCourse = searchParams.get("fromCourse") || "";
    const isAuthenticated = useSelector((s) => s.auth?.isAuthenticated);
    const [resolvedLab, setResolvedLab] = useState(null);
    const [loadError, setLoadError] = useState(null);
    const [pageLoading, setPageLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        async function load() {
            setLoadError(null);
            setPageLoading(true);
            if (!slug) {
                if (!cancelled) {
                    setLoadError("fetch");
                    setResolvedLab(null);
                    setPageLoading(false);
                }
                return;
            }
            if (slug === "demo") {
                if (!cancelled) {
                    setResolvedLab({
                        labId: null,
                        courseId: null,
                        slug: "demo",
                        meta: MOCK_LAB.meta,
                        tasks: MOCK_LAB.tasks,
                    });
                    setPageLoading(false);
                }
                return;
            }
            try {
                const res = await api.get(`/labs/slug/${encodeURIComponent(slug)}`, { withCredentials: true });
                const raw = res?.data?.data?.lab || res?.data?.lab;
                const mapped = raw ? mapPublishedLabToSkillBuilderPage(raw) : null;
                if (!mapped) {
                    if (!cancelled) {
                        setLoadError("not_skill_builder");
                        setResolvedLab(null);
                    }
                } else if (!cancelled) {
                    setResolvedLab(mapped);
                }
            } catch {
                if (!cancelled) {
                    setLoadError("fetch");
                    setResolvedLab(null);
                }
            } finally {
                if (!cancelled) setPageLoading(false);
            }
        }
        load();
        return () => {
            cancelled = true;
        };
    }, [slug]);

    if (pageLoading) {
        return (
            <div style={{ paddingTop: NAVBAR_H + 48, textAlign: "center", color: "#5f6368", fontFamily: "system-ui,sans-serif" }}>
                Loading assessment…
            </div>
        );
    }
    if (loadError === "fetch") {
        return (
            <div style={{ marginTop: NAVBAR_H + 40, textAlign: "center", padding: 24, fontFamily: "system-ui,sans-serif" }}>
                <p style={{ marginBottom: 12 }}>Could not load this lab.</p>
                <Link to="/labs" style={{ color: "#1a73e8" }}>Back to labs</Link>
            </div>
        );
    }
    if (loadError === "not_skill_builder") {
        return (
            <div style={{ marginTop: NAVBAR_H + 40, textAlign: "center", padding: 24, fontFamily: "system-ui,sans-serif" }}>
                <p style={{ marginBottom: 12 }}>This page is only for Skill Builder assessments.</p>
                {slug && (
                    <Link to={`/labs/${encodeURIComponent(slug)}`} style={{ color: "#1a73e8" }}>
                        Open lab overview
                    </Link>
                )}
            </div>
        );
    }
    if (!resolvedLab) return null;

    return (
        <SkillBuilderExperience
            resolvedLab={resolvedLab}
            slug={slug}
            fromCourse={fromCourse}
            isAuthenticated={isAuthenticated}
        />
    );
}