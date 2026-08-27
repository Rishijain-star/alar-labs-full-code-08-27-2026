import { useMemo, useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation, Navigate } from "react-router-dom";
import { Plus } from "lucide-react";
import GlobalPagination from "../../components/common/Pagination";
import GlobalListManager from "../../components/common/Globallistmanager";
import { useGetCoursesQuery } from "@/store/api/courseApi";
import { CourseCard } from "@/components/cards/CourseCard";
import { CourseCardSkeleton } from "../../components/common/CourseCardSkeleton";
import { resolveMediaUrl } from "@/lib/mediaUrl";
import { hasPermission } from "@/utils/permissions";
import { isApprover } from "@/lib/auth";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { resolveItemCurrency } from "@/lib/localeFormat";

const DEFAULT_PER_PAGE = 12;
const PER_PAGE_OPTIONS = [4, 8, 12, 16, 24];
const CATALOG_GRID_CLASS =
  "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 justify-items-stretch";

export default function AdminCourses() {
  const navigate = useNavigate();
  const location = useLocation();
  const scope = location.pathname.includes("/others") ? "others" : "mine";
  const isMine = scope === "mine";
  const userIsApprover = isApprover();
  const canCreateCourses = hasPermission("create_courses") && !userIsApprover;
  const canEditCourses = hasPermission("edit_courses") && !userIsApprover;
  const canDeleteCourses = hasPermission("delete_courses") && !userIsApprover;

  if (userIsApprover && isMine) {
    return <Navigate to="/app/courses/others" replace />;
  }

  if (isMine && !canCreateCourses && !canEditCourses && !canDeleteCourses) {
    return <Navigate to="/app/courses/others" replace />;
  }
  const [q, setQ] = useState("");
  const debouncedSearch = useDebouncedValue(q, 3000);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(DEFAULT_PER_PAGE);
  const [levelFilter, setLevelFilter] = useState("all");
  const [pricingFilter, setPricingFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    setPage(1);
  }, [scope, debouncedSearch, levelFilter, pricingFilter, statusFilter, perPage]);

  const { data, isLoading, isFetching } = useGetCoursesQuery({
    page,
    limit: perPage,
    scope,
    search: debouncedSearch.trim() || undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
  });

  const serverRows =
    data?.data?.rows ||
    data?.rows ||
    data?.data?.items ||
    data?.items ||
    data?.data ||
    [];

  const filteredRows = useMemo(() => {
    let filtered = [...serverRows];

    if (levelFilter !== "all") {
      filtered = filtered.filter((c) => c.level === levelFilter);
    }

    if (pricingFilter !== "all") {
      filtered = filtered.filter((c) => c.pricing === pricingFilter);
    }

    return filtered;
  }, [serverRows, levelFilter, pricingFilter]);

  const totalItems =
    data?.data?.pagination?.total ||
    data?.pagination?.total ||
    data?.data?.total ||
    data?.total ||
    filteredRows.length;

  const totalPages =
    data?.data?.pagination?.totalPages ||
    data?.pagination?.totalPages ||
    data?.data?.pagination?.total_pages ||
    data?.pagination?.total_pages ||
    data?.data?.totalPages ||
    data?.totalPages ||
    Math.max(1, Math.ceil(totalItems / perPage));

  const handlePageChange = useCallback((newPage) => setPage(newPage), []);
  const handlePerPageChange = useCallback((next) => {
    setPerPage(next);
    setPage(1);
  }, []);
  const handleRefresh = () => { };
  const handleExport = () => console.log("Exporting courses...", filteredRows);
  const handleAddCourse = () => navigate("/app/courses/new");

  const listLoading = isLoading || isFetching || q.trim() !== debouncedSearch.trim();

  return (
    <GlobalListManager
      title={isMine ? "My Courses" : "All Courses"}
      description={
        isMine
          ? "Courses you created — edit or delete from here"
          : "Courses created by other instructors"
      }
      addButtonText="New Course"
      addButtonIcon={Plus}
      onAdd={isMine && canCreateCourses ? handleAddCourse : undefined}
      showAddButton={isMine && canCreateCourses}
      onExport={handleExport}
      onRefresh={handleRefresh}
      isRefreshing={false}
      searchConfig={{
        value: q,
        onChange: setQ,
        onPageReset: () => setPage(1),
        placeholder: "Search courses...",
      }}
      permissions={{
        checkPermissions: true,
        resource: "courses",
        actions: {
          create: "create_courses",
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
          width: "w-40",
          options: [
            { value: "published", label: "Published" },
            { value: "draft", label: "Draft" },
            { value: "archived", label: "Archived" },
          ],
          allOptionText: "All Statuses",
        },
        {
          value: levelFilter,
          onChange: setLevelFilter,
          onPageReset: () => setPage(1),
          placeholder: "Level",
          width: "w-44",
          options: [
            { value: "Beginner", label: "Beginner" },
            { value: "Intermediate", label: "Intermediate" },
            { value: "Advanced", label: "Advanced" },
          ],
          allOptionText: "All Levels",
        },
        {
          value: pricingFilter,
          onChange: setPricingFilter,
          onPageReset: () => setPage(1),
          placeholder: "Pricing",
          width: "w-40",
          options: [
            { value: "free", label: "Free" },
            { value: "paid", label: "Paid" },
          ],
          allOptionText: "All Pricing",
        },
      ]}
    >
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

      {listLoading ? (
        <div className={CATALOG_GRID_CLASS}>
          {Array.from({ length: Math.min(perPage, 8) }).map((_, index) => (
            <CourseCardSkeleton key={index} />
          ))}
        </div>
      ) : (
        <>
          {filteredRows.length > 0 ? (
            <div className={CATALOG_GRID_CLASS}>
              {filteredRows.map((c) => (
                <CourseCard
                  key={c.id || c._id}
                  id={c.id || c._id}
                  slug={c.slug}
                  title={c.title}
                  description={c.description || ""}
                  thumbnail={resolveMediaUrl(c.thumbnail || c.thumbnailUrl || c.image) || ""}
                  isFree={c.isFree ?? c.is_free ?? false}
                  price={c.price ?? 0}
                  currency={resolveItemCurrency(c)}
                  duration={c.duration || "N/A"}
                  level={c.level || "Beginner"}
                  rating={c.rating ?? 0}
                  enrolledCount={c.enrolledCount ?? c.enrolled_count ?? 0}
                  modulesCount={c.modulesCount ?? c.modules_count ?? 0}
                  labsCount={c.labsCount ?? c.labs_count ?? 0}
                  platform={c.platform || c.vendor_platform || ""}
                  vendorPlatform={c.platform || c.vendor_platform || ""}
                  status={c.status}
                  courseCode={c.course_code}
                  version={c.version}
                  createdAt={c.created_at || c.createdAt}
                  updatedAt={c.updated_at || c.updatedAt}
                  showActions={isMine && (canEditCourses || canDeleteCourses)}
                  showAdminDates
                  prefetchOverview={false}
                  onAction={
                    isMine
                      ? undefined
                      : () => {
                          if (c.slug) {
                            navigate(`/courses/${c.slug}`);
                          }
                        }
                  }
                />
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              {q || levelFilter !== "all" || pricingFilter !== "all"
                ? "No courses found matching your filters"
                : "No courses available"}
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
        </>
      )}
    </GlobalListManager>
  );
}