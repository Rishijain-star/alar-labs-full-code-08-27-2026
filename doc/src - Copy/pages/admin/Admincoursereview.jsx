import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useGetCourseBySlugQuery, useSetCourseContentApprovalMutation } from "@/store/api/courseApi";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { ArrowLeft, BookOpen, Check, Clock, Loader2, X, CheckCircle, XCircle, ExternalLink } from "lucide-react";

function parseCourseMetadata(raw) {
  if (raw == null || raw === "") return {};
  if (typeof raw === "object" && !Array.isArray(raw)) return raw;
  if (typeof raw === "string") {
    try {
      const o = JSON.parse(raw);
      return typeof o === "object" && o !== null && !Array.isArray(o) ? o : {};
    } catch {
      return {};
    }
  }
  return {};
}

const AdminCourseReview = () => {
  const navigate = useNavigate();
  const { courseSlug } = useParams();

  const { data: courseRes, isLoading, isError, error } = useGetCourseBySlugQuery(courseSlug, {
    skip: !courseSlug,
  });
  const [setCourseApproval, { isLoading: isMutating }] = useSetCourseContentApprovalMutation();

  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const raw = courseRes?.data?.course;
  const meta = useMemo(() => parseCourseMetadata(raw?.metadata), [raw]);
  const approval = meta.content_approval_status || "pending";
  const courseId = raw?.id;
  const title = raw?.title || courseSlug;

  const previewSrc =
    courseSlug && typeof window !== "undefined"
      ? `${window.location.origin}/approval-preview/courses/${encodeURIComponent(courseSlug)}`
      : "";

  const handleApprove = async () => {
    if (!courseId) return;
    setIsSubmitting(true);
    try {
      await setCourseApproval({ id: courseId, status: "approved" }).unwrap();
      toast.success("Course approved");
      navigate("/app/course-approval");
    } catch (e) {
      toast.error(e?.data?.message || e?.message || "Approval failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim() || !courseId) return;
    setIsSubmitting(true);
    try {
      await setCourseApproval({ id: courseId, status: "rejected" }).unwrap();
      toast.success("Course rejected");
      setIsRejectDialogOpen(false);
      setRejectionReason("");
      navigate("/app/course-approval");
    } catch (e) {
      toast.error(e?.data?.message || e?.message || "Reject failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (courseSlug && isLoading && !raw) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
        <p className="text-muted-foreground">Loading course…</p>
      </div>
    );
  }

  if (courseSlug && isError) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => navigate("/app/course-approval")}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Course Approval
        </Button>
        <p className="text-destructive">{error?.data?.message || error?.message || "Could not load course."}</p>
      </div>
    );
  }

  if (!raw) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => navigate("/app/course-approval")}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Course Approval
        </Button>
        <p className="text-muted-foreground">No course data to display.</p>
      </div>
    );
  }

  const statusBadge =
    approval === "approved" ? (
      <Badge className="gap-1 bg-green-600">
        <CheckCircle className="h-3 w-3" /> Approved
      </Badge>
    ) : approval === "rejected" ? (
      <Badge variant="destructive" className="gap-1">
        <XCircle className="h-3 w-3" /> Rejected
      </Badge>
    ) : (
      <Badge variant="secondary" className="gap-1 text-amber-800 bg-amber-100">
        <Clock className="h-3 w-3" /> Pending review
      </Badge>
    );

  return (
    <>
      <div className="flex flex-col gap-3 min-h-0" style={{ height: "calc(100vh - 7rem)" }}>
        <div className="flex flex-wrap items-start justify-between gap-3 shrink-0">
          <div className="space-y-2">
            <Button variant="ghost" className="text-muted-foreground -ml-2" onClick={() => navigate("/app/course-approval")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Course Approval
            </Button>
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-primary/10 p-3">
                <BookOpen className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-semibold tracking-tight">Review course</h1>
                <p className="text-lg font-medium mt-1">{title}</p>
                <p className="text-sm text-muted-foreground">
                  Slug: <span className="font-mono">{courseSlug}</span>
                </p>
                <div className="flex flex-wrap gap-2 mt-2">{statusBadge}</div>
              </div>
            </div>
            <p className="text-sm text-muted-foreground max-w-3xl">
              Open the review preview to see the frontend course page in read-only approval mode (no site header/footer,
              and no enroll/purchase actions).
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {previewSrc ? (
              <Button variant="outline" size="sm" asChild>
                <a href={previewSrc} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open in new tab
                </a>
              </Button>
            ) : null}
            {approval === "pending" && (
              <>
                <Button
                  onClick={handleApprove}
                  disabled={isSubmitting || isMutating || !courseId}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
                  Approve
                </Button>
                <Button variant="destructive" onClick={() => setIsRejectDialogOpen(true)} disabled={isSubmitting}>
                  <X className="w-4 h-4 mr-2" />
                  Reject
                </Button>
              </>
            )}
          </div>
        </div>

        {previewSrc ? (
          <div className="flex-1 w-full min-h-[340px] rounded-lg border bg-background grid place-items-center p-6 text-center">
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Preview opens without iframe so approval can check the real frontend rendering.
              </p>
              <Button type="button" onClick={() => navigate(`/approval-preview/courses/${encodeURIComponent(courseSlug)}`)}>
                Open approval preview
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Course</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejection. The author can use this feedback when revising.
            </DialogDescription>
          </DialogHeader>
          <div>
            <label className="block text-sm font-medium mb-2">
              Rejection reason <span className="text-red-500">*</span>
            </label>
            <Textarea
              placeholder="e.g., Learning outcomes need clearer alignment with modules…"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="min-h-[120px]"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsRejectDialogOpen(false);
                setRejectionReason("");
              }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleReject} disabled={!rejectionReason.trim() || isSubmitting}>
              {isSubmitting ? "Rejecting…" : "Reject course"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AdminCourseReview;
