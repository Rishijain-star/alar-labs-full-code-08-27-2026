import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import GlobalPagination from "../../components/common/Pagination";
import GlobalListManager from "../../components/common/Globallistmanager";
import { useGetCoursesQuery } from "@/store/api/courseApi";
import { CourseCard } from "@/components/cards/CourseCard";
import { CourseCardSkeleton } from "../../components/common/CourseCardSkeleton";
import { resolveMediaUrl } from "@/lib/mediaUrl";

export default function AdminCourses() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [levelFilter, setLevelFilter] = useState("all");
  const [pricingFilter, setPricingFilter] = useState("all");
  const itemsPerPage = 9;

  const { data, isLoading, isFetching } = useGetCoursesQuery({
    page,
    limit: itemsPerPage,
    search: q.trim(),
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

    const searchTerm = q.trim().toLowerCase();
    if (searchTerm) {
      filtered = filtered.filter((c) => c.title.toLowerCase().includes(searchTerm));
    }

    if (levelFilter !== "all") {
      filtered = filtered.filter((c) => c.level === levelFilter);
    }

    if (pricingFilter !== "all") {
      filtered = filtered.filter((c) => c.pricing === pricingFilter);
    }

    return filtered;
  }, [serverRows, q, levelFilter, pricingFilter]);

  const totalItems =
    data?.data?.pagination?.total ||
    data?.pagination?.total ||
    data?.data?.total ||
    data?.total ||
    filteredRows.length;

  const totalPages =
    data?.data?.pagination?.totalPages ||
    data?.pagination?.totalPages ||
    data?.data?.totalPages ||
    data?.totalPages ||
    Math.ceil(totalItems / itemsPerPage);

  const handlePageChange = (newPage) => setPage(newPage);
  const handleRefresh = () => { };
  const handleExport = () => console.log("Exporting courses...", filteredRows);
  const handleAddCourse = () => navigate("/app/courses/new");

  return (
    <GlobalListManager
      title="Courses"
      description="Manage and organize all your courses"
      addButtonText="New Course"
      addButtonIcon={Plus}
      onAdd={handleAddCourse}
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
      {isLoading || isFetching ? (
        // ✅ Grid wrapper is outside the map — all skeletons share one grid
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: itemsPerPage }).map((_, index) => (
            <CourseCardSkeleton key={index} />
          ))}
        </div>
      ) : (
        <>
          {filteredRows.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
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
                  duration={c.duration || "N/A"}
                  level={c.level || "Beginner"}
                  rating={c.rating ?? 0}
                  enrolledCount={c.enrolledCount ?? c.enrolled_count ?? 0}
                  modulesCount={c.modulesCount ?? c.modules_count ?? 0}
                  labsCount={c.labsCount ?? c.labs_count ?? 0}
                  onAction={() => {
                    if (c.slug) {
                      navigate(`/courses/${c.slug}`);
                    } else {
                      navigate("/app/courses/list");
                    }
                  }}
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

          {totalPages > 1 && (
            <div className="mt-6">
              <GlobalPagination
                page={page}
                totalPages={totalPages}
                totalItems={totalItems}
                itemsPerPage={itemsPerPage}
                onPageChange={handlePageChange}
                showInfo={true}
              />
            </div>
          )}
        </>
      )}
    </GlobalListManager>
  );
}