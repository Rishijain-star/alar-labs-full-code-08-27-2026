import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Plus, Trash2, Save, Eye, CheckCircle2 } from "lucide-react";
import {
  useGetAdminCloudServicesQuery,
  useCreateCloudServiceMutation,
  useUpdateCloudServiceMutation,
  useDeleteCloudServiceMutation,
  useGetCloudServiceRequestsQuery,
  useUpdateCloudServiceRequestStatusMutation,
} from "@/store/api/cloudServiceApi";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { permissionStore } from "@/utils/permissions";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";

const iconOptions = [
  "Cloud",
  "Server",
  "Shield",
  "Settings",
  "Users",
  "Database",
  "CheckCircle2",
  "Target",
];

export default function CloudServicesAdmin() {
  const canView = permissionStore.hasPermission("view_cloud_services") || permissionStore.hasPermission("manage_cloud_services") || permissionStore.hasPermission("view_programs") || permissionStore.hasPermission("manage_programs");
const canEdit = permissionStore.hasPermission("manage_cloud_services") || permissionStore.hasPermission("manage_programs");
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
      features: [],
      is_active: true,
      sort_order: services.length,
    };
    setEditingService(newService);
  };

  const handleEditService = (service) => {
    setEditingService({ ...service, features: Array.isArray(service.features) ? [...service.features] : [] });
  };

  const handleSaveService = async () => {
    if (!editingService) return;
    if (editingService.id) {
      await updateService({ id: editingService.id, data: editingService }).unwrap();
    } else {
      await createService(editingService).unwrap();
    }
    setEditingService(null);
    refetchServices();
  };

  const handleDeleteService = async (id) => {
    if (confirm("Are you sure you want to delete this service?")) {
      await deleteService(id).unwrap();
      refetchServices();
    }
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
          Manage cloud services, and review user requests.
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
                    <CardTitle>{service.title}</CardTitle>
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
                  <p className="text-sm text-muted-foreground mb-4">{service.description}</p>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-medium">Active:</span>
                    <Switch checked={service.is_active} disabled={!canEdit} />
                  </div>
                  {Array.isArray(service.features) && service.features.length > 0 && (
                    <ul className="space-y-1">
                      {service.features.map((feat, i) => (
                        <li key={i} className="text-sm flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-success" />
                          {feat}
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Edit Dialog */}
          {editingService && (
            <Dialog open={!!editingService} onOpenChange={(open) => !open && setEditingService(null)}>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Edit Cloud Service</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Title</Label>
                    <Input
                      value={editingService.title}
                      onChange={(e) => setEditingService({ ...editingService, title: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Textarea
                      value={editingService.description}
                      onChange={(e) => setEditingService({ ...editingService, description: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Icon</Label>
                      <Select
                        value={editingService.icon}
                        onValueChange={(v) => setEditingService({ ...editingService, icon: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {iconOptions.map((icon) => (
                            <SelectItem key={icon} value={icon}>{icon}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-end gap-2">
                      <Label className="block">Requires Login</Label>
                      <Switch
                        checked={editingService.requires_login}
                        onCheckedChange={(v) => setEditingService({ ...editingService, requires_login: v })}
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Features (one per line)</Label>
                    <Textarea
                      value={editingService.features.join("\n")}
                      onChange={(e) =>
                        setEditingService({
                          ...editingService,
                          features: e.target.value.split("\n").map((f) => f.trim()).filter(Boolean),
                        })
                      }
                      rows={6}
                    />
                  </div>
                </div>
                <DialogFooter>
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
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Organization</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(requestsData?.data?.data || []).map((request) => (
                    <TableRow key={request.id}>
                      <TableCell>{request.name}</TableCell>
                      <TableCell>{request.email}</TableCell>
                      <TableCell>{request.organization || "-"}</TableCell>
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
                                  <Label>Organization</Label>
                                  <div className="text-sm">{request.organization || "-"}</div>
                                </div>
                                <div>
                                  <Label>Status</Label>
                                  <div className="capitalize">{request.status}</div>
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
