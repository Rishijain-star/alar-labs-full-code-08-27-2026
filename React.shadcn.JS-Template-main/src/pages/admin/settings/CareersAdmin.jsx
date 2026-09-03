import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Plus, Trash2, Save, Eye, CheckCircle2, Star, AlertCircle } from "lucide-react";

function getMeta(item) {
  if (!item?.metadata) return {};
  if (typeof item.metadata === "object") return item.metadata;
  try {
    return JSON.parse(item.metadata) || {};
  } catch (_) {
    return {};
  }
}
import {
  useGetAdminCareerOfferingsQuery,
  useCreateCareerOfferingMutation,
  useUpdateCareerOfferingMutation,
  useDeleteCareerOfferingMutation,
  useGetCareerRequestsQuery,
  useUpdateCareerRequestStatusMutation,
} from "@/store/api/careerOfferingApi";
import { confirmDelete } from "@/lib/confirmAction";
import QuillRichEditor from "@/components/editor/QuillRichEditor";
import RichTextContent from "@/components/learning/RichTextContent";
import { sanitizeCourseDescriptionHtml } from "@/lib/sanitizeCourseHtml";
import { stripHtmlToPlain } from "@/lib/stripHtml";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogBody,
} from "@/components/ui/dialog";
import { permissionStore } from "@/utils/permissions";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";

export default function CareersAdmin() {
  const canEdit =
    permissionStore.hasPermission("manage_career_offerings") ||
    permissionStore.hasPermission("approve_career_offerings") ||
    permissionStore.hasPermission("approve_courses");
  const { data: offeringsData, isLoading: loadingOfferings, refetch: refetchOfferings } =
    useGetAdminCareerOfferingsQuery(undefined, { skip: !canEdit });
  const [createOffering] = useCreateCareerOfferingMutation();
  const [updateOffering] = useUpdateCareerOfferingMutation();
  const [deleteOffering] = useDeleteCareerOfferingMutation();

  const { data: requestsData, isLoading: loadingRequests, refetch: refetchRequests } =
    useGetCareerRequestsQuery();
  const [updateRequestStatus] = useUpdateCareerRequestStatusMutation();

  const [editingOffering, setEditingOffering] = useState(null);
  const [rejectionModalItem, setRejectionModalItem] = useState(null);
  const [itemsText, setItemsText] = useState("");
  const [offerings, setOfferings] = useState([]);

  useEffect(() => {
    if (offeringsData?.data?.rows) {
      setOfferings(offeringsData.data.rows);
    }
  }, [offeringsData]);

  const handleAddOffering = () => {
    setItemsText("");
    setEditingOffering({
      title: "New Career Offering",
      description: "",
      items: "",
      rating: 4.8,
      is_active: true,
      sort_order: offerings.length,
    });
  };

  const handleEditOffering = (offering) => {
    // If the offering has a pending draft, use that data for editing
    const dataToEdit = offering.draft_data || offering;
    
    // Legacy support: convert array items to HTML string for editor
    let parsedItems = dataToEdit.items;
    if (typeof parsedItems === "string") {
      try { parsedItems = JSON.parse(parsedItems); } catch (e) { /* ignore */ }
    }
    
    let itemsHtml = typeof parsedItems === "string" ? parsedItems : "";
    if (Array.isArray(parsedItems)) {
      itemsHtml = parsedItems.length > 0 
        ? "<ul>" + parsedItems.map(f => `<li>${f}</li>`).join("") + "</ul>"
        : "";
    }
    
    setEditingOffering({ ...dataToEdit, id: offering.id, items: itemsHtml });
  };

  const handleSaveOffering = async () => {
    if (!editingOffering) return;
    const payload = {
      ...editingOffering,
      rating: Math.min(5, Math.max(1, Number(editingOffering.rating) || 4.8)),
      items: editingOffering.items || "",
    };
    if (payload.id) {
      await updateOffering({ id: payload.id, data: payload }).unwrap();
    } else {
      await createOffering(payload).unwrap();
    }
    setEditingOffering(null);
    refetchOfferings();
  };

  const handleDeleteOffering = async (id) => {
    if (!(await confirmDelete("this offering"))) return;
    await deleteOffering(id).unwrap();
    refetchOfferings();
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
          Manage career offerings and review user requests. Anyone can submit a request without signing in.
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
            {offerings.map((offering) => {
              const meta = getMeta(offering);
              const isRejected = meta.content_approval_status === "rejected" || Boolean(meta.rejection_reason);
              const isPending = meta.content_approval_status === "pending";

              return (
                <Card key={offering.id} className="flex flex-col justify-between hover:shadow-md transition-all duration-200 border-slate-200">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1.5 min-w-0 flex-1">
                        <CardTitle className="text-base font-bold tracking-tight text-foreground line-clamp-1">
                          {offering.title}
                        </CardTitle>

                        {isPending && (
                          <div className="pt-0.5">
                            <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200 text-[11px] font-medium px-2 py-0.5 inline-flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                              Pending Approval
                            </Badge>
                          </div>
                        )}
                        
                        {isRejected && (
                          <div className="flex items-center gap-2 flex-wrap pt-0.5">
                            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-[11px] font-medium px-2 py-0.5 inline-flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0 animate-pulse" />
                              Changes Rejected
                            </Badge>
                            <button
                              type="button"
                              onClick={() => setRejectionModalItem(offering)}
                              className="text-xs text-red-600 hover:text-red-800 font-medium inline-flex items-center gap-1 hover:underline cursor-pointer transition-colors"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              View Reason
                            </button>
                          </div>
                        )}
                      </div>

                      {canEdit && (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Button size="sm" variant="outline" className="h-8 px-3 text-xs font-medium" onClick={() => handleEditOffering(offering)}>
                            Edit
                          </Button>
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={() => handleDeleteOffering(offering.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardHeader>

                  <CardContent className="pt-0 flex-1 flex flex-col justify-between space-y-4">
                    <div className="text-sm text-muted-foreground">
                      {stripHtmlToPlain(offering.description) ? (
                        <RichTextContent
                          html={sanitizeCourseDescriptionHtml(offering.description)}
                          showTitle={false}
                          className="text-sm text-muted-foreground line-clamp-2"
                        />
                      ) : (
                        <p className="text-sm text-muted-foreground italic">No description provided.</p>
                      )}

                      {(() => {
                        let parsedItems = offering.items;
                        if (typeof parsedItems === "string") {
                          try { parsedItems = JSON.parse(parsedItems); } catch (e) { /* ignore */ }
                        }
                        
                        if (Array.isArray(parsedItems) && parsedItems.length > 0) {
                          return (
                            <ul className="space-y-1 mt-3 pt-2 border-t border-slate-100 text-xs">
                              {parsedItems.slice(0, 3).map((item, i) => (
                                <li key={i} className="flex items-center gap-2 text-muted-foreground">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                  <span className="truncate">{item}</span>
                                </li>
                              ))}
                            </ul>
                          );
                        } else if (typeof parsedItems === "string" && stripHtmlToPlain(parsedItems)) {
                          return (
                            <div className="mt-3 pt-2 border-t border-slate-100 text-xs">
                              <RichTextContent
                                html={sanitizeCourseDescriptionHtml(parsedItems)}
                                showTitle={false}
                                className="text-xs text-muted-foreground line-clamp-2"
                              />
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Status:</span>
                        <Switch checked={offering.is_active} disabled={!canEdit} />
                        <span className="text-[11px] text-muted-foreground font-medium">
                          {offering.is_active ? "Active" : "Inactive"}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {editingOffering && (
            <Dialog
              open={!!editingOffering}
              onOpenChange={(open) => {
                if (!open) {
                  setEditingOffering(null);
                  setItemsText("");
                }
              }}
            >
              <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col gap-0 overflow-hidden p-0">
                <DialogHeader className="shrink-0 px-6 pt-6 pb-2">
                  <DialogTitle>Edit Career Offering</DialogTitle>
                </DialogHeader>
                <DialogBody className="space-y-4">
                  <div>
                    <Label>Title</Label>
                    <Input
                      value={editingOffering.title}
                      onChange={(e) => setEditingOffering({ ...editingOffering, title: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label className="flex items-center gap-1.5">
                      <Star className="w-4 h-4 text-amber-500" />
                      Star rating
                    </Label>
                    <p className="text-xs text-muted-foreground mb-2">
                      Shown at the top of the offering card on the public Careers page (1.0 – 5.0).
                    </p>
                    <Input
                      type="number"
                      step="0.1"
                      min="1"
                      max="5"
                      value={editingOffering.rating ?? 4.8}
                      onChange={(e) =>
                        setEditingOffering({ ...editingOffering, rating: e.target.value })
                      }
                      className="w-32"
                    />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <p className="text-xs text-muted-foreground mb-2">
                      Formatting is shown the same way on the public Careers page.
                    </p>
                    <QuillRichEditor
                      editorKey={editingOffering.id || "new-career-offering"}
                      value={editingOffering.description || ""}
                      onChange={(html) =>
                        setEditingOffering({ ...editingOffering, description: html })
                      }
                      placeholder="Describe this career offering…"
                      minHeight={160}
                      maxHeight={320}
                    />
                  </div>
                  <div>
                    <Label>Features</Label>
                    <p className="text-xs text-muted-foreground mb-2">
                      Formatting is shown the same way on the public Careers page.
                    </p>
                    <QuillRichEditor
                      editorKey={(editingOffering.id || "new-career-offering") + "-features"}
                      value={editingOffering.items || ""}
                      onChange={(html) =>
                        setEditingOffering({ ...editingOffering, items: html })
                      }
                      placeholder="Describe the features…"
                      minHeight={160}
                      maxHeight={320}
                    />
                  </div>
                </DialogBody>
                <DialogFooter className="shrink-0 border-t bg-background px-6 py-4">
                  <Button variant="outline" onClick={() => setEditingOffering(null)}>Cancel</Button>
                  <Button onClick={handleSaveOffering}>
                    <Save className="w-4 h-4 mr-2" />
                    Save
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}

          {/* Rejection Reason Modal */}
          {rejectionModalItem && (
            <Dialog open={!!rejectionModalItem} onOpenChange={(open) => { if (!open) setRejectionModalItem(null); }}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-destructive">
                    <AlertCircle className="w-5 h-5 text-destructive shrink-0" />
                    Changes Rejected
                  </DialogTitle>
                  <DialogDescription>
                    Approver feedback for <strong>"{rejectionModalItem.title}"</strong>
                  </DialogDescription>
                </DialogHeader>

                <div className="py-2 space-y-3">
                  <div className="p-3.5 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm font-medium leading-relaxed">
                    {getMeta(rejectionModalItem).rejection_reason || "No specific reason was provided by the approver."}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Note: Your existing base content remains active. Only your recently requested changes were rejected. Click <strong>Resubmit Changes</strong> to update details and submit again.
                  </p>
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                  <Button variant="outline" onClick={() => setRejectionModalItem(null)}>
                    Close
                  </Button>
                  <Button
                    onClick={() => {
                      const itemToEdit = rejectionModalItem;
                      setRejectionModalItem(null);
                      handleEditOffering(itemToEdit);
                    }}
                    className="gap-2"
                  >
                    Resubmit Changes
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
                    <TableHead>Offering</TableHead>
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
                        {request.offering?.title || "—"}
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
                                <Label>Career Offering</Label>
                                <div className="text-sm font-medium">
                                  {request.offering?.title || "Not specified"}
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
