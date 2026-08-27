import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function DetailPageHeaderSkeleton() {
  return (
    <div className="bg-gradient-to-b from-primary/10 to-background border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-2 mb-6">
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className="h-4 w-32" />
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <Skeleton className="h-6 w-16 rounded-full" />
              <Skeleton className="h-6 w-24 rounded-full" />
            </div>

            <Skeleton className="h-9 w-full max-w-2xl mb-4" />

            <div className="space-y-2 mb-6">
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-4/5" />
            </div>

            <div className="flex flex-wrap items-center gap-6">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-2">
                  <Skeleton className="h-4 w-4 rounded" />
                  <Skeleton className="h-4 w-20" />
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-1">
            <Card className="overflow-hidden sticky top-24">
              <Skeleton className="aspect-video w-full rounded-none" />
              
              <CardContent className="p-4 space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-4 w-12" />
                  </div>
                  <Skeleton className="h-2 w-full rounded-full" />
                  <Skeleton className="h-3 w-36" />
                </div>
                
                <Skeleton className="h-11 w-full rounded-md" />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}



export function ContentListSkeleton({ itemsCount = 4 }) {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-40 mb-2" />
        <Skeleton className="h-4 w-64" />
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y">
          {Array.from({ length: itemsCount }).map((_, i) => (
            <div key={i} className="px-6 py-4">
              <div className="flex items-center gap-3">
                <Skeleton className="w-8 h-8 rounded-full shrink-0" />
                <div className="flex-1">
                  <Skeleton className="h-5 w-2/3 mb-2" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function CodeSampleSkeleton({ linesCount = 12 }) {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-32 mb-2" />
        <Skeleton className="h-4 w-56" />
      </CardHeader>
      <CardContent className="p-0">
        <div className="bg-sidebar rounded-b-lg overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 border-b border-sidebar-border">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-7 w-20" />
          </div>
          
          <div className="p-4 space-y-2">
            {Array.from({ length: linesCount }).map((_, i) => {
              const widthPercent = 40 + Math.floor(Math.random() * 50);
              return (
                <Skeleton
                  key={i}
                  className="h-4"
                  style={{ width: `${widthPercent}%` }}
                />
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function TabsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid w-full max-w-2xl grid-cols-5 gap-2">
        {[0, 1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-10 rounded-md" />
        ))}
      </div>
      
      <Card>
        <CardContent className="p-6 space-y-4">
          <Skeleton className="h-6 w-48 mb-4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="h-32 w-full mt-6" />
        </CardContent>
      </Card>
    </div>
  );
}

export function GridCardsSkeleton({ cols = 3, itemsCount = 6 }) {
  const gridCols = {
    2: "grid-cols-1 md:grid-cols-2",
    3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 md:grid-cols-2 lg:grid-cols-4",
  };

  return (
    <div className={`grid ${gridCols[cols]} gap-6`}>
      {Array.from({ length: itemsCount }).map((_, i) => (
        <Card key={i} className="overflow-hidden">
          <Skeleton className="aspect-video w-full rounded-none" />
          <CardContent className="p-4 space-y-3">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <div className="flex items-center gap-4 pt-2">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-16" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function DetailPageSkeleton({
  type = "course", 
  showTabs = false,
  showCodeSample = false,
  gridItems = 0
}) {
  return (
    <div className="min-h-screen bg-background">
      <main className="pt-20">
        <DetailPageHeaderSkeleton />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
            

              {showCodeSample && <CodeSampleSkeleton />}

              {gridItems > 0 && (
                <div className="space-y-6">
                  <Skeleton className="h-8 w-64" />
                  <GridCardsSkeleton itemsCount={gridItems} />
                </div>
              )}
            </div>

            <div className="hidden lg:block">
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default DetailPageSkeleton;