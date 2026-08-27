import { cn } from "@/lib/utils";
import {
  formatAdminContentDateTime,
  shouldShowUpdatedContentDate,
  pickContentTimestamps,
} from "@/utils/formatters";
import { hasFullAccessUser, hasAnyPermission } from "@/utils/permissions";
import { DIGITAL_PROGRAMS_ADMIN_PERMISSIONS } from "@/lib/digitalProgramsPermissions";

/**
 * Admin-only created / updated metadata (secondary text).
 * Pass explicit dates or a record with created_at / updated_at fields.
 */
export default function AdminContentDates({
  createdAt,
  updatedAt,
  record = null,
  className,
  inline = false,
}) {
  const isAuthorized = hasAnyPermission([
    "edit_programs",
    "manage_programs",
    "delete_programs",
    "create_programs",
    "edit_courses",
    "manage_courses",
    "edit_labs",
    "manage_labs",
    "manage_users",
  ]);

  if (!isAuthorized) return null;

  const picked = record ? pickContentTimestamps(record) : { createdAt, updatedAt };
  const created = picked.createdAt;
  const updated = picked.updatedAt;
  const showUpdated = shouldShowUpdatedContentDate(created, updated);

  if (!created) return null;

  const createdLabel = formatAdminContentDateTime(created);
  const updatedLabel = showUpdated ? formatAdminContentDateTime(updated) : "";

  if (!createdLabel) return null;

  return (
    <div
      className={cn(
        "text-xs text-muted-foreground",
        inline ? "flex flex-wrap items-center gap-x-3 gap-y-0.5" : "space-y-0.5",
        className
      )}
    >
      <p>
        <span className="font-medium text-muted-foreground/90">Created:</span> {createdLabel}
      </p>
      {showUpdated && updatedLabel ? (
        <p>
          <span className="font-medium text-muted-foreground/90">Updated:</span> {updatedLabel}
        </p>
      ) : null}
    </div>
  );
}
