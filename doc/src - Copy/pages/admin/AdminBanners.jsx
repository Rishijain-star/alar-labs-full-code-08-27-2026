import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Search, Edit, Trash2, Image as ImageIcon, Upload, Loader2 } from "lucide-react";
import GlobalPagination from "@/components/common/Pagination";
import {
  useCreateOwnerBannerMutation,
  useDeleteOwnerBannerMutation,
  useGetOwnerBannersQuery,
  useUpdateOwnerBannerMutation,
  useUploadSiteAssetMutation,
} from "@/store/api/siteContentApi";
import { resolveMediaUrl } from "@/lib/mediaUrl";
import { CardTableSkeleton } from "@/components/common/TableSkeleton";

const empty = {
  title: "",
  subtitle: "",
  image_url: "",
  link_url: "",
  button_title: "",
  button_link: "",
  is_active: true,
  sort_order: 0,
};

export default function AdminBanners() {
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const limit = 10;
  const { data, isLoading, isFetching } = useGetOwnerBannersQuery({ page, limit, q });
  const [createBanner, { isLoading: creating }] = useCreateOwnerBannerMutation();
  const [updateBanner, { isLoading: updating }] = useUpdateOwnerBannerMutation();
  const [deleteBanner] = useDeleteOwnerBannerMutation();
  const [upload] = useUploadSiteAssetMutation();

  const rows = data?.data?.rows || [];
  const pagination = data?.data?.pagination || { page: 1, total_pages: 1 };

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);

  const openNew = () => {
    setEditing(null);
    setForm(empty);
    setDialogOpen(true);
  };

  const openEdit = (b) => {
    setEditing(b);
    setForm({
      title: b.title || "",
      subtitle: b.subtitle || "",
      image_url: b.image_url || "",
      link_url: b.link_url || "",
      button_title: b.button_title || "",
      button_link: b.button_link || "",
      is_active: !!b.is_active,
      sort_order: b.sort_order ?? 0,
    });
    setDialogOpen(true);
  };

  const onUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await upload(fd).unwrap();
      const url = res?.data?.url;
      if (url) setForm((f) => ({ ...f, image_url: url }));
    } catch {
      /* toast */
    }
    e.target.value = "";
  };

  const save = async () => {
    const payload = {
      ...form,
      sort_order: Number(form.sort_order) || 0,
    };
    if (!payload.title.trim()) return;
    if (editing) await updateBanner({ id: editing.id, ...payload }).unwrap();
    else await createBanner(payload).unwrap();
    setDialogOpen(false);
  };

  const loading = isLoading || (isFetching && rows.length === 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Banner Management</h1>
          <p className="text-muted-foreground mt-1">Homepage hero uses active banners.</p>
        </div>
        <Button onClick={openNew} className="gap-2">
          <Plus className="w-4 h-4" />
          Add Banner
        </Button>
      </div>

      <Card className="border shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center">
            <CardTitle className="text-lg">Banners</CardTitle>
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search banners..."
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
            <CardTableSkeleton rows={5} columns={6} showHeader showActions showCheckbox={false} />
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6">No banners yet.</p>
          ) : (
            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Preview</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Button</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell>
                        {b.image_url ? (
                          <img
                            src={resolveMediaUrl(b.image_url)}
                            alt=""
                            className="h-12 w-20 object-cover rounded border"
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                            }}
                          />
                        ) : (
                          <ImageIcon className="w-8 h-8 text-muted-foreground" />
                        )}
                      </TableCell>
                      <TableCell className="font-medium max-w-[180px]">
                        <div className="truncate">{b.title}</div>
                        {b.subtitle ? <div className="text-xs text-muted-foreground truncate">{b.subtitle}</div> : null}
                      </TableCell>
                      <TableCell className="text-sm">{b.button_title || "—"}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={!!b.is_active}
                            onCheckedChange={async (v) => {
                              await updateBanner({ id: b.id, is_active: v }).unwrap();
                            }}
                          />
                          {b.is_active ? (
                            <Badge className="bg-primary">Active</Badge>
                          ) : (
                            <Badge variant="secondary">Off</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {b.created_at ? String(b.created_at).slice(0, 10) : "—"}
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button type="button" size="icon" variant="ghost" onClick={() => openEdit(b)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="text-destructive"
                          onClick={async () => {
                            if (!confirm("Delete this banner?")) return;
                            await deleteBanner(b.id).unwrap();
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit banner" : "Add banner"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-sm font-medium">Title</label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div>
              <label className="text-sm font-medium">Subtitle</label>
              <Textarea value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} />
            </div>
            <div>
              <label className="text-sm font-medium">Image</label>
              <Input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} />
              <label className="mt-2 flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-4 cursor-pointer hover:border-primary/50">
                <Upload className="w-6 h-6 text-muted-foreground mb-1" />
                <span className="text-xs text-muted-foreground">Upload image</span>
                <input type="file" accept="image/*" className="hidden" onChange={onUpload} />
              </label>
            </div>
            <div>
              <label className="text-sm font-medium">Link URL</label>
              <Input value={form.link_url} onChange={(e) => setForm({ ...form, link_url: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-sm font-medium">Button title</label>
                <Input value={form.button_title} onChange={(e) => setForm({ ...form, button_title: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium">Button link</label>
                <Input value={form.button_link} onChange={(e) => setForm({ ...form, button_link: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Sort order</label>
              <Input
                type="number"
                value={form.sort_order}
                onChange={(e) => setForm({ ...form, sort_order: e.target.value })}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Active</span>
              <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save} disabled={creating || updating}>
              {(creating || updating) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
