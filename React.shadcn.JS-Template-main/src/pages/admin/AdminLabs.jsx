import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation, Navigate } from "react-router-dom";

import { LabCard } from "@/components/cards/LabCard";
import { LabCardSkeleton } from "@/components/common/LabCardSkeleton";
import { resolveMediaUrl } from "@/lib/mediaUrl";
import GlobalPagination from "@/components/common/Pagination";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Beaker, Plus, Zap, BookOpen, FileSpreadsheet } from "lucide-react";
import GlobalListManager from "../../components/common/Globallistmanager";
import { useGetLabsQuery } from "@/store/api/labApi";
import { hasPermission } from "@/utils/permissions";
import { resolveLabCardRating, resolveLabCardEnrolledCount } from "@/lib/labDisplayStats";
import { isSuperAdmin, getUserId, isApprover } from "@/lib/auth";
import { resolveItemCurrency } from "@/lib/localeFormat";
import BulkLabUploadModal from "@/components/admin/BulkLabUploadModal";

const DEFAULT_PER_PAGE = 12;
const PER_PAGE_OPTIONS = [4, 8, 12, 16, 24];
const CATALOG_GRID_CLASS =
  "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 justify-items-stretch";

export default function Lab() {
  const navigate = useNavigate();
  const location = useLocation();
  const isAllLabsView = location.pathname.includes("/others");
  const scope = isAllLabsView ? "all" : "mine";
  const isMine = scope === "mine";
  const userIsApprover = isApprover();
  const canCreateLabs = hasPermission("create_labs") && !userIsApprover;
  const canEditLabs = hasPermission("edit_labs") && !userIsApprover;
  const canDeleteLabs = hasPermission("delete_labs") && !userIsApprover;
  const superAdmin = isSuperAdmin();
  const currentUserId = getUserId();

  if (userIsApprover && isMine) {
    return <Navigate to="/app/labs/others" replace />;
  }

  if (isMine && !canCreateLabs && !canEditLabs && !canDeleteLabs) {
    return <Navigate to="/app/labs/others" replace />;
  }

  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(DEFAULT_PER_PAGE);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebouncedValue(searchQuery, 3000);
  const [priceFilter, setPriceFilter] = useState("all");
  const [levelFilter, setLevelFilter] = useState("all");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [isBulkLabModalOpen, setIsBulkLabModalOpen] = useState(false);

  useEffect(() => {
    setPage(1);
  }, [scope, debouncedSearch, priceFilter, levelFilter, platformFilter, statusFilter, perPage]);

  const { data, isLoading: apiLoading, isFetching } = useGetLabsQuery({
    page,
    limit: perPage,
    scope,
    search: debouncedSearch.trim() || undefined,
    level: levelFilter !== "all" ? levelFilter : undefined,
    price: priceFilter !== "all" ? priceFilter : undefined,
    platform: platformFilter !== "all" ? platformFilter : undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
  });

  const serverLabs =
    data?.data?.rows ||
    data?.data?.items ||
    data?.rows ||
    data?.items ||
    [];
  const dataLabs = Array.isArray(serverLabs) ? serverLabs : [];

  const totalItems =
    data?.data?.pagination?.total ??
    data?.pagination?.total ??
    dataLabs.length;

  const totalPages =
    data?.data?.pagination?.total_pages ??
    data?.pagination?.total_pages ??
    Math.max(1, Math.ceil(totalItems / perPage));

  const paginatedLabs = dataLabs;

  const handleRefresh = () => {
    /* RTK Query refetch is triggered by invalidation or remount; list updates on next fetch */
  };

  const handleExport = () => {
    console.log("Exporting labs data...");
  };

  const handleAddLab = () => {
    navigate("/app/labs/new");
  };

  const handleAddSkillBuilder = () => {
    navigate("/app/labs/skill-builder-lab-new");
  };

  const handleAddNormalLearningLab = () => {
    navigate("/app/labs/new");
  };

  const handlePageChange = useCallback((newPage) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const handlePerPageChange = useCallback((next) => {
    setPerPage(next);
    setPage(1);
  }, []);

  const activeFiltersCount = [
    priceFilter !== "all",
    levelFilter !== "all",
    platformFilter !== "all",
    statusFilter !== "all",
  ].filter(Boolean).length;

  const listLoading = apiLoading || isFetching || searchQuery.trim() !== debouncedSearch.trim();

  return (
    <GlobalListManager
      title={isMine ? "My Labs" : "All Labs"}
      description={
        isMine
          ? "Labs you created — edit or delete from here"
          : "All labs on the platform — yours and other instructors"
      }
      addButtonText="Create Lab"
      addButtonIcon={Plus}
      onAdd={isMine && canCreateLabs ? handleAddLab : undefined}
      showAddButton={isMine && canCreateLabs}
      onExport={handleExport}
      onRefresh={handleRefresh}
      isRefreshing={isFetching}
      customActions={
        isMine && canCreateLabs ? (
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleAddSkillBuilder}
              className="bg-amber-500 hover:bg-amber-600 text-white border-0"
            >
              <Zap className="mr-2 h-4 w-4" />
              Create Skill Builder
            </Button>
          </div>
        ) : null
      }
      searchConfig={{
        value: searchQuery,
        onChange: setSearchQuery,
        onPageReset: () => setPage(1),
        placeholder: "Search labs...",
      }}
      permissions={{
        checkPermissions: true,
        resource: "user",
        actions: {
          create: "create_labs",
          export: "courses_export",
        },
        showLockedButtons: false,
      }}
      filters={[
        {
          value: statusFilter,
          onChange: setStatusFilter,
          onPageReset: () => setPage(1),
          placeholder: "Status",
          width: "w-36",
          options: [
            { value: "published", label: "Published" },
            { value: "draft", label: "Draft" },
            { value: "archived", label: "Archived" },
          ],
          allOptionText: "All Statuses",
        },
        {
          value: priceFilter,
          onChange: setPriceFilter,
          onPageReset: () => setPage(1),
          placeholder: "Price",
          width: "w-32",
          options: [
            { value: "free", label: "Free" },
            { value: "paid", label: "Paid" },
          ],
          allOptionText: "All Prices",
        },
        {
          value: levelFilter,
          onChange: setLevelFilter,
          onPageReset: () => setPage(1),
          placeholder: "Level",
          width: "w-36",
          options: [
            { value: "beginner", label: "Beginner" },
            { value: "intermediate", label: "Intermediate" },
            { value: "advanced", label: "Advanced" },
            { value: "expert", label: "Expert" },
          ],
          allOptionText: "All Levels",
        },
        {
          value: platformFilter,
          onChange: setPlatformFilter,
          onPageReset: () => setPage(1),
          placeholder: "Platform",
          width: "w-36",
          options: [
            { value: "AWS", label: "AWS" },
            { value: "Azure", label: "Azure" },
            { value: "GCP", label: "GCP" },
            { value: "DevOps", label: "DevOps" },
            { value: "Multi-Cloud", label: "Multi-Cloud" },
          ],
          allOptionText: "All Platforms",
        },
      ]}
    >
      {!listLoading && activeFiltersCount > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          <Badge variant="secondary">
            {activeFiltersCount} filter{activeFiltersCount > 1 ? "s" : ""} active
          </Badge>
          {priceFilter !== "all" && (
            <Badge variant={priceFilter === "free" ? "secondary" : "default"}>
              {priceFilter === "free" ? "Free" : "Paid"}
            </Badge>
          )}
          {levelFilter !== "all" && (
            <Badge variant="outline" className="capitalize">
              {levelFilter}
            </Badge>
          )}
          {platformFilter !== "all" && <Badge variant="outline">{platformFilter}</Badge>}
        </div>
      )}

      {!listLoading && totalItems > 0 && (
        <div className="mb-2">
          <GlobalPagination
            mode="toolbar"
          variant="split"
          page={page}
          totalPages={totalPages}
          totalItems={totalItems}
          itemsPerPage={perPage}
          onItemsPerPageChange={handlePerPageChange}
          showItemsPerPage
          showInfo
          itemsPerPageOptions={PER_PAGE_OPTIONS}
          />
        </div>
      )}

      <div className={CATALOG_GRID_CLASS}>
        {listLoading ? (
          <>
            {Array.from({ length: Math.min(perPage, 8) }).map((_, index) => (
              <LabCardSkeleton key={index} />
            ))}
          </>
        ) : (
          <>
            {paginatedLabs.map((lab) => {
              const isFree = lab.isFree ?? lab.is_free ?? !!(lab.price === 0 || lab.price === "0.00");
              const level =
                lab.level ||
                (lab.difficulty ? lab.difficulty.charAt(0).toUpperCase() + lab.difficulty.slice(1) : "");
              const duration =
                lab.duration ||
                (typeof lab.time_limit_minutes === "number" ? `${lab.time_limit_minutes} min` : "—");
              const enrolledCount = resolveLabCardEnrolledCount(lab);
              const thumbnail = lab.thumbnail || lab.thumbnail_url || lab.image || "";
              const labKind =
                lab.lab_kind === "skill_builder" || lab.metadata?.lab_kind === "skill_builder"
                  ? "skill_builder"
                  : "lab";
              const rating = resolveLabCardRating(lab);
              const labOwnerId = lab.created_by ?? lab.createdBy ?? lab.creator?.id;
              const isOwnLab =
                labOwnerId != null &&
                currentUserId != null &&
                String(labOwnerId) === String(currentUserId);
              const showLabActions =
                (isMine && (canEditLabs || canDeleteLabs)) ||
                (isAllLabsView && superAdmin) ||
                (isAllLabsView && (canEditLabs || canDeleteLabs) && isOwnLab);
              return (
                <LabCard
                  key={lab.id || lab._id}
                  id={lab.id || lab._id}
                  slug={lab.slug}
                  title={lab.title}
                  description={lab.description}
                  thumbnail={resolveMediaUrl(thumbnail)}
                  isFree={isFree}
                  price={lab.price}
                  currency={resolveItemCurrency(lab)}
                  duration={duration}
                  level={level}
                  rating={rating}
                  enrolledCount={enrolledCount}
                  labKind={labKind}
                  status={lab.status}
                  labCode={lab.lab_code}
                  version={lab.version}
                  createdAt={lab.created_at || lab.createdAt}
                  updatedAt={lab.updated_at || lab.updatedAt}
                  platform={lab.platform}
                  showActions={showLabActions}
                  showAdminDates
                  prefetchOverview={false}
                />
              );
            })}
          </>
        )}
      </div>

      {!listLoading && paginatedLabs.length === 0 && (
        <div className="text-center py-16">
          <Beaker className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-foreground mb-2">No labs found</h3>
          <p className="text-muted-foreground">Try adjusting your filters or search query</p>
        </div>
      )}

      {!listLoading && totalItems > 0 && (
        <GlobalPagination
          mode="nav"
          variant="split"
          page={page}
          totalPages={totalPages}
          totalItems={totalItems}
          itemsPerPage={perPage}
          onPageChange={handlePageChange}
          showInfo={false}
        />
      )}

      <BulkLabUploadModal
        open={isBulkLabModalOpen}
        onOpenChange={setIsBulkLabModalOpen}
        onSuccess={() => handleRefresh()}
      />
    </GlobalListManager>
  );
}
