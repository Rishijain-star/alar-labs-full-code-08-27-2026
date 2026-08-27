import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
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
} from "@/components/ui/dialog";
import { Plus, Search, Pencil, Trash2, Loader2 } from "lucide-react";
import GlobalPagination from "@/components/common/Pagination";
import {
  useCreateOwnerTrainingProgramMutation,
  useDeleteOwnerTrainingProgramMutation,
  useGetOwnerTrainingProgramsQuery,
  useUpdateOwnerTrainingProgramMutation,
  useUploadTrainingProgramBannerMutation,
} from "@/store/api/siteContentApi";
import { resolveMediaUrl } from "@/lib/mediaUrl";
import { CardTableSkeleton } from "@/components/common/TableSkeleton";

const emptyForm = {
  title: "",
  description: "",
  price: "0",
  instructor_name: "",
  instructor_title: "",
  instructor_rating: "4.9",
  instructor_image_url: "",
  banner_image_url: "",
  schedule_start: "",
  schedule_end: "",
  max_seats: "30",
  enrolled_count: "0",
  enrollment_url: "",
  tags: "",
  is_published: false,
};

function toPayload(form) {
  const tags = form.tags
    ? form.tags
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : [];
  return {
    title: form.title.trim(),
    description: form.description || "",
    price: Number(form.price) || 0,
    instructor_name: form.instructor_name || "",
    instructor_title: form.instructor_title || "",
    instructor_rating: Number(form.instructor_rating) || 0,
    instructor_image_url: form.instructor_image_url || "",
    banner_image_url: form.banner_image_url || "",
    schedule_start: form.schedule_start ? new Date(form.schedule_start).toISOString() : null,
    schedule_end: form.schedule_end ? new Date(form.schedule_end).toISOString() : null,
    max_seats: Math.max(0, parseInt(form.max_seats, 10) || 0),
    enrolled_count: Math.max(0, parseInt(form.enrolled_count, 10) || 0),
    enrollment_url: form.enrollment_url || "",
    tags,
    is_published: !!form.is_published,
  };
}

export default function AdminExpertLedTraining() {
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const limit = 10;
  const { data, isLoading, isFetching } = useGetOwnerTrainingProgramsQuery({ page, limit, q });
  const [createProgram, { isLoading: creating }] = useCreateOwnerTrainingProgramMutation();
  const [updateProgram, { isLoading: updating }] = useUpdateOwnerTrainingProgramMutation();
  const [deleteProgram] = useDeleteOwnerTrainingProgramMutation();
  const [uploadBanner, { isLoading: uploading }] = useUploadTrainingProgramBannerMutation();

  const rows = data?.data?.rows || [];
  const pagination = data?.data?.pagination || { page: 1, limit, total: 0, total_pages: 1 };

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const openNew = () => {
    setEditingId(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (row) => {
    setEditingId(row.id);
    const tags = Array.isArray(row.tags) ? row.tags.join(", ") : "";
    setForm({
      title: row.title || "",
      description: row.description || "",
      price: String(row.price ?? 0),
      instructor_name: row.instructor_name || "",
      instructor_title: row.instructor_title || "",
      instructor_rating: String(row.instructor_rating ?? 4.9),
      instructor_image_url: row.instructor_image_url || "",
      banner_image_url: row.banner_image_url || "",
      schedule_start: row.schedule_start ? row.schedule_start.slice(0, 16) : "",
      schedule_end: row.schedule_end ? row.schedule_end.slice(0, 16) : "",
      max_seats: String(row.max_seats ?? 0),
      enrolled_count: String(row.enrolled_count ?? 0),
      enrollment_url: row.enrollment_url || "",
      tags,
      is_published: !!row.is_published,
    });
    setOpen(true);
  };

  const onBannerFile = async (e, field) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await uploadBanner(fd).unwrap();
      const url = res?.data?.url;
      if (url) setForm((f) => ({ ...f, [field]: url }));
    } catch {
      /* toast from axios */
    }
    e.target.value = "";
  };

  const save = async () => {
    const payload = toPayload(form);
    if (!payload.title) return;
    if (editingId) await updateProgram({ id: editingId, ...payload }).unwrap();
    else await createProgram(payload).unwrap();
    setOpen(false);
  };

  const loading = isLoading || (isFetching && rows.length === 0);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Expert-Led Training</h1>
          <p className="text-muted-foreground mt-1">
            Programs shown on the public Training page (published items).
          </p>
        </div>
        <Button onClick={openNew} className="gap-2">
          <Plus className="w-4 h-4" />
          Create program
        </Button>
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
            <CardTableSkeleton rows={5} columns={6} showHeader showActions={false} showCheckbox={false} />
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6">No programs yet.</p>
          ) : (
            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Banner</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Instructor</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Published</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>
                        {row.banner_image_url ? (
                          <img
                            src={resolveMediaUrl(row.banner_image_url)}
                            alt=""
                            className="h-12 w-20 object-cover rounded border"
                          />
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="font-medium max-w-[200px] truncate">{row.title}</TableCell>
                      <TableCell>{row.instructor_name || "—"}</TableCell>
                      <TableCell>${Number(row.price || 0).toFixed(0)}</TableCell>
                      <TableCell>
                        {row.is_published ? (
                          <Badge className="bg-primary">Yes</Badge>
                        ) : (
                          <Badge variant="secondary">No</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button type="button" size="icon" variant="ghost" onClick={() => openEdit(row)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="text-destructive"
                          onClick={async () => {
                            if (!confirm("Delete this program?")) return;
                            await deleteProgram(row.id).unwrap();
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit program" : "Create program"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-sm font-medium">Title</label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea
                className="min-h-[80px]"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-sm font-medium">Price (USD)</label>
                <Input value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium">Max seats</label>
                <Input value={form.max_seats} onChange={(e) => setForm({ ...form, max_seats: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-sm font-medium">Enrolled</label>
                <Input
                  value={form.enrolled_count}
                  onChange={(e) => setForm({ ...form, enrolled_count: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Rating</label>
                <Input
                  value={form.instructor_rating}
                  onChange={(e) => setForm({ ...form, instructor_rating: e.target.value })}
                />
              </div>
            </div>
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
            <div>
              <label className="text-sm font-medium">Instructor image URL</label>
              <Input
                value={form.instructor_image_url}
                onChange={(e) => setForm({ ...form, instructor_image_url: e.target.value })}
              />
              <Input type="file" accept="image/*" className="mt-1" onChange={(e) => onBannerFile(e, "instructor_image_url")} />
            </div>
            <div>
              <label className="text-sm font-medium">Banner image</label>
              <Input
                value={form.banner_image_url}
                onChange={(e) => setForm({ ...form, banner_image_url: e.target.value })}
              />
              <Input type="file" accept="image/*" className="mt-1" onChange={(e) => onBannerFile(e, "banner_image_url")} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-sm font-medium">Start</label>
                <Input
                  type="datetime-local"
                  value={form.schedule_start}
                  onChange={(e) => setForm({ ...form, schedule_start: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">End</label>
                <Input
                  type="datetime-local"
                  value={form.schedule_end}
                  onChange={(e) => setForm({ ...form, schedule_end: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Tags (comma-separated)</label>
              <Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} />
            </div>
            <div>
              <label className="text-sm font-medium">Enrollment URL</label>
              <Input
                value={form.enrollment_url}
                onChange={(e) => setForm({ ...form, enrollment_url: e.target.value })}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Published</span>
              <Switch checked={form.is_published} onCheckedChange={(v) => setForm({ ...form, is_published: v })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
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
