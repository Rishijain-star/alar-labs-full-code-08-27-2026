import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function GroupLabCardSkeleton() {
    return (
        <Card className="overflow-hidden w-full">
           
            <Skeleton className="aspect-video w-full" />

            <CardHeader className="pb-2">
               
                <div className="flex items-center justify-between mb-2">
                    <Skeleton className="h-5 w-24" />
                    <Skeleton className="h-5 w-12" />
                </div>
               
                <Skeleton className="h-5 w-full mb-1" />
                <Skeleton className="h-5 w-3/4" />
            </CardHeader>

            <CardContent className="pb-3">
               
                <Skeleton className="h-4 w-full mb-1" />
                <Skeleton className="h-4 w-5/6" />

               
                <div className="flex items-center gap-4 mt-3">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-16" />
                </div>
            </CardContent>

            <CardFooter>
                        
                <Skeleton className="h-9 w-full" />
            </CardFooter>
        </Card>
    );
}