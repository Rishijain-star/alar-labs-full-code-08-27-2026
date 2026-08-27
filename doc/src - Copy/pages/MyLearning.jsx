import axios from "axios";
import { useGetMyLearningQuery } from "@/store/api/learningApi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Loader2, BookOpen, FlaskConical, BarChart3, Award } from "lucide-react";
import { resolveMediaUrl } from "@/lib/mediaUrl";
import { cookieUtils } from "@/lib/cookies";
import { showError } from "@/lib/toast-utils";

async function downloadCourseCertificatePdf(courseId, slug) {
  const base = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
  const token = cookieUtils.getToken();
  try {
    const res = await axios.get(`${base}/api/me/courses/${courseId}/certificate`, {
      params: { format: "pdf" },
      responseType: "blob",
      withCredentials: true,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    const blob = new Blob([res.data], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `certificate-${slug || courseId}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (e) {
    const msg = e?.response?.data?.message || e?.message || "Could not download certificate";
    showError("Certificate", typeof msg === "string" ? msg : "Download failed");
  }
}

export default function MyLearning() {
  const { data, isLoading, isError, refetch } = useGetMyLearningQuery(undefined, {
    refetchOnMountOrArgChange: true,
  });
  const payload = data?.data ?? data;
  const stats = payload?.stats;
  const courses = payload?.courses ?? [];
  const labs = payload?.labs ?? [];

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] gap-3">
        <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
        <p className="text-muted-foreground">Loading your learning…</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">My Learning</h1>
        <p className="text-destructive">Could not load learning data. Try again.</p>
        <Button onClick={() => refetch()}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Learning</h1>
        <p className="text-muted-foreground mt-1">
          Courses and labs you&apos;re enrolled in — free, purchased, or via course bundles.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <BookOpen className="h-4 w-4" /> Courses
            </div>
            <div className="text-2xl font-bold">{stats?.coursesEnrolled ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <FlaskConical className="h-4 w-4" /> Labs
            </div>
            <div className="text-2xl font-bold">{stats?.labsInList ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <BarChart3 className="h-4 w-4" /> Started
            </div>
            <div className="text-2xl font-bold">{stats?.labsStarted ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <BarChart3 className="h-4 w-4" /> Completed
            </div>
            <div className="text-2xl font-bold">{stats?.labsCompleted ?? 0}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">My courses</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {courses.length === 0 && (
            <p className="text-sm text-muted-foreground">No course enrollments yet.</p>
          )}
          {courses.map((c) => (
            <div
              key={c.courseId}
              className="flex flex-wrap items-center gap-4 justify-between border rounded-lg p-4"
            >
              <div className="flex items-center gap-3 min-w-0">
                <img
                  src={resolveMediaUrl(c.thumbnail)}
                  alt=""
                  className="h-14 w-24 rounded-md object-cover bg-muted shrink-0"
                />
                <div className="min-w-0">
                  <p className="font-medium truncate">{c.title}</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    <Badge variant="secondary">{c.source === "purchase" ? "Purchased" : "Free enroll"}</Badge>
                    <Badge variant="outline">{c.progress ?? 0}%</Badge>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 shrink-0">
                {c.certificateReady ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="gap-1.5"
                    onClick={() => downloadCourseCertificatePdf(c.courseId, c.slug)}
                  >
                    <Award className="w-4 h-4" />
                    Certificate (PDF)
                  </Button>
                ) : null}
                <Button asChild size="sm" variant="outline">
                  <Link to={`/courses/${c.slug}`}>Open</Link>
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">My labs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {labs.length === 0 && (
            <p className="text-sm text-muted-foreground">No labs yet — enroll in a free lab or a course that includes labs.</p>
          )}
          {labs.map((l) => (
            <div
              key={`${l.labId}-${l.source}`}
              className="flex flex-wrap items-center gap-4 justify-between border rounded-lg p-4"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium truncate">{l.title}</p>
                <div className="flex flex-wrap gap-2 mt-2 text-xs text-muted-foreground">
                  <span>{l.courseTitle ? `Course: ${l.courseTitle}` : null}</span>
                  <Badge variant="outline" className="text-[10px]">
                    {l.source?.replace(/_/g, " ")}
                  </Badge>
                  {l.labKind === "skill_builder" && (
                    <Badge className="bg-amber-600 text-[10px]">Skill Builder</Badge>
                  )}
                </div>
                <Progress value={Math.min(100, l.progress || 0)} className="h-2 mt-3 max-w-md" />
              </div>
              {l.slug && (
                <Button asChild size="sm">
                  <Link to={`/labs/${l.slug}`}>View</Link>
                </Button>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
