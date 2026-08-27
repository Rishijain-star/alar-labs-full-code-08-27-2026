import { Link, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Beaker, BookOpen, Layers } from "lucide-react";

/**
 * Lab bundles are not exposed as a separate public catalog yet.
 * Course bundles use the course detail flow (/courses/:slug). This route remains
 * for old bookmarks; it does not render placeholder catalog data.
 */
export default function GroupLabDetailPage() {
  const { id } = useParams();

  return (
    <div className="min-h-screen bg-background">
      <main className="pb-16">
        <div className="max-w-lg mx-auto px-4 text-center">
          <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-6">
            <Layers className="w-7 h-7 text-muted-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Lab bundle</h1>
          <p className="text-muted-foreground mb-2">
            Standalone bundle pages are not available. Browse published labs or open a course that includes multiple
            labs.
          </p>
          {id ? (
            <p className="text-xs text-muted-foreground mb-8 font-mono break-all">id: {id}</p>
          ) : null}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild variant="default">
              <Link to="/labs">
                <Beaker className="w-4 h-4 mr-2" />
                Browse labs
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/courses">
                <BookOpen className="w-4 h-4 mr-2" />
                Browse courses
              </Link>
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
