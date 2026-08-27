import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Plus, Trash2, Save, Eye, CheckCircle2, Star } from "lucide-react";
import {
  useGetAdminCloudServicesQuery,
  useCreateCloudServiceMutation,
  useUpdateCloudServiceMutation,
  useDeleteCloudServiceMutation,
  useGetCloudServiceRequestsQuery,
  useUpdateCloudServiceRequestStatusMutation,
} from "@/store/api/cloudServiceApi";
import { confirmDelete } from "@/lib/confirmAction";
import QuillRichEditor from "@/components/editor/QuillRichEditor";
import RichTextContent from "@/components/learning/RichTextContent";
import { sanitizeCourseDescriptionHtml } from "@/lib/sanitizeCourseHtml";
import { stripHtmlToPlain } from "@/lib/stripHtml";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
  DialogBody,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { permissionStore } from "@/utils/permissions";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";

export default function CloudServicesAdmin() {
  const canView = permissionStore.hasPermission("manage_cloud_services");
  const canEdit = permissionStore.hasPermission("manage_cloud_services");
  const { data: servicesData, isLoading: loadingServices, refetch: refetchServices } = useGetAdminCloudServicesQuery();
  const [createService] = useCreateCloudServiceMutation();
  const [updateService] = useUpdateCloudServiceMutation();
  const [deleteService] = useDeleteCloudServiceMutation();
  
  const { data: requestsData, isLoading: loadingRequests, refetch: refetchRequests } = useGetCloudServiceRequestsQuery();
  const [updateRequestStatus] = useUpdateCloudServiceRequestStatusMutation();

  const [editingService, setEditingService] = useState(null);
  const [services, setServices] = useState([]);

  useEffect(() => {
    if (servicesData?.data?.rows) {
      setServices(servicesData.data.rows);
    }
  }, [servicesData]);

  const handleAddService = () => {
    const newService = {
      title: "New Cloud Service",
      description: "",
      icon: "Cloud",
      requires_login: true,
      features: "",
      rating: 4.8,
      is_active: true,
      sort_order: services.length,
    };
    setEditingService(newService);
  };

  const handleEditService = (service) => {
    // If the service has a pending draft, use that data for editing
    const dataToEdit = service.draft_data || service;
    
    // Legacy support: convert array features to HTML string for editor
    let parsedFeatures = dataToEdit.features;
    if (typeof parsedFeatures === "string") {
      try { parsedFeatures = JSON.parse(parsedFeatures); } catch (e) { /* ignore */ }
    }
    
    let featuresHtml = typeof parsedFeatures === "string" ? parsedFeatures : "";
    if (Array.isArray(parsedFeatures)) {
      featuresHtml = parsedFeatures.length > 0 
        ? "<ul>" + parsedFeatures.map(f => `<li>${f}</li>`).join("") + "</ul>"
        : "";
    }
    
    setEditingService({ ...dataToEdit, id: service.id, features: featuresHtml });
  };

  const handleSaveService = async () => {
    if (!editingService) return;
    const payload = {
      ...editingService,
      requires_login: true,
      rating: Math.min(5, Math.max(1, Number(editingService.rating) || 4.8)),
      features: editingService.features || "",
    };
    if (payload.id) {
      await updateService({ id: payload.id, data: payload }).unwrap();
    } else {
      await createService(payload).unwrap();
    }
    setEditingService(null);
    refetchServices();
  };

  const handleDeleteService = async (id) => {
    if (!(await confirmDelete("this service"))) return;
    await deleteService(id).unwrap();
    refetchServices();
  };

  const handleUpdateRequestStatus = async (id, status) => {
    await updateRequestStatus({ id, status }).unwrap();
    refetchRequests();
  };

  if (loadingServices || loadingRequests) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="w-8 h-8 animate-spin mr-2" />
        Loading...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Cloud Services Management</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Manage cloud services and review user requests. Users must be signed in to submit a request.
        </p>
      </div>

      <Tabs defaultValue="services">
        <TabsList>
          <TabsTrigger value="services">Services</TabsTrigger>
          <TabsTrigger value="requests">Requests</TabsTrigger>
        </TabsList>

        <TabsContent value="services">
          <div className="flex justify-end mb-4">
            {canEdit && (
              <Button onClick={handleAddService}>
                <Plus className="w-4 h-4 mr-2" />
                Add Service
              </Button>
            )}
          </div>
          
          <div className="grid md:grid-cols-2 gap-6">
            {services.map((service) => (
              <Card key={service.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CardTitle>{service.title}</CardTitle>
                      {service.metadata?.content_approval_status === "pending" && (
                        <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-200">
                          Pending Approval
                        </Badge>
                      )}
                    </div>
                    {canEdit && (
                      <div className="flex gap-2">
                        <Button size="sm" variant="secondary" onClick={() => handleEditService(service)}>
                          Edit
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleDeleteService(service.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {stripHtmlToPlain(service.description) ? (
                    <RichTextContent
                      html={sanitizeCourseDescriptionHtml(service.description)}
                      showTitle={false}
                      className="text-sm text-muted-foreground mb-4"
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground mb-4">No description provided.</p>
                  )}
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-medium">Active:</span>
                    <Switch checked={service.is_active} disabled={!canEdit} />
                  </div>
                  {(() => {
                    let parsedFeatures = service.features;
                    if (typeof parsedFeatures === "string") {
                      try { parsedFeatures = JSON.parse(parsedFeatures); } catch (e) { /* ignore */ }
                    }
                    
                    if (Array.isArray(parsedFeatures) && parsedFeatures.length > 0) {
                      return (
                        <ul className="space-y-1 mt-4">
                          {parsedFeatures.map((feat, i) => (
                            <li key={i} className="text-sm flex items-center gap-2">
                              <CheckCircle2 className="w-4 h-4 text-success" />
                              {feat}
                            </li>
                          ))}
                        </ul>
                      );
                    } else if (typeof parsedFeatures === "string" && stripHtmlToPlain(parsedFeatures)) {
                      return (
                        <RichTextContent
                          html={sanitizeCourseDescriptionHtml(parsedFeatures)}
                          showTitle={false}
                          className="text-sm text-muted-foreground mt-4"
                        />
                      );
                    }
                    return null;
                  })()}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Edit Dialog */}
          {editingService && (
            <Dialog open={!!editingService} onOpenChange={(open) => {
              if (!open) {
                setEditingService(null);
              }
            }}>
              <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col gap-0 overflow-hidden p-0">
                <DialogHeader className="shrink-0 px-6 pt-6 pb-2">
                  <DialogTitle>Edit Cloud Service</DialogTitle>
                </DialogHeader>
                <DialogBody className="space-y-4">
                  <div>
                    <Label>Title</Label>
                    <Input
                      value={editingService.title}
                      onChange={(e) => setEditingService({ ...editingService, title: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label className="flex items-center gap-1.5">
                      <Star className="w-4 h-4 text-amber-500" />
                      Star rating
                    </Label>
                    <p className="text-xs text-muted-foreground mb-2">
                      Shown at the top of the offering card on the public page (1.0 – 5.0).
                    </p>
                    <Input
                      type="number"
                      step="0.1"
                      min="1"
                      max="5"
                      value={editingService.rating ?? 4.8}
                      onChange={(e) =>
                        setEditingService({ ...editingService, rating: e.target.value })
                      }
                      className="w-32"
                    />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <p className="text-xs text-muted-foreground mb-2">
                      Formatting is shown the same way on the public Cloud Services page.
                    </p>
                    <QuillRichEditor
                      editorKey={editingService.id || "new-cloud-service"}
                      value={editingService.description || ""}
                      onChange={(html) =>
                        setEditingService({ ...editingService, description: html })
                      }
                      placeholder="Describe this cloud service…"
                      minHeight={160}
                      maxHeight={320}
                    />
                  </div>
                  <div>
                    <Label>Features</Label>
                    <p className="text-xs text-muted-foreground mb-2">
                      Formatting is shown the same way on the public Cloud Services page.
                    </p>
                    <QuillRichEditor
                      editorKey={(editingService.id || "new-cloud-service") + "-features"}
                      value={editingService.features || ""}
                      onChange={(html) =>
                        setEditingService({ ...editingService, features: html })
                      }
                      placeholder="List the features here…"
                      minHeight={160}
                      maxHeight={320}
                    />
                  </div>
                </DialogBody>
                <DialogFooter className="shrink-0 border-t bg-background px-6 py-4">
                  <Button variant="outline" onClick={() => setEditingService(null)}>Cancel</Button>
                  <Button onClick={handleSaveService}>
                    <Save className="w-4 h-4 mr-2" />
                    Save
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </TabsContent>

        <TabsContent value="requests">
          <Card>
            <CardHeader>
              <CardTitle>Cloud Service Requests</CardTitle>
              <CardDescription>Review and manage user requests.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Service</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(requestsData?.data?.data || []).map((request) => (
                    <TableRow key={request.id}>
                      <TableCell className="font-medium">
                        {request.service?.title || "—"}
                      </TableCell>
                      <TableCell>{request.name}</TableCell>
                      <TableCell>{request.email}</TableCell>
                      <TableCell>{request.contact_number || "—"}</TableCell>
                      <TableCell className="capitalize">{request.request_type || "—"}</TableCell>
                      <TableCell className="capitalize">{request.status}</TableCell>
                      <TableCell>{new Date(request.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button size="sm" variant="secondary">
                              <Eye className="w-4 h-4 mr-1" />
                              View
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Request Details</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <Label>Cloud Service</Label>
                                <div className="text-sm font-medium">
                                  {request.service?.title || "Not specified"}
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <Label>Name</Label>
                                  <div className="text-sm">{request.name}</div>
                                </div>
                                <div>
                                  <Label>Email</Label>
                                  <div className="text-sm">{request.email}</div>
                                </div>
                                <div>
                                  <Label>Contact Number</Label>
                                  <div className="text-sm">{request.contact_number || "—"}</div>
                                </div>
                                <div>
                                  <Label>Request Type</Label>
                                  <div className="text-sm capitalize">{request.request_type || "—"}</div>
                                </div>
                                {request.request_type === "corporate" && (
                                  <div className="col-span-2">
                                    <Label>Organization</Label>
                                    <div className="text-sm">{request.organization || "—"}</div>
                                  </div>
                                )}
                                <div>
                                  <Label>Status</Label>
                                  <div className="capitalize">{request.status}</div>
                                </div>
                                <div>
                                  <Label>Submitted</Label>
                                  <div className="text-sm">
                                    {new Date(request.created_at).toLocaleString()}
                                  </div>
                                </div>
                              </div>
                              {request.requirements && (
                                <div>
                                  <Label>Requirements</Label>
                                  <p className="text-sm">{request.requirements}</p>
                                </div>
                              )}
                            </div>
                            <DialogFooter>
                              {["pending", "in_progress"].includes(request.status) && (
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => handleUpdateRequestStatus(request.id, "rejected")}
                                  >
                                    Reject
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={() => handleUpdateRequestStatus(request.id, "in_progress")}
                                  >
                                    Mark as In Progress
                                  </Button>
                                  <Button
                                    size="sm"
                                    onClick={() => handleUpdateRequestStatus(request.id, "completed")}
                                  >
                                    Mark as Completed
                                  </Button>
                                </div>
                              )}
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
