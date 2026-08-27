import { useMemo, useCallback } from "react";
import { useSearchParams } from "react-router-dom";

import { LabCard } from "@/components/cards/LabCard";
import { LabCardSkeleton } from "@/components/common/LabCardSkeleton";
import GlobalPagination from "@/components/common/Pagination";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Beaker, Sparkles } from "lucide-react";
import { useGetPublicLabsQuery } from "@/store/api/labApi";
import { normalizeLabsPayload } from "@/lib/normalizeApiPayload";
import { resolveItemCurrency } from "@/lib/localeFormat";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { mapLabRowForCard } from "@/lib/labDisplayStats";

const DEFAULT_PER_PAGE = 12;
const PER_PAGE_OPTIONS = [4, 8, 12, 16, 24];

const DIFFICULTY_LABEL = {
  easy: "Beginner",
  medium: "Intermediate",
  hard: "Advanced",
};

function mapLabRow(l) {
  const stats = mapLabRowForCard(l);
  return {
    id: l.id || l._id,
    slug: l.slug,
    title: l.title,
    description: l.description || "",
    thumbnail: l.thumbnail || "https://images.unsplash.com/photo-1516116216624-53e697fedbea?w=500",
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
  if (next.get("type") === "hands_on" || !next.get("type")) next.delete("type");

  return next;
}

const CATALOG_GRID_CLASS =
  "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 justify-items-stretch";

function LabsCatalog({ labKind, searchQuery, priceFilter, levelFilter, platformFilter, page, perPage, onPageChange, onPerPageChange }) {
  const debouncedSearch = useDebouncedValue(searchQuery, 400);

  const params = {
    limit: perPage,
    page,
    status: "published",
    lab_kind: labKind,
    search: debouncedSearch || undefined,
    level: levelFilter !== "all" ? levelFilter : undefined,
    platform: platformFilter !== "all" ? platformFilter : undefined,
    is_free:
      priceFilter === "free" ? true : priceFilter === "paid" ? false : undefined,
  };

  const { data, isFetching, isLoading } = useGetPublicLabsQuery(params, {
    refetchOnMountOrArgChange: true,
  });

  const { labs, totalCount, totalPages } = useMemo(() => {
    const { rows, pagination } = normalizeLabsPayload(data);
    const total = Number(pagination?.total) || rows.length;
    const pages =
      Number(pagination?.total_pages) ||
      Math.max(1, Math.ceil(total / perPage));
    return {
      labs: rows.map(mapLabRow),
      totalCount: total,
      totalPages: pages,
    };
  }, [data, perPage]);

  const listLoading = isLoading || (isFetching && !data);
  const emptyLabel = labKind === "skill_builder" ? "skill builder labs" : "labs";
  const skeletonCount = Math.min(perPage, 8);

  const activeFilterBadges = (
    <>
      {priceFilter !== "all" && (
        <Badge variant={priceFilter === "free" ? "free" : "paid"}>
          {priceFilter === "free" ? "Free" : "Paid"}
        </Badge>
      )}
      {levelFilter !== "all" && <Badge variant="level">{levelFilter}</Badge>}
      {platformFilter !== "all" && <Badge variant="outline">{platformFilter}</Badge>}
    </>
  );

  return (
    <div className="space-y-6">
      {!listLoading && (priceFilter !== "all" || levelFilter !== "all" || platformFilter !== "all") && (
        <div className="flex flex-wrap gap-2">{activeFilterBadges}</div>
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
          onItemsPerPageChange={onPerPageChange}
          showItemsPerPage
          showInfo
          itemsPerPageOptions={PER_PAGE_OPTIONS}
          />
        </div>
      )}

      {listLoading ? (
        <div className={CATALOG_GRID_CLASS}>
          {Array.from({ length: skeletonCount }).map((_, index) => (
            <LabCardSkeleton key={`sk-${labKind}-${index}`} />
          ))}
        </div>
      ) : labs.length === 0 ? (
        <div className="rounded-2xl border border-dashed bg-muted/20 py-20 text-center">
          <Beaker className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-foreground mb-2">No {emptyLabel} found</h3>
          <p className="text-muted-foreground">Try adjusting your filters or search query</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-border/60 bg-gradient-to-b from-muted/25 to-transparent p-4 sm:p-6 md:p-8">
          <div className={CATALOG_GRID_CLASS}>
            {labs.map((lab) => (
              <LabCard key={lab.id} {...lab} prefetchOverview={false} />
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
          onPageChange={onPageChange}
          showInfo={false}
        />
      )}
    </div>
  );
}

export default function LabsPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const page = readIntParam(searchParams, "page", 1);
  const perPage = readIntParam(searchParams, "per_page", DEFAULT_PER_PAGE, { min: 4, max: 48 });
  const activeTab = searchParams.get("type") === "skill_builder" ? "skill_builder" : "labs";
  const labKind = activeTab === "skill_builder" ? "skill_builder" : "hands_on";

  const searchQuery = searchParams.get("search") || searchParams.get("skills")?.split(",")[0]?.trim() || "";
  const priceFilter = searchParams.get("price") || "all";
  const levelFilter = searchParams.get("level") || "all";
  const platformFilter = searchParams.get("platform") || "all";

  const updateParams = useCallback(
    (patch, options) => {
      setSearchParams((prev) => patchSearchParams(prev, patch, options), { replace: true });
    },
    [setSearchParams],
  );

  const handleTabChange = (tab) => {
    updateParams(
      { type: tab === "skill_builder" ? "skill_builder" : undefined },
      { resetPage: true },
    );
  };

  return (
    <div>
      <main className="pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-secondary to-secondary/70 flex items-center justify-center">
                <Beaker className="w-6 h-6 text-secondary-foreground" />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-foreground">Labs</h1>
                <p className="text-muted-foreground">Hands-on practice and skill builder challenges</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border bg-card/50 p-4 sm:p-5 mb-6 shadow-sm">
            <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search labs..."
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

              <Select
                value={platformFilter}
                onValueChange={(v) => updateParams({ platform: v }, { resetPage: true })}
              >
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Platform" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Platforms</SelectItem>
                  <SelectItem value="AWS">AWS</SelectItem>
                  <SelectItem value="Azure">Azure</SelectItem>
                  <SelectItem value="GCP">GCP</SelectItem>
                  <SelectItem value="DevOps">DevOps</SelectItem>
                  <SelectItem value="Multi-Cloud">Multi-Cloud</SelectItem>
                </SelectContent>
              </Select>
            </div>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
            <TabsList className="grid w-full max-w-md grid-cols-2 h-11 p-1 bg-muted/60">
              <TabsTrigger value="labs" className="gap-2">
                <Beaker className="w-4 h-4" />
                Labs
              </TabsTrigger>
              <TabsTrigger value="skill_builder" className="gap-2">
                <Sparkles className="w-4 h-4" />
                Skill Builder Lab
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-0">
              <LabsCatalog
                key={labKind}
                labKind={labKind}
                searchQuery={searchQuery}
                priceFilter={priceFilter}
                levelFilter={levelFilter}
                platformFilter={platformFilter}
                page={page}
                perPage={perPage}
                onPageChange={(p) => updateParams({ page: p })}
                onPerPageChange={(n) => updateParams({ per_page: n }, { resetPage: true })}
              />
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
