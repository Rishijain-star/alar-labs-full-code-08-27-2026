import { Skeleton } from "@/components/ui/skeleton";

/** Matches CourseOverviewPage / OverviewDetilasPage layout (dark hero + tabs). */
export default function ContentOverviewPageSkeleton({ backLabel = "Back" }) {
  return (
    <div className="min-h-screen bg-[#f4f6f8] w-full min-w-0 overflow-x-hidden" style={{ fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      <div className="bg-gradient-to-br from-[#0f1f3d] via-[#1a3560] to-[#1e4080] w-full min-w-0">
        <div className="max-w-7xl mx-auto w-full min-w-0 px-4 sm:px-6 lg:px-8">
          <div className="pt-4 sm:pt-5">
            <Skeleton className="h-8 w-32 bg-white/15" />
          </div>
          <div className="py-4 sm:py-6 grid grid-cols-1 lg:grid-cols-[1fr_308px] gap-6 lg:gap-8 items-center">
            <div className="space-y-5">
              <div className="flex flex-wrap gap-2">
                <Skeleton className="h-7 w-14 rounded-full bg-white/20" />
                <Skeleton className="h-7 w-24 rounded-full bg-white/20" />
                <Skeleton className="h-7 w-16 rounded-full bg-white/20" />
              </div>
              <Skeleton className="h-10 w-full max-w-xl bg-white/20" />
              <Skeleton className="h-5 w-full max-w-lg bg-white/15" />
              <Skeleton className="h-5 w-4/5 max-w-md bg-white/15" />
              <div className="flex flex-wrap gap-6 pt-2">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-4 w-24 bg-white/15" />
                ))}
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-9 w-28 rounded-full bg-white/15" />
                ))}
              </div>
            </div>
            <div className="rounded-2xl overflow-hidden border border-white/10 bg-white/5 p-1">
              <Skeleton className="aspect-video w-full rounded-xl bg-white/10" />
              <Skeleton className="h-11 w-full mt-3 rounded-lg bg-white/20" />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto w-full min-w-0 px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-6 border-b border-slate-200 mb-8">
          <Skeleton className="h-9 w-20 mb-[-1px]" />
          <Skeleton className="h-9 w-20 mb-[-1px]" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8">
          <div className="space-y-8">
            <section className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
              <Skeleton className="h-6 w-48" />
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-start gap-3">
                  <Skeleton className="h-5 w-5 rounded-full shrink-0" />
                  <Skeleton className="h-4 flex-1" />
                </div>
              ))}
            </section>
            <section className="bg-white rounded-xl border border-slate-200 p-6 space-y-3">
              <Skeleton className="h-6 w-36" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
            </section>
          </div>
          <aside className="space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
              <Skeleton className="h-5 w-40" />
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex justify-between items-center">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-8" />
                </div>
              ))}
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-2">
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-9 w-full" />
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
