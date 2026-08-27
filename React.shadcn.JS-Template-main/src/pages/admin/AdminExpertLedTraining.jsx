import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogBody,
} from "@/components/ui/dialog";
import { Plus, Search, Pencil, Trash2, Loader2, Eye, Star, X } from "lucide-react";
import GlobalPagination from "@/components/common/Pagination";
import {
  useCreateOwnerTrainingProgramMutation,
  useDeleteOwnerTrainingProgramMutation,
  useGetOwnerTrainingProgramQuery,
  useGetOwnerTrainingProgramsQuery,
  useUpdateOwnerTrainingProgramMutation,
  useUploadTrainingProgramBannerMutation,
} from "@/store/api/siteContentApi";
import { resolveMediaUrl } from "@/lib/mediaUrl";
import { CardTableSkeleton } from "@/components/common/TableSkeleton";
import { formatLabel } from "@/lib/mapWebinarRow";
import { confirmDelete } from "@/lib/confirmAction";
import QuillRichEditor from "@/components/editor/QuillRichEditor";
import { canEditDigitalPrograms, canDeleteDigitalPrograms } from "@/lib/digitalProgramsPermissions";
import AdminContentDates from "@/components/admin/AdminContentDates";
import { parseJsonStringArray } from "@/lib/parseJsonStringArray";

const emptyForm = {
  title: "",
  description: "",
  price: "0",
  original_price: "",
  is_paid: false,
  instructor_name: "",
  instructor_title: "",
  instructor_rating: "4.9",
  instructor_image_url: "",
  instructor_profile_url: "",
  banner_image_url: "",
  schedule_start: "",
  schedule_end: "",
  max_seats: "30",
  enrollment_url: "",
  tags: "",
  duration: "",
  training_format: "live_online",
  level: "beginner",
  certificate_available: false,
  language: "English",
  prerequisites: "",
  course_content: "",
  learning_outcomes: "",
  session_count: "8",
  meeting_link: "",
  venue: "",
  is_published: false,
};

function toPayload(form, badges, outcomesText) {
  const tags = [...badges];
  const learning_outcomes = outcomesText
    ? outcomesText.split("\n").map((s) => s.trim()).filter(Boolean)
    : [];
  const price = form.is_paid ? Number(form.price) || 0 : 0;
  return {
    title: form.title.trim(),
    description: form.description || "",
    price,
    original_price:
      form.is_paid && form.original_price !== "" ? Number(form.original_price) || null : null,
    is_free: !form.is_paid,
    instructor_name: form.instructor_name || "",
    instructor_title: form.instructor_title || "",
    instructor_rating: Math.min(5, Math.max(1, Number(form.instructor_rating) || 4.9)),
    instructor_image_url: form.instructor_image_url || "",
    instructor_profile_url: form.instructor_profile_url?.trim() || null,
    banner_image_url: form.banner_image_url || "",
    schedule_start: form.schedule_start ? new Date(form.schedule_start).toISOString() : null,
    schedule_end: form.schedule_end ? new Date(form.schedule_end).toISOString() : null,
    max_seats: Math.max(0, parseInt(form.max_seats, 10) || 0),
    enrollment_url: form.enrollment_url || "",
    tags,
    duration: form.duration || null,
    training_format: form.training_format,
    level: form.level,
    certificate_available: !!form.certificate_available,
    language: form.language || "English",
    prerequisites: form.prerequisites || null,
    course_content: form.course_content || null,
    learning_outcomes,
    session_count: Math.max(1, parseInt(form.session_count, 10) || 1),
    meeting_link: form.meeting_link || null,
    venue: form.venue || null,
    currency: "INR",
    is_published: !!form.is_published,
  };
}

function rowToForm(row) {
  const tags = Array.isArray(row.tags) ? row.tags.join(", ") : "";
  const outcomes = Array.isArray(row.learning_outcomes) ? row.learning_outcomes.join("\n") : "";
  const price = Number(row.price ?? 0);
  const isPaid = !Boolean(row.is_free) && price > 0;
  return {
    title: row.title || "",
    description: row.description || "",
    price: String(row.price ?? 0),
    original_price: row.original_price != null ? String(row.original_price) : "",
    is_paid: isPaid,
    instructor_name: row.instructor_name || "",
    instructor_title: row.instructor_title || "",
    instructor_rating: String(row.instructor_rating ?? 4.9),
    instructor_image_url: row.instructor_image_url || "",
    instructor_profile_url: row.instructor_profile_url || "",
    banner_image_url: row.banner_image_url || "",
    schedule_start: row.schedule_start ? row.schedule_start.slice(0, 16) : "",
    schedule_end: row.schedule_end ? row.schedule_end.slice(0, 16) : "",
    max_seats: String(row.max_seats ?? 0),
    enrollment_url: row.enrollment_url || "",
    tags,
    duration: row.duration || "",
    training_format: row.training_format || "live_online",
    level: row.level || "beginner",
    certificate_available: !!row.certificate_available,
    language: row.language || "English",
    prerequisites: row.prerequisites || "",
    course_content: row.course_content || "",
    learning_outcomes: outcomes,
    session_count: String(row.session_count ?? 8),
    meeting_link: row.meeting_link || "",
    venue: row.venue || "",
    is_published: !!row.is_published,
  };
}

export default function AdminExpertLedTraining() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const editId = searchParams.get("edit");
  const canEdit = canEditDigitalPrograms();
  const canDelete = canDeleteDigitalPrograms();

  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const limit = 10;
  const { data, isLoading, isFetching } = useGetOwnerTrainingProgramsQuery({ page, limit, q });
  const { data: editRes } = useGetOwnerTrainingProgramQuery(editId, { skip: !editId });
  const [createProgram, { isLoading: creating }] = useCreateOwnerTrainingProgramMutation();
  const [updateProgram, { isLoading: updating }] = useUpdateOwnerTrainingProgramMutation();
  const [deleteProgram] = useDeleteOwnerTrainingProgramMutation();
  const [uploadBanner, { isLoading: uploading }] = useUploadTrainingProgramBannerMutation();

  const rows = data?.data?.rows || [];
  const pagination = data?.data?.pagination || { page: 1, limit, total: 0, total_pages: 1 };

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editingRow, setEditingRow] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [badges, setBadges] = useState([]);
  const [badgeInput, setBadgeInput] = useState("");
  const [outcomesText, setOutcomesText] = useState("");
  const hydratedProgramIdRef = useRef(null);

  const addBadge = (value) => {
    const val = String(value || "").trim();
    if (!val) return;
    setBadges((prev) => (prev.includes(val) ? prev : [...prev, val]));
    setBadgeInput("");
  };

  const openNew = () => {
    setEditingId(null);
    setEditingRow(null);
    setForm(emptyForm);
    setBadges([]);
    setBadgeInput("");
    setOutcomesText("");
    hydratedProgramIdRef.current = null;
    setOpen(true);
  };

  const openEdit = (row) => {
    setEditingId(row.id);
    setEditingRow(row);
    setForm(rowToForm(row));
    setBadges(parseJsonStringArray(row.tags));
    setBadgeInput("");
    setOutcomesText(
      Array.isArray(row.learning_outcomes)
        ? row.learning_outcomes.join("\n")
        : parseJsonStringArray(row.learning_outcomes).join("\n"),
    );
    hydratedProgramIdRef.current = row.id;
    setOpen(true);
  };

  useEffect(() => {
    hydratedProgramIdRef.current = null;
  }, [editId]);

  useEffect(() => {
    if (!editId || !editRes?.data?.program) return;
    const row = editRes.data.program;
    if (open && editingId === row.id) return;
    if (hydratedProgramIdRef.current === row.id) return;
    hydratedProgramIdRef.current = row.id;
    setEditingId(editId);
    setEditingRow(row);
    setForm(rowToForm(row));
    setBadges(parseJsonStringArray(row.tags));
    setOutcomesText(
      Array.isArray(row.learning_outcomes)
        ? row.learning_outcomes.join("\n")
        : parseJsonStringArray(row.learning_outcomes).join("\n"),
    );
    setOpen(true);
  }, [editId, editRes, open, editingId]);

  const closeDialog = () => {
    setOpen(false);
    hydratedProgramIdRef.current = null;
    if (editId) setSearchParams({});
  };

  const onImageFile = async (e, field) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await uploadBanner(fd).unwrap();
      const url = res?.data?.url;
      if (url) setForm((f) => ({ ...f, [field]: url }));
    } catch {
      /* toast */
    }
    e.target.value = "";
  };

  const save = async () => {
    const payload = toPayload(form, badges, outcomesText);
    if (!payload.title) return;
    if (editingId) {
      const res = await updateProgram({ id: editingId, ...payload }).unwrap();
      const saved = res?.data?.program;
      if (saved) {
        setBadges(parseJsonStringArray(saved.tags));
        setEditingRow(saved);
      }
    } else {
      const res = await createProgram(payload).unwrap();
      const id = res?.data?.program?.id;
      if (id) navigate(`/app/digital-programs/expert-led-training/${id}`);
    }
    closeDialog();
  };

  const loading = isLoading || (isFetching && rows.length === 0);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Expert-Led Training</h1>
          <p className="text-muted-foreground mt-1">
            Instructor-led programs with live sessions — shown on the public Training page when published.
          </p>
        </div>
        {canEdit && (
          <Button onClick={openNew} className="gap-2">
            <Plus className="w-4 h-4" />
            Create program
          </Button>
        )}
      </div>

      <Card className="border shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
            <CardTitle className="text-lg">Programs</CardTitle>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search..."
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setPage(1);
                }}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <CardTableSkeleton rows={5} columns={7} showHeader showActions={false} showCheckbox={false} />
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6">No programs yet.</p>
          ) : (
            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Profile</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Instructor</TableHead>
                    <TableHead>Format</TableHead>
                    <TableHead>Spots Left</TableHead>
                    <TableHead>Published</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>
                        {row.instructor_image_url ? (
                          <img
                            src={resolveMediaUrl(row.instructor_image_url)}
                            alt={row.instructor_name || "Instructor"}
                            className="h-12 w-12 object-cover rounded-full border"
                          />
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="font-medium max-w-[200px]">
                        <p className="truncate">{row.title}</p>
                        <AdminContentDates record={row} className="mt-1" />
                      </TableCell>
                      <TableCell>{row.instructor_name || "—"}</TableCell>
                      <TableCell className="text-sm">{formatLabel(row.training_format || "live_online")}</TableCell>
                      <TableCell className="font-medium text-emerald-600">
                        {row.max_seats
                          ? `${Math.max(0, row.max_seats - (row.enrolled_count ?? 0))} Spots Left`
                          : `${row.enrolled_count ?? 0} Enrolled`}
                      </TableCell>
                      <TableCell>
                        {row.is_published ? (
                          <Badge className="bg-primary">Yes</Badge>
                        ) : (
                          <Badge variant="secondary">No</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          title="View details"
                          onClick={() => navigate(`/app/digital-programs/expert-led-training/${row.id}`)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        {canEdit && (
                        <Button type="button" size="icon" variant="ghost" onClick={() => openEdit(row)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        )}
                        {canDelete && (
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="text-destructive"
                          onClick={async () => {
                            if (!(await confirmDelete("this program"))) return;
                            await deleteProgram(row.id).unwrap();
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          <div className="mt-4 flex justify-end">
            <GlobalPagination
              page={pagination.page || page}
              totalPages={pagination.total_pages || 1}
              onPageChange={setPage}
            />
          </div>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : closeDialog())}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col gap-0 overflow-hidden p-0">
          <DialogHeader className="shrink-0 px-6 pt-6 pb-2">
            <DialogTitle>{editingId ? "Edit program" : "Create program"}</DialogTitle>
            {editingId && editingRow ? (
              <AdminContentDates record={editingRow} className="mt-1" />
            ) : null}
          </DialogHeader>
          <DialogBody className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium">Title *</label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div>
              <label className="text-sm font-medium">Short Description</label>
              <p className="text-xs text-muted-foreground mb-2">
                Shown on the public program page. Formatting is preserved for learners.
              </p>
              <QuillRichEditor
                editorKey={editingId || "new-training-program"}
                value={form.description}
                onChange={(html) => setForm({ ...form, description: html })}
                placeholder="Brief overview of this training program…"
                minHeight={160}
                maxHeight={320}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Duration</label>
                <Input
                  placeholder="e.g. 4 Weeks, 12 Hours"
                  value={form.duration}
                  onChange={(e) => setForm({ ...form, duration: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Session count</label>
                <Input
                  type="number"
                  value={form.session_count}
                  onChange={(e) => setForm({ ...form, session_count: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Training format</label>
                <Select
                  value={form.training_format}
                  onValueChange={(v) => setForm({ ...form, training_format: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="live_online">Live Online</SelectItem>
                    <SelectItem value="hybrid">Hybrid</SelectItem>
                    <SelectItem value="in_person">In-Person</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Level</label>
                <Select value={form.level} onValueChange={(v) => setForm({ ...form, level: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Beginner</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {(form.training_format === "live_online" || form.training_format === "hybrid") && (
              <div>
                <label className="text-sm font-medium">Meeting / join link</label>
                <Input
                  placeholder="Zoom, Teams, or Google Meet URL"
                  value={form.meeting_link}
                  onChange={(e) => setForm({ ...form, meeting_link: e.target.value })}
                />
              </div>
            )}
            {(form.training_format === "in_person" || form.training_format === "hybrid") && (
              <div>
                <label className="text-sm font-medium">Venue</label>
                <Textarea
                  value={form.venue}
                  onChange={(e) => setForm({ ...form, venue: e.target.value })}
                  className="min-h-[60px]"
                />
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Max seats</label>
                <Input value={form.max_seats} onChange={(e) => setForm({ ...form, max_seats: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium">Language</label>
                <Input value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })} />
              </div>
            </div>
            <div className="flex items-center justify-between py-2 border-t">
              <span className="text-sm font-medium">Paid program (Razorpay)</span>
              <Switch checked={form.is_paid} onCheckedChange={(v) => setForm({ ...form, is_paid: v })} />
            </div>
            {form.is_paid && (
              <div className="space-y-3 pl-4 border-l-2 border-muted">
                <div>
                  <label className="text-sm font-medium">Standard price (INR)</label>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-muted-foreground">₹</span>
                    <Input
                      type="number"
                      min="0"
                      step="1"
                      value={form.original_price}
                      onChange={(e) => setForm({ ...form, original_price: e.target.value })}
                      placeholder="e.g. 19999"
                      className="w-40"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Optional. Shown with strikethrough when higher than the discounted price.
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Discounted price (INR)</label>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-muted-foreground">₹</span>
                    <Input
                      type="number"
                      min="1"
                      step="1"
                      value={form.price}
                      onChange={(e) => setForm({ ...form, price: e.target.value })}
                      className="w-40"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Amount charged at checkout.
                  </p>
                </div>
              </div>
            )}
            <div className="flex items-center justify-between py-2 border-t">
              <span className="text-sm font-medium">Certificate available</span>
              <Switch
                checked={form.certificate_available}
                onCheckedChange={(v) => setForm({ ...form, certificate_available: v })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Instructor name</label>
                <Input
                  value={form.instructor_name}
                  onChange={(e) => setForm({ ...form, instructor_name: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Instructor title</label>
                <Input
                  value={form.instructor_title}
                  onChange={(e) => setForm({ ...form, instructor_title: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Profile icon</label>
              <p className="text-xs text-muted-foreground mb-2">
                Shown on the public Training page next to instructor details.
              </p>
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full border-2 border-dashed border-muted-foreground/30 bg-muted/30 overflow-hidden shrink-0 flex items-center justify-center">
                  {form.instructor_image_url ? (
                    <img
                      src={resolveMediaUrl(form.instructor_image_url)}
                      alt="Profile preview"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-[10px] text-muted-foreground text-center px-1">No photo</span>
                  )}
                </div>
                <div className="flex-1 min-w-0 space-y-2">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => onImageFile(e, "instructor_image_url")}
                  />
                  {form.instructor_image_url ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 text-muted-foreground"
                      onClick={() => setForm({ ...form, instructor_image_url: "" })}
                    >
                      Remove photo
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium flex items-center gap-1.5">
                <Star className="w-4 h-4 text-amber-500" />
                Star rating
              </label>
              <p className="text-xs text-muted-foreground mb-2">
                Shown on the public program page (1.0 – 5.0).
              </p>
              <Input
                type="number"
                step="0.1"
                min="1"
                max="5"
                value={form.instructor_rating}
                onChange={(e) => setForm({ ...form, instructor_rating: e.target.value })}
                className="w-32"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Instructor profile link (optional)</label>
              <Input
                placeholder="https://linkedin.com/in/..."
                value={form.instructor_profile_url}
                onChange={(e) => setForm({ ...form, instructor_profile_url: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Prerequisites</label>
              <Textarea
                value={form.prerequisites}
                onChange={(e) => setForm({ ...form, prerequisites: e.target.value })}
                className="min-h-[60px]"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Course content</label>
              <p className="text-xs text-muted-foreground mb-2">
                Shown below Prerequisites on the public program page.
              </p>
              <QuillRichEditor
                editorKey={editingId ? `${editingId}-course` : "new-training-course"}
                value={form.course_content || ""}
                onChange={(html) => setForm({ ...form, course_content: html })}
                placeholder="Syllabus, modules, topics covered…"
                minHeight={160}
                maxHeight={320}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Learning outcomes (one per line)</label>
              <p className="text-xs text-muted-foreground mb-2">Press Enter to add each outcome on a new line.</p>
              <Textarea
                value={outcomesText}
                onChange={(e) => setOutcomesText(e.target.value)}
                onKeyDown={(e) => e.stopPropagation()}
                className="min-h-[80px]"
                placeholder={"Mock interviews\nResume review\nJob referrals"}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Start date</label>
                <Input
                  type="datetime-local"
                  value={form.schedule_start}
                  onChange={(e) => setForm({ ...form, schedule_start: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">End date</label>
                <Input
                  type="datetime-local"
                  value={form.schedule_end}
                  onChange={(e) => setForm({ ...form, schedule_end: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Badges</label>
              <p className="text-xs text-muted-foreground mb-2">
                Custom badges shown at the top of the public program page.
              </p>
              <div className="flex flex-wrap gap-2 mb-2">
                {badges.map((badge, i) => (
                  <Badge key={i} className="flex items-center gap-1">
                    {badge}
                    <button
                      type="button"
                      onClick={() => setBadges((prev) => prev.filter((_, idx) => idx !== i))}
                      className="ml-0.5"
                      aria-label={`Remove ${badge}`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Add a badge (press Enter)"
                  value={badgeInput}
                  onChange={(e) => setBadgeInput(e.target.value)}
                  onKeyDown={(e) => {
                    e.stopPropagation();
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addBadge(badgeInput);
                    }
                  }}
                />
                <Button type="button" variant="outline" onClick={() => addBadge(badgeInput)}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Published</span>
              <Switch checked={form.is_published} onCheckedChange={(v) => setForm({ ...form, is_published: v })} />
            </div>
          </DialogBody>
          <DialogFooter className="shrink-0 border-t bg-background px-6 py-4">
            <Button variant="outline" onClick={closeDialog}>
              Cancel
            </Button>
            <Button onClick={save} disabled={creating || updating || uploading}>
              {(creating || updating) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
