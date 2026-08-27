/** Shared AbortController for in-flight multipart uploads (cancel from progress bar). */
let activeController = null;
let sessionController = null;

export function setActiveUploadAbort(controller) {
  activeController = controller;
}

export function clearActiveUploadAbort(controller) {
  if (activeController === controller) activeController = null;
}

export function beginUploadSession() {
  sessionController = new AbortController();
  setActiveUploadAbort(sessionController);
}

export function endUploadSession() {
  if (sessionController) {
    clearActiveUploadAbort(sessionController);
    sessionController = null;
  }
}

export function getUploadSessionSignal() {
  return sessionController?.signal;
}

export function cancelActiveUpload() {
  const target = sessionController || activeController;
  if (target) {
    target.abort();
    if (sessionController === target) sessionController = null;
    if (activeController === target) activeController = null;
    return true;
  }
  return false;
}

export function isUploadAbortError(error) {
  const message = String(error?.message || "").toLowerCase();
  return (
    error?.name === "CanceledError" ||
    error?.name === "AbortError" ||
    error?.code === "ERR_CANCELED" ||
    message === "canceled" ||
    message === "cancelled"
  );
}
