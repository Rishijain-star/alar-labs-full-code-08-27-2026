import axiosInstance from "@/lib/axios";
import { store } from "@/store/store";
import { start, progress, complete, fail, hide } from "@/store/slices/uploadSlice";

// ─── Helper ───────────────────────────────────────────────────────────────────
const sumFileSizes = (files = []) =>
  files.filter(Boolean).reduce((sum, f) => sum + (f?.size || 0), 0);

/** Extract a human-readable error message from an axios error */
const extractErrorMessage = (e) => {
  // Server responded with a structured error
  const serverMsg =
    e?.response?.data?.message ||
    e?.response?.data?.error ||
    e?.response?.data?.errors?.[0]?.message;
  if (serverMsg) return String(serverMsg);

  // Axios / network message
  if (e?.message) return String(e.message);

  return "Upload failed. Please try again.";
};

// ─── uploadFiles ─────────────────────────────────────────────────────────────
export const uploadFiles = async ({
  files,
  endpoint,
  fieldName = "files",
  extraData = {},
}) => {
  if (!Array.isArray(files) || files.length === 0) return [];

  const safeFiles = files.filter(Boolean);
  const totalBytes = sumFileSizes(safeFiles);

  store.dispatch(
    start({ bytesTotal: totalBytes, itemsTotal: safeFiles.length, label: "Uploading media" })
  );

  let bytesUploaded = 0;
  const results = [];

  for (let i = 0; i < safeFiles.length; i++) {
    const file = safeFiles[i];
    const form = new FormData();
    form.append(fieldName, file, file.name);
    Object.entries(extraData || {}).forEach(([k, v]) => form.append(k, v));

    const fileStartBytes = bytesUploaded;

    try {
      const res = await axiosInstance.post(endpoint, form, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (evt) => {
          if (!evt) return;
          const current = fileStartBytes + (evt.loaded || 0);
          store.dispatch(
            progress({ bytesUploaded: current, itemsUploaded: i, bytesTotal: totalBytes })
          );
        },
        withCredentials: true,
      });

      bytesUploaded += file.size || 0;
      store.dispatch(
        progress({ bytesUploaded, itemsUploaded: i + 1, bytesTotal: totalBytes })
      );
      results.push(res?.data);
    } catch (e) {
      store.dispatch(fail(extractErrorMessage(e)));
      throw e;
    }
  }

  store.dispatch(complete());
  // Auto-hide after 2.5s on success
  setTimeout(() => store.dispatch(hide()), 2500);

  return results;
};

// ─── postMultipartWithProgress ────────────────────────────────────────────────
/**
 * Pass `filesToMeasure` — the actual File[] objects being uploaded — so we can
 * call `.size` on them directly before they're wrapped in FormData.
 *
 * Example usage in AdminCourseCreate:
 *   await postMultipartWithProgress({
 *     endpoint: "/owner/courses/create-full",
 *     formData: form,
 *     label: "Submitting course",
 *     filesToMeasure: [thumbnail, introVideoFile, ...lessonFiles].filter(Boolean),
 *   });
 */
export const postMultipartWithProgress = async ({
  endpoint,
  formData,
  label = "Uploading",
  expectedBytesTotal,
  filesToMeasure = [],
}) => {
  // --- Accurately measure total bytes BEFORE starting ---
  let bytesTotal = expectedBytesTotal;

  if (!bytesTotal && filesToMeasure.length > 0) {
    bytesTotal = sumFileSizes(filesToMeasure);
  }

  // Fallback: iterate FormData (less reliable but catches JSON-only payloads)
  if (!bytesTotal) {
    let calculated = 0;
    try {
      for (const [, value] of formData.entries()) {
        if (value instanceof File || value instanceof Blob) {
          calculated += value.size || 0;
        } else if (typeof value === "string") {
          calculated += new TextEncoder().encode(value).length;
        }
      }
    } catch {
      calculated = 0;
    }
    bytesTotal = calculated || 0;
  }

  store.dispatch(start({ bytesTotal, itemsTotal: 1, label }));

  try {
    const res = await axiosInstance.post(endpoint, formData, {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: (evt) => {
        if (!evt) return;
        // Browser-reported total is most accurate (includes multipart overhead)
        const total = evt.total && evt.total > 0 ? evt.total : bytesTotal || 1;
        const loaded = evt.loaded || 0;
        store.dispatch(
          progress({
            bytesUploaded: loaded,
            itemsUploaded: loaded >= total ? 1 : 0,
            bytesTotal: total,
          })
        );
      },
      withCredentials: true,
    });

    store.dispatch(complete());
    // Auto-hide after 2.5s on success
    setTimeout(() => store.dispatch(hide()), 2500);

    return res?.data;
  } catch (e) {
    // Dispatch the actual error message so the UI can display it
    const errorMsg = extractErrorMessage(e);
    store.dispatch(fail(errorMsg));
    // Re-throw so the call site can also handle it (e.g. setIsSubmitting(false))
    throw e;
  }
};