import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Plus, Search, Edit, Trash2, FileText, Download } from "lucide-react";
import axiosInstance from "@/lib/axios";
import { toast } from "sonner";
import GlobalPagination from "@/components/common/Pagination";

export default function AdminInstructorResources() {
  const [resources, setResources] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingResource, setEditingResource] = useState(null);
  const [formData, setFormData] = useState({ title: "", version: "1.0", file_url: "", course_id: "", certification_id: "" });
  const [isLoading, setIsLoading] = useState(false);

  const fetchResources = async () => {
    setIsLoading(true);
    try {
      const res = await axiosInstance.get("/instructor-resources");
      setResources(res.data || []);
    } catch (err) {
      toast.error("Failed to fetch resources");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchResources();
  }, []);

  const filteredResources = useMemo(() => {
    return resources.filter(r => r.title?.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [resources, searchQuery]);

  const total = filteredResources.length;
  const totalPages = Math.max(1, Math.ceil(total / itemsPerPage));
  const paginatedResources = filteredResources.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleOpenDialog = (resource) => {
    if (resource) {
      setEditingResource(resource);
      setFormData({
        title: resource.title,
        version: resource.version,
        file_url: resource.file_url,
        course_id: resource.course_id || "",
        certification_id: resource.certification_id || "",
      });
    } else {
      setEditingResource(null);
      setFormData({ title: "", version: "1.0", file_url: "", course_id: "", certification_id: "" });
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.title.trim() || !formData.file_url.trim()) {
      toast.error("Title and File URL are required.");
      return;
    }
    try {
      const payload = { ...formData };
      if (!payload.course_id) delete payload.course_id;
      if (!payload.certification_id) delete payload.certification_id;

      if (editingResource) {
        await axiosInstance.put(`/instructor-resources/${editingResource.id}`, payload);
        toast.success("Resource updated successfully.");
      } else {
        await axiosInstance.post("/instructor-resources", payload);
        toast.success("Resource created successfully.");
      }
      setDialogOpen(false);
      fetchResources();
    } catch (err) {
      toast.error("Failed to save resource.");
    }
  };

  const handleDelete = async (id) => {
    if (confirm("Are you sure you want to delete this resource?")) {
      try {
        await axiosInstance.delete(`/instructor-resources/${id}`);
        toast.success("Resource deleted successfully.");
        fetchResources();
      } catch (err) {
        toast.error("Failed to delete resource.");
      }
    }
  };

  return (
    <>
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-4">
            <CardTitle className="text-lg">Instructor Resources</CardTitle>
            <Button onClick={() => handleOpenDialog(null)}>
              <Plus className="h-4 w-4 mr-2" /> Add Resource
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search resources..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Title</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>Linked To</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedResources.length > 0 ? (
                  paginatedResources.map((res) => (
                    <TableRow key={res.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-primary" />
                          <span className="font-medium">{res.title}</span>
                        </div>
                      </TableCell>
                      <TableCell>{res.version}</TableCell>
                      <TableCell>
                        {res.course ? `Course: ${res.course.title}` : (res.certification ? `Cert: ${res.certification.title}` : "None")}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleOpenDialog(res)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-600 hover:text-red-700"
                            onClick={() => handleDelete(res.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      No resources found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <GlobalPagination
            page={currentPage}
            totalPages={totalPages}
            totalItems={total}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={setItemsPerPage}
            showInfo={true}
            showItemsPerPage={true}
            itemsPerPageOptions={[5, 10, 20]}
          />
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingResource ? 'Edit Resource' : 'Add Resource'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Title</label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Version</label>
              <Input
                value={formData.version}
                onChange={(e) => setFormData({ ...formData, version: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">File URL</label>
              <Input
                placeholder="https://..."
                value={formData.file_url}
                onChange={(e) => setFormData({ ...formData, file_url: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Course ID (Optional)</label>
              <Input
                value={formData.course_id}
                onChange={(e) => setFormData({ ...formData, course_id: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Certification ID (Optional)</label>
              <Input
                value={formData.certification_id}
                onChange={(e) => setFormData({ ...formData, certification_id: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
