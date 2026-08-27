import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import SEO from "../components/Seo";
import { Button } from "@/components/ui/button";
import { Home, Search } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <>
      <SEO
        title="404 — Page Not Found"
        description="The page you're looking for doesn't exist."
        robots="noindex,nofollow"
      />
      <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100/90 dark:from-slate-950 dark:to-slate-900 px-4 py-16">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_0%,rgba(59,130,246,0.12),transparent)] dark:bg-[radial-gradient(ellipse_70%_50%_at_50%_0%,rgba(59,130,246,0.2),transparent)] pointer-events-none" />
        <div className="relative text-center max-w-lg">
          <p className="text-sm font-semibold tracking-widest text-slate-500 dark:text-slate-400 uppercase mb-3">Error 404</p>
          <h1 className="text-6xl sm:text-7xl font-extrabold text-slate-950 dark:text-white tracking-tight mb-4">Page not found</h1>
          <p className="text-lg text-slate-700 dark:text-slate-300 font-medium mb-2">
            We couldn&apos;t find a page at{" "}
            <span className="font-mono text-sm bg-white/80 dark:bg-slate-800/80 px-2 py-0.5 rounded border border-slate-200/80 dark:border-slate-600 break-all">
              {location.pathname}
            </span>
          </p>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-10">
            Check the URL or use the links below to continue.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button asChild size="lg" className="gap-2 font-semibold shadow-md min-w-[200px]">
              <Link to="/">
                <Home className="w-5 h-5" />
                Back to home
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="gap-2 font-semibold min-w-[200px] border-slate-300 dark:border-slate-600">
              <Link to="/courses">
                <Search className="w-5 h-5" />
                Browse courses
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};

export default NotFound;
