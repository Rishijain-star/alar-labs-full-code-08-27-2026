import { useEffect, useMemo, useState } from "react";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Search, Edit, Trash2, Award } from "lucide-react";
import TableSkeleton from "@/components/common/TableSkeleton";
import GlobalPagination from "@/components/common/Pagination";
import { hasAnyPermission } from "@/utils/permissions";
import {
  useGetCertificationsQuery,
  useCreateCertificationMutation,
  useUpdateCertificationMutation,
  useDeleteCertificationMutation,
} from "@/store/api/certificationAdminApi";

const DEFAULT_PER_PAGE = 12;
const PER_PAGE_OPTIONS = [4, 8, 12, 16, 24];

const EMPTY_FORM = {
  title: "",
  description: "",
  template_url: "",
  passing_score: 70,
  validity_days: "",
  is_active: true,
  templateFile: null,
};

const CAN_CREATE = [
  "create_certifications",
  "manage_certificates",
  "manage_certifications",
  "generate_certificates",
];

function buildFormData(form) {
  const fd = new FormData();
  fd.append("title", form.title.trim());
  if (form.description) fd.append("description", form.description.trim());
  if (form.template_url) fd.append("template_url", form.template_url.trim());
  fd.append("passing_score", String(form.passing_score ?? 70));
  if (form.validity_days !== "" && form.validity_days != null) {
    fd.append("validity_days", String(form.validity_days));
  }
  fd.append("is_active", String(!!form.is_active));
  if (form.templateFile) fd.append("templateFile", form.templateFile);
  return fd;
}

export default function AdminCertifications() {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(DEFAULT_PER_PAGE);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [toDelete, setToDelete] = useState(null);

  const canCreate = hasAnyPermission(CAN_CREATE);

  const { data, isLoading, isFetching } = useGetCertificationsQuery({
    page: currentPage,
    limit: itemsPerPage,
  });

  const rows = useMemo(
    () =>
      data?.data?.rows ||
      data?.data?.items ||
      data?.rows ||
      data?.items ||
      data?.data ||
      [],
    [data]
  );

  const total =
    data?.data?.total || data?.total || rows.length;
  const totalPages =
    data?.data?.totalPages ||
    data?.data?.total_pages ||
    data?.totalPages ||
    data?.total_pages ||
    Math.max(1, Math.ceil(total / itemsPerPage));

  const handlePerPageChange = (next) => {
    setItemsPerPage(next);
    setCurrentPage(1);
  };

  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        String(r.title || "").toLowerCase().includes(q) ||
        String(r.description || "").toLowerCase().includes(q)
    );
  }, [rows, searchQuery]);

  const [createCert, { isLoading: creating }] = useCreateCertificationMutation();
  const [updateCert, { isLoading: updating }] = useUpdateCertificationMutation();
  const [deleteCert, { isLoading: deleting }] = useDeleteCertificationMutation();

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const openDialog = (cert) => {
    if (cert) {
      setEditing(cert);
      setFormData({
        title: cert.title || "",
        description: cert.description || "",
        template_url: cert.template_url || "",
        passing_score: cert.passing_score ?? 70,
        validity_days: cert.validity_days ?? "",
        is_active: cert.is_active !== false,
        templateFile: null,
      });
    } else {
      setEditing(null);
      setFormData(EMPTY_FORM);
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.title.trim()) return;
    const fd = buildFormData(formData);
    if (editing) {
      await updateCert({ id: editing.id, formData: fd }).unwrap().catch(() => {});
    } else {
      await createCert(fd).unwrap().catch(() => {});
    }
    setDialogOpen(false);
    setFormData(EMPTY_FORM);
    setEditing(null);
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    await deleteCert(toDelete.id).unwrap().catch(() => {});
    setDeleteDialogOpen(false);
    setToDelete(null);
  };

  if (isLoading || isFetching) {
    return (
      <TableSkeleton
        rows={6}
        columns={5}
        showHeader
        showActions
        showCheckbox={false}
      />
    );
  }

  return (
    <>
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Award className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Certificate Templates</CardTitle>
            </div>
            {canCreate && (
              <Button onClick={() => openDialog()}>
                <Plus className="h-4 w-4 mr-2" /> Create Certificate
              </Button>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Reusable completion certificates. Link them when creating courses or labs.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search certificates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {total > 0 && (
            <GlobalPagination
              mode="toolbar"
              variant="split"
              page={currentPage}
              totalPages={totalPages}
              totalItems={total}
              itemsPerPage={itemsPerPage}
              onItemsPerPageChange={handlePerPageChange}
              showItemsPerPage
              showInfo
              itemsPerPageOptions={PER_PAGE_OPTIONS}
            />
          )}

          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Title</TableHead>
                  <TableHead>Passing score</TableHead>
                  <TableHead>Validity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      No certificate templates yet.
                      {canCreate && " Click Create Certificate to add one."}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRows.map((cert) => (
                    <TableRow key={cert.id}>
                      <TableCell>
                        <div className="font-medium">{cert.title}</div>
                        {cert.description && (
                          <div className="text-xs text-muted-foreground line-clamp-1">
                            {cert.description}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>{cert.passing_score ?? 70}%</TableCell>
                      <TableCell>
                        {cert.validity_days ? `${cert.validity_days} days` : "Never expires"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={cert.is_active ? "default" : "secondary"}>
                          {cert.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => openDialog(cert)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-destructive"
                            onClick={() => {
                              setToDelete(cert);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {total > 0 && (
            <GlobalPagination
              mode="nav"
              variant="split"
              page={currentPage}
              totalPages={totalPages}
              totalItems={total}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              showInfo={false}
            />
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit Certificate Template" : "Create Certificate Template"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium">Title *</label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData((f) => ({ ...f, title: e.target.value }))}
                placeholder="e.g. AWS Cloud Practitioner Completion"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData((f) => ({ ...f, description: e.target.value }))}
                rows={3}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Template URL</label>
              <Input
                value={formData.template_url}
                onChange={(e) => setFormData((f) => ({ ...f, template_url: e.target.value }))}
                placeholder="https://... or upload a file below"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Template file (image/PDF)</label>
              <Input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,application/pdf,.jfif"
                onChange={(e) =>
                  setFormData((f) => ({
                    ...f,
                    templateFile: e.target.files?.[0] || null,
                  }))
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Passing score (%)</label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={formData.passing_score}
                  onChange={(e) =>
                    setFormData((f) => ({
                      ...f,
                      passing_score: Number(e.target.value),
                    }))
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium">Validity (days)</label>
                <Input
                  type="number"
                  min={1}
                  value={formData.validity_days}
                  onChange={(e) =>
                    setFormData((f) => ({ ...f, validity_days: e.target.value }))
                  }
                  placeholder="Leave empty = never expires"
                />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <span className="text-sm font-medium">Active</span>
              <Switch
                checked={!!formData.is_active}
                onCheckedChange={(v) => setFormData((f) => ({ ...f, is_active: v }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={creating || updating || !formData.title.trim()}>
              {editing ? "Save changes" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete certificate template?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            &ldquo;{toDelete?.title}&rdquo; will be removed. Courses and labs already linked
            may lose their template reference.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
