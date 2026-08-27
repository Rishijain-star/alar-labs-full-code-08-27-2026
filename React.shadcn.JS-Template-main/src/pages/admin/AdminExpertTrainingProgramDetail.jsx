import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  Calendar,
  Clock,
  Users,
  Video,
  MapPin,
  Link2,
  Globe,
  Edit,
  Trash2,
  Download,
  Mail,
  Search,
  CheckCircle,
  Award,
  Layers,
  Languages,
  BookOpen,
} from "lucide-react";
import {
  useDeleteOwnerTrainingProgramMutation,
  useGetOwnerTrainingProgramQuery,
  useGetTrainingProgramEnrollmentsQuery,
} from "@/store/api/siteContentApi";
import { DisplayPrice } from "@/components/common/PriceBadge";
import { resolveItemCurrency } from "@/lib/localeFormat";
import RichTextContent from "@/components/learning/RichTextContent";
import { sanitizeCourseDescriptionHtml } from "@/lib/sanitizeCourseHtml";
import { stripHtmlToPlain } from "@/lib/stripHtml";
import { formatLabel } from "@/lib/mapWebinarRow";
import { canEditDigitalPrograms, canDeleteDigitalPrograms } from "@/lib/digitalProgramsPermissions";
import AdminContentDates from "@/components/admin/AdminContentDates";

function statusBadgeClass(status) {
  switch (status) {
    case "Confirmed":
      return "bg-green-100 text-green-700";
    case "Pending":
      return "bg-yellow-100 text-yellow-700";
    case "Cancelled":
      return "bg-red-100 text-red-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

function paymentBadgeClass(label) {
  if (label === "Paid") return "bg-emerald-100 text-emerald-800";
  if (label === "Free") return "bg-sky-100 text-sky-800";
  if (label === "Pending") return "bg-yellow-100 text-yellow-800";
  return "bg-red-100 text-red-700";
}

export default function AdminExpertTrainingProgramDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchQuery, setSearchQuery] = useState("");
  const canEdit = canEditDigitalPrograms();
  const canDelete = canDeleteDigitalPrograms();

  const { data: programRes, isLoading } = useGetOwnerTrainingProgramQuery(id, { skip: !id });
  const { data: enrollRes, isFetching: enrollLoading } = useGetTrainingProgramEnrollmentsQuery(
    { id, search: searchQuery },
    { skip: !id }
  );
  const [deleteProgram] = useDeleteOwnerTrainingProgramMutation();

  const program = programRes?.data?.program;
  const enrollments = enrollRes?.data?.rows || [];
  const stats = enrollRes?.data?.stats || {};

  const isFree = useMemo(
    () => Boolean(program?.is_free) || Number(program?.price) === 0,
    [program]
  );
  const descriptionHtml = useMemo(
    () => sanitizeCourseDescriptionHtml(program?.description || ""),
    [program?.description],
  );
  const hasDescription = Boolean(stripHtmlToPlain(descriptionHtml));
  const outcomes = Array.isArray(program?.learning_outcomes) ? program.learning_outcomes : [];

  const getInitials = (name) =>
    String(name || "?")
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  const exportEnrollments = () => {
    if (!enrollments.length) return;
    const header = ["Name", "Email", "Company", "Title", "Enrolled", "Status", "Payment"];
    const lines = enrollments.map((a) =>
      [a.name, a.email, a.company, a.title, a.enrolledAt, a.status, a.paymentLabel].join(",")
    );
    const csv = [header.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `training-program-${id}-enrollments.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this program?")) return;
    await deleteProgram(id);
    navigate("/app/digital-programs/expert-led-training");
  };

  if (isLoading) {
    return <p className="p-8 text-muted-foreground">Loading program…</p>;
  }

  if (!program) {
    return (
      <div className="max-w-7xl mx-auto p-8">
        <p className="text-muted-foreground mb-4">Program not found.</p>
        <Button variant="outline" onClick={() => navigate("/app/digital-programs/expert-led-training")}>
          Back to programs
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <Button
        variant="ghost"
        className="mb-4 text-muted-foreground"
        onClick={() => navigate("/app/digital-programs/expert-led-training")}
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Programs
      </Button>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">{program.title}</h1>
          <p className="text-muted-foreground mt-1">Program Details & Enrolled Students</p>
          <AdminContentDates record={program} className="mt-2" />
        </div>
        <div className="flex items-center gap-3">
          {canEdit && (
          <Button
            variant="outline"
            onClick={() => navigate(`/app/digital-programs/expert-led-training?edit=${id}`)}
          >
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </Button>
          )}
          {canDelete && (
          <Button variant="outline" onClick={handleDelete} className="text-red-600 hover:text-red-700">
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <Card className="border shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Spots Left</p>
                <p className="text-2xl font-bold text-emerald-600">
                  {program.max_seats
                    ? Math.max(0, program.max_seats - (stats.total ?? program.enrolled_count ?? 0))
                    : `${stats.total ?? program.enrolled_count ?? 0} Enrolled`}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Confirmed</p>
                <p className="text-2xl font-bold">{stats.confirmed ?? 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-yellow-100 rounded-lg">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold">{stats.pending ?? 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Program Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="flex items-start gap-3">
              <Calendar className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">Schedule</p>
                <p className="text-muted-foreground">
                  {program.schedule_start
                    ? new Date(program.schedule_start).toLocaleString()
                    : "—"}
                  {program.schedule_end
                    ? ` → ${new Date(program.schedule_end).toLocaleString()}`
                    : ""}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">Duration</p>
                <p className="text-muted-foreground">{program.duration || "—"}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Layers className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">Sessions</p>
                <p className="text-muted-foreground">{program.session_count ?? 1} live sessions</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Globe className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">Format & Level</p>
                <p className="text-muted-foreground">
                  {formatLabel(program.training_format)} · {formatLabel(program.level)}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Languages className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">Language</p>
                <p className="text-muted-foreground">{program.language || "English"}</p>
              </div>
            </div>
            {program.meeting_link && (
              <div className="flex items-start gap-3">
                <Link2 className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium">Meeting link</p>
                  <a href={program.meeting_link} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline break-all">
                    {program.meeting_link}
                  </a>
                </div>
              </div>
            )}
            {program.venue && (
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium">Venue</p>
                  <p className="text-muted-foreground">{program.venue}</p>
                </div>
              </div>
            )}
            <div className="flex items-start gap-3">
              <Video className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">Price</p>
                <p className="text-muted-foreground">
                  {isFree ? "Free" : <DisplayPrice price={program.price} currency={resolveItemCurrency(program)} />}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Award className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">Certificate</p>
                <p className="text-muted-foreground">
                  {program.certificate_available ? "Available" : "Not included"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Description & Outcomes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {hasDescription ? (
              <RichTextContent html={descriptionHtml} showTitle={false} />
            ) : (
              <p className="text-sm text-muted-foreground">No description provided.</p>
            )}
            {program.prerequisites && (
              <div>
                <p className="text-sm font-medium flex items-center gap-2 mb-1">
                  <BookOpen className="w-4 h-4" />
                  Prerequisites
                </p>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{program.prerequisites}</p>
              </div>
            )}
            {outcomes.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Learning outcomes</p>
                <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
                  {outcomes.map((o, i) => (
                    <li key={i}>{o}</li>
                  ))}
                </ul>
              </div>
            )}
            <div className="pt-4 border-t">
              <Badge className={program.is_published ? "bg-primary" : "bg-gray-100 text-gray-700"}>
                {program.is_published ? "Published" : "Draft"}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">
              Enrolled Students ({stats.total ?? enrollments.length})
            </CardTitle>
            <Button variant="outline" size="sm" onClick={exportEnrollments} disabled={!enrollments.length}>
              <Download className="w-4 h-4 mr-2" />
              Export List
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search students by name, email, or company..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Enrolled</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Payment</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {enrollLoading && enrollments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Loading enrollments…
                    </TableCell>
                  </TableRow>
                ) : enrollments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No students enrolled yet
                    </TableCell>
                  </TableRow>
                ) : (
                  enrollments.map((row) => (
                    <TableRow key={row.id} className="hover:bg-muted/50">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="w-10 h-10">
                            <AvatarImage src={null} />
                            <AvatarFallback className="bg-primary/10 text-primary">
                              {getInitials(row.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{row.name}</p>
                            <p className="text-sm text-muted-foreground">{row.title}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{row.company}</TableCell>
                      <TableCell>
                        <a href={`mailto:${row.email}`} className="text-sm text-primary hover:underline flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {row.email}
                        </a>
                      </TableCell>
                      <TableCell>
                        {row.enrolledAt ? new Date(row.enrolledAt).toLocaleDateString() : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge className={statusBadgeClass(row.status)}>{row.status}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={paymentBadgeClass(row.paymentLabel)}>{row.paymentLabel}</Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
