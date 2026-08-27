import { toast } from "sonner";
import { isUploadAbortError } from "@/lib/uploadAbortRegistry";

const DURATION = 5000;

export const showSuccess = (title, description, options = {}) => {
  return toast.success(title || "Success", {
    description,
    duration: DURATION,
    ...options,
  });
};

export const showError = (titleOrError, description, options = {}) => {
  const isError = titleOrError instanceof Error;
  return toast.error(isError ? "Error" : titleOrError || "Error", {
    description: isError ? titleOrError.message : description || "Something went wrong",
    duration: DURATION,
    ...options,
  });
};

export const showWarning = (title, description, options = {}) => {
  return toast.warning(title || "Warning", {
    description,
    duration: DURATION,
    ...options,
  });
};

export const showInfo = (title, description, options = {}) => {
  return toast.info(title || "Info", {
    description,
    duration: DURATION,
    ...options,
  });
};

/** Upload/save failures — shows a friendly message when the user cancelled. */
export const showUploadOutcomeError = (error, fallback = "Something went wrong") => {
  if (isUploadAbortError(error)) {
    return showInfo("Upload cancelled", "You cancelled the upload.");
  }
  return showError(
    error?.response?.data?.message || error?.message || fallback
  );
};

export const showLoading = (title = "Loading...", description) => {
  return toast.loading(title, { description, duration: Infinity });
};

export const showPromise = async (promiseOrFn, messages = {}, options = {}) => {
  const p = typeof promiseOrFn === "function" ? promiseOrFn() : promiseOrFn;
  return toast.promise(p, {
    loading: messages.loading || "Processing...",
    success: messages.success || "Success",
    error: (err) =>
      typeof messages.error === "function"
        ? messages.error(err)
        : messages.error || err?.message || "Something went wrong",
    ...options,
  });
};

export const notify = {
  success: showSuccess,
  error: showError,
  warning: showWarning,
  info: showInfo,
  loading: showLoading,
  promise: showPromise,
};
