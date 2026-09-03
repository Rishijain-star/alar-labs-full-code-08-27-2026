import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, Star, Users, Lock, Edit, Trash2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { resolveMediaUrl } from "@/lib/mediaUrl";
import { stripHtmlToPlain } from "@/lib/stripHtml";
import ContentTypeBadge from "@/components/common/ContentTypeBadge";
import PlatformBadge from "@/components/common/PlatformBadge";
import { PriceBadge, DEFAULT_STORED_CURRENCY } from "@/components/common/PriceBadge";
import { useToast } from "@/hooks/use-toast";
import { useDeleteLabMutation, labApi } from "@/store/api/labApi";
import { confirmDelete } from "@/lib/confirmAction";
import { hasPermission } from "@/utils/permissions";
import { WishlistButton } from "@/components/common/WishlistButton";
import AdminContentDates from "@/components/admin/AdminContentDates";

const FALLBACK_THUMB =
  "https://images.unsplash.com/photo-1516116216624-53e697fedbea?w=500";

export function LabCard({
  id,
  slug,
  title,
  description,
  thumbnail,
  isFree,
  isLocked,
  price,
  currency = DEFAULT_STORED_CURRENCY,
  duration,
  level,
  rating,
  enrolledCount,
  labKind,
  labHref,
  created_by,
  status,
  labCode,
  version,
  createdAt,
  updatedAt,
  platform,
  showActions = false,
  showAdminDates = false,
  prefetchOverview = false,
  enrolledView = false,
  progress = 0,
  metadata = null,
  rejection_reason = null,
  rejectionReason = null,
  contentApprovalStatus = null,
}) {
  const parsedMeta = typeof metadata === "object" && metadata !== null ? metadata : (function() { try { return JSON.parse(metadata || "{}"); } catch(_) { return {}; } })();
  const approvalStatus = parsedMeta.content_approval_status || contentApprovalStatus;
  const reasonText = parsedMeta.rejection_reason || rejection_reason || rejectionReason;
  const showLock =
    typeof isLocked === "boolean"
      ? isLocked
      : !isFree && Number(price) > 0;
  const thumbSrc = resolveMediaUrl(thumbnail) || FALLBACK_THUMB;
  const ratingNum = Number(rating);
  const displayRating = Number.isFinite(ratingNum) ? ratingNum : null;
  const typeBadgeKind =
    labKind === "skill_builder" ? "skill_builder" : labKind ? "lab" : null;
  const navigate = useNavigate();
  const { toast } = useToast();
  const [deleteLab] = useDeleteLabMutation();
  const canEditLab = hasPermission("edit_labs");
  const canDeleteLab = hasPermission("delete_labs");
  const prefetchLabOverview = labApi.usePrefetch("getLabOverview");
  const handlePrefetch = () => {
    if (slug) prefetchLabOverview({ slug, params: {} }, { ifOlderThan: 60 });
  };

  const handleDelete = async () => {
    if (!(await confirmDelete("this lab"))) return;
    try {
      await deleteLab(id).unwrap();
      toast({
        title: "Lab deleted",
        description: "The lab has been deleted successfully.",
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "Failed to delete the lab.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card variant="elevated" className="overflow-hidden group w-full h-full flex flex-col">
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted shrink-0">
        <img
          src={thumbSrc}
          alt={title}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          onError={(e) => {
            if (e.currentTarget.src !== FALLBACK_THUMB) {
              e.currentTarget.src = FALLBACK_THUMB;
            }
          }}
        />
        <div className="absolute top-3 left-3 right-3 flex flex-wrap gap-1.5 items-start justify-between">
          <div className="flex flex-wrap gap-1.5">
            {typeBadgeKind ? <ContentTypeBadge kind={typeBadgeKind} /> : null}
            <PlatformBadge platform={platform} className="bg-background/90 backdrop-blur-sm" />
            <PriceBadge isFree={isFree} price={price} currency={currency} />
            {showActions && status && status !== "published" && (
              <Badge className="bg-amber-500 text-white border-0 capitalize">{status}</Badge>
            )}
            {(approvalStatus === "rejected" || reasonText) && (
              <Badge className="bg-red-500 text-white border-0 capitalize">Rejected</Badge>
            )}
          </div>
          {showActions && (canEditLab || canDeleteLab) && (
            <div className="flex gap-1">
              {canEditLab && (
                <Button
                  variant="secondary"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (!slug) {
                      toast({
                        title: "Cannot edit",
                        description: "This lab has no URL slug.",
                        variant: "destructive",
                      });
                      return;
                    }
                    const editPath = labKind === "skill_builder"
                      ? `/app/labs/skill-builder-lab-edit/${slug}`
                      : `/app/labs/edit/${slug}`;
                    navigate(editPath);
                  }}
                >
                  <Edit className="w-4 h-4" />
                </Button>
              )}
              {canDeleteLab && (
                <Button
                  variant="destructive"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleDelete();
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          )}
        </div>
        {!showActions && id ? (
          <div className="absolute top-3 right-3 z-10">
            <WishlistButton itemType="lab" targetId={id} />
          </div>
        ) : null}
        {showLock && (
          <div className="absolute bottom-3 right-3">
            <div className="w-8 h-8 rounded-full bg-background/90 backdrop-blur-sm flex items-center justify-center shadow-md">
              <Lock className="w-4 h-4 text-secondary" />
            </div>
          </div>
        )}
        {enrolledView && (
          <div className="absolute bottom-0 left-0 right-0 w-full bg-secondary h-1.5 z-20">
            <div 
              className="bg-primary h-full transition-all duration-500" 
              style={{ width: `${Math.min(100, Math.max(0, progress || 0))}%` }}
            />
          </div>
        )}
      </div>

      <CardHeader className="pb-2">
        <Badge variant="level" className="text-xs w-fit mb-2">
          {level}
        </Badge>
        <h3 className="text-base font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors leading-tight">
          {title}
        </h3>
        {showActions && (labCode || version) && (
          <div className="mt-1 flex items-center gap-2 text-[11px] font-medium text-muted-foreground">
            {labCode && <span className="rounded bg-muted px-1.5 py-0.5 font-mono">{labCode}</span>}
            {version ? <span>v{version}</span> : null}
          </div>
        )}
        {showAdminDates && (
          <AdminContentDates
            createdAt={createdAt}
            updatedAt={updatedAt}
            className="mt-1.5"
          />
        )}
      </CardHeader>

      <CardContent className="pb-3 flex-1 flex flex-col">
        {(approvalStatus === "rejected" || reasonText) && (
          <div className="mb-2 text-xs p-2 rounded bg-destructive/10 text-destructive border border-destructive/20">
            <span className="font-semibold">Rejection Feedback: </span>
            {reasonText || "No specific reason provided."}
          </div>
        )}
        <p className="text-sm text-muted-foreground line-clamp-2">
          {stripHtmlToPlain(description)}
        </p>

        <div className="flex flex-col gap-2 mt-3 text-xs text-muted-foreground flex-1">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 shrink-0" />
              <span>{duration}</span>
            </div>
            {typeof enrolledCount === "number" && Number.isFinite(enrolledCount) ? (
              <div className="flex items-center gap-1" title="Enrolled users">
                <Users className="w-3.5 h-3.5 shrink-0" />
                <span>{enrolledCount.toLocaleString()} enrolled</span>
              </div>
            ) : null}
          </div>
          <div
            className="flex items-center gap-1.5 mt-auto pt-1"
            aria-label={displayRating != null ? `Rating ${displayRating} out of 5` : "No rating"}
          >
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star
                  key={i}
                  className={`w-3.5 h-3.5 ${displayRating != null && i <= Math.round(displayRating)
                      ? "fill-secondary text-secondary"
                      : "text-muted-foreground/40"
                    }`}
                />
              ))}
            </div>
            <span className="font-medium text-foreground tabular-nums text-sm">
              {displayRating != null ? displayRating.toFixed(1) : "—"}
            </span>
          </div>
        </div>
      </CardContent>

      <CardFooter className="mt-auto">
        <Link
          to={labHref || (slug ? `/labs/${slug}` : "#")}
          className="w-full"
          aria-disabled={!slug && !labHref}
          onMouseEnter={prefetchOverview ? handlePrefetch : undefined}
        >
          <Button
            variant={isFree ? "success" : "secondary"}
            className="w-full"
            size="sm"
          >
            {enrolledView ? (progress > 0 ? "Resume" : "Start") : (isFree ? "Start Now" : "View Details")}
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
