import { useState, useMemo } from "react";

function stripHtml(s) {
  if (s == null || s === "") return "";
  return String(s).replace(/<[^>]*>/g, "").trim();
}

/** Shape expected by POST /me/labs/:id/skill-builder/submit */
export function buildSkillBuilderApiAnswer(task, type, raw) {
  if (type === "fill_blank") {
    const out = {};
    const bl = task.blanks || [];
    const arr = Array.isArray(raw) ? raw : [];
    bl.forEach((b, i) => {
      out[b.id] = String(arr[i] ?? "").trim();
    });
    return out;
  }
  if (type === "drag_drop" && raw && typeof raw === "object") return raw;
  return raw;
}

function normalizeAnswer(task, raw) {
  const t = task?.type || "mcq";
  if (t === "multi_select") return Array.isArray(raw) ? raw : [];
  if (t === "true_false") return String(raw || "").toLowerCase();
  return raw;
}

function gradeTask(task, answer) {
  const t = task?.type || "mcq";
  const pts = Number(task.points) || 0;

  if (t === "mcq") {
    const correct = task.correctOptions || [];
    const a = answer;
    if (correct.length && a != null && correct.includes(a)) return { ok: true, pts };
    return { ok: false, pts: 0 };
  }

  if (t === "true_false") {
    const ca = String(task.correctAnswer || "").toLowerCase();
    const ua = String(answer || "").toLowerCase();
    if (ca && ua === ca) return { ok: true, pts };
    return { ok: false, pts: 0 };
  }

  if (t === "multi_select") {
    const correct = [...(task.correctOptions || [])].map(String).sort().join("\u0000");
    const user = [...(Array.isArray(answer) ? answer : [])].map(String).sort().join("\u0000");
    if (correct && user === correct) return { ok: true, pts };
    return { ok: false, pts: 0 };
  }

  if (t === "short_answer") {
    const model = stripHtml(task.modelAnswer || "").toLowerCase();
    const ua = String(answer || "").trim().toLowerCase();
    if (!ua) return { ok: false, pts: 0 };
    if (!model) return { ok: true, pts };
    if (ua.includes(model) || model.includes(ua)) return { ok: true, pts };
    return { ok: false, pts: 0 };
  }

  if (t === "fill_blank") {
    const blanks = task.blanks || [];
    const arr = Array.isArray(answer) ? answer : [];
    let all = blanks.length > 0;
    blanks.forEach((b, i) => {
      const exp = String(b?.answer || "").trim().toLowerCase();
      const got = String(arr[i] || "").trim().toLowerCase();
      if (exp && got !== exp) all = false;
    });
    return all && blanks.length ? { ok: true, pts } : { ok: false, pts: 0 };
  }

  if (t === "code_challenge") {
    const code = String(answer || "").trim();
    if (code.length > 0) return { ok: true, pts };
    return { ok: false, pts: 0 };
  }

  /* drag_drop and others — participation if answered */
  if (answer != null && String(answer).length > 0) return { ok: true, pts: Math.round(pts * 0.5) };
  return { ok: false, pts: 0 };
}

export default function SkillBuilderTaskCard({
  task,
  taskIndex,
  onGraded,
  onTaskAnswerSubmit,
  /** After "Submit Lab" on parent — block new per-task submits */
  disableNewSubmits,
  interactionDisabled,
}) {
  const [mcqId, setMcqId] = useState("");
  const [multi, setMulti] = useState([]);
  const [tf, setTf] = useState("");
  const [shortAns, setShortAns] = useState("");
  const [blanks, setBlanks] = useState(() =>
    (task.blanks || []).map(() => "")
  );
  const [codeAns, setCodeAns] = useState(task.starterCode || task.starter_code || "");
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState(null);

  const maxPts = Number(task.points) || 0;
  const type = task.type || "mcq";

  const questionHtml = task.question || "";

  const locked = interactionDisabled || submitted || disableNewSubmits;

  const handleSubmit = () => {
    if (interactionDisabled || disableNewSubmits || submitted) return;
    let answer;
    if (type === "mcq") answer = mcqId;
    else if (type === "multi_select") answer = multi;
    else if (type === "true_false") answer = tf;
    else if (type === "short_answer") answer = shortAns;
    else if (type === "fill_blank") answer = blanks;
    else if (type === "code_challenge") answer = codeAns;
    else answer = mcqId;

    const g = gradeTask(task, answer);
    setSubmitted(true);
    setResult(g);
    if (typeof onGraded === "function") {
      onGraded({ index: taskIndex, earned: g.pts, max: maxPts, ok: g.ok });
    }
    const taskId = task.id != null && String(task.id) !== "" ? task.id : `task-${taskIndex}`;
    if (typeof onTaskAnswerSubmit === "function") {
      onTaskAnswerSubmit({
        taskId,
        answer: buildSkillBuilderApiAnswer(task, type, answer),
      });
    }
  };

  const toggleMulti = (id) => {
    setMulti((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const options = useMemo(() => (Array.isArray(task.options) ? task.options : []), [task.options]);

  return (
    <div
      style={{
        border: "1px solid #e5eaf3",
        borderRadius: 12,
        padding: "22px 24px",
        marginBottom: 22,
        background: "#fafbff",
        boxShadow: "0 1px 4px rgba(0,0,0,.04)",
      }}
    >
      <div id={`task-${taskIndex}`} style={{ scrollMarginTop: 72 }} />
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            minWidth: 28,
            height: 28,
            padding: "0 8px",
            borderRadius: 8,
            background: "#7c3aed",
            color: "#fff",
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          Q{taskIndex + 1}
        </span>
        <span style={{ fontSize: 12, fontWeight: 600, color: "#6b21a8", textTransform: "uppercase" }}>
          {type.replace(/_/g, " ")}
        </span>
        <span style={{ marginLeft: "auto", fontSize: 13, fontWeight: 600, color: "#5f6368" }}>
          {maxPts} pts
        </span>
      </div>

      {task.context && String(task.context).trim() && (
        <pre
          style={{
            background: "#1e1e2e",
            color: "#cdd6f4",
            padding: 12,
            borderRadius: 8,
            fontSize: 12,
            overflow: "auto",
            marginBottom: 14,
          }}
        >
          {task.context}
        </pre>
      )}

      <div
        style={{ fontSize: 15, lineHeight: 1.65, color: "#202124", marginBottom: 16 }}
        dangerouslySetInnerHTML={{ __html: questionHtml || `<p>Question ${taskIndex + 1}</p>` }}
      />

      {interactionDisabled && !submitted && (
        <div
          style={{
            marginBottom: 16,
            padding: "10px 14px",
            borderRadius: 8,
            background: "#fef3c7",
            border: "1px solid #fcd34d",
            color: "#92400e",
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          Sign in to submit answers and earn points for this lab.
        </div>
      )}

      {type === "mcq" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {options.map((opt) => (
            <label
              key={opt.id || opt.text}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
                cursor: locked ? "default" : "pointer",
                padding: "10px 12px",
                borderRadius: 8,
                border: mcqId === opt.id ? "2px solid #1a73e8" : "1px solid #e0e0e0",
                background: mcqId === opt.id ? "#e8f0fe" : "#fff",
              }}
            >
              <input
                type="radio"
                name={`mcq-${taskIndex}`}
                checked={mcqId === opt.id}
                disabled={locked}
                onChange={() => setMcqId(opt.id)}
              />
              <span style={{ fontSize: 14, color: "#3c4043" }}>{opt.text || "—"}</span>
            </label>
          ))}
        </div>
      )}

      {type === "multi_select" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {options.map((opt) => (
            <label
              key={opt.id || opt.text}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
                cursor: locked ? "default" : "pointer",
                padding: "10px 12px",
                borderRadius: 8,
                border: multi.includes(opt.id) ? "2px solid #1a73e8" : "1px solid #e0e0e0",
                background: multi.includes(opt.id) ? "#e8f0fe" : "#fff",
              }}
            >
              <input
                type="checkbox"
                checked={multi.includes(opt.id)}
                disabled={locked}
                onChange={() => toggleMulti(opt.id)}
              />
              <span style={{ fontSize: 14, color: "#3c4043" }}>{opt.text || "—"}</span>
            </label>
          ))}
        </div>
      )}

      {type === "true_false" && (
        <div style={{ display: "flex", gap: 12 }}>
          {["true", "false"].map((v) => (
            <button
              key={v}
              type="button"
              disabled={locked}
              onClick={() => setTf(v)}
              style={{
                padding: "10px 20px",
                borderRadius: 8,
                border: tf === v ? "2px solid #1a73e8" : "1px solid #dadce0",
                background: tf === v ? "#e8f0fe" : "#fff",
                cursor: locked ? "default" : "pointer",
                fontWeight: 600,
              }}
            >
              {v === "true" ? "True" : "False"}
            </button>
          ))}
        </div>
      )}

      {type === "short_answer" && (
        <textarea
          value={shortAns}
          disabled={locked}
          onChange={(e) => setShortAns(e.target.value)}
          rows={4}
          style={{
            width: "100%",
            padding: 12,
            borderRadius: 8,
            border: "1px solid #e0e0e0",
            fontSize: 14,
            fontFamily: "inherit",
          }}
          placeholder="Type your answer…"
        />
      )}

      {type === "fill_blank" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {(task.blanks || []).map((b, i) => (
            <input
              key={b.id || i}
              value={blanks[i] || ""}
              disabled={locked}
              onChange={(e) => {
                const next = [...blanks];
                next[i] = e.target.value;
                setBlanks(next);
              }}
              placeholder={`Blank ${i + 1}`}
              style={{
                padding: "10px 12px",
                borderRadius: 8,
                border: "1px solid #e0e0e0",
                fontSize: 14,
              }}
            />
          ))}
        </div>
      )}

      {type === "code_challenge" && (
        <textarea
          value={codeAns}
          disabled={locked}
          onChange={(e) => setCodeAns(e.target.value)}
          rows={10}
          style={{
            width: "100%",
            padding: 12,
            borderRadius: 8,
            border: "1px solid #e0e0e0",
            fontSize: 13,
            fontFamily: "ui-monospace, monospace",
          }}
        />
      )}

      {!submitted ? (
        <button
          type="button"
          onClick={handleSubmit}
          disabled={interactionDisabled || disableNewSubmits}
          style={{
            marginTop: 16,
            padding: "10px 22px",
            borderRadius: 8,
            border: "none",
            background: interactionDisabled || disableNewSubmits ? "#dadce0" : "#1a73e8",
            color: "#fff",
            fontWeight: 600,
            cursor: interactionDisabled ? "not-allowed" : "pointer",
          }}
        >
          Submit answer
        </button>
      ) : (
        <div
          style={{
            marginTop: 16,
            padding: 12,
            borderRadius: 8,
            background: result?.ok ? "#ecfdf5" : "#fef2f2",
            border: `1px solid ${result?.ok ? "#bbf7d0" : "#fecaca"}`,
            color: result?.ok ? "#166534" : "#991b1b",
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          {result?.ok ? `Correct! +${result.pts} pts` : `Not quite — 0 / ${maxPts} pts`}
          {task.explanation && (
            <p style={{ marginTop: 8, fontWeight: 400, fontSize: 13, color: "#4b5563" }}>
              {stripHtml(task.explanation)}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
