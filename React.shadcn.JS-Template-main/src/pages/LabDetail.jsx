import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { toast } from "@/lib/toast";
import { useParams, Link, useSearchParams, useNavigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import api from "@/lib/axios";
import { mapApiLabToRunner } from "@/lib/mapApiLabToRunner";
import { getDemoSkillBuilderRunner } from "@/lib/demoSkillBuilderContent";
import { resolveMediaUrl } from "@/lib/mediaUrl";
import HlsVideo from "@/components/media/HlsVideo";
import SkillBuilderTaskCard from "@/components/lab/SkillBuilderTaskCard";
import {
  useGetMyLearningQuery,
  useEnrollLabMutation,
  useEnrollCourseMutation,
  useCompleteLabMutation,
  useStartLabMutation,
  useSubmitSkillBuilderMutation,
} from "@/store/api/learningApi";

/* ═══════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════ */
function formatTime(s) {
  const h = String(Math.floor(s / 3600)).padStart(2, "0");
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const sec = String(s % 60).padStart(2, "0");
  return `${h}:${m}:${sec}`;
}

function StarRating({ value = 4 }) {
  return (
    <span style={{ display: "inline-flex", gap: 2, verticalAlign: "middle" }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} width="15" height="15" viewBox="0 0 20 20">
          <polygon
            points="10,1 12.9,7 19.5,7.6 14.7,11.9 16.2,18.5 10,15 3.8,18.5 5.3,11.9 0.5,7.6 7.1,7"
            fill={i <= Math.round(value) ? "#f59e0b" : "#e5e7eb"}
          />
        </svg>
      ))}
    </span>
  );
}

/* ═══════════════════════════════════════════════════════
   BLOCK RENDERERS
═══════════════════════════════════════════════════════ */
function BlockCode({ language = "bash", code }) {
  const [copied, setCopied] = useState(false);
  return (
    <div
      style={{
        background: "#1e1e2e",
        borderRadius: 8,
        overflow: "hidden",
        margin: "12px 0",
        border: "1px solid #313244",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "6px 14px",
          background: "#181825",
          borderBottom: "1px solid #313244",
        }}
      >
        <span
          style={{
            fontSize: 11,
            color: "#89b4fa",
            fontFamily: "monospace",
            textTransform: "uppercase",
            letterSpacing: 1,
          }}
        >
          {language}
        </span>
        <button
          onClick={() => {
            navigator.clipboard.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
          style={{
            fontSize: 11,
            color: copied ? "#a6e3a1" : "#6e738d",
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "2px 8px",
            borderRadius: 4,
            transition: "color .2s",
          }}
        >
          {copied ? "✓ Copied" : "Copy"}
        </button>
      </div>
      <pre
        style={{
          margin: 0,
          padding: "14px 18px",
          overflowX: "auto",
          fontFamily: "'JetBrains Mono','Fira Code',monospace",
          fontSize: 12.5,
          lineHeight: 1.65,
          color: "#cdd6f4",
        }}
      >
        <code>{code}</code>
      </pre>
    </div>
  );
}

function decodeHtmlEntities(s) {
  if (s == null) return "";
  const str = String(s);
  // Quick path: if it doesn't look like escaped HTML, return as-is.
  if (!str.includes("&lt;") && !str.includes("&gt;") && !str.includes("&#") && !str.includes("&quot;")) return str;
  if (typeof document === "undefined") return str;
  const textarea = document.createElement("textarea");
  textarea.innerHTML = str;
  return textarea.value;
}

function BlockTable({ rows }) {
  return (
    <div style={{ overflowX: "auto", margin: "12px 0" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
        <thead>
          <tr style={{ background: "#eff6ff" }}>
            <th
              style={{
                padding: "9px 14px",
                textAlign: "left",
                borderBottom: "2px solid #bfdbfe",
                color: "#1e40af",
                fontWeight: 700,
                whiteSpace: "nowrap",
              }}
            >
              Setting
            </th>
            <th
              style={{
                padding: "9px 14px",
                textAlign: "left",
                borderBottom: "2px solid #bfdbfe",
                color: "#1e40af",
                fontWeight: 700,
              }}
            >
              Value
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([k, v], i) => (
            <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : "#f8faff" }}>
              <td
                style={{
                  padding: "8px 14px",
                  borderBottom: "1px solid #e5eaf3",
                  fontWeight: 600,
                  color: "#374151",
                  whiteSpace: "nowrap",
                }}
              >
                {k}
              </td>
              <td
                style={{
                  padding: "8px 14px",
                  borderBottom: "1px solid #e5eaf3",
                  fontFamily: "monospace",
                  color: "#1d4ed8",
                  fontSize: 13,
                }}
              >
                {v}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const BANNER_MAP = {
  info: { bg: "#eff6ff", border: "#bfdbfe", color: "#1e40af", icon: "ℹ️" },
  warning: { bg: "#fffbeb", border: "#fde68a", color: "#92400e", icon: "⚠️" },
  success: { bg: "#f0fdf4", border: "#bbf7d0", color: "#166534", icon: "✅" },
  tip: { bg: "#f5f3ff", border: "#c4b5fd", color: "#5b21b6", icon: "💡" },
};

function BlockBanner({ variant = "info", text }) {
  const c = BANNER_MAP[variant] || BANNER_MAP.info;
  return (
    <div
      style={{
        background: c.bg,
        border: `1px solid ${c.border}`,
        borderRadius: 8,
        padding: "10px 15px",
        display: "flex",
        gap: 10,
        alignItems: "flex-start",
        margin: "12px 0",
        fontSize: 13.5,
        color: c.color,
        lineHeight: 1.6,
      }}
    >
      <span style={{ flexShrink: 0 }}>{c.icon}</span>
      <span>{text}</span>
    </div>
  );
}

function BlockMedia({ src, mediaType = "image", caption, alt = "" }) {
  if (!src) return null;
  const raw = String(src).trim();
  if (raw.startsWith("blob:")) {
    return (
      <figure
        style={{
          margin: "18px 0",
          borderRadius: 10,
          overflow: "hidden",
          border: "1px solid #fecaca",
          background: "#fef2f2",
        }}
      >
        <p style={{ padding: "16px 18px", color: "#991b1b", fontSize: 13, margin: 0, lineHeight: 1.5 }}>
          This media uses a temporary browser URL and will not play after reload. Save the lab in admin after uploading
          so the file is stored on the server.
        </p>
      </figure>
    );
  }
  const url = resolveMediaUrl(src);
  if (!url) return null;
  const uniformMediaHeight = "clamp(320px, 48vh, 460px)";
  const videoStyle = {
    width: "100%",
    display: "block",
    height: uniformMediaHeight,
    objectFit: "cover",
    background: "#000",
  };
  const isHls = /\.m3u8($|\?)/i.test(url);
  return (
    <figure
      style={{
        margin: "18px 0",
        width: "100%",
        borderRadius: 10,
        overflow: "hidden",
        border: "1px solid #e5eaf3",
        background: "#f8faff",
      }}
    >
      {mediaType === "image" && (
        <img
          src={url}
          alt={alt}
          style={{
            width: "100%",
            display: "block",
            height: uniformMediaHeight,
            objectFit: "contain",
            background: "#f3f4f6",
          }}
        />
      )}
      {mediaType === "video" && isHls && <HlsVideo src={url} style={videoStyle} />}
      {mediaType === "video" && !isHls && (
        <video controls playsInline src={url} style={videoStyle} />
      )}
      {mediaType === "youtube" && (
        <div style={{ position: "relative", paddingBottom: "56.25%", height: 0 }}>
          <iframe
            src={url}
            title={caption || "Video"}
            frameBorder="0"
            allowFullScreen
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
          />
        </div>
      )}
      {caption && (
        <figcaption
          style={{
            padding: "8px 14px",
            fontSize: 12.5,
            color: "#6b7280",
            textAlign: "center",
            borderTop: "1px solid #e5eaf3",
          }}
        >
          {caption}
        </figcaption>
      )}
    </figure>
  );
}

function RenderBlock({ block }) {
  const mediaSrc = block?.src || block?.url || block?.mediaUrl || "";
  switch (block.type) {
    case "para": {
      const rawValue = block.text ?? block.html ?? block.content ?? "";
      const raw = rawValue != null ? String(rawValue) : "";
      const decoded = decodeHtmlEntities(raw);
      if (decoded.includes("<")) {
        return (
          <div
            style={{ ...T.p, marginBottom: 12 }}
            dangerouslySetInnerHTML={{ __html: decoded }}
          />
        );
      }
      return <p style={T.p}>{raw}</p>;
    }
    case "label": return <p style={T.label}>{block.text}</p>;
    case "list": return <ul style={T.ul}>{block.items.map((it, i) => <li key={i}>{it}</li>)}</ul>;
    case "code": return <BlockCode language={block.language} code={block.code} />;
    case "table": return <BlockTable rows={block.rows} />;
    case "banner": return <BlockBanner variant={block.variant} text={block.text} />;
    case "note_box":
      return (
        <div
          id={block.id}
          style={{
            margin: "18px 0",
            padding: "18px 22px",
            borderRadius: 12,
            background: block.backgroundColor || "#fef9c3",
            border: "1px solid rgba(0,0,0,.08)",
            boxShadow: "0 2px 10px rgba(17,24,39,.06)",
            fontSize: 14.5,
            lineHeight: 1.75,
            color: "#374151",
          }}
          dangerouslySetInnerHTML={{ __html: block.html || "" }}
        />
      );
    case "media":
      return <BlockMedia src={mediaSrc} mediaType={block.mediaType} caption={block.caption} alt={block.alt} />;
    case "image":
      return <BlockMedia src={mediaSrc} mediaType="image" caption={block.caption} alt={block.alt} />;
    case "video":
      return <BlockMedia src={mediaSrc} mediaType="video" caption={block.caption} alt={block.alt} />;
    case "youtube":
      return <BlockMedia src={mediaSrc} mediaType="youtube" caption={block.caption} alt={block.alt} />;
    default: return null;
  }
}

function StepCard({ step }) {
  return (
    <div
      style={{
        border: "1px solid #e5eaf3",
        borderRadius: 10,
        padding: "20px 24px",
        marginBottom: 18,
        background: "#fafbff",
        boxShadow: "0 1px 4px rgba(0,0,0,.04)",
      }}
    >
      <div id={step.id} style={{ scrollMarginTop: 16 }} />
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 14,
          paddingBottom: 12,
          borderBottom: "1px solid #eef0f6",
        }}
      >
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 26,
            height: 26,
            borderRadius: "50%",
            background: "#1a73e8",
            color: "#fff",
            fontSize: 12,
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          {step.number}
        </span>
        <strong style={{ fontSize: 15, color: "#1a1a2e" }}>{step.title}</strong>
      </div>
      {(step.content || []).map((block, i) => (
        <RenderBlock key={i} block={block} />
      ))}
      {Array.isArray(step.subSteps) &&
        step.subSteps.map((ss, si) => (
          <div
            key={ss.id || si}
            style={{
              marginTop: 14,
              paddingLeft: 12,
              borderLeft: "3px solid #c7d2fe",
            }}
          >
            {ss.title && (
              <p style={{ ...T.label, marginBottom: 6 }}>{ss.title}</p>
            )}
            {(ss.content || []).map((block, bi) => (
              <RenderBlock key={bi} block={block} />
            ))}
          </div>
        ))}
    </div>
  );
}

function SkillOverviewSection({ section }) {
  const { id, descriptionHtml, whatYouLearn, requirements, skillsTested } = section;
  return (
    <div>
      <div id={id} style={{ scrollMarginTop: 72 }} />
      <h2 style={T.h2}>Overview</h2>
      {descriptionHtml && String(descriptionHtml).trim() && (
        <div
          style={{ ...T.p, marginBottom: 16 }}
          dangerouslySetInnerHTML={{
            __html: (() => {
              const decoded = decodeHtmlEntities(descriptionHtml);
              return String(decoded).includes("<") ? decoded : `<p>${decoded}</p>`;
            })(),
          }}
        />
      )}
      {Array.isArray(skillsTested) && skillsTested.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <p style={T.label}>Skills validated</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {skillsTested.map((s) => (
              <span
                key={s}
                style={{
                  display: "inline-block",
                  padding: "4px 10px",
                  borderRadius: 999,
                  background: "#ede9fe",
                  color: "#5b21b6",
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                {s}
              </span>
            ))}
          </div>
        </div>
      )}
      {Array.isArray(whatYouLearn) && whatYouLearn.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <p style={T.label}>What you&apos;ll validate</p>
          <ul style={T.ul}>
            {whatYouLearn.map((it, i) => (
              <li key={i}>{it}</li>
            ))}
          </ul>
        </div>
      )}
      {Array.isArray(requirements) && requirements.length > 0 && (
        <div>
          <p style={T.label}>Requirements</p>
          <ul style={T.ul}>
            {requirements.map((it, i) => (
              <li key={i}>{it}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function stripHtmlShort(s, n = 120) {
  if (s == null || s === "") return "";
  const t = String(s)
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/gi, " ")
    .trim();
  return t.length > n ? `${t.slice(0, n)}…` : t;
}

function SkillBuilderLabReport({
  meta,
  earnedPoints,
  totalPts,
  taskGrades,
  sections,
  onTryAgain,
  backHref,
}) {
  const passing = Number(meta.passingScore) || 70;
  const pct = totalPts > 0 ? Math.round((earnedPoints / totalPts) * 100) : 0;
  const passed = pct >= passing;
  const skillTasks = sections.filter((s) => s.type === "skill_task");

  return (
    <div
      id="skill-builder-lab-report"
      style={{
        marginBottom: 36,
        padding: "28px 32px",
        borderRadius: 16,
        border: `1px solid ${passed ? "#bbf7d0" : "#fecaca"}`,
        background: passed ? "linear-gradient(135deg,#f0fdf4,#ecfdf5)" : "linear-gradient(135deg,#fef2f2,#fff7ed)",
        fontFamily: "'Google Sans','Segoe UI',sans-serif",
      }}
    >
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <div style={{ fontSize: 44, marginBottom: 8 }}>{passed ? "🏆" : "📚"}</div>
        <h2
          style={{
            fontSize: 26,
            fontWeight: 700,
            color: passed ? "#15803d" : "#dc2626",
            margin: "0 0 8px",
          }}
        >
          {passed ? "Lab passed!" : "Keep practicing"}
        </h2>
        <p style={{ fontSize: 15, color: passed ? "#166534" : "#991b1b", margin: 0 }}>
          {passed
            ? meta.passMessage || "You met the pass mark for this Skill Builder."
            : meta.failMessage || `Pass mark is ${passing}%. You can try again anytime.`}
        </p>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: 40,
          flexWrap: "wrap",
          marginBottom: 24,
          fontSize: 14,
          color: "#374151",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: passed ? "#15803d" : "#dc2626" }}>{pct}%</div>
          <div style={{ fontSize: 12, color: "#6b7280" }}>Score</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: "#1a1a2e" }}>
            {Math.round(earnedPoints)}/{totalPts}
          </div>
          <div style={{ fontSize: 12, color: "#6b7280" }}>Points earned</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: "#1a73e8" }}>{passing}%</div>
          <div style={{ fontSize: 12, color: "#6b7280" }}>Pass mark</div>
        </div>
      </div>

      <h3 style={{ fontSize: 15, fontWeight: 600, color: "#202124", margin: "0 0 12px" }}>Task breakdown</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {skillTasks.map((sec) => {
          const idx = sec.taskIndex;
          const g = taskGrades[idx];
          const q = stripHtmlShort(sec.task?.question, 90);
          return (
            <div
              key={idx}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "10px 14px",
                borderRadius: 8,
                border: "1px solid #e5eaf3",
                background: "#fafbff",
                fontSize: 13,
              }}
            >
              <span style={{ fontWeight: 700, color: "#6b7280", width: 24 }}>{idx + 1}</span>
              <span style={{ flex: 1, color: "#3c4043", lineHeight: 1.4 }}>{q || `Task ${idx + 1}`}</span>
              <span style={{ fontWeight: 700, color: g ? (g.ok ? "#15803d" : "#dc2626") : "#9ca3af" }}>
                {g ? `${g.earned}/${g.max}` : "—"}
              </span>
            </div>
          );
        })}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "center", marginTop: 28 }}>
        <button
          type="button"
          onClick={onTryAgain}
          style={{
            padding: "12px 24px",
            borderRadius: 8,
            border: "2px solid #dadce0",
            background: "#fff",
            fontWeight: 600,
            cursor: "pointer",
            fontSize: 14,
          }}
        >
          ↺ Try again
        </button>
        <Link
          to={backHref}
          style={{
            padding: "12px 24px",
            borderRadius: 8,
            border: "2px solid #dadce0",
            background: "#fff",
            fontWeight: 600,
            fontSize: 14,
            textDecoration: "none",
            color: "#202124",
          }}
        >
          ← Back to labs
        </Link>
      </div>
    </div>
  );
}

function RenderSection({ section, onTaskGraded, onTaskAnswerSubmit, interactionDisabled, disableNewSubmits }) {
  switch (section.type) {
    case "skill_overview":
      return <SkillOverviewSection section={section} />;
    case "skill_task":
      return (
        <SkillBuilderTaskCard
          task={section.task}
          taskIndex={section.taskIndex}
          onGraded={onTaskGraded}
          onTaskAnswerSubmit={onTaskAnswerSubmit}
          disableNewSubmits={disableNewSubmits}
          interactionDisabled={interactionDisabled}
        />
      );
    case "heading": {
      const isTitle = section.level === "title";
      const isTask = section.level === "task";
      return (
        <div>
          <div id={section.id} style={{ scrollMarginTop: 16 }} />
          {isTitle ? (
            <h1
              style={{
                fontSize: 28,
                fontWeight: 700,
                color: "#202124",
                margin: "0 0 18px",
                lineHeight: 1.25,
                letterSpacing: "-0.02em",
              }}
            >
              {section.text}
            </h1>
          ) : (
            <h2 style={isTask ? T.taskH2 : T.h2}>{section.text}</h2>
          )}
        </div>
      );
    }
    case "para":
      return <RenderBlock block={section} />;
    case "list":
      return (
        <ul style={{ lineHeight: 2.3, paddingLeft: 24, color: "#3c4043", marginBottom: 20 }}>
          {section.items.map((it, i) => <li key={i}>{it}</li>)}
        </ul>
      );
    case "step":
      return <StepCard step={section} />;
    case "content":
      return (
        <div style={{ marginBottom: 20 }}>
          <div id={section.id} style={{ scrollMarginTop: 16 }} />
          {section.title && String(section.title).trim() && <h2 style={T.h2}>{section.title}</h2>}
          {(section.content || []).map((block, i) => (
            <RenderBlock key={i} block={block} />
          ))}
        </div>
      );
    case "note_box":
      return (
        <div
          id={section.id}
          style={{
            scrollMarginTop: 16,
            margin: "18px 0",
            padding: "18px 22px",
            minHeight: 92,
            borderRadius: 12,
            background: section.backgroundColor || "#fef9c3",
            border: "1px solid rgba(0,0,0,.08)",
            boxShadow: "0 2px 10px rgba(17,24,39,.06)",
            fontSize: 14.5,
            lineHeight: 1.75,
            color: "#374151",
          }}
          dangerouslySetInnerHTML={{ __html: decodeHtmlEntities(section.html) }}
        />
      );
    case "media":
      return (
        <div>
          {section.id && <div id={section.id} style={{ scrollMarginTop: 16 }} />}
          <BlockMedia
            src={section.src || section.url || section.mediaUrl || ""}
            mediaType={section.mediaType}
            caption={section.caption}
            alt={section.alt}
          />
        </div>
      );
    case "congrats":
      return (
        <div>
          <div id="congratulations" style={{ scrollMarginTop: 16 }} />
          <div
            style={{
              background: "#f0fdf4",
              border: "1px solid #bbf7d0",
              borderRadius: 12,
              padding: "36px 40px",
              textAlign: "center",
              marginTop: 20,
            }}
          >
            <div style={{ fontSize: 52, marginBottom: 14 }}>🎉</div>
            <h2 style={{ fontSize: 26, fontWeight: 600, color: "#15803d", margin: "0 0 12px" }}>
              Congratulations!
            </h2>
            <p
              style={{
                color: "#166534",
                fontSize: 15,
                lineHeight: 1.7,
                maxWidth: 520,
                margin: "0 auto 20px",
              }}
            >
              You have successfully completed <strong>{section.labCode}</strong>.
            </p>
            <p
              style={{
                color: "#4b5563",
                fontSize: 14,
                lineHeight: 1.7,
                maxWidth: 540,
                margin: "0 auto 24px",
              }}
            >
              {section.summary}
            </p>
            <div
              style={{
                display: "inline-block",
                background: "#dcfce7",
                borderRadius: 8,
                padding: "12px 28px",
                fontWeight: 700,
                color: "#15803d",
                fontSize: 15,
              }}
            >
              🏆 Lab Complete — {section.labCode}
            </div>
          </div>
        </div>
      );
    default:
      return null;
  }
}

/* ═══════════════════════════════════════════════════════
   LOADING SKELETON
═══════════════════════════════════════════════════════ */
function Skeleton() {
  return (
    <div
      style={{
        display: "flex",
        height: `calc(100vh - ${NAVBAR_H}px)`,
        marginTop: NAVBAR_H,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: 252,
          borderRight: "1px solid #e0e0e0",
          padding: 18,
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        {[80, 55, 40, 100, 40, 80, 60].map((w, i) => (
          <div
            key={i}
            style={{
              height: 13,
              background: "#f1f3f4",
              borderRadius: 4,
              width: `${w}%`,
              animation: "pulse 1.5s ease-in-out infinite",
              animationDelay: `${i * 0.1}s`,
            }}
          />
        ))}
      </div>
      <div
        style={{
          flex: 1,
          padding: "32px 52px",
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        <div style={{ height: 34, background: "#f1f3f4", borderRadius: 6, width: "65%" }} />
        <div style={{ height: 14, background: "#f1f3f4", borderRadius: 4, width: "38%" }} />
        <div style={{ height: 110, background: "#f1f3f4", borderRadius: 8, marginTop: 12 }} />
        {[100, 88, 93, 72, 85].map((w, i) => (
          <div key={i} style={{ height: 13, background: "#f1f3f4", borderRadius: 4, width: `${w}%` }} />
        ))}
      </div>
      <div
        style={{
          width: 232,
          borderLeft: "1px solid #e0e0e0",
          padding: 16,
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        {[90, 72, 80, 63, 76, 65, 82, 70, 60, 74].map((w, i) => (
          <div key={i} style={{ height: 12, background: "#f1f3f4", borderRadius: 4, width: `${w}%` }} />
        ))}
      </div>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.45}}`}</style>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   CONSTANTS
   ─ NAVBAR_H : height of your fixed top navbar (px)
   ─ FOOTER_H : height of your fixed bottom footer (px)
             set to 0 if your footer is NOT position:fixed
═══════════════════════════════════════════════════════ */
const NAVBAR_H = 64;
const FOOTER_H = 0; // ← FIXED: was 280, which caused content to hide behind footer

function buildFallbackTocFromSections(sections = []) {
  const out = [];
  const push = (item) => {
    if (!item?.id || out.some((x) => x.id === item.id)) return;
    out.push(item);
  };
  push({ id: "overview", label: "Overview", indent: false, isTask: false });
  sections.forEach((s, i) => {
    if (s?.type === "skill_task") {
      push({
        id: s.id || `task-${i}`,
        label: `Task ${Number(s.taskIndex) + 1}: ${stripHtmlShort(s?.task?.question || "", 48) || "Task"}`,
        indent: true,
        isTask: true,
      });
      return;
    }
    if (s?.type === "heading" && s.id) {
      push({
        id: s.id,
        label: s.text || `Section ${i + 1}`,
        indent: s.level !== "title",
        isTask: s.level === "task",
      });
      return;
    }
    if (s?.type === "step" && s.id) {
      push({
        id: s.id,
        label: s.title || `Step ${s.number || i + 1}`,
        indent: true,
        isTask: false,
      });
      return;
    }
    if (s?.id && s?.title) {
      push({ id: s.id, label: s.title, indent: true, isTask: false });
    }
  });
  return out;
}

function mergeToc(primary = [], fallback = []) {
  const merged = [];
  const seen = new Set();
  const push = (item) => {
    if (!item?.id || seen.has(item.id)) return;
    seen.add(item.id);
    merged.push(item);
  };
  primary.forEach(push);
  fallback.forEach(push);
  return merged;
}

function getInitialTocId(runner) {
  const toc = Array.isArray(runner?.toc) && runner.toc.length
    ? runner.toc
    : buildFallbackTocFromSections(runner?.sections || []);
  return toc[0]?.id || "";
}

export default function LabDetailPage() {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isApprovalPreview = location.pathname.startsWith("/approval-preview/");
  const fromCourse = searchParams.get("fromCourse") || "";
  const isSkillLabsRoute = location.pathname.startsWith("/skill-labs/");
  const isAuthenticated = useSelector((s) => s.auth?.isAuthenticated);
  const user = useSelector((s) => s.auth?.user);
  const userId = user?.user_id || user?.id || "";
  const bundleTimerKey =
    fromCourse && userId ? `pm_lab_bundle_timer:${fromCourse}:${userId}` : null;

  const { data: learningRes } = useGetMyLearningQuery(undefined, {
    skip: !isAuthenticated,
  });
  const learningPayload = learningRes?.data ?? learningRes;
  const myCourses = learningPayload?.courses ?? [];
  const myLabs = learningPayload?.labs ?? [];
  const [enrollLab, { isLoading: enrollingLab }] = useEnrollLabMutation();
  const [enrollCourse, { isLoading: enrollingCourse }] = useEnrollCourseMutation();
  const [completeLab, { isLoading: completingLab }] = useCompleteLabMutation();
  const [startLab] = useStartLabMutation();
  const [submitSkillBuilder, { isLoading: submittingLab }] = useSubmitSkillBuilderMutation();

  const [lab, setLab] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timerSec, setTimerSec] = useState(3600);
  const [running, setRunning] = useState(false);
  const [started, setStarted] = useState(false);
  // Server-authoritative deadline (ms epoch) + time-up flag for the lab timer.
  const [serverDeadlineMs, setServerDeadlineMs] = useState(null);
  const [timeUp, setTimeUp] = useState(false);
  const [activeId, setActiveId] = useState("");
  const [setupOpen, setSetupOpen] = useState(false);
  const [earnedPoints, setEarnedPoints] = useState(0);
  const [taskGrades, setTaskGrades] = useState({});
  const [sessionSubmitted, setSessionSubmitted] = useState(false);
  const [sessionRemountKey, setSessionRemountKey] = useState(0);
  const answersRef = useRef({});
  const [courseLabSlugs, setCourseLabSlugs] = useState([]);
  const [nextLabSlug, setNextLabSlug] = useState(null);

  const labId = lab?.labId;
  const courseId = lab?.courseId;

  const handleTaskGraded = useCallback(({ index, earned, max, ok }) => {
    setEarnedPoints((p) => p + (Number(earned) || 0));
    setTaskGrades((prev) => ({ ...prev, [index]: { earned, max, ok } }));
  }, []);

  const onTaskAnswerSubmit = useCallback(({ taskId, answer }) => {
    answersRef.current = { ...answersRef.current, [taskId]: answer };
  }, []);

  const handleSubmitLabSession = useCallback(async () => {
    setSessionSubmitted(true);
    setRunning(false);
    const m = lab?.meta;
    if (!m?.isSkillBuilder) return;
    const tp = m.totalPoints ?? 100;
    const ep = earnedPoints;
    const passing = Number(m.passingScore) || 70;
    const pct = tp > 0 ? Math.round((ep / tp) * 100) : 0;
    const passed = pct >= passing;

    if (slug !== "demo" && lab?.labId && isAuthenticated) {
      try {
        const res = await submitSkillBuilder({ labId: lab.labId, answers: answersRef.current }).unwrap();
        const inner = res?.data ?? res;
        toast.success(inner?.passed || passed ? "Passed — progress saved" : "Score saved to your profile");
      } catch (e) {
        toast.error(e?.data?.message || e?.message || "Could not save score");
      }
    } else if (slug === "demo") {
      toast.info("Demo only — open a published Skill Builder lab and sign in to save scores.");
    }

    setTimeout(() => {
      document.getElementById("skill-builder-lab-report")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  }, [lab?.meta, lab?.labId, slug, isAuthenticated, earnedPoints, submitSkillBuilder]);

  const handleTryLabAgain = useCallback(() => {
    setSessionSubmitted(false);
    setEarnedPoints(0);
    setTaskGrades({});
    answersRef.current = {};
    setSessionRemountKey((k) => k + 1);
    setRunning(false);
    setStarted(false);
    setTimerSec(lab?.meta?.timerSec ?? 3600);
  }, [lab?.meta?.timerSec]);

  useEffect(() => {
    if (slug === "demo") return;
    if (isAuthenticated) return;
    setStarted(false);
    setRunning(false);
    setEarnedPoints(0);
    setTaskGrades({});
    setSessionSubmitted(false);
    answersRef.current = {};
  }, [slug, isAuthenticated]);

  useEffect(() => {
    if (slug === "demo") return;
    if (!lab || isAuthenticated) return;
    setTimerSec(lab.meta.timerSec);
  }, [slug, isAuthenticated, lab]);

  const goToLoginToStart = useCallback(() => {
    navigate("/auth/login", { state: { from: location } });
  }, [navigate, location]);

  const totalPts = lab?.meta?.totalPoints ?? 100;
  const scoreLabel =
    lab?.meta?.isSkillBuilder ? `${Math.round(earnedPoints)}/${totalPts}` : "—/100";

  const hasAccessToRun = useMemo(() => {
    if (slug === "demo") return true;
    if (!labId) return true;
    const lid = String(labId);
    if (myLabs.some((l) => String(l.labId) === lid)) return true;
    const cid = courseId != null && courseId !== "" ? String(courseId) : "";
    if (cid && myCourses.some((c) => String(c.courseId) === cid)) return true;
    if (fromCourse && myCourses.some((c) => c.slug === fromCourse)) return true;
    return false;
  }, [slug, labId, courseId, myLabs, myCourses, fromCourse]);

  const needsEnroll = Boolean(isAuthenticated && labId && !hasAccessToRun);

  const savedLabProgress = useMemo(() => {
    const row = myLabs.find((l) => String(l.labId) === String(labId));
    return row?.progress ?? 0;
  }, [myLabs, labId]);

  const enrolling = enrollingLab || enrollingCourse;

  const markCurrentLabComplete = useCallback(async () => {
    if (!labId || slug === "demo") return;
    try {
      await completeLab(labId).unwrap();
    } catch {
      /* already complete or network — still allow navigation */
    }
  }, [slug, labId, completeLab]);

  const handleEnrollStandalone = useCallback(async () => {
    if (!labId) return;
    const isFree = lab?.meta?.isFree !== false;
    try {
      await enrollLab({
        labId,
        confirmPurchase: !isFree,
        orderId: undefined,
      }).unwrap();
    } catch {
      /* toast from RTK meta */
    }
  }, [labId, lab?.meta?.isFree, enrollLab]);

  const handleEnrollInCourse = useCallback(async () => {
    if (!courseId) return;
    try {
      await enrollCourse({ courseId, confirmPurchase: false }).unwrap();
    } catch {
      /* Paid or other errors — toast from RTK meta; user may need checkout */
    }
  }, [courseId, enrollCourse]);

  /* Load lab data — API only (demo slug uses in-memory demo runner) */
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setActiveId("");

    function readBundleTimerRestore() {
      if (!bundleTimerKey) return null;
      try {
        const raw = sessionStorage.getItem(bundleTimerKey);
        if (!raw) return null;
        const o = JSON.parse(raw);
        if (o && typeof o.timerSec === "number" && o.started) return o;
      } catch {
        /* ignore */
      }
      return null;
    }

    async function load() {
      const bundleRestore = readBundleTimerRestore();

      if (slug === "demo") {
        const fromDemo = getDemoSkillBuilderRunner();
        if (!cancelled && fromDemo) {
          setLab(fromDemo);
          setEarnedPoints(0);
          setTaskGrades({});
          setSessionSubmitted(false);
          answersRef.current = {};
          setSessionRemountKey((k) => k + 1);
          if (bundleRestore) {
            setTimerSec(bundleRestore.timerSec);
            setStarted(!!bundleRestore.started);
            setRunning(!!bundleRestore.running);
          } else {
            setTimerSec(fromDemo.meta.timerSec);
            setStarted(false);
            setRunning(false);
          }
          setActiveId(getInitialTocId(fromDemo));
        }
        setLoading(false);
        return;
      }

      try {
        const res = await api.get(`/labs/slug/${encodeURIComponent(slug)}`, { withCredentials: true });
        const raw = res?.data?.data?.lab || res?.data?.lab;
        const fromApi = raw ? mapApiLabToRunner(raw) : null;
        if (!cancelled && fromApi) {
          setLab(fromApi);
          setEarnedPoints(0);
          setTaskGrades({});
          setSessionSubmitted(false);
          answersRef.current = {};
          setSessionRemountKey((k) => k + 1);
          if (bundleRestore) {
            setTimerSec(bundleRestore.timerSec);
            setStarted(!!bundleRestore.started);
            setRunning(!!bundleRestore.running);
          } else {
            setTimerSec(fromApi.meta.timerSec);
            setStarted(false);
            setRunning(false);
          }
          setActiveId(getInitialTocId(fromApi));
          setLoading(false);
          return;
        }
      } catch {
        /* no static fallback — show not found */
      }
      if (!cancelled) {
        setLab(null);
        setLoading(false);
      }
    }

    if (slug) load();
    else setLoading(false);
    return () => {
      cancelled = true;
    };
  }, [slug, bundleTimerKey]);

  /* Persist bundle timer when navigating course labs (?fromCourse=) */
  useEffect(() => {
    if (!bundleTimerKey || !started) return;
    try {
      sessionStorage.setItem(
        bundleTimerKey,
        JSON.stringify({ timerSec, started, running })
      );
    } catch {
      /* ignore */
    }
  }, [bundleTimerKey, started, timerSec, running]);

  /* Auto-start the server-authoritative lab timer when an enrolled user opens
     the lab. started_at is recorded on the backend (idempotent), and we count
     down to started_at + time_limit_minutes — so it survives refresh. */
  useEffect(() => {
    if (slug === "demo") return;
    if (!isAuthenticated || !labId || !hasAccessToRun) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await startLab(labId).unwrap();
        const timer = (res?.data ?? res)?.timer;
        if (cancelled || !timer) return;
        // No time limit configured → leave the existing display untouched.
        if (timer.remainingSeconds == null || !timer.expiresAt) return;
        setServerDeadlineMs(new Date(timer.expiresAt).getTime());
        setTimerSec(Math.max(0, timer.remainingSeconds));
        setStarted(true);
        if (timer.remainingSeconds <= 0) {
          setRunning(false);
          setTimeUp(true);
        } else {
          setTimeUp(false);
          setRunning(true);
        }
      } catch {
        /* not enrolled / network — fall back to the local timer */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug, isAuthenticated, labId, hasAccessToRun, startLab]);

  /* Countdown */
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => {
      if (serverDeadlineMs) {
        // Drift-free: derive remaining from the absolute server deadline.
        const remaining = Math.max(0, Math.round((serverDeadlineMs - Date.now()) / 1000));
        setTimerSec(remaining);
        if (remaining <= 0) {
          setRunning(false);
          setTimeUp(true);
        }
      } else {
        setTimerSec((s) => Math.max(0, s - 1));
      }
    }, 1000);
    return () => clearInterval(t);
  }, [running, serverDeadlineMs]);

  const effectiveToc = useMemo(() => {
    if (!lab) return [];
    const apiToc = Array.isArray(lab.toc) ? lab.toc : [];
    const sectionToc = buildFallbackTocFromSections(lab.sections || []);
    // Keep admin-provided TOC, but append missing task/step anchors automatically.
    return mergeToc(apiToc, sectionToc);
  }, [lab]);

  /* Scrollspy */
  useEffect(() => {
    if (!effectiveToc.length) return;
    const obs = new IntersectionObserver(
      (entries) => {
        const vis = entries.filter((e) => e.isIntersecting);
        if (!vis.length) return;
        const top = vis.reduce((a, b) =>
          a.boundingClientRect.top < b.boundingClientRect.top ? a : b
        );
        setActiveId(top.target.id);
      },
      { rootMargin: "-5% 0px -88% 0px", threshold: 0 }
    );

    effectiveToc.forEach(({ id: sid }) => {
      const el = document.getElementById(sid);
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  }, [effectiveToc]);

  /* Course bundle: ordered labs for "Next lab" */
  useEffect(() => {
    let cancelled = false;
    if (!fromCourse || !slug) {
      setCourseLabSlugs([]);
      setNextLabSlug(null);
      return;
    }
    (async () => {
      try {
        const res = await api.get(`/courses/slug/${encodeURIComponent(fromCourse)}/view`, {
          withCredentials: true,
        });
        const raw = res?.data?.data;
        const payload = raw?.course && !raw.title ? raw.course : raw;
        const labs = payload?.includedLabs || [];
        const slugs = labs.map((l) => l.slug).filter(Boolean);
        if (cancelled) return;
        setCourseLabSlugs(slugs);
        const idx = slugs.indexOf(slug);
        setNextLabSlug(idx >= 0 && idx < slugs.length - 1 ? slugs[idx + 1] : null);
      } catch {
        if (!cancelled) {
          setCourseLabSlugs([]);
          setNextLabSlug(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fromCourse, slug]);

  const scrollTo = (sid) => {
    document.getElementById(sid)?.scrollIntoView({ behavior: "smooth", block: "start" });
    setActiveId(sid);
  };

  // Always start at top when opening a lab (especially next lab in a course bundle).
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [slug]);

  if (loading) return <Skeleton />;
  if (!lab)
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "60vh",
          gap: 16,
          fontFamily: "'Google Sans','Segoe UI',sans-serif",
        }}
      >
        <div style={{ fontSize: 60 }}>🔍</div>
        <h2 style={{ fontSize: 22, fontWeight: 600, color: "#202124" }}>Lab not found</h2>
        <p style={{ color: "#5f6368" }}>
          No lab with slug{" "}
          <code style={{ background: "#f1f3f4", padding: "2px 8px", borderRadius: 4 }}>{slug}</code>
        </p>
        <Link to="/labs" style={{ color: "#1a73e8", fontWeight: 600, textDecoration: "none" }}>
          ← Back to Labs
        </Link>
      </div>
    );

  const { meta, setupNotes, sections } = lab;
  const resolvedThumb = resolveMediaUrl(meta.thumbnail);
  const safeDuration = meta.duration && String(meta.duration).trim() !== ""
    ? meta.duration
    : `${Math.max(1, Math.round((meta.timerSec || 3600) / 60))} min`;
  const timerRed = timeUp || timerSec < 300;

  return (
    <>
      {/* Score badge */}
      <div
        style={{
          position: "fixed",
          top: NAVBAR_H + 12,
          right: 16,
          zIndex: 900,
          background: "#f9ab00",
          color: "#fff",
          fontWeight: 700,
          fontSize: 14,
          padding: "7px 18px",
          borderRadius: 5,
          boxShadow: "0 2px 10px rgba(0,0,0,.25)",
        }}
      >
        {scoreLabel}
      </div>

      {/*
        ── OUTER WRAPPER ──────────────────────────────────────────
        This sits below the fixed navbar and fills remaining viewport.
        The footer (if not fixed) lives OUTSIDE this component in your
        layout file, so it scrolls naturally below.
        If your footer IS position:fixed, set FOOTER_H to its real
        height (e.g. 60) and it will be subtracted correctly here.
      ────────────────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          width: "100%",
          minHeight: `calc(100vh - ${NAVBAR_H}px - ${FOOTER_H}px)`,
          marginTop: NAVBAR_H,
          marginBottom: 24,
          fontFamily: "'Google Sans','Segoe UI',sans-serif",
          fontSize: 14,
          color: "#202124",
          background: "#fff",
          overflow: "visible",
          borderBottom: "1px solid #e8eaed",
        }}
      >

        {/* ══ LEFT SIDEBAR ══ */}
        <aside
          style={{
            width: 252,
            minWidth: 252,
            flexShrink: 0,
            background: "#fff",
            borderRight: "1px solid #e0e0e0",
            display: "flex",
            flexDirection: "column",
            gap: 14,
            padding: "18px 14px",
            position: "sticky",
            top: NAVBAR_H + 8,
            maxHeight: `calc(100vh - ${NAVBAR_H + 16}px)`,
            overflowY: "auto",
            alignSelf: "flex-start",
          }}
        >
          <button
            onClick={() => setSetupOpen((o) => !o)}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              padding: "11px 13px",
              background: "#f1f3f4",
              borderRadius: 8,
              border: "none",
              cursor: "pointer",
              fontSize: 12.5,
              fontWeight: 600,
              color: "#202124",
              width: "100%",
              textAlign: "left",
              lineHeight: 1.5,
            }}
          >
            <span>
              Lab setup instructions
              <br />
              and requirements
            </span>
            <span style={{ fontSize: 16, marginLeft: 6, color: "#5f6368" }}>
              {setupOpen ? "▾" : "›"}
            </span>
          </button>

          {setupOpen && (
            <div
              style={{
                fontSize: 12.5,
                color: "#3c4043",
                lineHeight: 1.9,
                padding: "4px 4px 0",
              }}
            >
              {(setupNotes || []).map((note, i) => (
                <p key={i} style={{ margin: "0 0 6px" }}>
                  {i + 1}. {note}
                </p>
              ))}
            </div>
          )}

          <hr style={{ border: "none", borderTop: "1px solid #e0e0e0", margin: "2px 0" }} />

          {/* Timer */}
          <div style={{ textAlign: "center", padding: "6px 0" }}>
            <div
              style={{
                fontSize: 34,
                fontWeight: 700,
                letterSpacing: 3,
                color: timerRed ? "#d93025" : "#202124",
                fontFamily: "'Roboto Mono','Courier New',monospace",
                transition: "color .3s",
              }}
            >
              {formatTime(timerSec)}
            </div>
            <div style={{ fontSize: 11, color: timeUp ? "#d93025" : "#5f6368", marginTop: 3 }}>
              {timeUp
                ? "⛔ Time's up"
                : started
                  ? running
                    ? "⏱ Time remaining"
                    : "⏸ Paused"
                  : "⏱ Time limit"}
            </div>
            {timeUp && (
              <div
                style={{
                  marginTop: 8,
                  fontSize: 12,
                  color: "#d93025",
                  background: "#fce8e6",
                  border: "1px solid #f5c6c2",
                  borderRadius: 5,
                  padding: "6px 10px",
                }}
              >
                Your allotted time for this lab has ended. You can still review your work.
              </div>
            )}
          </div>

          <button
            type="button"
            disabled={(enrolling && slug !== "demo") || isApprovalPreview}
            onClick={() => {
              if (isApprovalPreview) return;
              if (slug === "demo") {
                if (started) setRunning((r) => !r);
                else {
                  setStarted(true);
                  setRunning(true);
                }
                return;
              }
              if (!isAuthenticated) {
                goToLoginToStart();
                return;
              }
              if (needsEnroll) {
                if (courseId) handleEnrollInCourse();
                else handleEnrollStandalone();
                return;
              }
              if (started) setRunning((r) => !r);
              else {
                setStarted(true);
                setRunning(true);
              }
            }}
            style={{
              padding: "11px 0",
              borderRadius: 5,
              fontWeight: 700,
              fontSize: 14,
              cursor: enrolling ? "wait" : "pointer",
              width: "100%",
              border: "none",
              transition: "background .2s",
              background: started ? (running ? "#ea4335" : "#34a853") : "#1a73e8",
              color: "#fff",
              opacity: enrolling ? 0.85 : 1,
            }}
          >
            {slug === "demo"
              ? started
                ? running
                  ? "⏸  Pause Lab"
                  : "▶  Resume Lab"
                : "Start Lab"
              : isApprovalPreview
                ? "Approval preview (start/enroll disabled)"
                : !isAuthenticated
                  ? "Sign in to start lab"
                  : needsEnroll
                    ? courseId
                      ? "Enroll in course"
                      : "Enroll"
                    : started
                      ? running
                        ? "⏸  Pause Lab"
                        : "▶  Resume Lab"
                      : savedLabProgress > 0
                        ? "Continue lab"
                        : "Start Lab"}
          </button>

          {started && meta.isSkillBuilder && !sessionSubmitted && (
            <button
              type="button"
              disabled={submittingLab}
              onClick={handleSubmitLabSession}
              style={{
                padding: "11px 0",
                borderRadius: 5,
                fontWeight: 700,
                fontSize: 14,
                cursor: submittingLab ? "wait" : "pointer",
                width: "100%",
                border: "none",
                transition: "background .2s",
                background: "#1a73e8",
                color: "#fff",
                opacity: submittingLab ? 0.85 : 1,
              }}
            >
              {submittingLab ? "Submitting…" : "✓ Submit Lab"}
            </button>
          )}

          {!isAuthenticated && slug !== "demo" && !isApprovalPreview && (
            <p style={{ margin: 0, fontSize: 12, color: "#5f6368", lineHeight: 1.45, textAlign: "center" }}>
              Timer and lab progress require an account.
            </p>
          )}
          {isAuthenticated && needsEnroll && !isApprovalPreview && (
            <p style={{ margin: 0, fontSize: 12, color: "#5f6368", lineHeight: 1.45, textAlign: "center" }}>
              {courseId
                ? "Enroll in the course to access this lab, then you can start the timer."
                : "Enroll to add this lab to My Learning and unlock the runner."}
            </p>
          )}
          {isApprovalPreview && (
            <p style={{ margin: 0, fontSize: 12, color: "#5f6368", lineHeight: 1.45, textAlign: "center" }}>
              Approval preview mode: enroll, purchase, and lab run actions are disabled.
            </p>
          )}

          {started && (
            <button
              onClick={() => {
                setTimerSec(meta.timerSec);
                setRunning(false);
                setStarted(false);
                if (meta.isSkillBuilder) {
                  setEarnedPoints(0);
                  setTaskGrades({});
                  setSessionSubmitted(false);
                  answersRef.current = {};
                  setSessionRemountKey((k) => k + 1);
                }
              }}
              style={{
                background: "none",
                border: "1px solid #dadce0",
                borderRadius: 5,
                padding: "7px",
                fontSize: 12,
                cursor: "pointer",
                color: "#5f6368",
              }}
            >
              ↺ Reset Lab
            </button>
          )}

          <hr style={{ border: "none", borderTop: "1px solid #e0e0e0", margin: "2px 0" }} />

          <div style={{ fontSize: 12.5, color: "#5f6368", lineHeight: 2.1 }}>
            <div>📋 Lab &nbsp;·&nbsp; {meta.credits}</div>
            <div>⏱ {safeDuration}</div>
            <div>📈 {meta.level}</div>
            <div>☁️ {meta.platform}</div>
            <div style={{ marginTop: 4 }}>
              <StarRating value={meta.rating} />
            </div>
          </div>
        </aside>

        {/* ══ CENTER CONTENT ══ */}
        <main
          style={{
            flex: 1,
            width: "100%",
            overflow: "visible",
            padding: "28px 32px 72px",
          }}
        >
          <div id="overview" style={{ scrollMarginTop: 16 }} />
          {/* Lab header */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ display: "grid", gridTemplateColumns: "7fr 3fr", gap: 30, alignItems: "start" }}>
              <div>
                <h1
                  style={{
                    fontSize: 46,
                    fontWeight: 700,
                    lineHeight: 1.1,
                    color: "#111827",
                    margin: "0 0 14px",
                    letterSpacing: "-0.03em",
                  }}
                >
                  {meta.title}
                </h1>
                {!meta.isSkillBuilder && meta.description && String(meta.description).trim() && !String(meta.description).includes("<") && (
                  <p style={{ marginTop: 14, fontSize: 16, color: "#374151", lineHeight: 1.7, maxWidth: 760 }}>
                    {meta.description}
                  </p>
                )}
                {!meta.isSkillBuilder && meta.description && String(meta.description).includes("<") && (
                  <div
                    style={{ marginTop: 14, fontSize: 16, color: "#374151", lineHeight: 1.7, maxWidth: 760 }}
                    dangerouslySetInnerHTML={{ __html: decodeHtmlEntities(meta.description) }}
                  />
                )}
                {/* Enroll/Start button moved here below content */}
                <div style={{ marginTop: 20 }}>
                  <button
                    type="button"
                    disabled={(!isAuthenticated && slug !== "demo") || (needsEnroll && !isAuthenticated)}
                    onClick={() => {
                      if (slug === "demo") {
                        if (started) {
                          setRunning((r) => !r);
                        } else {
                          setStarted(true);
                          setRunning(true);
                        }
                        return;
                      }
                      if (!isAuthenticated) {
                        navigate("/auth/login", { state: { from: location } });
                        return;
                      }
                      if (needsEnroll) {
                        if (courseId) {
                          handleEnrollInCourse();
                        } else {
                          handleEnrollStandalone();
                        }
                        return;
                      }
                      if (started) {
                        setRunning((r) => !r);
                      } else {
                        setStarted(true);
                        setRunning(true);
                      }
                    }}
                    style={{
                      padding: "12px 28px",
                      borderRadius: 8,
                      fontWeight: 700,
                      fontSize: 15,
                      cursor: "pointer",
                      border: "none",
                      transition: "background .2s",
                      background: "#1a73e8",
                      color: "#fff",
                      boxShadow: "0 2px 8px rgba(26, 115, 232, .3)"
                    }}
                  >
                    {slug === "demo" ? "Start Demo" : !isAuthenticated ? "Sign in to start" : needsEnroll ? "Enroll Now" : started ? (running ? "Pause Lab" : "Resume Lab") : "Start Lab"}
                  </button>
                </div>
              </div>
              <div style={{ borderRadius: 20, overflow: "hidden", border: "2px solid #e5e7eb", background: "#f9fafb", padding: 8 }}>
                {resolvedThumb ? (
                  <img
                    src={resolvedThumb}
                    alt={meta.title}
                    style={{ width: "100%", height: 260, objectFit: "cover", display: "block", borderRadius: 16 }}
                  />
                ) : (
                  <div style={{ height: 260, display: "grid", placeItems: "center", color: "#6b7280", fontSize: 14, borderRadius: 16, background: "#f3f4f6" }}>
                    Thumbnail not available
                  </div>
                )}
              </div>
            </div>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 18,
                alignItems: "center",
                fontSize: 13,
                color: "#3c4043",
                marginBottom: 14,
              }}
            >
              {meta.isSkillBuilder ? (
                <span
                  style={{
                    background: "#d97706",
                    color: "#fff",
                    padding: "2px 10px",
                    borderRadius: 999,
                    fontWeight: 700,
                    fontSize: 12,
                  }}
                >
                  Skill Builder
                </span>
              ) : (
                <span>🧪 Lab</span>
              )}
              <span>⏱ {safeDuration}</span>
              <span>💳 {meta.credits}</span>
              <span>📈 {meta.level}</span>
              <span>☁️ {meta.platform}</span>
            </div>
            <div style={{ marginBottom: 14 }}>
              <StarRating value={meta.rating} />
            </div>
            <div
              style={{
                background: "#eff6ff",
                border: "1px solid #bfdbfe",
                borderRadius: 8,
                padding: "10px 15px",
                display: "flex",
                gap: 10,
                fontSize: 13.5,
                color: "#1e40af",
                marginBottom: 18,
              }}
            >
              <span>ℹ️</span>
              <span>This lab may incorporate AI tools to support your learning.</span>
            </div>
            <div style={{ fontWeight: 700, fontSize: 15, color: "#202124", marginBottom: 3 }}>
              {meta.code}
            </div>
            <div style={{ fontSize: 13, color: "#5f6368" }}>ALAR Cloud Training Labs</div>
          </div>

          <hr style={{ border: "none", borderTop: "1px solid #e0e0e0", margin: "0 0 36px" }} />

          {sessionSubmitted && meta.isSkillBuilder && (
            <SkillBuilderLabReport
              meta={meta}
              earnedPoints={earnedPoints}
              totalPts={totalPts}
              taskGrades={taskGrades}
              sections={sections}
              onTryAgain={handleTryLabAgain}
              backHref={isSkillLabsRoute ? "/skill-labs" : "/labs"}
            />
          )}

          {sections.map((section, i) => (
            <RenderSection
              key={`${sessionRemountKey}-${i}`}
              section={section}
              onTaskGraded={handleTaskGraded}
              onTaskAnswerSubmit={onTaskAnswerSubmit}
              disableNewSubmits={sessionSubmitted}
              interactionDisabled={
                slug === "demo"
                  ? false
                  : !isAuthenticated || (!!labId && !hasAccessToRun)
              }
            />
          ))}

          {fromCourse && started && hasAccessToRun && (
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                marginTop: 28,
                paddingTop: 18,
                borderTop: "1px solid #e5e7eb",
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                {nextLabSlug ? (
                  <>
                    <button
                      type="button"
                      disabled={completingLab}
                      onClick={async () => {
                        await markCurrentLabComplete();
                        const nextUrl = isSkillLabsRoute
                          ? `/skill-labs/${encodeURIComponent(nextLabSlug)}?fromCourse=${encodeURIComponent(fromCourse)}`
                          : `/labs/${encodeURIComponent(nextLabSlug)}/start?fromCourse=${encodeURIComponent(fromCourse)}`;
                        navigate(nextUrl);
                      }}
                      style={{
                        padding: "12px 18px",
                        borderRadius: 8,
                        border: "none",
                        background: "#0d9488",
                        color: "#fff",
                        fontWeight: 700,
                        cursor: completingLab ? "wait" : "pointer",
                        fontSize: 14,
                        boxShadow: "0 2px 12px rgba(0,0,0,.15)",
                        opacity: completingLab ? 0.85 : 1,
                      }}
                    >
                      {completingLab ? "Saving…" : "Next lab in course →"}
                    </button>
                    <span style={{ fontSize: 12, color: "#5f6368", textAlign: "right", lineHeight: 1.35 }}>
                      {courseLabSlugs.length} labs in bundle
                    </span>
                  </>
                ) : (
                  <button
                    type="button"
                    disabled={completingLab}
                    onClick={async () => {
                      await markCurrentLabComplete();
                      navigate(`/courses/${encodeURIComponent(fromCourse)}`);
                    }}
                    style={{
                      padding: "12px 18px",
                      borderRadius: 8,
                      border: "none",
                      background: "#1d4ed8",
                      color: "#fff",
                      fontWeight: 700,
                      cursor: completingLab ? "wait" : "pointer",
                      fontSize: 14,
                      boxShadow: "0 2px 12px rgba(0,0,0,.15)",
                      opacity: completingLab ? 0.85 : 1,
                    }}
                  >
                    {completingLab ? "Saving…" : "Complete lab & return to course"}
                  </button>
                )}
              </div>
            </div>
          )}
        </main>

        {/* ══ RIGHT TOC ══ */}
        <nav
          style={{
            width: 232,
            minWidth: 232,
            flexShrink: 0,
            borderLeft: "1px solid #e0e0e0",
            position: "sticky",
            top: NAVBAR_H + 8,
            maxHeight: `calc(100vh - ${NAVBAR_H + 16}px)`,
            overflowY: "auto",
            alignSelf: "flex-start",
            padding: "0 0 20px",
          }}
        >
          <div
            style={{
              fontSize: 10.5,
              fontWeight: 700,
              color: "#1a73e8",
              letterSpacing: 0.8,
              textTransform: "uppercase",
              padding: "16px 18px 12px",
              borderBottom: "1px solid #e0e0e0",
              marginBottom: 6,
            }}
          >
            Lab instructions and tasks
          </div>

          {effectiveToc.map(({ id: sid, label, indent, isTask }) => {
            const isActive = activeId === sid;
            return (
              <button
                key={sid}
                onClick={() => scrollTo(sid)}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  fontSize: indent ? 12.5 : 13,
                  fontWeight: isActive ? 700 : isTask ? 600 : 400,
                  color: isActive ? "#1a73e8" : isTask ? "#202124" : "#3c4043",
                  background: isActive ? "#e8f0fe" : "transparent",
                  borderRight: isActive ? "3px solid #1a73e8" : "3px solid transparent",
                  border: "none",
                  cursor: "pointer",
                  lineHeight: 1.45,
                  transition: "all .15s",
                  padding: `${indent ? 6 : 8}px 18px`,
                  paddingLeft: indent ? 28 : 18,
                }}
              >
                {isTask && !isActive && (
                  <span style={{ color: "#9aa0a6", marginRight: 6, fontSize: 10 }}>▸</span>
                )}
                {label}
              </button>
            );
          })}
        </nav>
      </div>
    </>
  );
}

/* ── Shared text styles ── */
const T = {
  h2: { fontSize: 22, fontWeight: 600, color: "#202124", margin: "0 0 14px", paddingBottom: 10, borderBottom: "1px solid #e0e0e0" },
  taskH2: { fontSize: 22, fontWeight: 700, color: "#1a1a2e", margin: "8px 0 10px", paddingBottom: 10, borderBottom: "2px solid #1a73e8" },
  p: { lineHeight: 1.75, color: "#3c4043", marginBottom: 10, marginTop: 0 },
  label: { fontSize: 12, fontWeight: 700, color: "#5f6368", textTransform: "uppercase", letterSpacing: 0.5, margin: "12px 0 4px" },
  ul: { paddingLeft: 22, lineHeight: 2.1, color: "#3c4043", margin: "4px 0 8px" },
};