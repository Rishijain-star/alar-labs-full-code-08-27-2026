import { useLocation } from "react-router-dom";

/** True when viewing content in approval / review mode (no enroll or purchase). */
export function useApprovalPreviewMode(approvalPreviewProp = false) {
  const location = useLocation();
  const fromPath =
    location.pathname.startsWith("/approval-preview/") ||
    (location.pathname.startsWith("/app/") && location.pathname.includes("/review"));
  return approvalPreviewProp || fromPath;
}
