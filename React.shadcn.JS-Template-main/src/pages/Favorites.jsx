import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Bookmark, Beaker, GraduationCap, Sparkles } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CourseCard } from "@/components/cards/CourseCard";
import { LabCard } from "@/components/cards/LabCard";
import { CourseCardSkeleton } from "@/components/common/CourseCardSkeleton";
import { LabCardSkeleton } from "@/components/common/LabCardSkeleton";
import GlobalPagination from "@/components/common/Pagination";
import { useGetFavoritesQuery } from "@/store/api/favoriteApi";
import { resolveMediaUrl } from "@/lib/mediaUrl";
import { resolveItemCurrency } from "@/lib/localeFormat";
import { mapLabRowForCard } from "@/lib/labDisplayStats";
import { stripHtmlToPlain } from "@/lib/stripHtml";

const DEFAULT_PER_PAGE = 12;
const PER_PAGE_OPTIONS = [4, 8, 12, 16, 24];
const CATALOG_GRID_CLASS =
  "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 justify-items-stretch";

const DIFFICULTY_LABEL = {
  easy: "Beginner",
  medium: "Intermediate",
  hard: "Advanced",
};

function readIntParam(params, key, fallback, { min = 1, max = 100 } = {}) {
  const n = Number(params.get(key));
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(n)));
}

function patchSearchParams(prev, patch, { resetPage = false } = {}) {
  const next = new URLSearchParams(prev);
  if (resetPage) next.set("page", "1");

  for (const [key, value] of Object.entries(patch)) {
    if (value == null || value === "") {
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

function mapCourseRow(c) {
  return {
    id: c.id || c._id,
    slug: c.slug,
    title: c.title,
    description: stripHtmlToPlain(c.description || c.short_description || ""),
    thumbnail:
      resolveMediaUrl(c.thumbnail || c.image)
      || "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=500",
    isFree: c.is_free ?? c.isFree ?? false,
    price: c.price ?? 0,
    currency: resolveItemCurrency(c),
    duration: c.duration || c.duration_label || "N/A",
    level: c.level || "Beginner",
    rating: c.rating ?? 0,
    enrolledCount: c.enrolled_count ?? c.enrolledCount ?? 0,
    modulesCount: c.modules_count ?? c.modulesCount ?? 0,
    labsCount: c.labs_count ?? c.labsCount ?? 0,
    platform: c.platform || c.vendor_platform || "",
  };
}

function mapLabRow(l) {
  const stats = mapLabRowForCard(l);
  return {
    id: l.id || l._id,
    slug: l.slug,
    title: l.title,
    description: l.description || "",
    thumbnail: resolveMediaUrl(l.thumbnail) || "https://images.unsplash.com/photo-1516116216624-53e697fedbea?w=500",
    isFree: l.is_free ?? false,
    price: l.price ?? 0,
    currency: resolveItemCurrency(l),
    duration: l.time_limit_minutes ? `${Math.round(l.time_limit_minutes)} min` : "N/A",
    level: DIFFICULTY_LABEL[l.difficulty] || l.difficulty || "Intermediate",
    rating: stats.rating,
    enrolledCount: stats.enrolledCount,
    platform: stats.platform,
    labKind: l.lab_kind || l.labKind || null,
  };
}

function FavoritesTabPanel({ tab, page, perPage, onPageChange, onPerPageChange }) {
  const { data, isLoading, isFetching } = useGetFavoritesQuery(
    { tab, page, limit: perPage },
    { refetchOnMountOrArgChange: true },
  );

  const rows = data?.rows || [];
  const pagination = data?.pagination || {};
  const total = Number(pagination.total) || 0;
  const totalPages = Number(pagination.total_pages) || 1;
  const listLoading = isLoading || (isFetching && !data);
  const isCourseTab = tab === "courses";

  const emptyLabel =
    tab === "courses" ? "courses" : tab === "skill_builder" ? "skill builder labs" : "labs";

  return (
    <div className="space-y-6">
      {!listLoading && total > 0 && (
        <GlobalPagination
          mode="toolbar"
          variant="split"
          page={page}
          totalPages={totalPages}
          totalItems={total}
          itemsPerPage={perPage}
          onItemsPerPageChange={onPerPageChange}
          showItemsPerPage
          showInfo
          itemsPerPageOptions={PER_PAGE_OPTIONS}
        />
      )}

      {listLoading ? (
        <div className={CATALOG_GRID_CLASS}>
          {Array.from({ length: Math.min(perPage, 8) }).map((_, i) =>
            isCourseTab ? <CourseCardSkeleton key={i} /> : <LabCardSkeleton key={i} />,
          )}
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed bg-muted/20 py-20 text-center">
          <Bookmark className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-foreground mb-2">No favorite {emptyLabel}</h3>
          <p className="text-muted-foreground">Save items using the bookmark icon on catalog cards.</p>
        </div>
      ) : (
        <div className={CATALOG_GRID_CLASS}>
          {isCourseTab
            ? rows.map((c) => <CourseCard key={c.id} {...mapCourseRow(c)} prefetchOverview={false} />)
            : rows.map((l) => (
                <LabCard key={l.id} {...mapLabRow(l)} prefetchOverview={false} />
              ))}
        </div>
      )}

      {!listLoading && total > 0 && (
        <GlobalPagination
          mode="nav"
          variant="split"
          page={page}
          totalPages={totalPages}
          totalItems={total}
          itemsPerPage={perPage}
          onPageChange={onPageChange}
          showInfo={false}
        />
      )}
    </div>
  );
}

export default function FavoritesPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const activeTab = useMemo(() => {
    const t = searchParams.get("tab") || "courses";
    if (t === "labs" || t === "skill_builder") return t;
    return "courses";
  }, [searchParams]);

  const page = readIntParam(searchParams, "page", 1);
  const perPage = readIntParam(searchParams, "per_page", DEFAULT_PER_PAGE, { min: 4, max: 48 });

  const updateParams = useCallback(
    (patch, options) => {
      setSearchParams((prev) => patchSearchParams(prev, patch, options), { replace: true });
    },
    [setSearchParams],
  );

  const handleTabChange = (tab) => {
    updateParams({ tab: tab === "courses" ? undefined : tab }, { resetPage: true });
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
            <Bookmark className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">My Favorites</h1>
            <p className="text-muted-foreground">Courses and labs you saved for later</p>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList className="grid w-full max-w-2xl grid-cols-3 h-11 p-1 bg-muted/60">
          <TabsTrigger value="courses" className="gap-2">
            <GraduationCap className="w-4 h-4" />
            Courses
          </TabsTrigger>
          <TabsTrigger value="labs" className="gap-2">
            <Beaker className="w-4 h-4" />
            Labs
          </TabsTrigger>
          <TabsTrigger value="skill_builder" className="gap-2">
            <Sparkles className="w-4 h-4" />
            Skill Builder
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-0">
          <FavoritesTabPanel
            key={activeTab}
            tab={activeTab}
            page={page}
            perPage={perPage}
            onPageChange={(p) => updateParams({ page: p })}
            onPerPageChange={(n) => updateParams({ per_page: n }, { resetPage: true })}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
