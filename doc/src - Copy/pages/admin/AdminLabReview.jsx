import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useGetOwnerLabByIdQuery, useSetLabContentApprovalMutation } from "@/store/api/labApi";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { ArrowLeft, Beaker, Check, Loader2, X, Clock, CheckCircle, XCircle, ExternalLink } from "lucide-react";

function parseLabMetadata(raw) {
  if (raw == null || raw === "") return {};
  if (typeof raw === "object" && !Array.isArray(raw)) return raw;
  if (typeof raw === "string") {
    try {
      const p = JSON.parse(raw);
      return typeof p === "object" && p !== null && !Array.isArray(p) ? p : {};
    } catch {
      return {};
    }
  }
  return {};
}

export default function AdminLabReview() {
  const navigate = useNavigate();
  const { labId } = useParams();
  const { data: res, isLoading, isError, error } = useGetOwnerLabByIdQuery(labId, {
    skip: !labId,
  });
  const [setLabApproval, { isLoading: isMutating }] = useSetLabContentApprovalMutation();
  const [rejectOpen, setRejectOpen] = useState(false);

  const lab = useMemo(() => res?.data?.lab ?? null, [res]);

  const { approval, title, slug, previewSrc } = useMemo(() => {
    if (!lab) {
      return { approval: "pending", title: "", slug: "", previewSrc: "" };
    }
    const meta = parseLabMetadata(lab.metadata);
    const ap = meta.content_approval_status || "pending";
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const src = lab.slug ? `${origin}/approval-preview/labs/${encodeURIComponent(lab.slug)}` : "";
    return {
      approval: ap,
      title: lab.title,
      slug: lab.slug,
      previewSrc: src,
    };
  }, [lab]);

  const handleApprove = async () => {
    if (!lab?.id) return;
    try {
      await setLabApproval({ id: lab.id, status: "approved" }).unwrap();
      toast.success("Lab approved");
      navigate("/app/course-approval");
    } catch (e) {
      toast.error(e?.data?.message || e?.message || "Approval failed");
    }
  };

  const handleReject = async () => {
    if (!lab?.id) return;
    try {
      await setLabApproval({ id: lab.id, status: "rejected" }).unwrap();
      toast.success("Lab rejected");
      setRejectOpen(false);
      navigate("/app/course-approval");
    } catch (e) {
      toast.error(e?.data?.message || e?.message || "Reject failed");
    }
  };

  if (labId && isLoading && !lab) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
        <p className="text-muted-foreground">Loading lab…</p>
      </div>
    );
  }

  if (labId && isError) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => navigate("/app/course-approval")}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to approval
        </Button>
        <p className="text-destructive">{error?.data?.message || error?.message || "Could not load lab."}</p>
      </div>
    );
  }

  if (!lab) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => navigate("/app/course-approval")}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to approval
        </Button>
        <p className="text-muted-foreground">No lab data to display.</p>
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
      <div className="flex flex-col gap-3 min-h-0 flex-1" style={{ height: "calc(100vh - 7rem)" }}>
        <div className="flex flex-wrap items-start justify-between gap-3 shrink-0">
          <div className="space-y-2">
            <Button variant="ghost" className="text-muted-foreground -ml-2" onClick={() => navigate("/app/course-approval")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to approval
            </Button>
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-primary/10 p-3">
                <Beaker className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
                <p className="text-sm text-muted-foreground">
                  Slug: <span className="font-mono">{slug}</span>
                </p>
                <div className="flex flex-wrap gap-2 mt-2">{statusBadge}</div>
              </div>
            </div>
            <p className="text-sm text-muted-foreground max-w-3xl">
              Open the review preview to see the frontend lab page in read-only approval mode (no site header/footer,
              and no enroll/purchase/start actions).
            </p>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
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
                <Button onClick={handleApprove} disabled={isMutating || !previewSrc}>
                  {isMutating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
                  Approve
                </Button>
                <Button variant="destructive" onClick={() => setRejectOpen(true)} disabled={isMutating}>
                  <X className="h-4 w-4 mr-2" />
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
              <Button type="button" onClick={() => navigate(`/approval-preview/labs/${encodeURIComponent(slug)}`)}>
                Open approval preview
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-amber-700">This lab has no slug yet — publish or save to generate a URL for preview.</p>
        )}
      </div>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject lab</DialogTitle>
            <DialogDescription>
              This marks the lab as rejected for content approval. The author can revise and resubmit.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setRejectOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleReject} disabled={isMutating}>
              {isMutating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Confirm reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
