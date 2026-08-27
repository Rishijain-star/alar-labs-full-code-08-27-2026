// src/components/ui/UploadProgressBar.jsx
import { useEffect, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import { hide, reset } from "@/store/slices/uploadSlice";

const prettyBytes = (n) => {
  if (n == null || n < 0) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0, v = n;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  return i === 0 ? `${Math.round(v)} B` : `${v.toFixed(1)} ${units[i]}`;
};

const UploadIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
    <polyline points="16 16 12 12 8 16" /><line x1="12" y1="12" x2="12" y2="21" />
    <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
  </svg>
);

const CheckIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const ErrorIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
    <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
  </svg>
);

const CloseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" width="13" height="13">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

function AnimatedDots() {
  return (
    <span style={{ display: "inline-flex", gap: 3, alignItems: "center", marginLeft: 4 }}>
      {[0, 1, 2].map(i => (
        <span key={i} style={{
          width: 4, height: 4, borderRadius: "50%",
          background: "currentColor", opacity: 0.6,
          animation: `uploadDotPulse 1.2s ease-in-out ${i * 0.2}s infinite`,
        }} />
      ))}
      <style>{`@keyframes uploadDotPulse { 0%,80%,100%{transform:scale(0);opacity:0.3} 40%{transform:scale(1);opacity:1} }`}</style>
    </span>
  );
}

export function UploadProgressBar() {
  const dispatch = useDispatch();
  const { active, percentage, label, bytesUploaded, bytesTotal, itemsUploaded, itemsTotal, isError, error } =
    useSelector((s) => s.upload || {});

  const autoHideTimer = useRef(null);

  useEffect(() => {
    if (percentage >= 100 && !isError) {
      clearTimeout(autoHideTimer.current);
      autoHideTimer.current = setTimeout(() => dispatch(hide()), 2500);
    }
    return () => clearTimeout(autoHideTimer.current);
  }, [percentage, isError, dispatch]);

  if (!active) return null;

  const pct    = Math.max(0, Math.min(100, percentage || 0));
  const isDone = pct >= 100 && !isError;

  const radius          = 17;
  const circumference   = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (pct / 100) * circumference;

  const colors = isError
    ? { icon: "#ef4444", iconBg: "rgba(239,68,68,0.12)", ring: "#ef4444", bar: "#ef4444", glow: "rgba(239,68,68,0.06)" }
    : isDone
      ? { icon: "#22c55e", iconBg: "rgba(34,197,94,0.12)", ring: "#22c55e", bar: "#22c55e", glow: "rgba(34,197,94,0.06)" }
      : { icon: "hsl(var(--primary))", iconBg: "hsl(var(--primary)/0.1)", ring: "hsl(var(--primary))", bar: "hsl(var(--primary))", glow: "hsl(var(--primary)/0.04)" };

  const statusText = isError ? null
    : isDone ? "Upload complete ✓"
    : pct < 5 ? "Starting upload…"
    : pct < 95 ? "Uploading, please wait…"
    : "Finishing up…";

  const subText = isError ? null
    : isDone ? (bytesTotal > 0 ? prettyBytes(bytesTotal) : "")
    : bytesTotal > 0 ? `${prettyBytes(bytesUploaded)} / ${prettyBytes(bytesTotal)}`
    : bytesUploaded > 0 ? prettyBytes(bytesUploaded) : null;

  const itemText = itemsTotal > 1 ? `File ${(itemsUploaded || 0) + 1} of ${itemsTotal}` : null;

  return (
    <>
      <style>{`
        @keyframes uploadSlideIn {
          from { transform: translateY(20px) scale(0.97); opacity: 0; }
          to   { transform: translateY(0) scale(1); opacity: 1; }
        }
        @keyframes uploadShimmer {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
      `}</style>

      <div style={{
        position: "fixed", bottom: 20, right: 20, zIndex: 9999,
        animation: "uploadSlideIn 0.3s cubic-bezier(0.34,1.56,0.64,1) both",
      }}>
        <div style={{
          width: isError ? 380 : 340,
          background: "hsl(var(--background))",
          borderRadius: 16,
          border: `1px solid ${isError ? "rgba(239,68,68,0.35)" : isDone ? "rgba(34,197,94,0.3)" : "hsl(var(--border))"}`,
          boxShadow: isError
            ? "0 20px 60px -10px rgba(239,68,68,0.22), 0 8px 24px -4px rgba(0,0,0,0.14)"
            : isDone
              ? "0 20px 60px -10px rgba(34,197,94,0.18), 0 8px 24px -4px rgba(0,0,0,0.12)"
              : "0 20px 60px -10px rgba(0,0,0,0.18), 0 8px 24px -4px rgba(0,0,0,0.10)",
          overflow: "hidden",
          transition: "width 0.2s ease, border-color 0.3s, box-shadow 0.3s",
        }}>
          <div style={{ height: 3, background: "hsl(var(--muted))", position: "relative", overflow: "hidden" }}>
            <div style={{
              position: "absolute", left: 0, top: 0, height: "100%",
              width: `${pct}%`,
              background: !isError && !isDone
                ? `linear-gradient(90deg, ${colors.bar} 0%, ${colors.bar} 40%, rgba(255,255,255,0.6) 50%, ${colors.bar} 60%, ${colors.bar} 100%)`
                : colors.bar,
              backgroundSize: !isError && !isDone ? "200% 100%" : "100% 100%",
              animation: !isError && !isDone ? "uploadShimmer 1.5s linear infinite" : "none",
              transition: "width 0.35s ease-out",
              borderRadius: "0 2px 2px 0",
            }} />
          </div>

          <div style={{
            position: "absolute", inset: 0, pointerEvents: "none",
            background: `linear-gradient(135deg, ${colors.glow} 0%, transparent 60%)`,
          }} />

          <div style={{ padding: "14px 16px", position: "relative" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: colors.iconBg, color: colors.icon,
                transition: "all 0.3s",
              }}>
                {isError ? <ErrorIcon /> : isDone ? <CheckIcon /> : <UploadIcon />}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center" }}>
                  <p style={{
                    fontSize: 13, fontWeight: 600, color: "hsl(var(--foreground))",
                    margin: 0, lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>{label || "Uploading"}</p>
                  {!isError && !isDone && <AnimatedDots />}
                </div>
                {itemText && (
                  <p style={{ fontSize: 11, color: "hsl(var(--muted-foreground))", margin: "2px 0 0", fontWeight: 600 }}>{itemText}</p>
                )}
                {subText && !itemText && (
                  <p style={{ fontSize: 11, color: "hsl(var(--muted-foreground))", margin: "2px 0 0", fontFamily: "monospace", fontVariantNumeric: "tabular-nums" }}>{subText}</p>
                )}
              </div>

              <div style={{ position: "relative", width: 44, height: 44, flexShrink: 0 }}>
                <svg viewBox="0 0 40 40" style={{ width: 44, height: 44, transform: "rotate(-90deg)" }}>
                  <circle cx="20" cy="20" r={radius} fill="none"
                    stroke={isError ? "rgba(239,68,68,0.2)" : "hsl(var(--muted))"} strokeWidth="3" />
                  <circle cx="20" cy="20" r={radius} fill="none"
                    stroke={colors.ring} strokeWidth="3" strokeLinecap="round"
                    strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
                    style={{ transition: "stroke-dashoffset 0.4s ease-out, stroke 0.3s" }} />
                </svg>
                <div style={{
                  position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 10, fontWeight: 800,
                  color: isError ? "#ef4444" : isDone ? "#22c55e" : "hsl(var(--foreground))",
                  fontVariantNumeric: "tabular-nums",
                }}>{pct}%</div>
              </div>

              {(isError || isDone) && (
                <button type="button" onClick={() => dispatch(isError ? reset() : hide())} style={{
                  flexShrink: 0, width: 24, height: 24, borderRadius: "50%",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  border: "none", background: "transparent", cursor: "pointer",
                  color: "hsl(var(--muted-foreground))",
                }} aria-label="Dismiss">
                  <CloseIcon />
                </button>
              )}
            </div>

            <div style={{ marginTop: 12, height: 6, borderRadius: 3, overflow: "hidden", background: isError ? "rgba(239,68,68,0.12)" : "hsl(var(--muted))" }}>
              <div style={{
                height: "100%", borderRadius: 3, width: `${pct}%`,
                background: !isError && !isDone
                  ? `linear-gradient(90deg, ${colors.bar} 0%, rgba(255,255,255,0.5) 50%, ${colors.bar} 100%)`
                  : colors.bar,
                backgroundSize: !isError && !isDone ? "200% 100%" : "100% 100%",
                animation: !isError && !isDone ? "uploadShimmer 1.5s linear infinite" : "none",
                transition: "width 0.35s ease-out",
              }} />
            </div>

            {statusText && (
              <p style={{
                fontSize: 11, marginTop: 6, fontWeight: 500,
                color: isDone ? "#16a34a" : "hsl(var(--muted-foreground))",
              }}>{statusText}</p>
            )}

            {isError && (
              <div style={{ marginTop: 10, borderRadius: 10, overflow: "hidden", border: "1px solid rgba(239,68,68,0.3)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: "rgba(239,68,68,0.1)" }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" width="14" height="14">
                    <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#ef4444" }}>Upload Failed</span>
                </div>
                <div style={{ padding: "10px 12px", background: "rgba(239,68,68,0.05)" }}>
                  <p style={{ fontSize: 13, fontWeight: 500, color: "#dc2626", margin: 0, lineHeight: 1.5, wordBreak: "break-word" }}>
                    {error || "An unexpected error occurred. Please try again."}
                  </p>
                </div>
                <div style={{ padding: "8px 12px", background: "rgba(239,68,68,0.05)", borderTop: "1px solid rgba(239,68,68,0.15)", display: "flex", justifyContent: "flex-end" }}>
                  <button type="button" onClick={() => dispatch(reset())} style={{
                    fontSize: 11, fontWeight: 700, color: "#ef4444", background: "none",
                    border: "1px solid rgba(239,68,68,0.4)", borderRadius: 6, padding: "4px 12px", cursor: "pointer",
                  }}>Dismiss</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default UploadProgressBar;