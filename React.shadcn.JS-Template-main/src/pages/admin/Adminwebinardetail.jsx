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
  DollarSign,
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
  Tag,
} from "lucide-react";
import {
  useDeleteOwnerWebinarMutation,
  useGetOwnerWebinarByIdQuery,
  useGetWebinarRegistrationsQuery,
} from "@/store/api/webinarApi";
import { DisplayPrice } from "@/components/common/PriceBadge";
import { resolveItemCurrency } from "@/lib/localeFormat";
import { confirmDelete } from "@/lib/confirmAction";
import RichTextContent from "@/components/learning/RichTextContent";
import { sanitizeCourseDescriptionHtml } from "@/lib/sanitizeCourseHtml";
import { stripHtmlToPlain } from "@/lib/stripHtml";
import AdminContentDates from "@/components/admin/AdminContentDates";
import { canEditDigitalPrograms, canDeleteDigitalPrograms } from "@/lib/digitalProgramsPermissions";
import { WebinarLiveStatusBadge } from "@/components/training/WebinarLiveStatus";

function deliveryLabel(mode) {
  if (mode === "offline") return "In-person";
  if (mode === "hybrid") return "Hybrid";
  return "Online";
}

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

const AdminWebinarDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchQuery, setSearchQuery] = useState("");
  const canEdit = canEditDigitalPrograms();
  const canDelete = canDeleteDigitalPrograms();

  const { data: webinarRes, isLoading } = useGetOwnerWebinarByIdQuery(id, { skip: !id });
  const { data: regRes, isFetching: regLoading } = useGetWebinarRegistrationsQuery(
    { id, search: searchQuery },
    { skip: !id }
  );
  const [deleteWebinar] = useDeleteOwnerWebinarMutation();

  const webinar = webinarRes?.data?.webinar;
  const attendees = regRes?.data?.rows || [];
  const stats = regRes?.data?.stats || {};

  const isFree = useMemo(
    () => Boolean(webinar?.is_free) || Number(webinar?.price) === 0,
    [webinar]
  );

  const getInitials = (name) =>
    String(name || "?")
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  const exportAttendees = () => {
    if (!attendees.length) return;
    const header = ["Name", "Email", "Company", "Title", "Registered", "Status", "Payment"];
    const lines = attendees.map((a) =>
      [a.name, a.email, a.company, a.title, a.registeredAt, a.status, a.paymentLabel].join(",")
    );
    const csv = [header.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `webinar-${id}-attendees.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDelete = async () => {
    if (!(await confirmDelete("this webinar"))) return;
    await deleteWebinar(id);
    navigate("/app/live-webinar");
  };

  if (isLoading) {
    return <p className="p-8 text-muted-foreground">Loading webinar…</p>;
  }

  if (!webinar) {
    return (
      <div className="max-w-7xl mx-auto p-8">
        <p className="text-muted-foreground mb-4">Webinar not found.</p>
        <Button variant="outline" onClick={() => navigate("/app/live-webinar")}>
          Back to webinars
        </Button>
      </div>
    );
  }

  const webinarStatus =
    webinar.status === "published"
      ? "Published"
      : webinar.status === "cancelled"
        ? "Cancelled"
        : "Draft";

  return (
    <div className="max-w-7xl mx-auto">
      <Button
        variant="ghost"
        className="mb-4 text-muted-foreground"
        onClick={() => navigate("/app/live-webinar")}
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Webinars
      </Button>

      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">{webinar.title}</h1>
            <WebinarLiveStatusBadge webinar={webinar} />
          </div>
          <p className="text-muted-foreground mt-1">Webinar Details & Attendees</p>
        </div>
        <div className="flex items-center gap-3">
          {canEdit && (
          <Button variant="outline" onClick={() => navigate(`/app/webinar/create?edit=${id}`)}>
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
                  {webinar.max_capacity
                    ? Math.max(0, webinar.max_capacity - (stats.total ?? webinar.enrolled_count ?? 0))
                    : `${stats.total ?? webinar.enrolled_count ?? 0} Enrolled`}
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
            <CardTitle className="text-lg">Webinar Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <Calendar className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">Date & Time</p>
                <p className="text-sm text-muted-foreground">{webinar.schedule_summary || "—"}</p>
                <p className="text-sm text-muted-foreground">
                  {webinar.time_summary || "—"}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">Duration</p>
                <p className="text-sm text-muted-foreground">{webinar.duration_summary || "—"}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Globe className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">Format</p>
                <p className="text-sm text-muted-foreground">{deliveryLabel(webinar.delivery_mode)}</p>
              </div>
            </div>
            {webinar.meeting_link && (
              <div className="flex items-start gap-3">
                <Link2 className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Meeting link</p>
                  <a
                    href={webinar.meeting_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline break-all"
                  >
                    {webinar.meeting_link}
                  </a>
                </div>
              </div>
            )}
            {webinar.venue && (
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Venue</p>
                  <p className="text-sm text-muted-foreground">{webinar.venue}</p>
                </div>
              </div>
            )}
            <div className="flex items-start gap-3">
              <DollarSign className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">Price</p>
                <p className="text-sm text-muted-foreground">
                  {isFree ? (
                    "Free"
                  ) : (
                    <>
                      {webinar.original_price != null &&
                      Number(webinar.original_price) > Number(webinar.price) ? (
                        <span className="line-through text-red-500/80 mr-2">
                          <DisplayPrice
                            price={webinar.original_price}
                            currency={resolveItemCurrency(webinar)}
                          />
                        </span>
                      ) : null}
                      <DisplayPrice price={webinar.price} currency={resolveItemCurrency(webinar)} />
                    </>
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">Rating</p>
                <p className="text-sm text-muted-foreground">{Number(webinar.rating ?? 0).toFixed(1)} / 5</p>
              </div>
            </div>
            {Array.isArray(webinar.topics) && webinar.topics.length > 0 ? (
              <div className="flex items-start gap-3">
                <Tag className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Badges</p>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {webinar.topics.map((badge, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {badge}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
            <div className="flex items-start gap-3">
              <Video className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">Recording</p>
                <p className="text-sm text-muted-foreground">
                  {webinar.is_recorded ? "Enabled" : "Disabled"}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Users className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">Capacity</p>
                <p className="text-sm text-muted-foreground">
                  {webinar.max_capacity || "—"} maximum attendees
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Header description</CardTitle>
          </CardHeader>
          <CardContent>
            {stripHtmlToPlain(webinar.description) ? (
              <RichTextContent
                html={sanitizeCourseDescriptionHtml(webinar.description)}
                showTitle={false}
                className="text-sm text-muted-foreground leading-relaxed"
              />
            ) : (
              <p className="text-sm text-muted-foreground leading-relaxed">
                No header description provided.
              </p>
            )}
            <div className="mt-4 pt-4 border-t">
              <AdminContentDates record={webinar} />
              <div className="mt-2">
                <Badge className="bg-gray-100 text-gray-700">{webinarStatus}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">About this webinar</CardTitle>
          </CardHeader>
          <CardContent>
            {stripHtmlToPlain(webinar.about_content) ? (
              <RichTextContent
                html={sanitizeCourseDescriptionHtml(webinar.about_content)}
                showTitle={false}
                className="text-sm text-muted-foreground leading-relaxed"
              />
            ) : (
              <p className="text-sm text-muted-foreground leading-relaxed">
                No about content provided.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">
              Registered Attendees ({stats.total ?? attendees.length})
            </CardTitle>
            <Button variant="outline" size="sm" onClick={exportAttendees} disabled={!attendees.length}>
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
                placeholder="Search attendees by name, email, or company..."
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
                  <TableHead>Attendee</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Registered</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Payment</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {regLoading && attendees.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Loading attendees…
                    </TableCell>
                  </TableRow>
                ) : attendees.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No attendees registered yet
                    </TableCell>
                  </TableRow>
                ) : (
                  attendees.map((attendee) => (
                    <TableRow key={attendee.id} className="hover:bg-muted/50">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="w-10 h-10">
                            <AvatarImage src={null} />
                            <AvatarFallback className="bg-primary/10 text-primary">
                              {getInitials(attendee.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{attendee.name}</p>
                            <p className="text-sm text-muted-foreground">{attendee.title}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{attendee.company}</span>
                      </TableCell>
                      <TableCell>
                        <a
                          href={`mailto:${attendee.email}`}
                          className="text-sm text-primary hover:underline flex items-center gap-1"
                        >
                          <Mail className="w-3 h-3" />
                          {attendee.email}
                        </a>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {attendee.registeredAt
                            ? new Date(attendee.registeredAt).toLocaleDateString()
                            : "—"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusBadgeClass(attendee.status)}>{attendee.status}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={paymentBadgeClass(attendee.paymentLabel)}>
                          {attendee.paymentLabel}
                        </Badge>
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
};

export default AdminWebinarDetail;
