/** @type {((options: ConfirmOptions) => Promise<boolean>) | null} */
let confirmImpl = null;

/**
 * @typedef {Object} ConfirmOptions
 * @property {string} [title]
 * @property {string} [description]
 * @property {string} [confirmLabel]
 * @property {string} [cancelLabel]
 * @property {"default" | "destructive"} [variant]
 */

export function registerConfirmImpl(fn) {
  confirmImpl = fn;
}

export function unregisterConfirmImpl() {
  confirmImpl = null;
}

/** Global styled confirmation dialog (falls back to window.confirm before provider mounts). */
export async function confirmAction({
  title = "Confirm",
  description = "Are you sure?",
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "default",
} = {}) {
  if (confirmImpl) {
    return confirmImpl({ title, description, confirmLabel, cancelLabel, variant });
  }
  return window.confirm(description);
}

/** Confirmation before deleting an item by label, e.g. `"My Lesson"`. */
export async function confirmDelete(label = "this item") {
  return confirmAction({
    title: "Confirm delete",
    description: `Are you sure you want to delete ${label}? This cannot be undone.`,
    confirmLabel: "Delete",
    cancelLabel: "Cancel",
    variant: "destructive",
  });
}
