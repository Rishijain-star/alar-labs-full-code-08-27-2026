import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Link, useNavigate, useParams, useLocation } from "react-router-dom";
import {
  ArrowLeft, CheckCircle2,
  Play, FileText, Code2, HelpCircle, Copy,
  AlertCircle, BookOpen, Zap, FlaskConical, ClipboardList, Download, ExternalLink, AlertTriangle, Info
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import api from "@/lib/axios";
import { useGetLabViewQuery } from "@/store/api/labApi";
import { useGetCourseSlugViewQuery } from "@/store/api/courseApi";
import { useApprovalPreviewMode } from "@/lib/approvalPreview";
import { useSiteTopbar } from "@/hooks/useSiteTopbar";
import { siteStickyBelowNavClass } from "@/lib/siteHeaderLayout";
import HlsVideo from "@/components/media/HlsVideo";
import RichTextContent from "@/components/learning/RichTextContent";
import { getRichTextBlockTitle } from "@/lib/richTextUtils";
import { resolveMediaUrl } from "@/lib/mediaUrl";
import {
  isInteractiveBlock,
  getBlockDisplayTitle,
  getLessonContentLabel,
  progressStorageKey,
  loadBlockProgress,
  saveBlockProgress,
  normalizeModules,
  flattenLessonBlocks,
  computeInteractiveProgress,
  computeGradingSummary,
  isCertificateEligible,
  resolveContentKind,
  CONTENT_KIND_META,
  isLinkedLabLesson,
  buildLabCompletionMap,
  isLessonComplete,
  computeCourseLessonProgress,
} from "@/lib/learningProgress";
import LearningProgressSidebar from "@/components/learning/LearningProgressSidebar";
import LearningModuleSidebar from "@/components/learning/LearningModuleSidebar";
import LabTimer from "@/components/learning/LabTimer";

async function gradeBlockOnServer({ entityId, blockId, answer, isCourse, labId }) {
  const targetLabId = labId || (!isCourse ? entityId : null);
  const path = targetLabId
    ? `/me/labs/${targetLabId}/check-block`
    : `/me/courses/${entityId}/check-block`;
  const res = await api.post(
    path,
    { blockId, answer },
    { withCredentials: true }
  );
  return res?.data?.data || res?.data || {};
}

const UNIFORM_MEDIA_HEIGHT = "clamp(280px, 42vh, 420px)";

const BLOCK_TYPES = [
  { id: "video", label: "Videos", icon: Play, color: "text-blue-600", bg: "bg-blue-50" },
  { id: "richText", label: "Text / Docs", icon: FileText, color: "text-slate-600", bg: "bg-slate-100" },
  { id: "image", label: "Images", icon: FileText, color: "text-indigo-600", bg: "bg-indigo-50" },
  { id: "quiz", label: "Quizzes", icon: HelpCircle, color: "text-yellow-600", bg: "bg-yellow-50" },
  { id: "code", label: "Codes", icon: Code2, color: "text-green-600", bg: "bg-green-50" },
  { id: "codeSnippet", label: "Code Snippets", icon: Code2, color: "text-cyan-600", bg: "bg-cyan-50" },
  { id: "pdf", label: "PDF", icon: FileText, color: "text-red-600", bg: "bg-red-50" },
  { id: "alert", label: "Alerts", icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-50" },
  { id: "externalLink", label: "Links", icon: ExternalLink, color: "text-violet-600", bg: "bg-violet-50" },
  { id: "divider", label: "Divider", icon: FileText, color: "text-slate-400", bg: "bg-slate-50" },
  { id: "download", label: "Downloads", icon: Download, color: "text-teal-600", bg: "bg-teal-50" },
  { id: "audio", label: "Audio", icon: Play, color: "text-violet-600", bg: "bg-violet-50" },
  { id: "fillBlank", label: "Fill Blank", icon: FileText, color: "text-orange-600", bg: "bg-orange-50" },
  { id: "project", label: "Projects", icon: Zap, color: "text-pink-600", bg: "bg-pink-50" },
  { id: "trueFalse", label: "True/False", icon: HelpCircle, color: "text-orange-600", bg: "bg-orange-50" },
];

const TypeIcon = ({ type, className = "w-3.5 h-3.5" }) => {
  const cfg = BLOCK_TYPES.find((t) => t.id === type) || BLOCK_TYPES[1];
  const Icon = cfg.icon;
  return <Icon className={cn(className, cfg.color)} />;
};

function CodeBlock({ code, language = "jsx" }) {
  const [copied, setCopied] = useState(false);
  const copy = () => navigator.clipboard.writeText(code).then(() => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  });
  return (
    <div className="bg-slate-950 rounded-xl overflow-hidden text-sm font-mono">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-800">
        <span className="text-slate-400 text-xs">{language}</span>
        <button onClick={copy} className="flex items-center gap-1.5 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md text-xs transition-colors">
          <Copy className="w-3.5 h-3.5" />
          {copied ? "✓ Copied!" : "Copy"}
        </button>
      </div>
      <pre className="p-4 overflow-x-auto text-slate-100 leading-relaxed"><code>{code}</code></pre>
    </div>
  );
}

function BlobUrlWarning() {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
      This media uses a temporary browser URL and will not work after reload. Re-save the lab in admin after uploading files.
    </div>
  );
}

function getVideoUrl(content) {
  const fromList = content.videos?.find(v => v?.url)?.url;
  return fromList || content.videoUrl || content.url || "";
}

/** Turn a YouTube/Vimeo watch URL into an embeddable iframe URL (null if not one). */
function getEmbedUrl(rawUrl) {
  const u = String(rawUrl || "").trim();
  const yt = u.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/
  );
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  const vimeo = u.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
  return null;
}

function VideoTask({ content }) {
  const rawUrl = getVideoUrl(content);
  if (!rawUrl) {
    return <p className="text-slate-500 text-sm italic">No video uploaded for this block.</p>;
  }
  if (String(rawUrl).startsWith("blob:")) {
    return <BlobUrlWarning />;
  }

  const embedUrl = getEmbedUrl(rawUrl);
  const url = resolveMediaUrl(rawUrl);
  const isHls = /\.m3u8($|\?)/i.test(url);
  const videoStyle = {
    width: "100%",
    display: "block",
    height: UNIFORM_MEDIA_HEIGHT,
    objectFit: "contain",
    background: "#0f172a",
    borderRadius: "0.75rem",
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-950">
        {embedUrl ? (
          <iframe
            src={embedUrl}
            title={content.videos?.[0]?.title || "Video"}
            style={{ width: "100%", height: UNIFORM_MEDIA_HEIGHT, display: "block", border: 0 }}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : isHls ? (
          <HlsVideo src={url} style={videoStyle} />
        ) : (
          <video controls playsInline src={url} style={videoStyle} />
        )}
      </div>
      {content.videos?.[0]?.title && (
        <p className="text-sm font-medium text-slate-800">{content.videos[0].title}</p>
      )}
      {content.description && (
        <p className="text-slate-600 text-sm leading-relaxed">{content.description}</p>
      )}
      {content.notes && (
        <p className="text-slate-500 text-xs leading-relaxed border-l-2 border-slate-200 pl-3">{content.notes}</p>
      )}
    </div>
  );
}

function AudioTask({ content }) {
  const rawUrl = content.audioUrl || content.url || content.src || "";
  if (!rawUrl) {
    return <p className="text-slate-500 text-sm italic">No audio uploaded for this block.</p>;
  }
  if (String(rawUrl).startsWith("blob:")) {
    return <BlobUrlWarning />;
  }
  const url = resolveMediaUrl(rawUrl);
  return (
    <div className="space-y-3">
      <audio controls className="w-full" src={url} />
      {content.description && (
        <p className="text-slate-600 text-sm leading-relaxed">{content.description}</p>
      )}
    </div>
  );
}

function RichTextTask({ content }) {
  const displayTitle = content.title?.trim() || getRichTextBlockTitle(content);
  const showTitle = displayTitle && displayTitle !== "Reading";
  return (
    <RichTextContent
      html={content.content || content.html || ""}
      title={showTitle ? displayTitle : null}
      showTitle={showTitle}
    />
  );
}

function ImageTask({ content }) {
  const layoutClass = {
    fullWidth: "w-full",
    centered: "mx-auto max-w-2xl",
    leftAlign: "mr-auto max-w-2xl",
    rightAlign: "ml-auto max-w-2xl",
  }[content.layout] || "w-full";

  return (
    <div className="space-y-3">
      {content.description && (
        <p className="text-slate-600 text-sm leading-relaxed">{content.description}</p>
      )}
      {content.images?.map((img, i) => {
        const rawUrl = img.url;
        if (!rawUrl) return null;
        if (String(rawUrl).startsWith("blob:")) {
          return <BlobUrlWarning key={img.id || i} />;
        }
        const url = resolveMediaUrl(rawUrl);
        return (
          <figure key={img.id || i} className={cn("rounded-xl overflow-hidden border border-slate-200 bg-slate-50", layoutClass)}>
            <img
              src={url}
              alt={img.altText || img.title || content.title || "Lab image"}
              className="w-full block object-contain bg-slate-100"
              style={{ height: UNIFORM_MEDIA_HEIGHT, maxHeight: UNIFORM_MEDIA_HEIGHT }}
            />
            {img.title && (
              <figcaption className="px-3 py-2 text-xs text-slate-500 border-t border-slate-200">{img.title}</figcaption>
            )}
          </figure>
        );
      })}
      {content.caption && <p className="text-sm text-slate-500">{content.caption}</p>}
    </div>
  );
}

function CodeSnippetTask({ content }) {
  return (
    <div className="space-y-4">
      {content.shortDescription && (
        <p className="text-slate-600 text-sm leading-relaxed">{content.shortDescription}</p>
      )}
      <CodeBlock code={content.code || ""} language={content.language || "javascript"} />
      {content.explanation && (
        <p className="text-slate-600 text-sm leading-relaxed border-l-2 border-slate-200 pl-3">{content.explanation}</p>
      )}
    </div>
  );
}

function PdfTask({ content }) {
  return (
    <div className="space-y-3">
      {content.description && (
        <p className="text-slate-600 text-sm leading-relaxed">{content.description}</p>
      )}
      {(content.files || []).map((file, i) => {
        const url = resolveMediaUrl(file.url);
        if (!url) return null;
        return (
          <a
            key={file.id || i}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-4 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors"
          >
            <FileText className="w-5 h-5 text-red-600 flex-shrink-0" />
            <span className="text-sm font-medium text-slate-800">{file.name || content.title || "PDF Document"}</span>
          </a>
        );
      })}
    </div>
  );
}

const ALERT_STYLES = {
  info: { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-900", icon: Info },
  note: { bg: "bg-indigo-50", border: "border-indigo-200", text: "text-indigo-900", icon: Info },
  warning: { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-900", icon: AlertTriangle },
  error: { bg: "bg-red-50", border: "border-red-200", text: "text-red-900", icon: AlertCircle },
  danger: { bg: "bg-red-50", border: "border-red-200", text: "text-red-900", icon: AlertCircle },
  success: { bg: "bg-green-50", border: "border-green-200", text: "text-green-900", icon: CheckCircle2 },
};

function AlertTask({ content }) {
  const typeKey = content.alertType === "danger" ? "error" : content.alertType;
  const style = ALERT_STYLES[typeKey] || ALERT_STYLES.info;
  const Icon = style.icon;
  const accent = content.accentColor?.trim();
  if (accent) {
    return (
      <div
        className="flex gap-3 p-4 rounded-xl border"
        style={{
          borderColor: accent,
          backgroundColor: `${accent}18`,
          color: accent,
        }}
      >
        <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
        <div>
          {content.title && <p className="font-semibold text-sm mb-1">{content.title}</p>}
          <p className="text-sm leading-relaxed">{content.message}</p>
        </div>
      </div>
    );
  }
  return (
    <div className={cn("flex gap-3 p-4 rounded-xl border", style.bg, style.border, style.text)}>
      <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
      <div>
        {content.title && <p className="font-semibold text-sm mb-1">{content.title}</p>}
        <p className="text-sm leading-relaxed">{content.message}</p>
      </div>
    </div>
  );
}

function ExternalLinkTask({ content }) {
  return (
    <div className="space-y-3">
      {content.description && (
        <p className="text-slate-600 text-sm leading-relaxed">{content.description}</p>
      )}
      {content.url && (
        <a href={content.url} target="_blank" rel="noopener noreferrer">
          <Button variant="outline" className="gap-2">
            <ExternalLink className="w-4 h-4" />
            {content.buttonText || "Visit Link"}
          </Button>
        </a>
      )}
    </div>
  );
}

function DividerTask({ content }) {
  return (
    <div className="py-2">
      {content.title && (
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2 text-center">{content.title}</p>
      )}
      <hr className={cn(
        "border-slate-200",
        content.style === "dashed" && "border-dashed",
        content.style === "dotted" && "border-dotted"
      )} />
    </div>
  );
}

function DownloadTask({ content }) {
  return (
    <div className="space-y-3">
      {content.shortDescription && (
        <p className="text-slate-600 text-sm leading-relaxed">{content.shortDescription}</p>
      )}
      {(content.resources || []).map((res, i) => {
        const rawUrl = res.url;
        if (!rawUrl) return null;
        if (String(rawUrl).startsWith("blob:")) {
          return <BlobUrlWarning key={res.id || i} />;
        }
        const url = resolveMediaUrl(rawUrl);
        return (
          <a
            key={res.id || i}
            href={url}
            download={res.name || undefined}
            className="flex items-center gap-3 p-4 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors"
          >
            <Download className="w-5 h-5 text-teal-600 flex-shrink-0" />
            <span className="text-sm font-medium text-slate-800">{res.name || "Download file"}</span>
          </a>
        );
      })}
    </div>
  );
}

/** Shown after submit — no correct/wrong feedback until the final report. */
function AnswerRecordedNotice() {
  return (
    <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center gap-3">
      <CheckCircle2 className="w-6 h-6 text-blue-600 flex-shrink-0" />
      <div>
        <p className="font-semibold text-sm text-slate-900">Answer recorded</p>
        <p className="text-sm text-slate-600">
          Continue when ready. Your overall performance is shown after you complete the lab.
        </p>
      </div>
    </div>
  );
}

function CodeTask({ content, taskId, completedTasks, onComplete, onTaskResult, shaking }) {
  const alreadyDone = completedTasks.has(taskId);
  const files = content.files?.length
    ? content.files
    : [{ id: "default", name: "code.js", code: content.starterCode || "" }];

  const fileKey = (file) => file.id || file.name;

  const [fileCodes, setFileCodes] = useState(() => {
    const map = {};
    files.forEach((f) => { map[fileKey(f)] = f.code || ""; });
    return map;
  });
  const [activeFileKey, setActiveFileKey] = useState(fileKey(files[0]));
  const [consoleOut, setConsoleOut] = useState("");
  const [previewHtml, setPreviewHtml] = useState("");
  const [previewRan, setPreviewRan] = useState(alreadyDone);
  const [submitted, setSubmitted] = useState(alreadyDone);
  const [feedback, setFeedback] = useState(null);
  const [hintIdx, setHintIdx] = useState(-1);
  const iframeRef = useRef(null);

  const previewType = content.previewType || "html";
  const activeFile = files.find((f) => fileKey(f) === activeFileKey) || files[0];
  const hints = content.hints || [];

  const buildPreviewDoc = () => {
    const get = (name) => {
      const f = files.find((x) => x.name === name);
      return f ? (fileCodes[fileKey(f)] || "") : "";
    };
    const html = get("index.html") || get("index.htm") || "";
    const css = get("style.css") || "";
    const js = get("script.js") || "";
    if (html.trim().startsWith("<!DOCTYPE") || html.includes("<html")) {
      let doc = html;
      if (css && !doc.includes("<style")) {
        doc = doc.replace("</head>", `<style>${css}</style></head>`);
      }
      if (js && !doc.includes("<script")) {
        doc = doc.replace("</body>", `<script>${js}<\/script></body>`);
      }
      return doc;
    }
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${css}</style></head><body>${html}<script>${js}<\/script></body></html>`;
  };

  const updateFileCode = (key, code) => {
    setFileCodes((prev) => ({ ...prev, [key]: code }));
  };

  const runConsole = () => {
    const logs = [];
    const capture = { log: (...args) => logs.push(args.map(String).join(" ")) };
    try {
      const jsFile = files.find((f) => /\.(js|javascript|jsx|ts)$/i.test(f.name)) || files[0];
      const code = fileCodes[fileKey(jsFile)] || "";
      // eslint-disable-next-line no-new-func
      const fn = new Function("console", code);
      fn(capture);
      setConsoleOut(logs.length ? logs.join("\n") : "(no output)");
    } catch (err) {
      setConsoleOut(`Error: ${err.message}`);
    }
  };

  const validateHtmlRules = (rules) => {
    const doc = new DOMParser().parseFromString(buildPreviewDoc(), "text/html");
    for (const rule of rules) {
      const el = rule.selector ? doc.querySelector(rule.selector) : null;
      if (rule.type === "elementExists" && !el) {
        return { ok: false, msg: `Missing element: ${rule.selector}` };
      }
      if (rule.type === "classExists" && el && rule.condition && !el.classList.contains(rule.condition)) {
        return { ok: false, msg: `Element ${rule.selector} is missing class "${rule.condition}"` };
      }
      if (rule.type === "textContains" && el && rule.condition && !el.textContent?.includes(rule.condition)) {
        return { ok: false, msg: `Expected text "${rule.condition}" inside ${rule.selector}` };
      }
    }
    return { ok: true, msg: "All checks passed!" };
  };

  const validateCode = () => {
    const rules = content.validationRules || [];
    if (previewType === "html" && rules.length > 0) {
      return validateHtmlRules(rules);
    }
    const hasCode = Object.values(fileCodes).some((c) => String(c).trim());
    return hasCode
      ? { ok: true, msg: "Code submitted successfully!" }
      : { ok: false, msg: "Write your code in the editor before submitting." };
  };

  const handleRunPreview = () => {
    setPreviewHtml(buildPreviewDoc());
    setPreviewRan(true);
  };

  const handleSubmit = () => {
    const hasCode = Object.values(fileCodes).some((c) => String(c).trim());
    if (!hasCode) {
      setFeedback({ ok: false, msg: "Write your code in the editor before submitting." });
      return;
    }
    const result = validateCode();
    setFeedback(result);
    setSubmitted(true);
    setPreviewRan(true);
    onTaskResult?.(taskId, {
      correct: !!result.ok,
      points: result.ok ? Number(content.xp) || 10 : 0,
    });
  };

  return (
    <div className="space-y-4">
      {content.shortDescription && (
        <p className="text-slate-600 text-sm leading-relaxed">{content.shortDescription}</p>
      )}
      {content.instructions && (
        <div className="p-4 rounded-xl border border-blue-100 bg-blue-50 text-sm text-blue-900 leading-relaxed whitespace-pre-wrap">
          {content.instructions}
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-4 min-h-[420px]">
        <div className="flex flex-col rounded-xl border border-slate-800 overflow-hidden bg-slate-950 min-h-[380px]">
          <div className="flex items-center gap-1 px-2 py-2 border-b border-slate-800 bg-slate-900 overflow-x-auto">
            {files.map((file) => {
              const key = fileKey(file);
              const active = key === activeFileKey;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActiveFileKey(key)}
                  className={cn(
                    "px-3 py-1.5 rounded-md text-xs font-mono whitespace-nowrap transition-colors",
                    active ? "bg-slate-700 text-white" : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                  )}
                >
                  {file.name}
                </button>
              );
            })}
          </div>
          <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800 bg-slate-900">
            <span className="text-xs text-slate-400 font-mono uppercase">{activeFile?.name}</span>
            <Badge variant="secondary" className="text-[10px] bg-slate-800 text-slate-300 border-slate-700">
              {previewType === "console" ? "JavaScript" : "Editor"}
            </Badge>
          </div>
          <textarea
            value={fileCodes[activeFileKey] || ""}
            onChange={(e) => updateFileCode(activeFileKey, e.target.value)}
            disabled={submitted}
            spellCheck={false}
            className="flex-1 w-full min-h-[280px] p-4 bg-slate-950 text-slate-100 font-mono text-sm leading-relaxed resize-none border-0 outline-none focus:ring-0"
            placeholder="// Write your code here..."
          />
        </div>

        <div className="flex flex-col rounded-xl border border-slate-200 overflow-hidden bg-white min-h-[380px]">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-200 bg-slate-50">
            <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
              {previewType === "console" ? "Console Output" : "Live Preview"}
            </span>
            {previewType === "html" && (
              <Button type="button" size="sm" variant="outline" onClick={handleRunPreview} className="h-7 text-xs">
                Run Preview
              </Button>
            )}
            {previewType === "console" && (
              <Button type="button" size="sm" variant="outline" onClick={runConsole} className="h-7 text-xs">
                Run Code
              </Button>
            )}
          </div>
          {previewType === "html" && (
            previewHtml ? (
              <iframe
                ref={iframeRef}
                title="Code preview"
                srcDoc={previewHtml}
                sandbox="allow-scripts allow-same-origin"
                className="flex-1 w-full min-h-[320px] bg-white"
              />
            ) : (
              <div className="flex-1 flex items-center justify-center text-sm text-slate-400 p-6 text-center">
                Click Run Preview to see your HTML/CSS/JS output
              </div>
            )
          )}
          {previewType === "console" && (
            <pre className="flex-1 p-4 m-0 text-sm font-mono text-slate-800 bg-slate-50 overflow-auto whitespace-pre-wrap min-h-[320px]">
              {consoleOut || "Click Run Code to execute your script"}
            </pre>
          )}
          {(previewType === "react" || previewType === "terminal") && (
            <div className="flex-1 flex items-center justify-center text-sm text-slate-400 p-6 text-center">
              Use HTML or Console preview type for live output in this workspace.
            </div>
          )}
        </div>
      </div>

      {hints.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setHintIdx((i) => (i + 1) % hints.length)}
            className="gap-1.5"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            {hintIdx >= 0 ? `Hint ${hintIdx + 1}/${hints.length}` : "Show hint"}
          </Button>
          {hintIdx >= 0 && hints[hintIdx]?.text && (
            <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 flex-1">
              {hints[hintIdx].text}
            </p>
          )}
        </div>
      )}

      {!submitted ? (
        <div className="space-y-3">
          <Button
            onClick={handleSubmit}
            className={cn("bg-blue-600 hover:bg-blue-700", shaking && "ring-2 ring-red-400 ring-offset-2")}
          >
            Submit Code
          </Button>
          {feedback && !feedback.ok && (
            <div className="p-4 rounded-xl border border-red-200 bg-red-50 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm font-medium text-red-900">{feedback.msg}</p>
            </div>
          )}
          {shaking && (
            <p className="text-red-600 text-sm flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              Complete the coding exercise before continuing.
            </p>
          )}
        </div>
      ) : (
        <AnswerRecordedNotice />
      )}
    </div>
  );
}

function FillBlankTask({ content, taskId, gradingContext, completedTasks, onComplete, onTaskResult, shaking }) {
  const alreadyDone = completedTasks.has(taskId);
  const [answer, setAnswer] = useState("");
  const [submitted, setSubmitted] = useState(alreadyDone);
  const [showHint, setShowHint] = useState(false);
  const [checking, setChecking] = useState(false);

  const handleSubmit = async () => {
    if (!String(answer).trim() || !gradingContext?.entityId) return;
    setChecking(true);
    try {
      const result = await gradeBlockOnServer({
        ...gradingContext,
        blockId: taskId,
        answer,
      });
      setSubmitted(true);
      onTaskResult?.(taskId, {
        correct: !!result.correct,
        points: result.correct ? Number(content.points) || 10 : 0,
      });
    } catch (e) {
      console.error("Failed to grade answer", e);
    } finally {
      setChecking(false);
    }
  };

  const blankPattern = /(___+|____+|\[blank\]|\{\{blank\}\})/i;
  const sentence = content.sentence || "";
  const hasInlineBlank = blankPattern.test(sentence);

  const renderSentence = () => {
    if (!hasInlineBlank) {
      return (
        <div className="space-y-3">
          <p className="text-slate-800 text-sm leading-relaxed font-medium">{sentence}</p>
          <Input
            value={answer}
            disabled={submitted}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Type your answer..."
            className="max-w-md"
          />
        </div>
      );
    }

    const parts = sentence.split(/(___+|____+|\[blank\]|\{\{blank\}\})/i);
    return (
      <p className="text-slate-800 text-sm leading-relaxed flex flex-wrap items-center gap-2">
        {parts.map((part, i) => (
          blankPattern.test(part) ? (
            <Input
              key={i}
              value={answer}
              disabled={submitted}
              onChange={(e) => setAnswer(e.target.value)}
              className="inline-flex w-40 h-9 font-medium"
              placeholder="?"
            />
          ) : (
            <span key={i}>{part}</span>
          )
        ))}
      </p>
    );
  };

  return (
    <div className="space-y-4">
      <div className={cn(
        "p-5 rounded-xl border transition-all",
        shaking && !completedTasks.has(taskId) ? "border-red-300 bg-red-50" : "border-slate-200 bg-white"
      )}>
        {renderSentence()}
      </div>

      {content.hint && (
        <Button type="button" variant="outline" size="sm" onClick={() => setShowHint((v) => !v)} className="gap-1.5">
          <HelpCircle className="w-3.5 h-3.5" />
          {showHint ? "Hide hint" : "Show hint"}
        </Button>
      )}
      {showHint && content.hint && (
        <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
          {content.hint}
        </p>
      )}

      {!submitted ? (
        <div>
          <Button onClick={handleSubmit} disabled={!String(answer).trim() || checking} className="bg-blue-600 hover:bg-blue-700">
            {checking ? "Saving…" : "Submit Answer"}
          </Button>
          {shaking && !String(answer).trim() && (
            <p className="text-red-600 text-sm mt-3 flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              Fill in the blank before continuing.
            </p>
          )}
        </div>
      ) : (
        <AnswerRecordedNotice />
      )}
    </div>
  );
}

function ProjectTask({ content, taskId, completedTasks, onComplete }) {
  const done = completedTasks.has(taskId);
  const [notes, setNotes] = useState("");

  return (
    <div className="space-y-5">
      {content.requirements && (
        <div>
          <h4 className="text-sm font-semibold text-slate-900 mb-2 flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-pink-600" />
            Requirements
          </h4>
          <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap bg-slate-50 border border-slate-200 rounded-xl p-4">
            {content.requirements}
          </p>
        </div>
      )}
      {content.submissionInstructions && (
        <div>
          <h4 className="text-sm font-semibold text-slate-900 mb-2">Submission Instructions</h4>
          <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
            {content.submissionInstructions}
          </p>
        </div>
      )}
      {(content.resources || []).length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-slate-900 mb-2">Resources</h4>
          <div className="space-y-2">
            {content.resources.map((res, i) => {
              const url = resolveMediaUrl(res.url);
              if (!url) return null;
              return (
                <a
                  key={res.id || i}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
                >
                  <Download className="w-4 h-4" />
                  {res.name || "Download resource"}
                </a>
              );
            })}
          </div>
        </div>
      )}
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-2">Your notes (optional)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
          placeholder="Track your progress, links, or submission details..."
          className="w-full rounded-xl border border-slate-200 p-3 text-sm text-slate-700 resize-y focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      {!done ? (
        <Button onClick={() => onComplete(taskId)} className="bg-pink-600 hover:bg-pink-700">
          Mark project complete
        </Button>
      ) : (
        <div className="p-4 rounded-xl bg-green-50 border border-green-200 flex items-center gap-3">
          <CheckCircle2 className="w-6 h-6 text-green-600" />
          <p className="font-semibold text-green-900 text-sm">Project marked complete</p>
        </div>
      )}
    </div>
  );
}

function QuizTask({ content, taskId, gradingContext, completedTasks, onComplete, onTaskResult, shaking }) {
  const alreadyDone = completedTasks.has(taskId);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(alreadyDone);
  const [checking, setChecking] = useState(false);

  const handleSubmit = async () => {
    if (answers[taskId] === undefined || !gradingContext?.entityId) return;
    setChecking(true);
    try {
      const result = await gradeBlockOnServer({
        ...gradingContext,
        blockId: taskId,
        answer: answers[taskId],
      });
      setSubmitted(true);
      onTaskResult?.(taskId, {
        correct: !!result.correct,
        points: result.correct ? Number(content.points) || 10 : 0,
      });
    } catch (e) {
      console.error("Failed to grade answer", e);
    } finally {
      setChecking(false);
    }
  };

  return (
    <div>
      <div className={cn(
        "mb-5 p-5 rounded-xl border transition-all",
        shaking && !completedTasks.has(taskId) ? "border-red-300 bg-red-50" : "border-slate-200 bg-white"
      )}>
        <p className="font-semibold text-slate-900 mb-3 text-sm">{content.question}</p>
        <div className="flex flex-col gap-2">
          {content.options?.map((opt, oi) => {
            const sel = answers[taskId] === oi;
            return (
              <button key={oi} disabled={submitted} onClick={() => !submitted && setAnswers({ ...answers, [taskId]: oi })}
                className={cn(
                  "text-left px-4 py-2.5 rounded-lg border text-sm transition-all",
                  sel ? "border-blue-500 bg-blue-50 text-blue-800 font-medium" :
                    "border-slate-200 bg-white hover:bg-slate-50 text-slate-700",
                  submitted && "cursor-default"
                )}>
                {opt}
              </button>
            );
          })}
        </div>
      </div>

      {!submitted ? (
        <div>
          <Button onClick={handleSubmit} disabled={answers[taskId] === undefined || checking}
            className={cn("mt-1", answers[taskId] !== undefined ? "bg-blue-600 hover:bg-blue-700" : "bg-slate-300 cursor-not-allowed text-slate-500")}>
            {checking ? "Saving…" : "Submit Answer"}
          </Button>
          {shaking && answers[taskId] === undefined && (
            <p className="text-red-600 text-sm mt-3 flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              Answer the question before continuing.
            </p>
          )}
        </div>
      ) : (
        <AnswerRecordedNotice />
      )}
    </div>
  );
}

function TrueFalseTask({ content, taskId, gradingContext, completedTasks, onComplete, onTaskResult, shaking }) {
  const alreadyDone = completedTasks.has(taskId);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(alreadyDone);
  const [checking, setChecking] = useState(false);

  const handleSubmit = async () => {
    if (answers[taskId] === undefined || !gradingContext?.entityId) return;
    setChecking(true);
    try {
      const result = await gradeBlockOnServer({
        ...gradingContext,
        blockId: taskId,
        answer: answers[taskId],
      });
      setSubmitted(true);
      onTaskResult?.(taskId, {
        correct: !!result.correct,
        points: result.correct ? Number(content.points) || 10 : 0,
      });
    } catch (e) {
      console.error("Failed to grade answer", e);
    } finally {
      setChecking(false);
    }
  };

  return (
    <div>
      <div className={cn(
        "mb-5 p-5 rounded-xl border transition-all",
        shaking && !completedTasks.has(taskId) ? "border-red-300 bg-red-50" : "border-slate-200 bg-white"
      )}>
        <p className="font-semibold text-slate-900 mb-4 text-sm">{content.statement}</p>
        <div className="flex gap-3">
          {[true, false].map(val => {
            const sel = answers[taskId] === val;
            return (
              <button key={String(val)} disabled={submitted} onClick={() => !submitted && setAnswers({ ...answers, [taskId]: val })}
                className={cn(
                  "flex-1 py-2.5 rounded-lg border text-sm font-semibold transition-all",
                  sel ? "border-blue-500 bg-blue-50 text-blue-800" :
                    "border-slate-200 bg-white hover:bg-slate-50 text-slate-700",
                  submitted && "cursor-default"
                )}>
                {val ? "✓ True" : "✗ False"}
              </button>
            );
          })}
        </div>
      </div>

      {!submitted ? (
        <div>
          <Button onClick={handleSubmit} disabled={answers[taskId] === undefined || checking}
            className={cn("mt-1", answers[taskId] !== undefined ? "bg-blue-600 hover:bg-blue-700" : "bg-slate-300 cursor-not-allowed text-slate-500")}>
            {checking ? "Saving…" : "Submit Answer"}
          </Button>
          {shaking && answers[taskId] === undefined && (
            <p className="text-red-600 text-sm mt-3 flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              Answer before continuing.
            </p>
          )}
        </div>
      ) : (
        <AnswerRecordedNotice />
      )}
    </div>
  );
}

function TaskRenderer({ task, gradingContext, completedTasks, onComplete, onTaskResult, shaking }) {
  const props = { taskId: task.id, gradingContext, completedTasks, onComplete, onTaskResult, shaking, content: task };
  switch (task.type) {
    case "video": return <VideoTask {...props} />;
    case "audio": return <AudioTask {...props} />;
    case "richText": return <RichTextTask {...props} />;
    case "image": return <ImageTask {...props} />;
    case "code": return <CodeTask {...props} />;
    case "codeSnippet": return <CodeSnippetTask {...props} />;
    case "pdf": return <PdfTask {...props} />;
    case "alert": return <AlertTask {...props} />;
    case "externalLink": return <ExternalLinkTask {...props} />;
    case "divider": return <DividerTask {...props} />;
    case "download": return <DownloadTask {...props} />;
    case "fillBlank": return <FillBlankTask {...props} />;
    case "project": return <ProjectTask {...props} />;
    case "quiz": return <QuizTask {...props} />;
    case "trueFalse": return <TrueFalseTask {...props} />;
    default: return <div className="text-slate-500 italic text-sm p-4">Task content coming soon.</div>;
  }
}

export default function LearningWorkspacePage({
  variant,
  slugOverride,
  approvalPreview: approvalPreviewProp = false,
  embedded = false,
}) {
  const { slug: routeSlug } = useParams();
  const slug = slugOverride || routeSlug;
  const navigate = useNavigate();
  const location = useLocation();
  const isApprovalPreview = useApprovalPreviewMode(approvalPreviewProp);
  const topbar = useSiteTopbar();
  const isCourseMode =
    variant === "course" ||
    (location.pathname.includes("/courses/") && location.pathname.includes("/learn"));

  const [completedTasks, setCompletedTasks] = useState(new Set());
  const [completedLessons, setCompletedLessons] = useState(new Set());
  const [taskResults, setTaskResults] = useState({});
  const [labCompletionByRef, setLabCompletionByRef] = useState({});
  const [currentLessonId, setCurrentLessonId] = useState(null);
  const [expandedModules, setExpandedModules] = useState({});
  const [expandedLessons, setExpandedLessons] = useState({});
  const [shakingTaskIds, setShakingTaskIds] = useState(new Set());
  const [globalShake, setGlobalShake] = useState(false);
  const [activeTaskId, setActiveTaskId] = useState(null);
  const [content, setContent] = useState(null);
  const contentRef = useRef();
  const taskRefs = useRef({});
  const observerRef = useRef(null);

  const storageKey = useMemo(() => {
    if (!slug) return null;
    return progressStorageKey(isCourseMode ? "course" : "lab", slug);
  }, [slug, isCourseMode]);

  const fromCourseSlug = useMemo(
    () => new URLSearchParams(location.search).get("fromCourse"),
    [location.search]
  );

  // ── RTK Query: fetch lab or course content (cached, instant on revisit) ──
  const { data: labContentRes, isLoading: labLoading, error: labError } = useGetLabViewQuery(
    { slug, params: fromCourseSlug ? { fromCourse: fromCourseSlug } : {} },
    { skip: !slug || isCourseMode }
  );
  const { data: courseContentRes, isLoading: courseLoading } = useGetCourseSlugViewQuery(
    { slug, params: {} },
    { skip: !slug || !isCourseMode }
  );

  const loading = isCourseMode ? courseLoading : labLoading;

  const rawContent = useMemo(() => {
    if (isCourseMode) return courseContentRes?.data || courseContentRes;
    return labContentRes?.data?.lab || labContentRes?.lab;
  }, [isCourseMode, labContentRes, courseContentRes]);

  // ── Initialize content, progress and lesson navigation from raw API data ──
  useEffect(() => {
    if (!rawContent) return;
    const labSlugByRef = Object.fromEntries(
      (rawContent.includedLabs || []).map((l) => [String(l.id), l.slug]).filter(([, s]) => s)
    );
    const labDoneByRef = buildLabCompletionMap(rawContent.includedLabs || []);
    const modules = normalizeModules(rawContent.modules || [], { labSlugByRef });
    const contentKind = resolveContentKind({
      isCourse: isCourseMode,
      labKind: rawContent.labKind || rawContent.lab_kind,
      labType: rawContent.labType || rawContent.type,
    });
    const tech = rawContent.technologies || rawContent.techStack || [];
    const mapped = {
      id: rawContent.id,
      title: rawContent.title,
      slug: rawContent.slug || slug,
      modules,
      contentKind,
      durationMinutes: Number(rawContent.durationMinutes ?? rawContent.duration_minutes) || 0,
      platform: rawContent.platform || rawContent.metadata?.platform || tech[0] || "",
      technologies: tech,
      certificate: isCourseMode
        ? rawContent.certificate || rawContent.settings?.certificate
        : rawContent.certificate,
      isPurchased: !!(rawContent.isPurchased ?? rawContent._is_enrolled ?? rawContent.is_purchased),
    };
    setContent(mapped);
    setLabCompletionByRef(labDoneByRef);

    const saved = storageKey
      ? loadBlockProgress(storageKey)
      : { completedBlockIds: [], completedLessonIds: [], taskResults: {}, lastLessonId: null };
    if (saved.completedBlockIds.length) setCompletedTasks(new Set(saved.completedBlockIds));
    if (saved.completedLessonIds?.length) setCompletedLessons(new Set(saved.completedLessonIds));
    if (saved.taskResults && Object.keys(saved.taskResults).length) setTaskResults(saved.taskResults);

    const flatLessons = modules.flatMap((m) =>
      (m.lessons || []).map((l) => ({ ...l, moduleId: m.id, moduleTitle: m.title }))
    );

    let resumeLessonId = saved.lastLessonId || flatLessons[0]?.id || null;
    const returnState = location.state || {};
    if (isCourseMode && returnState.fromLabComplete) {
      const completedLessonId =
        returnState.courseLessonId ||
        flatLessons.find(
          (l) =>
            isLinkedLabLesson(l) &&
            String(l.reference_id || l.lab_id || "") === String(returnState.labId || "")
        )?.id;
      if (completedLessonId) {
        const completedSet = new Set(saved.completedLessonIds || []);
        completedSet.add(completedLessonId);
        setCompletedLessons(completedSet);
        if (returnState.labId) {
          setLabCompletionByRef((prev) => ({ ...prev, [String(returnState.labId)]: true }));
        }
        const idx = flatLessons.findIndex((l) => l.id === completedLessonId);
        if (idx >= 0 && flatLessons[idx + 1]) resumeLessonId = flatLessons[idx + 1].id;
        if (storageKey) {
          saveBlockProgress(storageKey, {
            ...saved,
            completedLessonIds: [...completedSet],
            lastLessonId: resumeLessonId,
          });
        }
      }
      navigate(location.pathname + location.search, { replace: true, state: {} });
    }

    if (resumeLessonId) {
      setCurrentLessonId(resumeLessonId);
      const mod = modules.find((m) => (m.lessons || []).some((l) => l.id === resumeLessonId));
      if (mod) {
        setExpandedModules({ [mod.id]: true });
        setExpandedLessons({ [resumeLessonId]: true });
      }
    }
  }, [rawContent]);

  // ── Handle auth error (403 / enrollment required) from lab view ───────────
  useEffect(() => {
    if (!labError || isApprovalPreview || isCourseMode) return;
    const status = labError?.status;
    const code = labError?.data?.code;
    if (status === 403 || code === "ENROLLMENT_REQUIRED") {
      navigate(`/labs/${encodeURIComponent(slug)}`, { replace: true });
    }
  }, [labError, isApprovalPreview, isCourseMode, slug, navigate]);

  const modules = content?.modules || [];
  const allLessons = useMemo(
    () => modules.flatMap((m) => (m.lessons || []).map((l) => ({ ...l, moduleId: m.id, moduleTitle: m.title }))),
    [modules]
  );
  const allBlocks = useMemo(() => flattenLessonBlocks(modules), [modules]);

  const lessonProgressOpts = useMemo(
    () => ({
      completedTasks,
      completedLessonIds: completedLessons,
      labCompletionByRef,
    }),
    [completedTasks, completedLessons, labCompletionByRef]
  );

  const currentLesson = useMemo(
    () => allLessons.find((l) => l.id === currentLessonId),
    [allLessons, currentLessonId]
  );
  const currentIsLinkedLabLesson = useMemo(
    () => isLinkedLabLesson(currentLesson),
    [currentLesson]
  );
  const currentLessonIdx = useMemo(
    () => allLessons.findIndex((l) => l.id === currentLessonId),
    [allLessons, currentLessonId]
  );
  const prevLesson = useMemo(() => allLessons[currentLessonIdx - 1], [allLessons, currentLessonIdx]);
  const nextLesson = useMemo(() => allLessons[currentLessonIdx + 1], [allLessons, currentLessonIdx]);
  const currentTasks = useMemo(
    () => currentLesson?.blocks || currentLesson?.tasks || [],
    [currentLesson]
  );
  const currentInteractiveTasks = useMemo(
    () => currentTasks.filter((t) => isInteractiveBlock(t.type)),
    [currentTasks]
  );
  const allInteractiveDone = useMemo(
    () => currentInteractiveTasks.every((t) => completedTasks.has(t.id)),
    [currentInteractiveTasks, completedTasks]
  );
  const linkedLabDone = useMemo(
    () => !currentIsLinkedLabLesson || isLessonComplete(currentLesson, lessonProgressOpts),
    [currentIsLinkedLabLesson, currentLesson, lessonProgressOpts]
  );

  const resolveTaskGradingContext = useCallback(
    (task) => ({
      entityId: content?.id,
      isCourse: isCourseMode,
      labId: task?._labId || task?.labId || currentLesson?.lab_id || currentLesson?.reference_id || null,
    }),
    [content?.id, isCourseMode, currentLesson?.lab_id, currentLesson?.reference_id]
  );

  const courseLessonProgress = useMemo(
    () => (isCourseMode ? computeCourseLessonProgress(allLessons, lessonProgressOpts) : null),
    [isCourseMode, allLessons, lessonProgressOpts]
  );

  const globalProgress = useMemo(() => {
    if (isCourseMode && courseLessonProgress) {
      return {
        total: courseLessonProgress.total,
        done: courseLessonProgress.done,
        pct: courseLessonProgress.pct,
        allComplete: courseLessonProgress.allComplete,
      };
    }
    return computeInteractiveProgress(allBlocks, completedTasks);
  }, [isCourseMode, courseLessonProgress, allBlocks, completedTasks]);
  const { total: totalTasks, done: completedCount, pct: progressPct, allComplete: allContentComplete } =
    globalProgress;

  const isLessonUnlocked = (lessonId, optsOverride) => {
    const idx = allLessons.findIndex((l) => l.id === lessonId);
    if (idx <= 0) return true;
    const prev = allLessons[idx - 1];
    const opts = optsOverride || lessonProgressOpts;
    return isLessonComplete(prev, opts);
  };

  const goToLesson = (lessonId, optsOverride) => {
    if (!isLessonUnlocked(lessonId, optsOverride)) return;
    const lesson = allLessons.find((l) => l.id === lessonId);
    if (!lesson) return;
    setCurrentLessonId(lessonId);
    setExpandedModules((p) => ({ ...p, [lesson.moduleId]: true }));
    setExpandedLessons((p) => ({ ...p, [lessonId]: true }));
    setActiveTaskId(null);
    if (storageKey) {
      saveBlockProgress(storageKey, {
        ...loadBlockProgress(storageKey),
        lastLessonId: lessonId,
      });
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
    contentRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  const openLinkedLab = (lesson) => {
    const target = lesson?.lab_slug || lesson?.labSlug || lesson?.reference_id
      ? lesson
      : currentLesson;
    const labSlug = target?.lab_slug || target?.labSlug;
    const lessonId = target?.id || currentLessonId;
    if (!labSlug || !isCourseMode) return;
    navigate(
      `/labs/${encodeURIComponent(labSlug)}/start?fromCourse=${encodeURIComponent(slug)}`,
      { state: { courseLessonId: lessonId } }
    );
  };

  const advanceToLesson = (lesson, lessonsOverride) => {
    if (!lesson) return;
    const opts = {
      completedTasks,
      completedLessonIds: lessonsOverride ?? completedLessons,
      labCompletionByRef,
    };
    if (!isLessonUnlocked(lesson.id, opts)) return;

    if (
      isCourseMode
      && isLinkedLabLesson(lesson)
      && (lesson.lab_slug || lesson.labSlug)
      && !isLessonComplete(lesson, opts)
    ) {
      openLinkedLab(lesson);
      return;
    }

    goToLesson(lesson.id, opts);
  };

  const handleNext = () => {
    if (currentIsLinkedLabLesson && !linkedLabDone) {
      openLinkedLab();
      return;
    }
    if (!allInteractiveDone) {
      const ids = new Set(
        currentInteractiveTasks.filter((t) => !completedTasks.has(t.id)).map((t) => t.id)
      );
      setShakingTaskIds(ids);
      setGlobalShake(true);
      setTimeout(() => {
        setShakingTaskIds(new Set());
        setGlobalShake(false);
      }, 800);
      return;
    }
    const updatedLessons = markCurrentLessonComplete();
    if (nextLesson) {
      advanceToLesson(nextLesson, updatedLessons);
      return;
    }
    if (allContentComplete) {
      finishLearning();
    }
  };

  const persistProgress = useCallback(
    async (completedSet, lessonId, lessonSet = completedLessons, results = taskResults) => {
      if (!storageKey || !content?.id) return;
      const ids = [...completedSet];
      const lessonIds = [...lessonSet];
      const pct = isCourseMode
        ? computeCourseLessonProgress(allLessons, {
          completedTasks: completedSet,
          completedLessonIds: lessonSet,
          labCompletionByRef,
        }).pct
        : computeInteractiveProgress(allBlocks, completedSet).pct;
      saveBlockProgress(storageKey, {
        completedBlockIds: ids,
        completedLessonIds: lessonIds,
        taskResults: results,
        startedAt: loadBlockProgress(storageKey).startedAt || new Date().toISOString(),
        lastLessonId: lessonId || currentLessonId,
      });
      try {
        if (isCourseMode) {
          await api.patch(
            `/me/courses/${content.id}/progress`,
            { progress: pct },
            { withCredentials: true }
          );
        } else {
          await api.patch(
            `/me/labs/${content.id}/progress`,
            { progress: pct },
            { withCredentials: true }
          );
        }
      } catch {
        /* guest or not enrolled — local progress still saved */
      }
    },
    [storageKey, content?.id, allBlocks, allLessons, currentLessonId, isCourseMode, taskResults, completedLessons, labCompletionByRef]
  );

  const recordTaskResult = useCallback(
    (taskId, result) => {
      setTaskResults((prev) => {
        const next = { ...prev, [taskId]: { correct: !!result.correct, points: result.points ?? 0 } };
        setCompletedTasks((prevTasks) => {
          const n = new Set(prevTasks);
          n.add(taskId);
          persistProgress(n, currentLessonId, completedLessons, next);
          return n;
        });
        return next;
      });
    },
    [currentLessonId, persistProgress, completedLessons]
  );

  const markCurrentLessonComplete = useCallback(() => {
    if (!currentLessonId) return completedLessons;
    const nextLessons = new Set(completedLessons);
    nextLessons.add(currentLessonId);
    setCompletedLessons(nextLessons);
    persistProgress(completedTasks, currentLessonId, nextLessons);
    return nextLessons;
  }, [currentLessonId, completedLessons, completedTasks, persistProgress]);

  const markTaskComplete = (taskId) => {
    const block = allBlocks.find((b) => b.id === taskId);
    if (block && !isInteractiveBlock(block.type)) return;
    setCompletedTasks((prev) => {
      const n = new Set(prev);
      n.add(taskId);
      persistProgress(n, currentLessonId, completedLessons);
      return n;
    });
  };

  const finishLearning = useCallback(async () => {
    if (!content) return;

    const fromCourse = new URLSearchParams(location.search).get("fromCourse");

    if (!isCourseMode && fromCourse) {
      try {
        await api.post(`/me/labs/${content.id}/complete`, {}, { withCredentials: true });
      } catch {
        /* return to course even if API fails */
      }
      navigate(`/courses/${encodeURIComponent(fromCourse)}/learn`, {
        replace: true,
        state: {
          fromLabComplete: true,
          labId: content.id,
          courseLessonId: location.state?.courseLessonId || null,
        },
      });
      return;
    }

    if (isCourseMode && !allContentComplete) return;

    try {
      if (isCourseMode) {
        await api.patch(
          `/me/courses/${content.id}/progress`,
          { progress: 100 },
          { withCredentials: true }
        );
      } else {
        await api.post(`/me/labs/${content.id}/complete`, {}, { withCredentials: true });
      }
    } catch {
      /* still show report if API fails but local progress is complete */
    }
    const reportPath = isCourseMode
      ? `/courses/${slug}/learn/complete`
      : `/labs/${slug}/complete`;
    const progress = isCourseMode
      ? computeCourseLessonProgress(allLessons, lessonProgressOpts)
      : computeInteractiveProgress(allBlocks, completedTasks);
    const grading = computeGradingSummary(allBlocks, taskResults);
    navigate(reportPath, {
      state: {
        kind: isCourseMode ? "course" : (content.contentKind || "lab"),
        title: content.title,
        progressPct: progress.pct,
        tasksDone: progress.done,
        tasksTotal: progress.total,
        correctCount: grading.correct,
        wrongCount: grading.wrong,
        scorePct: grading.scorePct,
        certEligible: isCourseMode
          ? isCertificateEligible(content.certificate, progress.pct)
          : isCertificateEligible(content.certificate, grading.scorePct),
        entityId: content.id,
        certificate: isCourseMode ? content.certificate : null,
        backPath: isCourseMode ? `/courses/${slug}/learn` : `/labs/${slug}`,
      },
    });
  }, [
    content,
    isCourseMode,
    slug,
    navigate,
    allBlocks,
    allLessons,
    completedTasks,
    taskResults,
    lessonProgressOpts,
    allContentComplete,
    location.search,
    location.state,
  ]);

  const handlePrev = () => {
    if (prevLesson) goToLesson(prevLesson.id);
  };

  const goToTask = (taskId, lessonId) => {
    if (lessonId && currentLessonId !== lessonId) {
      goToLesson(lessonId);
    }
    setTimeout(() => {
      taskRefs.current[taskId]?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  useEffect(() => {
    const observerOptions = {
      root: null,
      rootMargin: "-20% 0px -70% 0px",
      threshold: 0
    };

    observerRef.current = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          setActiveTaskId(entry.target.id);
        }
      });
    }, observerOptions);

    const currentTaskElements = Object.values(taskRefs.current).filter(el => el);
    currentTaskElements.forEach(el => observerRef.current?.observe(el));

    return () => {
      observerRef.current?.disconnect();
    };
  }, [currentLessonId]);

  const kindMeta = CONTENT_KIND_META[content?.contentKind || "lab"] || CONTENT_KIND_META.lab;
  const isSkillBuilderLab = content?.contentKind === "skill_builder";

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-sm text-muted-foreground">
            Loading {isCourseMode ? "course" : "lab"}…
          </p>
        </div>
      </div>
    );
  }

  if (!content) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4">
        <div className="text-5xl">🔍</div>
        <h2 className="text-xl font-bold text-foreground">
          {isCourseMode ? "Course not found" : "Lab not found"}
        </h2>
        <Link
          to={isCourseMode ? "/courses" : "/labs"}
          className="text-primary font-semibold hover:underline flex items-center gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>
      </div>
    );
  }

  return (
    <div className={embedded ? "bg-slate-50" : "min-h-screen bg-slate-50"}>
      {isApprovalPreview && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-center text-xs text-amber-900 font-medium">
          Approval review — learning progress preview (read-only actions disabled where applicable).
        </div>
      )}
      {!embedded && (
        <div className={cn("bg-white border-b border-slate-200 sticky z-50", siteStickyBelowNavClass(topbar.visible, location.pathname))}>
          <div className="max-w-[1800px] mx-auto px-6 h-16 flex items-center gap-6">
            <button
              onClick={() => navigate(isCourseMode ? `/courses/${slug}` : `/labs/${slug}`)}
              className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors text-sm font-semibold px-3 py-2 rounded-lg hover:bg-slate-100"
            >
              <ArrowLeft className="w-4 h-4" /> Back to {isCourseMode ? "Course" : "Lab"}
            </button>
            <div className="flex-1 text-center min-w-0 px-2">
              {(isCourseMode || isSkillBuilderLab) && (
                <Badge
                  variant="outline"
                  className={cn("mb-0.5 text-[10px] font-semibold border", kindMeta.className)}
                >
                  {kindMeta.shortLabel}
                </Badge>
              )}
              <h1 className="text-base font-bold text-slate-900 truncate">{content.title}</h1>
            </div>
            <LabTimer
              entityId={content.id}
              isCourse={isCourseMode}
              durationMinutes={content.durationMinutes}
            />

            {(isCourseMode || isSkillBuilderLab) && (
              <Badge variant="secondary" className="px-4 py-1.5 text-sm font-semibold shrink-0">
                {completedCount} / {totalTasks} tasks
              </Badge>
            )}
          </div>
        </div>
      )}

      <div className="max-w-[1800px] mx-auto flex flex-col lg:flex-row">
        <LearningModuleSidebar
          contentTitle={content.title}
          modules={modules}
          contentKind={content.contentKind}
          platform={content.platform}
          expandedModules={expandedModules}
          setExpandedModules={setExpandedModules}
          currentLessonId={currentLessonId}
          completedTasks={completedTasks}
          completedLessons={completedLessons}
          labCompletionByRef={labCompletionByRef}
          isLessonUnlocked={isLessonUnlocked}
          onSelectLesson={goToLesson}
        />

        <main className="flex-1 p-6 lg:p-8 overflow-y-auto" ref={contentRef}>
          {currentLesson && (
            <div className="max-w-4xl mx-auto">
              <div className="mb-6">
                <Badge className="mb-2 bg-purple-100 text-purple-800 hover:bg-purple-100">{currentLesson.moduleTitle}</Badge>
                <h2 className="text-3xl font-bold text-slate-900 mb-1">{currentLesson.title}</h2>
                <p className="text-sm text-slate-600 font-medium mb-2">
                  {getLessonContentLabel(currentLesson, currentTasks, {
                    platform: content.platform,
                    contentKind: content.contentKind,
                  })}
                </p>
                {(isCourseMode || isSkillBuilderLab) && (
                  <p className="text-sm text-slate-500">
                    {currentInteractiveTasks.length} task{currentInteractiveTasks.length !== 1 ? "s" : ""} ·{" "}
                    {currentInteractiveTasks.filter((t) => completedTasks.has(t.id)).length} completed
                  </p>
                )}
              </div>

              <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm overflow-hidden">
                {currentIsLinkedLabLesson ? (
                  <div className="p-8 text-center">
                    {currentLesson.type === "skill_builder_lab" ? (
                      <Zap className="w-12 h-12 text-purple-500 mx-auto mb-3" />
                    ) : (
                      <FlaskConical className="w-12 h-12 text-orange-500 mx-auto mb-3" />
                    )}
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">{currentLesson.title}</h3>
                    <p className="text-sm text-slate-600 mb-6 max-w-md mx-auto">
                      This {currentLesson.type === "skill_builder_lab" ? "Skill Builder" : "Learning"} lab is linked inside
                      module &quot;{currentLesson.moduleTitle}&quot;. Open it to continue hands-on practice.
                    </p>
                    {(currentLesson.lab_slug || currentLesson.labSlug) ? (
                      <Button onClick={() => openLinkedLab()}>
                        {linkedLabDone ? "Review Lab" : "Open Lab"}
                      </Button>
                    ) : (
                      <p className="text-sm text-amber-700">Lab link is unavailable. Contact your instructor.</p>
                    )}
                    {!linkedLabDone && (
                      <p className="text-sm text-amber-700 mt-4">
                        Complete this lab before moving to the next lesson.
                      </p>
                    )}
                  </div>
                ) : (
                  currentTasks.map((task, idx) => (
                    <section
                      key={task.id}
                      id={task.id}
                      ref={(el) => { taskRefs.current[task.id] = el; }}
                      className={cn(
                        "px-6 py-6",
                        idx > 0 && "border-t border-slate-200/80"
                      )}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center",
                            BLOCK_TYPES.find(t => t.id === task.type)?.bg || "bg-slate-100"
                          )}>
                            <TypeIcon type={task.type} />
                          </div>
                          <div>
                            <h3 className="text-base font-semibold text-slate-900">
                              {getBlockDisplayTitle(task)}
                            </h3>
                            {task.duration && (
                              <p className="text-xs text-slate-500">{task.duration}</p>
                            )}
                          </div>
                        </div>
                        {isInteractiveBlock(task.type) && completedTasks.has(task.id) && (
                          <CheckCircle2 className="w-5 h-5 text-green-600" />
                        )}
                      </div>
                      <TaskRenderer
                        task={task}
                        gradingContext={resolveTaskGradingContext(task)}
                        completedTasks={completedTasks}
                        onComplete={markTaskComplete}
                        onTaskResult={recordTaskResult}
                        shaking={shakingTaskIds.has(task.id)}
                      />
                    </section>
                  ))
                )}
              </div>

              <div className="flex flex-col items-end gap-2 mt-8 pt-6 border-t border-slate-200">
                <div className="flex items-center justify-between w-full">
                  <Button
                    variant="outline"
                    onClick={handlePrev}
                    disabled={!prevLesson}
                    className="gap-2"
                  >
                    <ArrowLeft className="w-4 h-4" /> Previous
                  </Button>
                  <Button
                    onClick={handleNext}
                    disabled={
                      (!allInteractiveDone && !currentIsLinkedLabLesson)
                      || (!nextLesson && !allContentComplete && !(currentIsLinkedLabLesson && !linkedLabDone))
                    }
                    className={cn(
                      "gap-2",
                      allInteractiveDone ? "bg-blue-600 hover:bg-blue-700" : "bg-blue-600 hover:bg-blue-700 opacity-90"
                    )}
                  >
                    {!nextLesson && allContentComplete && (allInteractiveDone || linkedLabDone)
                      ? (isCourseMode
                        ? "Complete Course & View Certificate"
                        : fromCourseSlug
                          ? "Complete Lab & Return to Course"
                          : "Complete & View Report")
                      : currentIsLinkedLabLesson && !linkedLabDone
                        ? "Open Lab"
                        : "Next"}{" "}
                    <ArrowLeft className="w-4 h-4 rotate-180" />
                  </Button>
                </div>
                {!allInteractiveDone && !currentIsLinkedLabLesson && (
                  <p className="text-sm text-slate-600 bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 w-full text-center">
                    Submit each task in this lesson to unlock Next. Your score is calculated at the end.
                  </p>
                )}
                {currentIsLinkedLabLesson && !linkedLabDone && (
                  <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 w-full text-center">
                    Click Next to open the linked lab. After you finish it, you will return here to continue the course.
                  </p>
                )}
              </div>
            </div>
          )}
        </main>

        {content.contentKind !== "lab" && (
          <LearningProgressSidebar
            contentKind={content.contentKind || (isCourseMode ? "course" : "lab")}
            contentTitle={content.title}
            progressPct={progressPct}
            tasksDone={completedCount}
            tasksTotal={totalTasks}
            currentLesson={currentLesson}
            currentInteractiveTasks={currentInteractiveTasks}
            completedTasks={completedTasks}
            activeTaskId={activeTaskId}
            onTaskClick={(taskId) => goToTask(taskId, currentLesson?.id)}
          />
        )}
      </div>
    </div>
  );
}
