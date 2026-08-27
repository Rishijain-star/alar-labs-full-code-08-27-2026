import { cn } from "@/lib/utils";

export function focusValidationField(fieldId) {
  if (!fieldId || typeof document === "undefined") return;
  requestAnimationFrame(() => {
    const el = document.querySelector(`[data-field-id="${fieldId}"]`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    const focusable = el.querySelector(
      "input:not([type=hidden]), textarea, [contenteditable='true'], .ProseMirror"
    );
    if (focusable?.focus) {
      focusable.focus({ preventScroll: true });
    } else if (el instanceof HTMLElement) {
      el.focus?.({ preventScroll: true });
    }
  });
}

export function ValidatableField({
  fieldId,
  error,
  shake = false,
  className,
  children,
}) {
  return (
    <div
      data-field-id={fieldId}
      className={cn(
        "rounded-md transition-colors",
        error && shake && "animate-field-shake",
        className
      )}
    >
      {children}
      {error ? (
        <p className="text-sm text-destructive mt-1.5 font-medium" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function fieldInputClass(hasError) {
  return cn(
    hasError && "border-destructive focus-visible:ring-destructive/40 ring-1 ring-destructive/30"
  );
}
