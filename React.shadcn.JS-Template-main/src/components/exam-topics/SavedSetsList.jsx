import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2, Plus, BookOpen, GraduationCap, Upload } from "lucide-react";
import { confirmDelete } from "@/lib/confirmAction";
import { stripHtmlToPlain } from "@/lib/stripHtml";
import AdminContentDates from "@/components/admin/AdminContentDates";
import {
  getExamTopicSetStatusLabel,
  getExamTopicSetStatusVariant,
} from "@/lib/examTopicsConfig";

export default function SavedSetsList({
  items = [],
  type = "learning",
  onCreate,
  onEdit,
  onDelete,
  onPublish,
  canCreate = false,
  canEdit = false,
  canDelete = false,
  canPublish = false,
  publishingId = null,
  emptyLabel = "No saved sets yet.",
}) {
  const Icon = type === "exam" ? GraduationCap : BookOpen;

  return (
    <div className="space-y-4">
      {canCreate && (
        <Button type="button" onClick={onCreate} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          {type === "exam" ? "Create new exam" : "Create new learning set"}
        </Button>
      )}

      {items.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-muted-foreground text-sm">
            {emptyLabel}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const qCount = item.questions?.length || 0;
            const statusLabel = getExamTopicSetStatusLabel(item);
            const statusVariant = getExamTopicSetStatusVariant(item);
            const meta = typeof item.metadata === "object" ? (item.metadata || {}) : (function() { try { return JSON.parse(item.metadata || "{}"); } catch(_) { return {}; } })();
            const isPublishing = publishingId === item.id;
            const rejectionReason = item.rejection_reason || item.rejectionReason || meta.rejection_reason;
            const isRejected = item.content_approval_status === "rejected" || meta.content_approval_status === "rejected" || Boolean(rejectionReason);
            const canSubmitPublish = canPublish && (item.status !== "published" || isRejected);
            const isPending = item.status === "published" && (item.content_approval_status === "pending" || meta.content_approval_status === "pending");

            return (
              <Card key={item.id} className={isRejected ? "border-destructive/40 shadow-sm" : "border shadow-sm"}>
                <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="p-2 rounded-lg bg-blue-50 shrink-0">
                      <Icon className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{item.title || "Untitled"}</p>
                      {item.description && stripHtmlToPlain(item.description) ? (
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                          {stripHtmlToPlain(item.description)}
                        </p>
                      ) : null}
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        {isRejected ? (
                          <Badge variant="destructive" className="text-xs bg-red-600 text-white">
                            Changes Rejected
                          </Badge>
                        ) : (
                          <Badge variant={statusVariant} className="text-xs">
                            {statusLabel}
                          </Badge>
                        )}
                        <Badge variant="secondary" className="text-xs">
                          {qCount} question{qCount === 1 ? "" : "s"}
                        </Badge>
                        {type === "exam" && (
                          <Badge variant="outline" className="text-xs">
                            {item.timeLimitMinutes || 50} min
                          </Badge>
                        )}
                      </div>
                      {(canCreate || canEdit || canDelete || canPublish) && (
                        <AdminContentDates
                          createdAt={item.createdAt}
                          updatedAt={item.updatedAt}
                          className="mt-1.5"
                        />
                      )}
                      {isRejected && (
                        <div className="mt-2 text-xs p-2.5 rounded-md bg-destructive/10 text-destructive border border-destructive/20 space-y-1">
                          <span className="font-bold block">Rejection Feedback:</span>
                          <span className="text-foreground font-medium">{rejectionReason || "No specific reason provided."}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {canSubmitPublish && (
                      <Button
                        type="button"
                        size="sm"
                        className={isRejected ? "bg-red-600 hover:bg-red-700 text-white" : "bg-blue-600 hover:bg-blue-700"}
                        disabled={isPublishing}
                        onClick={() => onPublish?.(item.id)}
                      >
                        <Upload className="w-3.5 h-3.5 mr-1" />
                        {isPublishing ? "Submitting…" : isRejected ? "Resubmit for Approval" : "Publish"}
                      </Button>
                    )}
                    {isPending && (
                      <Badge variant="outline" className="text-xs text-amber-700 border-amber-200 bg-amber-50">
                        Awaiting approval
                      </Badge>
                    )}
                    {canEdit && (
                      <Button type="button" variant="outline" size="sm" onClick={() => onEdit(item.id)}>
                        <Pencil className="w-3.5 h-3.5 mr-1" /> Edit
                      </Button>
                    )}
                    {canDelete && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={async () => {
                          if (!(await confirmDelete(item.title || "this set"))) return;
                          onDelete(item.id);
                        }}
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
