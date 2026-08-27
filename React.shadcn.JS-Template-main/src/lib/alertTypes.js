/** Shared alert/note types (AlertBlockEditor + TipTap rich text). */
export const ALERT_TYPES = [
  { value: "info", label: "Info", color: "#3b82f6" },
  { value: "note", label: "Note", color: "#6366f1" },
  { value: "warning", label: "Warning", color: "#f59e0b" },
  { value: "success", label: "Success", color: "#22c55e" },
  { value: "error", label: "Error", color: "#ef4444" },
];

export function alertTypeMeta(type) {
  return ALERT_TYPES.find((t) => t.value === type) || ALERT_TYPES[0];
}
