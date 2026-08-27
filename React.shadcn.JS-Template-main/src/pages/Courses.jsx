import { useMemo, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CourseCard } from "@/components/cards/CourseCard";
import { CourseCardSkeleton } from "@/components/common/CourseCardSkeleton";
import GlobalPagination from "@/components/common/Pagination";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, GraduationCap } from "lucide-react";
import { useGetPublicCoursesQuery } from "@/store/api/courseApi";
import { resolveMediaUrl } from "@/lib/mediaUrl";
import { normalizeCoursesPayload } from "@/lib/normalizeApiPayload";
import { resolveItemCurrency } from "@/lib/localeFormat";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";

const DEFAULT_PER_PAGE = 12;
const PER_PAGE_OPTIONS = [4, 8, 12, 16, 24];

const CATALOG_GRID_CLASS =
  "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 justify-items-stretch";

function stripHtmlToPlain(s) {
  if (s == null || s === "") return "";
  return String(s).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function readIntParam(params, key, fallback, { min = 1, max = 100 } = {}) {
  const n = Number(params.get(key));
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(n)));
}

function patchSearchParams(prev, patch, { resetPage = false } = {}) {
  const next = new URLSearchParams(prev);
  if (resetPage) next.set("page", "1");

  for (const [key, value] of Object.entries(patch)) {
    if (value == null || value === "" || value === "all") {
      next.delete(key);
    } else {
      next.set(key, String(value));
    }
  }

  if ((next.get("page") || "1") === "1") next.delete("page");
  if ((next.get("per_page") || String(DEFAULT_PER_PAGE)) === String(DEFAULT_PER_PAGE)) {
    next.delete("per_page");
  }

  return next;
}

export default function CoursesPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const page = readIntParam(searchParams, "page", 1);
  const perPage = readIntParam(searchParams, "per_page", DEFAULT_PER_PAGE, { min: 4, max: 48 });
  const searchQuery = searchParams.get("search") || searchParams.get("skills")?.split(",")[0]?.trim() || "";
  const priceFilter = searchParams.get("price") || "all";
  const levelFilter = searchParams.get("level") || "all";

  const debouncedSearch = useDebouncedValue(searchQuery, 400);

  const updateParams = useCallback(
    (patch, options) => {
      setSearchParams((prev) => patchSearchParams(prev, patch, options), { replace: true });
    },
    [setSearchParams],
  );

  const params = {
    status: "published",
    limit: perPage,
    page,
    level: levelFilter !== "all" ? levelFilter : undefined,
    is_free: priceFilter === "free" ? true : priceFilter === "paid" ? false : undefined,
    search: debouncedSearch || undefined,
  };

  const { data, isFetching, isLoading } = useGetPublicCoursesQuery(params, {
    refetchOnMountOrArgChange: true,
    refetchOnReconnect: true,
  });

  const { courses, totalCount, totalPages } = useMemo(() => {
    const { rows, pagination } = normalizeCoursesPayload(data);
    const total = Number(pagination?.total) || rows.length;
    const pages =
      Number(pagination?.total_pages) ||
      Math.max(1, Math.ceil(total / perPage));

    const mapped = rows.map((c) => ({
      id: c.id || c._id,
      slug: c.slug,
      title: c.title,
      description: stripHtmlToPlain(c.description || c.short_description || ""),
      thumbnail:
        resolveMediaUrl(c.thumbnail || c.image)
        || "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=500",
      isFree: c.is_free ?? c.isFree ?? false,
      price: c.price ?? c.list_price ?? 0,
      currency: resolveItemCurrency(c),
      duration: c.duration || c.duration_label || "N/A",
      level: c.level || "Beginner",
      rating: c.rating ?? 0,
      enrolledCount: c.enrolled_count ?? c.enrolledCount ?? c.enrolled_display ?? 0,
      modulesCount: c.modules_count ?? c.modulesCount ?? 0,
      labsCount: c.labs_count ?? c.labsCount ?? 0,
      skills: Array.isArray(c.tech_stack) ? c.tech_stack : (Array.isArray(c.techStack) ? c.techStack : []),
      vendorPlatform: c.vendor_platform || c.platform || "",
      platform: c.platform || c.vendor_platform || "",
    }));

    return { courses: mapped, totalCount: total, totalPages: pages };
  }, [data, perPage]);

  const listLoading = isLoading || (isFetching && !data);

  const handleCourseAction = (course) => {
    if (!course?.slug) return;
    navigate(`/courses/${course.slug}`);
  };

  return (
    <div>
      <main className="pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
                <GraduationCap className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-foreground">
                  Digital Skills Programs
                </h1>
                <p className="text-muted-foreground">
                  Structured courses from beginner to expert
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border bg-card/50 p-4 sm:p-5 mb-8 shadow-sm">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search courses..."
                  value={searchQuery}
                  onChange={(e) => updateParams({ search: e.target.value.trim() || undefined }, { resetPage: true })}
                  className="pl-10"
                />
              </div>

              <div className="flex flex-wrap gap-3">
                <Select
                  value={priceFilter}
                  onValueChange={(v) => updateParams({ price: v }, { resetPage: true })}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Price" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Prices</SelectItem>
                    <SelectItem value="free">Free</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={levelFilter}
                  onValueChange={(v) => updateParams({ level: v }, { resetPage: true })}
                >
                  <SelectTrigger className="w-36">
                    <SelectValue placeholder="Level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Levels</SelectItem>
                    <SelectItem value="beginner">Beginner</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                    <SelectItem value="expert">Expert</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {!listLoading && (priceFilter !== "all" || levelFilter !== "all") && (
            <div className="flex flex-wrap gap-2 mb-6">
              {priceFilter !== "all" && (
                <Badge variant={priceFilter === "free" ? "free" : "paid"}>
                  {priceFilter === "free" ? "Free" : "Paid"}
                </Badge>
              )}
              {levelFilter !== "all" && (
                <Badge variant="level">{levelFilter}</Badge>
              )}
            </div>
          )}

          {!listLoading && totalCount > 0 && (
            <div className="mb-2">
              <GlobalPagination
                mode="toolbar"
              variant="split"
              page={page}
              totalPages={totalPages}
              totalItems={totalCount}
              itemsPerPage={perPage}
              onItemsPerPageChange={(n) => updateParams({ per_page: n }, { resetPage: true })}
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
          ) : courses.length === 0 ? (
            <div className="rounded-2xl border border-dashed bg-muted/20 py-20 text-center">
              <GraduationCap className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">No courses found</h3>
              <p className="text-muted-foreground">
                Try adjusting your filters or search query
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-border/60 bg-gradient-to-b from-muted/25 to-transparent p-4 sm:p-6 md:p-8">
              <div className={CATALOG_GRID_CLASS}>
                {courses.map((course) => (
                  <CourseCard
                    key={course.id}
                    {...course}
                    prefetchOverview={false}
                    onAction={handleCourseAction}
                  />
                ))}
              </div>
            </div>
          )}

          {!listLoading && totalCount > 0 && (
            <GlobalPagination
              mode="nav"
              variant="split"
              page={page}
              totalPages={totalPages}
              totalItems={totalCount}
              itemsPerPage={perPage}
              onPageChange={(p) => updateParams({ page: p })}
              showInfo={false}
            />
          )}
        </div>
      </main>
    </div>
  );
}
