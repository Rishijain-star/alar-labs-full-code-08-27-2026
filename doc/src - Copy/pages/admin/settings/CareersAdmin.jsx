import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Plus, Trash2, Save, Eye, CheckCircle2 } from "lucide-react";
import {
  useGetAdminCareerOfferingsQuery,
  useCreateCareerOfferingMutation,
  useUpdateCareerOfferingMutation,
  useDeleteCareerOfferingMutation,
  useGetCareerRequestsQuery,
  useUpdateCareerRequestStatusMutation,
} from "@/store/api/careerOfferingApi";
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
  "Briefcase",
  "FileText",
  "MessageSquare",
  "Target",
  "BookOpen",
  "Users",
  "CheckCircle2",
];

export default function CareersAdmin() {
  const canView = permissionStore.hasPermission("view_career_offerings") || permissionStore.hasPermission("manage_career_offerings") || permissionStore.hasPermission("view_programs") || permissionStore.hasPermission("manage_programs");
  const canEdit = permissionStore.hasPermission("manage_career_offerings") || permissionStore.hasPermission("manage_programs");
  const { data: offeringsData, isLoading: loadingOfferings, refetch: refetchOfferings } = useGetAdminCareerOfferingsQuery();
  const [createOffering] = useCreateCareerOfferingMutation();
  const [updateOffering] = useUpdateCareerOfferingMutation();
  const [deleteOffering] = useDeleteCareerOfferingMutation();
  
  const { data: requestsData, isLoading: loadingRequests, refetch: refetchRequests } = useGetCareerRequestsQuery();
  const [updateRequestStatus] = useUpdateCareerRequestStatusMutation();

  const [editingOffering, setEditingOffering] = useState(null);
  const [offerings, setOfferings] = useState([]);

  useEffect(() => {
    if (offeringsData?.data?.rows) {
      setOfferings(offeringsData.data.rows);
    }
  }, [offeringsData]);

  const handleAddOffering = () => {
    const newOffering = {
      title: "New Career Offering",
      description: "",
      icon: "Briefcase",
      items: [],
      is_active: true,
      sort_order: offerings.length,
    };
    setEditingOffering(newOffering);
  };

  const handleEditOffering = (offering) => {
    setEditingOffering({ ...offering, items: Array.isArray(offering.items) ? [...offering.items] : [] });
  };

  const handleSaveOffering = async () => {
    if (!editingOffering) return;
    if (editingOffering.id) {
      await updateOffering({ id: editingOffering.id, data: editingOffering }).unwrap();
    } else {
      await createOffering(editingOffering).unwrap();
    }
    setEditingOffering(null);
    refetchOfferings();
  };

  const handleDeleteOffering = async (id) => {
    if (confirm("Are you sure you want to delete this offering?")) {
      await deleteOffering(id).unwrap();
      refetchOfferings();
    }
  };

  const handleUpdateRequestStatus = async (id, status) => {
    await updateRequestStatus({ id, status }).unwrap();
    refetchRequests();
  };

  if (loadingOfferings || loadingRequests) {
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
        <h2 className="text-lg font-semibold">Career Offerings Management</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Manage career offerings and review user requests.
        </p>
      </div>

      <Tabs defaultValue="offerings">
        <TabsList>
          <TabsTrigger value="offerings">Offerings</TabsTrigger>
          <TabsTrigger value="requests">Requests</TabsTrigger>
        </TabsList>

        <TabsContent value="offerings">
          <div className="flex justify-end mb-4">
            {canEdit && (
              <Button onClick={handleAddOffering}>
                <Plus className="w-4 h-4 mr-2" />
                Add Offering
              </Button>
            )}
          </div>
          
          <div className="grid md:grid-cols-2 gap-6">
            {offerings.map((offering) => (
              <Card key={offering.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>{offering.title}</CardTitle>
                    {canEdit && (
                      <div className="flex gap-2">
                        <Button size="sm" variant="secondary" onClick={() => handleEditOffering(offering)}>
                          Edit
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleDeleteOffering(offering.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">{offering.description}</p>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-medium">Active:</span>
                    <Switch checked={offering.is_active} disabled={!canEdit} />
                  </div>
                  {Array.isArray(offering.items) && offering.items.length > 0 && (
                    <ul className="space-y-1">
                      {offering.items.map((item, i) => (
                        <li key={i} className="text-sm flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-success" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Edit Dialog */}
          {editingOffering && (
            <Dialog open={!!editingOffering} onOpenChange={(open) => !open && setEditingOffering(null)}>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Edit Career Offering</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Title</Label>
                    <Input
                      value={editingOffering.title}
                      onChange={(e) => setEditingOffering({ ...editingOffering, title: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Textarea
                      value={editingOffering.description}
                      onChange={(e) => setEditingOffering({ ...editingOffering, description: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Icon</Label>
                      <Select
                        value={editingOffering.icon}
                        onValueChange={(v) => setEditingOffering({ ...editingOffering, icon: v })}
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
                  </div>
                  <div>
                    <Label>Items (one per line)</Label>
                    <Textarea
                      value={editingOffering.items.join("\n")}
                      onChange={(e) =>
                        setEditingOffering({
                          ...editingOffering,
                          items: e.target.value.split("\n").map((f) => f.trim()).filter(Boolean),
                        })
                      }
                      rows={6}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setEditingOffering(null)}>Cancel</Button>
                  <Button onClick={handleSaveOffering}>
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
              <CardTitle>Career Requests</CardTitle>
              <CardDescription>Review and manage user requests.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Experience</TableHead>
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
                      <TableCell>
                        {request.experience_type === "fresher"
                          ? "Fresher"
                          : `Experienced (${request.total_experience_years || 0} years)`}
                      </TableCell>
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
                                  <Label>Experience Level</Label>
                                  <div className="capitalize">{request.experience_type}</div>
                                </div>
                                <div>
                                  <Label>Status</Label>
                                  <div className="capitalize">{request.status}</div>
                                </div>
                              </div>
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
