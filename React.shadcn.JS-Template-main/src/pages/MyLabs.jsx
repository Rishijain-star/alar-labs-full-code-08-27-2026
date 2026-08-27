import { Link } from "react-router-dom";
import { useGetMyLearningQuery } from "@/store/api/learningApi";
import { Button } from "@/components/ui/button";
import { Loader2, FlaskConical } from "lucide-react";
import { LabCard } from "@/components/cards/LabCard";

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

export default function MyLabs() {
  const { data, isLoading, isError, refetch } = useGetMyLearningQuery(undefined, {
    refetchOnMountOrArgChange: true,
  });
  
  const payload = data?.data ?? data;
  const labs = payload?.labs ?? [];

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] gap-3">
        <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
        <p className="text-muted-foreground">Loading your labs…</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">My Labs</h1>
        <p className="text-destructive">Could not load labs data. Try again.</p>
        <Button onClick={() => refetch()}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Labs</h1>
        <p className="text-muted-foreground mt-1">
          Hands-on labs you are enrolled in — including purchased labs, free enrollments, and labs included in your courses.
        </p>
      </div>

      {labs.length === 0 ? (
        <div className="rounded-2xl border border-dashed bg-muted/20 py-20 text-center">
          <FlaskConical className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-foreground mb-2">No labs found</h3>
          <p className="text-muted-foreground mb-4">You haven't enrolled in or purchased any labs yet.</p>
          <Button asChild variant="outline">
            <Link to="/labs">Browse Labs</Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 justify-items-stretch">
          {labs.map((l) => {
            const meta = parseMeta(l.metadata);
            return (
              <LabCard
                key={`${l.labId}-${l.source}`}
                id={l.labId}
                slug={l.slug}
                title={l.title}
                description={l.description || meta.short_description}
                thumbnail={l.thumbnail}
                duration={l.durationMin ? `${Math.round(l.durationMin)} min` : "N/A"}
                level={l.difficulty}
                labKind={l.labKind}
                labHref={`/labs/${l.slug}/start`}
                enrolledView={true}
                progress={l.progress}
                platform={l.platform || meta.platform}
                isFree={l.isFree}
                price={l.price}
                currency={l.currency || meta.currency || "INR"}
                rating={l.rating || meta.rating || 4.8}
                enrolledCount={l.enrolledCount || meta.enrolledCount || meta.studentCount || meta.student_count || 1200}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
