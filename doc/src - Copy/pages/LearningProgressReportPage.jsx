import { useState } from "react";
import { Link, useLocation, useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Award, CheckCircle2, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import api from "@/lib/axios";
import { isCertificateEnabled, CONTENT_KIND_META } from "@/lib/learningProgress";

export default function LearningProgressReportPage() {
  const { slug } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state || {};

  const kind = state.kind || (location.pathname.includes("/courses/") ? "course" : "lab");
  const kindMeta = CONTENT_KIND_META[kind] || CONTENT_KIND_META.lab;
  const title = state.title || (kind === "course" ? "Course" : "Lab");
  const progressPct = state.progressPct ?? 100;
  const tasksDone = state.tasksDone ?? 0;
  const tasksTotal = state.tasksTotal ?? tasksDone;
  const entityId = state.entityId;
  const certificate = state.certificate;
  const backPath = state.backPath || (kind === "course" ? `/courses/${slug}` : `/labs/${slug}`);

  const [downloading, setDownloading] = useState(false);

  const showCert = isCertificateEnabled(certificate);

  const downloadCourseCertificate = async () => {
    if (!entityId) return;
    setDownloading(true);
    try {
      const res = await api.get(`/me/courses/${entityId}/certificate`, {
        params: { format: "pdf" },
        responseType: "blob",
        withCredentials: true,
      });
      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `certificate-${slug || entityId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      const msg =
        e?.response?.data?.message ||
        e?.message ||
        "Could not download certificate. Complete all requirements first.";
      window.alert(msg);
    } finally {
      setDownloading(false);
    }
  };

  const openCourseCertificateHtml = async () => {
    if (!entityId) return;
    setDownloading(true);
    try {
      const res = await api.get(`/me/courses/${entityId}/certificate`, {
        params: { format: "html" },
        withCredentials: true,
      });
      const w = window.open("", "_blank");
      if (w) {
        w.document.write(res.data);
        w.document.close();
      } else {
        window.alert("Allow pop-ups to view your certificate.");
      }
    } catch (e) {
      window.alert(e?.response?.data?.message || "Could not load certificate.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <button
          type="button"
          onClick={() => navigate(backPath)}
          className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="w-4 h-4" /> Back to overview
        </button>

        <Card className="border-green-200 bg-white shadow-sm">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
              <CheckCircle2 className="w-9 h-9 text-green-600" />
            </div>
            <span
              className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border mb-3 ${kindMeta.className}`}
            >
              <span className={`w-2 h-2 rounded-full ${kindMeta.dotClass}`} />
              {kindMeta.label}
            </span>
            <CardTitle className="text-2xl">Congratulations!</CardTitle>
            <CardDescription className="text-base mt-2">
              You completed <span className="font-semibold text-slate-800">{title}</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-4 rounded-xl bg-slate-50">
                <p className="text-2xl font-bold text-slate-900">{progressPct}%</p>
                <p className="text-xs text-slate-500 mt-1">Progress</p>
              </div>
              <div className="p-4 rounded-xl bg-slate-50">
                <p className="text-2xl font-bold text-slate-900">{tasksDone}</p>
                <p className="text-xs text-slate-500 mt-1">Tasks done</p>
              </div>
              <div className="p-4 rounded-xl bg-slate-50">
                <p className="text-2xl font-bold text-slate-900">{tasksTotal}</p>
                <p className="text-xs text-slate-500 mt-1">Total tasks</p>
              </div>
            </div>

            <p className="text-sm text-slate-600 text-center leading-relaxed">
              All required quizzes and exercises are complete. Your progress has been saved.
            </p>

            {showCert && (
              <Card className="border-amber-200 bg-amber-50/50">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <Award className="w-5 h-5 text-amber-700" />
                    <CardTitle className="text-base">
                      {certificate?.title || "Certificate of Completion"}
                    </CardTitle>
                  </div>
                  {certificate?.description && (
                    <CardDescription>{certificate.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent className="flex flex-wrap gap-3">
                  {kind === "course" && entityId ? (
                    <>
                      <Button
                        className="gap-2"
                        onClick={downloadCourseCertificate}
                        disabled={downloading}
                      >
                        {downloading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Download className="w-4 h-4" />
                        )}
                        Download PDF
                      </Button>
                      <Button variant="outline" onClick={openCourseCertificateHtml} disabled={downloading}>
                        View / Print
                      </Button>
                    </>
                  ) : (
                    <p className="text-sm text-slate-600">
                      Your certificate is issued for this {kind}. Contact support or revisit the overview page if
                      download is not yet available for standalone labs.
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <Button asChild variant="outline">
                <Link to={backPath}>Review {kind === "course" ? "course" : "lab"}</Link>
              </Button>
              {kind === "course" ? (
                <Button asChild className="bg-blue-600 hover:bg-blue-700">
                  <Link to="/courses">Browse courses</Link>
                </Button>
              ) : (
                <Button asChild className="bg-blue-600 hover:bg-blue-700">
                  <Link to="/labs">Browse labs</Link>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
