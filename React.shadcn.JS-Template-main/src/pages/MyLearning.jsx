import axios from "axios";
import { useGetMyLearningQuery } from "@/store/api/learningApi";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Loader2, BookOpen } from "lucide-react";
import { resolveItemCurrency } from "@/lib/localeFormat";
import { CourseCard } from "@/components/cards/CourseCard";

function parseMeta(meta) {
  if (!meta) return {};
  if (typeof meta === "string") {
    try {
      return JSON.parse(meta);
    } catch {
      return {};
    }
  }
  return meta;
}

export default function MyLearning() {
  const { data, isLoading, isError, refetch } = useGetMyLearningQuery(undefined, {
    refetchOnMountOrArgChange: true,
  });
  const payload = data?.data ?? data;
  const courses = payload?.courses ?? [];

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] gap-3">
        <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
        <p className="text-muted-foreground">Loading your courses…</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">My Courses</h1>
        <p className="text-destructive">Could not load course data. Try again.</p>
        <Button onClick={() => refetch()}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Courses</h1>
        <p className="text-muted-foreground mt-1">
          Courses you are enrolled in — including free and purchased courses.
        </p>
      </div>

      {courses.length === 0 ? (
        <div className="rounded-2xl border border-dashed bg-muted/20 py-20 text-center">
          <BookOpen className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-foreground mb-2">No enrolled courses</h3>
          <p className="text-muted-foreground mb-4">You haven't enrolled in or purchased any courses yet.</p>
          <Button asChild variant="outline">
            <Link to="/courses">Browse Courses</Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 justify-items-stretch">
          {courses.map((c) => {
            const meta = parseMeta(c.metadata);
            return (
              <CourseCard
                key={`course-${c.courseId || c.id}`}
                id={c.courseId || c.id}
                slug={c.slug}
                title={c.title}
                description={c.description || meta.short_description}
                thumbnail={c.thumbnail}
                duration={c.duration || meta.duration || "Self-paced"}
                modulesCount={c.modulesCount || meta.modulesCount}
                labsCount={c.labsCount || meta.labsCount}
                level={c.level || meta.level}
                isFree={c.isFree}
                price={c.price}
                currency={c.currency || meta.currency || resolveItemCurrency(c)}
                enrolledView={true}
                progress={c.progress}
                platform={c.platform || meta.platform}
                rating={c.rating || meta.rating || 4.8}
                enrolledCount={c.enrolledCount || meta.enrolledCount || meta.studentCount || meta.student_count || 1200}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
