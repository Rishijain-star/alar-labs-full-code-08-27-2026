import { useState, useEffect, useRef } from "react";

import { LabCard } from "@/components/cards/LabCard";
import { LabCardSkeleton } from "@/components/common/LabCardSkeleton";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Beaker, Loader2 } from "lucide-react";
import { useGetPublicLabsQuery } from "@/store/api/labApi";
import { Button } from "@/components/ui/button";
import { normalizeLabsPayload } from "@/lib/normalizeApiPayload";

const PAGE_SIZE = 8;

function mapLabRow(l) {
  return {
    id: l.id || l._id,
    slug: l.slug,
    title: l.title,
    description: l.description || "",
    thumbnail: l.thumbnail || "https://images.unsplash.com/photo-1516116216624-53e697fedbea?w=500",
    isFree: l.is_free ?? false,
    price: l.price ?? 0,
    duration: l.time_limit_minutes ? `${Math.round(l.time_limit_minutes)} min` : "N/A",
    level: l.difficulty || "Intermediate",
    rating: typeof l.rating === "number" && Number.isFinite(l.rating) ? l.rating : undefined,
    enrolledCount:
      typeof l.enrolled_count === "number"
        ? l.enrolled_count
        : typeof l.enrolledCount === "number"
          ? l.enrolledCount
          : undefined,
    platform: l.platform || undefined,
    labKind: l.lab_kind || l.labKind || null,
  };
}

export default function LabsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [priceFilter, setPriceFilter] = useState("all");
  const [levelFilter, setLevelFilter] = useState("all");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [labs, setLabs] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const didInitFiltersRef = useRef(false);
  const mergedPagesRef = useRef(new Set());

  const params = {
    limit: PAGE_SIZE,
    page,
    status: "published",
    difficulty: levelFilter !== "all" ? levelFilter : undefined,
  };

  const { data, isFetching, isLoading: qLoading } = useGetPublicLabsQuery(params, {
    refetchOnMountOrArgChange: true,
  });

  const isInitialLoading = qLoading || (isFetching && labs.length === 0);
  const isLoadingMore = isFetching && labs.length > 0;

  useEffect(() => {
    if (isFetching || !data) return;

    const { rows, pagination } = normalizeLabsPayload(data);
    const responsePage = Number(pagination?.page) || page;

    if (responsePage !== page) return;
    if (mergedPagesRef.current.has(responsePage)) return;

    const mapped = rows.map(mapLabRow);
    mergedPagesRef.current.add(responsePage);

    setLabs((prev) => {
      if (responsePage === 1) return mapped;
      const seen = new Set(prev.map((l) => l.id));
      const next = mapped.filter((l) => l.id && !seen.has(l.id));
      return next.length ? [...prev, ...next] : prev;
    });

    setHasMore(
      pagination?.has_next === true ||
        (pagination?.has_next !== false && rows.length === PAGE_SIZE)
    );
  }, [data, page, isFetching]);

  useEffect(() => {
    if (!didInitFiltersRef.current) {
      didInitFiltersRef.current = true;
      return;
    }
    mergedPagesRef.current = new Set();
    setPage(1);
    setLabs([]);
    setHasMore(true);
  }, [levelFilter]);

  const handleLoadMore = () => {
    if (hasMore && !isFetching) setPage((p) => p + 1);
  };

  const filteredLabs = labs.filter((lab) => {
    const matchesSearch =
      lab.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lab.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPrice =
      priceFilter === "all" ||
      (priceFilter === "free" && lab.isFree) ||
      (priceFilter === "paid" && !lab.isFree);
    const matchesLevel = levelFilter === "all" || lab.level.toLowerCase() === levelFilter;
    const matchesPlatform = platformFilter === "all" || lab.platform === platformFilter;

    return matchesSearch && matchesPrice && matchesLevel && matchesPlatform;
  });

  return (
    <div>
      <main className="pt-24 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-secondary to-secondary/70 flex items-center justify-center">
                <Beaker className="w-6 h-6 text-secondary-foreground" />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-foreground">Skill Builder Labs</h1>
                <p className="text-muted-foreground">Hands-on practice with real cloud environments</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-4 mb-8">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search labs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex gap-3">
              <Select value={priceFilter} onValueChange={setPriceFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Price" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Prices</SelectItem>
                  <SelectItem value="free">Free</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                </SelectContent>
              </Select>

              <Select value={levelFilter} onValueChange={setLevelFilter}>
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

              <Select value={platformFilter} onValueChange={setPlatformFilter}>
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

          {!isInitialLoading && (
            <div className="flex items-center justify-between mb-6">
              <p className="text-muted-foreground">
                Showing <span className="font-semibold text-foreground">{filteredLabs.length}</span> labs
              </p>
              <div className="flex gap-2">
                {priceFilter !== "all" && (
                  <Badge variant={priceFilter === "free" ? "free" : "paid"}>
                    {priceFilter === "free" ? "Free" : "Paid"}
                  </Badge>
                )}
                {levelFilter !== "all" && <Badge variant="level">{levelFilter}</Badge>}
                {platformFilter !== "all" && <Badge variant="outline">{platformFilter}</Badge>}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {isInitialLoading
              ? Array.from({ length: PAGE_SIZE }).map((_, index) => (
                  <LabCardSkeleton key={`sk-${index}`} />
                ))
              : filteredLabs.map((lab) => <LabCard key={lab.id} {...lab} />)}

            {isLoadingMore &&
              Array.from({ length: 4 }).map((_, index) => (
                <LabCardSkeleton key={`more-sk-${index}`} />
              ))}
          </div>

          {!isInitialLoading && hasMore && filteredLabs.length > 0 && (
            <div className="flex items-center justify-center mt-8">
              <Button onClick={handleLoadMore} variant="outline" disabled={isFetching} className="min-w-[140px]">
                {isFetching ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Loading…
                  </>
                ) : (
                  "Load More"
                )}
              </Button>
            </div>
          )}

          {!isInitialLoading && !isFetching && !hasMore && filteredLabs.length > 0 && (
            <p className="text-center text-sm text-muted-foreground mt-8">You&apos;ve seen all labs.</p>
          )}

          {!isInitialLoading && filteredLabs.length === 0 && (
            <div className="text-center py-16">
              <Beaker className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">No labs found</h3>
              <p className="text-muted-foreground">Try adjusting your filters or search query</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
