import { useMemo } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import {
  useGetUserCreatorActivityQuery,
  useGetOwnerUserByIdQuery,
} from "@/store/api/userApi";
import { useGetCreatorInsightsQuery } from "@/store/api/learningApi";
import {
  buildActivityFromInsights,
  mapOwnerProfileToUserMeta,
  normalizeCreatorActivityPayload,
} from "@/lib/userActivityDetails";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import CreatorPublishedContentCard from "@/components/admin/CreatorPublishedContentCard";
import {
  ArrowLeft,
  Beaker,
  BookOpen,
  Loader2,
  ShoppingCart,
  Users,
  Layers,
  Info,
} from "lucide-react";

function StatCard({ icon: Icon, label, value, hint, className }) {
  return (
    <Card className={className}>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-3xl font-bold mt-1">{value}</p>
            {hint ? <p className="text-xs text-muted-foreground mt-1">{hint}</p> : null}
          </div>
          {Icon ? (
            <div className="rounded-lg bg-primary/10 p-2.5 text-primary shrink-0">
              <Icon className="h-5 w-5" />
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminUserDetails() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const userFromNav = location.state?.user;

  const {
    data: activityRes,
    isLoading: activityLoading,
    isError: activityError,
    isSuccess: activitySuccess,
    refetch: refetchActivity,
    isFetching: activityFetching,
  } = useGetUserCreatorActivityQuery(userId, { skip: !userId });

  const primaryPayload = useMemo(
    () => (activitySuccess ? normalizeCreatorActivityPayload(activityRes) : null),
    [activitySuccess, activityRes],
  );

  const needsFallback = Boolean(userId && activityError);

  const {
    data: insightsRes,
    isLoading: insightsLoading,
    isError: insightsError,
    refetch: refetchInsights,
    isFetching: insightsFetching,
  } = useGetCreatorInsightsQuery(userId, { skip: !needsFallback });

  const needsProfile =
    needsFallback && !userFromNav && Boolean(userId);

  const { data: profileRes, isLoading: profileLoading } = useGetOwnerUserByIdQuery(
    userId,
    { skip: !needsProfile },
  );

  const userMeta = useMemo(() => {
    if (userFromNav) {
      return {
        id: userFromNav.id ?? userFromNav.user_id ?? userId,
        email: userFromNav.email,
        fullName: userFromNav.fullName ?? userFromNav.full_name,
        role: userFromNav.role ?? userFromNav.role?.name,
        joinedAt: userFromNav.joinedAt ?? userFromNav.created_at,
      };
    }
    if (needsProfile && profileRes) {
      return mapOwnerProfileToUserMeta(profileRes?.data ?? profileRes, userId);
    }
    return { id: userId };
  }, [userFromNav, needsProfile, profileRes, userId]);

  const payload = useMemo(() => {
    if (primaryPayload?.user) return primaryPayload;
    if (needsFallback && insightsRes) {
      return buildActivityFromInsights(insightsRes, userMeta);
    }
    return null;
  }, [primaryPayload, needsFallback, insightsRes, userMeta]);

  const isLoading =
    activityLoading ||
    (needsFallback && (insightsLoading || (needsProfile && profileLoading)));

  const isError = !isLoading && !payload;

  const isFetching = activityFetching || insightsFetching;

  const user = payload?.user;
  const summary = payload?.summary ?? {};
  const publishedContent = payload?.publishedContent ?? [];
  const isFallback = payload?.isFallback === true;

  const handleRetry = () => {
    if (activityError) refetchActivity();
    if (needsFallback && insightsError) refetchInsights();
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError || !user) {
    return (
      <div className="space-y-4 py-8 text-center">
        <p className="text-destructive">Could not load user activity details.</p>
        <Button variant="outline" onClick={handleRetry}>
          Retry
        </Button>
        <Button variant="ghost" onClick={() => navigate("/app/users")}>
          Back to Users
        </Button>
      </div>
    );
  }

  const initials = (user.fullName || user.email || "?")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");

  return (
    <div className="space-y-8 pb-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-3">
          <Button variant="ghost" size="sm" className="-ml-2 h-8" onClick={() => navigate("/app/users")}>
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Back to Users
          </Button>
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-full bg-primary/10 text-primary flex items-center justify-center text-lg font-bold">
              {initials}
            </div>
            <div>
              <h1 className="text-2xl font-bold">{user.fullName || "Unnamed user"}</h1>
              <p className="text-muted-foreground text-sm">{user.email}</p>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                {user.role ? (
                  <Badge variant="outline" className="capitalize">
                    {user.role}
                  </Badge>
                ) : null}
                {user.joinedAt ? (
                  <span className="text-xs text-muted-foreground">
                    Joined {new Date(user.joinedAt).toLocaleDateString()}
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        </div>
        {isFetching ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> : null}
      </div>

      {isFallback ? (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <Info className="h-4 w-4 shrink-0 mt-0.5" />
          <p>
            Showing enrollment data from creator insights. Purchase counts need the latest backend API
            (<code className="text-xs">/owner/users/:id/creator-activity</code>).
          </p>
        </div>
      ) : null}

      <div>
        <h2 className="text-lg font-semibold mb-1">Creator activity overview</h2>
        <p className="text-sm text-muted-foreground">
          Published labs and courses created by this user, with enrollment and purchase metrics.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          icon={Layers}
          label="Published labs & courses"
          value={summary.totalPublishedContent ?? 0}
          hint={`${summary.totalPublishedLabs ?? 0} labs · ${summary.totalPublishedCourses ?? 0} courses`}
        />
        <StatCard
          icon={Beaker}
          label="Published labs"
          value={summary.totalPublishedLabs ?? 0}
          hint={`${summary.totalLabs ?? 0} total created`}
        />
        <StatCard
          icon={Users}
          label="Total enrollments"
          value={summary.totalEnrollments ?? 0}
          hint="Across all published content"
        />
        <StatCard
          icon={ShoppingCart}
          label="Total purchases"
          value={summary.totalPurchases ?? 0}
          hint={isFallback ? "Requires latest API" : "Paid enrollments only"}
        />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
          <div>
            <CardTitle className="text-lg">Published labs & programs</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Card view of every published lab and course with per-item enrollment and purchase counts.
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground shrink-0">
            <BookOpen className="w-4 h-4" />
            {publishedContent.length} item{publishedContent.length === 1 ? "" : "s"}
          </div>
        </CardHeader>
        <CardContent>
          {publishedContent.length === 0 ? (
            <div className="rounded-lg border border-dashed py-12 text-center text-muted-foreground">
              <p className="font-medium">No published content yet</p>
              <p className="text-sm mt-1">
                This user has not published any labs or courses, or has only draft/archived content.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
              {publishedContent.map((item) => (
                <CreatorPublishedContentCard key={`${item.contentType}-${item.id}`} item={item} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {(summary.totalLabs > summary.totalPublishedLabs ||
        summary.totalCourses > summary.totalPublishedCourses) && (
        <p className="text-xs text-muted-foreground text-center">
          Draft or archived content is excluded from the totals above.{" "}
          <Link to="/app/users" className="text-primary hover:underline">
            Return to user list
          </Link>
        </p>
      )}
    </div>
  );
}
