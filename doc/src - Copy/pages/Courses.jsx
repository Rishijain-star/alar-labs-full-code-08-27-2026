import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { CourseCard } from "@/components/cards/CourseCard";
import { CourseCardSkeleton } from "@/components/common/CourseCardSkeleton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, GraduationCap } from "lucide-react";
import { useGetPublicCoursesQuery } from "@/store/api/courseApi";
import { Button } from "@/components/ui/button";
import { resolveMediaUrl } from "@/lib/mediaUrl";
import { normalizeCoursesPayload } from "@/lib/normalizeApiPayload";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

function stripHtmlToPlain(s) {
  if (s == null || s === "") return "";
  return String(s).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

export default function CoursesPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const isAuthenticated = useSelector((s) => s.auth?.isAuthenticated);
  const [searchQuery, setSearchQuery] = useState("");
  const [priceFilter, setPriceFilter] = useState("all");
  const [levelFilter, setLevelFilter] = useState("all");
  const [courses, setCourses] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [pendingSlug, setPendingSlug] = useState(null);
  const didInitFiltersRef = useRef(false);
  const limit = 12;

  const params = {
    status: "published",
    limit,
    page,
    level: levelFilter !== "all" ? levelFilter : undefined,
    is_free: priceFilter === "free" ? true : priceFilter === "paid" ? false : undefined,
    search: searchQuery || undefined,
  };

  const { data, isFetching, isLoading: qLoading, isError } = useGetPublicCoursesQuery(params, {
    refetchOnMountOrArgChange: false,
    refetchOnReconnect: true,
  });
  const isLoading = qLoading || (isFetching && courses.length === 0);

  useEffect(() => {
    const list = normalizeCoursesPayload(data);
    const mapped = list.map((c) => ({
      id: c.id || c._id,
      slug: c.slug,
      title: c.title,
      description: stripHtmlToPlain(c.description || c.short_description || ""),
      thumbnail:
        resolveMediaUrl(c.thumbnail || c.image) ||
        "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=500",
      isFree: c.is_free ?? c.isFree ?? false,
      price: c.price ?? c.list_price ?? 0,
      duration: c.duration || c.duration_label || "N/A",
      level: c.level || "Beginner",
      rating: c.rating ?? 0,
      enrolledCount: c.enrolled_count ?? c.enrolledCount ?? c.enrolled_display ?? 0,
      modulesCount: c.modules_count ?? c.modulesCount ?? 0,
      labsCount: c.labs_count ?? c.labsCount ?? 0,
      skills: Array.isArray(c.tech_stack) ? c.tech_stack : (Array.isArray(c.techStack) ? c.techStack : []),
      vendorPlatform: c.vendor_platform || c.platform || "",
    }));
    setCourses((prev) => (page === 1 ? mapped : [...prev, ...mapped]));
    setHasMore(Array.isArray(list) && list.length === limit);
  }, [data, page, limit]);

  useEffect(() => {
    if (!didInitFiltersRef.current) {
      didInitFiltersRef.current = true;
      return;
    }
    setPage(1);
    setCourses([]);
    setHasMore(true);
  }, [searchQuery, levelFilter, priceFilter]);

  const handleLoadMore = () => {
    if (hasMore && !isLoading) setPage((p) => p + 1);
  };
  const handleCourseAction = (course) => {
    if (!course?.slug) return;
    if (!isAuthenticated) {
      setPendingSlug(course.slug);
      setShowLoginPrompt(true);
      return;
    }
    navigate(`/courses/${course.slug}`);
  };

  const filteredCourses = courses.filter((course) => {
    const matchesSearch = course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPrice = priceFilter === "all" ||
      (priceFilter === "free" && course.isFree) ||
      (priceFilter === "paid" && !course.isFree);
    const matchesLevel = levelFilter === "all" || course.level.toLowerCase() === levelFilter;

    return matchesSearch && matchesPrice && matchesLevel;
  });

  return (
    <div>
      <main className="pt-24 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
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

          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-8">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search courses..."
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
            </div>
          </div>

          {/* Results count */}
          {!isLoading && (
            <div className="flex items-center justify-between mb-6">
              <p className="text-muted-foreground">
                Showing <span className="font-semibold text-foreground">{filteredCourses.length}</span> courses
              </p>
              <div className="flex gap-2">
                {priceFilter !== "all" && (
                  <Badge variant={priceFilter === "free" ? "free" : "paid"}>
                    {priceFilter === "free" ? "Free" : "Paid"}
                  </Badge>
                )}
                {levelFilter !== "all" && (
                  <Badge variant="level">{levelFilter}</Badge>
                )}
              </div>
            </div>
          )}

          {/* Courses Grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {isLoading ? (
              <>
                {Array.from({ length: 6 }).map((_, index) => (
                  <CourseCardSkeleton key={index} />
                ))}
              </>
            ) : (
              <>
                {filteredCourses.map((course) => (
                  <CourseCard key={course.id} {...course} onAction={handleCourseAction} />
                ))}
              </>
            )}
          </div>

          {!isLoading && !isFetching && hasMore && filteredCourses.length > 0 && (
            <div className="flex items-center justify-center mt-8">
              <Button onClick={handleLoadMore} variant="outline">
                Load More
              </Button>
            </div>
          )}

          {!isLoading && filteredCourses.length === 0 && (
            <div className="text-center py-16">
              <GraduationCap className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">No courses found</h3>
              <p className="text-muted-foreground">
                Try adjusting your filters or search query
              </p>
            </div>
          )}
        </div>
      </main>
      <Dialog open={showLoginPrompt} onOpenChange={setShowLoginPrompt}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sign in required</DialogTitle>
            <DialogDescription>
              Please sign in to continue to the selected course.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLoginPrompt(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                setShowLoginPrompt(false);
                navigate("/auth/login", {
                  state: { from: { pathname: pendingSlug ? `/courses/${pendingSlug}` : location.pathname } },
                });
              }}
            >
              Sign In
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
