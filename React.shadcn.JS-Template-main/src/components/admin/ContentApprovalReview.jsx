import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { ArrowLeft, Check, Clock, Loader2, X, CheckCircle, XCircle } from "lucide-react";
import CourseOverviewPage from "@/pages/CourseOverviewPage";
import OverviewDetailsPage from "@/pages/OverviewDetilasPage";
import LearningWorkspacePage from "@/pages/LearningWorkspacePage";

/**
 * Shared approval review shell — Overview + Detail tabs with Approve/Reject on the same page.
 */
export default function ContentApprovalReview({
  kind,
  slug,
  title,
  approval = "pending",
  loading = false,
  loadError = null,
  onApprove,
  onReject,
  isMutating = false,
  backPath = "/app/course-approval",
  backLabel = "Back to approval",
  headerIcon: HeaderIcon,
}) {
  const navigate = useNavigate();
  const [tab, setTab] = useState("overview");
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isCourse = kind === "course";
  const typeLabel = isCourse ? "course" : "lab";

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

  const handleApprove = async () => {
    if (!onApprove) return;
    setIsSubmitting(true);
    try {
      await onApprove();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim() || !onReject) return;
    setIsSubmitting(true);
    try {
      await onReject(rejectionReason.trim());
      setRejectOpen(false);
      setRejectionReason("");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
        <p className="text-muted-foreground">Loading {typeLabel}…</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => navigate(backPath)}>
          <ArrowLeft className="w-4 h-4 mr-2" /> {backLabel}
        </Button>
        <p className="text-destructive">{loadError}</p>
      </div>
    );
  }

  if (!slug) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => navigate(backPath)}>
          <ArrowLeft className="w-4 h-4 mr-2" /> {backLabel}
        </Button>
        <p className="text-muted-foreground">No {typeLabel} slug available for preview.</p>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-4 min-h-0">
        <div className="flex flex-wrap items-start justify-between gap-3 shrink-0">
          <div className="space-y-2">
            <Button variant="ghost" className="text-muted-foreground -ml-2" onClick={() => navigate(backPath)}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              {backLabel}
            </Button>
            <div className="flex items-start gap-3">
              {HeaderIcon ? (
                <div className="rounded-lg bg-primary/10 p-3">
                  <HeaderIcon className="h-8 w-8 text-primary" />
                </div>
              ) : null}
              <div>
                <h1 className="text-xl font-semibold tracking-tight">
                  Review {typeLabel}
                </h1>
                <p className="text-lg font-medium mt-1">{title || slug}</p>
                <p className="text-sm text-muted-foreground">
                  Slug: <span className="font-mono">{slug}</span>
                </p>
                <div className="flex flex-wrap gap-2 mt-2">{statusBadge}</div>
              </div>
            </div>
            <p className="text-sm text-muted-foreground max-w-3xl">
              Use the tabs below to preview exactly what learners will see. Enroll, purchase, and start actions are
              disabled in this review mode.
            </p>
          </div>
          {approval === "pending" && (
            <div className="flex flex-wrap gap-2 items-center">
              <Button
                onClick={handleApprove}
                disabled={isSubmitting || isMutating}
                className="bg-green-600 hover:bg-green-700"
              >
                {isSubmitting || isMutating ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Check className="w-4 h-4 mr-2" />
                )}
                Approve
              </Button>
              <Button variant="destructive" onClick={() => setRejectOpen(true)} disabled={isSubmitting || isMutating}>
                <X className="w-4 h-4 mr-2" />
                Reject
              </Button>
            </div>
          )}
        </div>

        <Tabs value={tab} onValueChange={setTab} className="flex flex-col min-h-0 flex-1">
          <TabsList className="w-full max-w-md grid grid-cols-2">
            <TabsTrigger value="overview">Overview page</TabsTrigger>
            <TabsTrigger value="detail">Detail / progress</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-3 flex-1 min-h-0">
            <div className="rounded-lg border overflow-hidden bg-background max-h-[calc(100vh-14rem)] overflow-y-auto">
              {isCourse ? (
                <CourseOverviewPage slugOverride={slug} approvalPreview embedded />
              ) : (
                <OverviewDetailsPage slugOverride={slug} approvalPreview embedded />
              )}
            </div>
          </TabsContent>

          <TabsContent value="detail" className="mt-3 flex-1 min-h-0">
            <div className="rounded-lg border overflow-hidden bg-background max-h-[calc(100vh-14rem)] overflow-y-auto">
              <LearningWorkspacePage
                slugOverride={slug}
                variant={isCourse ? "course" : "lab"}
                approvalPreview
                embedded
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject {isCourse ? "course" : "lab"}</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejection. The author can use this feedback when revising.
            </DialogDescription>
          </DialogHeader>
          <div>
            <label className="block text-sm font-medium mb-2">
              Rejection reason <span className="text-red-500">*</span>
            </label>
            <Textarea
              placeholder={`e.g., ${isCourse ? "Modules need clearer learning outcomes…" : "Lab steps need clearer instructions…"}`}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="min-h-[120px]"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRejectOpen(false);
                setRejectionReason("");
              }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!rejectionReason.trim() || isSubmitting}
            >
              {isSubmitting ? "Rejecting…" : `Reject ${typeLabel}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
