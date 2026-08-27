import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { LabCard } from "@/components/cards/LabCard";
import { LabCardSkeleton } from "@/components/common/LabCardSkeleton";
import { resolveMediaUrl } from "@/lib/mediaUrl";
import GlobalPagination from "@/components/common/Pagination";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Beaker, Plus, Zap, BookOpen } from "lucide-react";
import GlobalListManager from "../../components/common/Globallistmanager";
import { useGetLabsQuery } from "@/store/api/labApi";

export default function Lab() {
  const navigate = useNavigate();

  const [page, setPage] = useState(1);
  const limit = 8;
  const [searchQuery, setSearchQuery] = useState("");
  const [priceFilter, setPriceFilter] = useState("all");
  const [levelFilter, setLevelFilter] = useState("all");
  const [platformFilter, setPlatformFilter] = useState("all");

  const { data, isLoading: apiLoading, isFetching } = useGetLabsQuery({
    page,
    limit,
    search: searchQuery.trim(),
    level: levelFilter !== "all" ? levelFilter : undefined,
    price: priceFilter !== "all" ? priceFilter : undefined,
    platform: platformFilter !== "all" ? platformFilter : undefined,
  });

  const serverLabs =
    data?.data?.rows ||
    data?.data?.items ||
    data?.rows ||
    data?.items ||
    data?.data ||
    [];
  const dataLabs = Array.isArray(serverLabs) ? serverLabs : [];

  const filteredLabs = dataLabs.filter((lab) => {
    const matchesSearch =
      lab.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (lab.description || "").toLowerCase().includes(searchQuery.toLowerCase());
    const isFreeVal = (lab.isFree ?? lab.is_free) === true;
    const matchesPrice =
      priceFilter === "all" ||
      (priceFilter === "free" && isFreeVal) ||
      (priceFilter === "paid" && !isFreeVal);
    const lvl = (lab.level || lab.difficulty || "").toLowerCase();
    const matchesLevel = levelFilter === "all" || lvl === levelFilter;
    const plat = lab.platform;
    const matchesPlatform = platformFilter === "all" || (plat ? plat === platformFilter : true);

    return matchesSearch && matchesPrice && matchesLevel && matchesPlatform;
  });

  const totalLabs = filteredLabs.length;
  const totalPages = Math.ceil(totalLabs / limit);
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedLabs = filteredLabs.slice(startIndex, endIndex);

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
    navigate("/app/labs/normal-learning-lab-new");
  };

  const handlePageChange = (newPage) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const activeFiltersCount = [
    priceFilter !== "all",
    levelFilter !== "all",
    platformFilter !== "all",
  ].filter(Boolean).length;

  const listLoading = apiLoading || (isFetching && dataLabs.length === 0);

  return (
    <GlobalListManager
      title="Skill Builder Labs"
      description="Hands-on practice with real cloud environments"
      addButtonText="Create Lab"
      addButtonIcon={Plus}
      onAdd={handleAddLab}
      onExport={handleExport}
      onRefresh={handleRefresh}
      isRefreshing={isFetching}
      customActions={
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleAddNormalLearningLab}
            className="bg-blue-600 hover:bg-blue-700 text-white border-0"
          >
            <BookOpen className="mr-2 h-4 w-4" />
            Create Learning Lab
          </Button>
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
      {!listLoading && (
        <div className="flex items-center justify-between mb-6">
          <p className="text-muted-foreground">
            Showing{" "}
            <span className="font-semibold text-foreground">{paginatedLabs.length}</span> of{" "}
            <span className="font-semibold text-foreground">{totalLabs}</span> labs
          </p>
          <div className="flex gap-2">
            {activeFiltersCount > 0 && (
              <Badge variant="secondary">
                {activeFiltersCount} filter{activeFiltersCount > 1 ? "s" : ""} active
              </Badge>
            )}
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
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {listLoading ? (
          <>
            {Array.from({ length: limit }).map((_, index) => (
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
              const enrolledCount =
                typeof lab.enrolledCount === "number"
                  ? lab.enrolledCount
                  : typeof lab.enrolled_count === "number"
                    ? lab.enrolled_count
                    : undefined;
              const thumbnail = lab.thumbnail || lab.thumbnail_url || lab.image || "";
              const labKind =
                lab.lab_kind === "skill_builder" || lab.metadata?.lab_kind === "skill_builder"
                  ? "skill_builder"
                  : "lab";
              const rating =
                typeof lab.rating === "number" && Number.isFinite(lab.rating) ? lab.rating : undefined;
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
                  duration={duration}
                  level={level}
                  rating={rating}
                  enrolledCount={enrolledCount}
                  labKind={labKind}
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

      {!listLoading && totalPages > 1 && (
        <div className="mt-8">
          <GlobalPagination
            page={page}
            totalPages={totalPages}
            totalItems={totalLabs}
            itemsPerPage={limit}
            onPageChange={handlePageChange}
            showInfo={true}
          />
        </div>
      )}
    </GlobalListManager>
  );
}
