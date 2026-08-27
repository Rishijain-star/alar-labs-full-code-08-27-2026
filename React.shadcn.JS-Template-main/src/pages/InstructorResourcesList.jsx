import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Search, FileText, Download } from "lucide-react";
import axiosInstance from "@/lib/axios";
import { toast } from "sonner";
import GlobalPagination from "@/components/common/Pagination";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export default function InstructorResourcesList() {
  const [resources, setResources] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [isLoading, setIsLoading] = useState(false);
  const [downloadDialogOpen, setDownloadDialogOpen] = useState(false);
  const [selectedResource, setSelectedResource] = useState(null);
  const [optInState, setOptInState] = useState(false);

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

  const handleDownloadClick = async (resource) => {
    setSelectedResource(resource);
    try {
      const res = await axiosInstance.get(`/instructor-resources/${resource.id}/opt-in`);
      setOptInState(res.data.optedIn);
      setDownloadDialogOpen(true);
    } catch (err) {
      toast.error("Error fetching opt-in status");
    }
  };

  const handleProceedDownload = async () => {
    try {
      await axiosInstance.post(`/instructor-resources/${selectedResource.id}/opt-in`, { optedIn: optInState });
      
      const res = await axiosInstance.post(`/instructor-resources/${selectedResource.id}/download`);
      if (res.data.file_url) {
        window.open(res.data.file_url, "_blank");
        setDownloadDialogOpen(false);
      } else {
        toast.error("File URL not found.");
      }
    } catch (err) {
      if (err.response && err.response.status === 403) {
        toast.error("You do not have access to this resource. Please purchase the associated module or certification.");
      } else {
        toast.error("An error occurred during download.");
      }
    }
  };

  return (
    <div className="container mx-auto py-8">
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Instructor Resources</CardTitle>
          <CardDescription>
            Download presentation slides and materials for courses you are enrolled in.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative max-w-md mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search resources..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {paginatedResources.length > 0 ? (
              paginatedResources.map((res) => (
                <Card key={res.id} className="flex flex-col h-full border hover:border-primary/50 transition-colors">
                  <CardHeader className="pb-3 flex-grow">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <FileText className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-base line-clamp-2">{res.title}</CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">Version {res.version}</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="text-sm text-muted-foreground mb-4">
                      {res.course ? `Linked to Course: ${res.course.title}` : (res.certification ? `Linked to Certification: ${res.certification.title}` : "General Resource")}
                    </div>
                    <Button className="w-full" onClick={() => handleDownloadClick(res)}>
                      <Download className="w-4 h-4 mr-2" /> Download
                    </Button>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="col-span-full text-center py-12 text-muted-foreground">
                {isLoading ? "Loading resources..." : "No resources found."}
              </div>
            )}
          </div>

          <div className="mt-8">
            <GlobalPagination
              page={currentPage}
              totalPages={totalPages}
              totalItems={total}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={setItemsPerPage}
              showInfo={true}
              showItemsPerPage={true}
              itemsPerPageOptions={[6, 12, 24]}
            />
          </div>
        </CardContent>
      </Card>

      <Dialog open={downloadDialogOpen} onOpenChange={setDownloadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Download Resource</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-6">
            <p className="text-sm text-muted-foreground">
              You are about to download <strong>{selectedResource?.title}</strong> (Version {selectedResource?.version}).
            </p>
            <div className="flex items-center space-x-2 bg-muted/30 p-4 rounded-lg">
              <Switch
                id="opt-in"
                checked={optInState}
                onCheckedChange={setOptInState}
              />
              <Label htmlFor="opt-in" className="leading-snug cursor-pointer">
                Opt-in for long-term updates. We will notify you when a new version of this resource is released.
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDownloadDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleProceedDownload}>
              Proceed to Download
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
