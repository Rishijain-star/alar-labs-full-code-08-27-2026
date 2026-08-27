const fs = require('fs');

const path = 'e:\\practice-mastery-platform-main\\React.shadcn.JS-Template-main\\src\\pages\\admin\\AdminCourseApproval.jsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Imports
content = content.replace(
  `import { useGetCoursesQuery, useSetCourseContentApprovalMutation } from "@/store/api/courseApi";`,
  `import { useGetCoursesQuery, useSetCourseContentApprovalMutation } from "@/store/api/courseApi";\nimport { useGetAdminCloudServicesQuery, useSetCloudServiceContentApprovalMutation } from "@/store/api/cloudServiceApi";`
);

content = content.replace(
  `BookOpen,\n} from "lucide-react";`,
  `BookOpen,\n  Cloud,\n} from "lucide-react";`
);

// 2. States
content = content.replace(
  `  // Exam Topics State`,
  `  // Cloud Services State\n  const [cloudServicesPage, setCloudServicesPage] = useState(1);\n  const [cloudServicesLimit] = useState(10);\n  const [cloudServicesSearch, setCloudServicesSearch] = useState("");\n  const [cloudServicesStatus, setCloudServicesStatus] = useState("all");\n\n  // Exam Topics State`
);

// 3. Query Hooks
content = content.replace(
  `  const { data: pendingETQ`,
  `  const { data: pendingCSQ, isLoading: cloudServicesQueryLoading, refetch: refetchPendingCloudServices } =\n    useGetAdminCloudServicesQuery({ approval: "pending", limit: 100 }, { refetchOnMountOrArgChange: true });\n  const [setCloudServiceApproval] = useSetCloudServiceContentApprovalMutation();\n\n  const { data: pendingETQ`
);

// 4. Memos
content = content.replace(
  `  const examTopicsSource = apiPendingExamTopics;`,
  `  const examTopicsSource = apiPendingExamTopics;\n\n  const apiPendingCloudServices = useMemo(() => {\n    const rows = pendingCSQ?.data?.rows || pendingCSQ?.rows || pendingCSQ?.data || [];\n    return Array.isArray(rows) ? rows.map((c) => {\n      const approval = c.metadata?.content_approval_status || "pending";\n      const created = c.created_at || c.createdAt;\n      return {\n        id: c.id,\n        title: c.title,\n        author: c.author_name || "—",\n        status: approval === "approved" ? "approved" : approval === "rejected" ? "rejected" : "pending",\n        submitted_at: created ? String(created).slice(0, 10) : "",\n        description: c.description || "",\n      };\n    }) : [];\n  }, [pendingCSQ]);\n\n  const cloudServicesSource = apiPendingCloudServices;`
);

// 5. Pagination
content = content.replace(
  `  const pendingExamTopicsCount = examTopicsSource.filter((e) => e.status === "pending").length;`,
  `  const pendingExamTopicsCount = examTopicsSource.filter((e) => e.status === "pending").length;\n\n  const filteredCloudServices = cloudServicesSource.filter((item) => {\n    const matchesSearch = item.title.toLowerCase().includes(cloudServicesSearch.toLowerCase());\n    const matchesStatus = cloudServicesStatus === "all" || item.status === cloudServicesStatus;\n    return matchesSearch && matchesStatus;\n  });\n\n  const totalCloudServices = filteredCloudServices.length;\n  const totalCloudServicesPages = Math.ceil(totalCloudServices / cloudServicesLimit);\n  const cloudServicesStartIndex = (cloudServicesPage - 1) * cloudServicesLimit;\n  const cloudServicesEndIndex = cloudServicesStartIndex + cloudServicesLimit;\n  const paginatedCloudServices = filteredCloudServices.slice(cloudServicesStartIndex, cloudServicesEndIndex);\n\n  const pendingCloudServicesCount = cloudServicesSource.filter((c) => c.status === "pending").length;`
);

// 6. Permissions
content = content.replace(
  `  const canApproveExamTopics =`,
  `  const canApproveCloudServices = hasPermission("approve_cloud_services") || hasPermission("approve_courses");\n  const canApproveExamTopics =`
);

// 7. Handlers: handleQuickApprove
content = content.replace(
  `    if (type === "course") {`,
  `    if (type === "cloud_service") {\n      try {\n        await setCloudServiceApproval({ id: itemId, status: "approved" }).unwrap();\n        toast.success("Cloud service approved");\n        refetchPendingCloudServices();\n      } catch (e) {\n        toast.error(e?.data?.message || e?.message || "Approval failed");\n      }\n      return;\n    }\n    if (type === "course") {`
);

// 8. Handlers: handleQuickReject
content = content.replace(
  `    if (selectedItem.itemKind === "course") {`,
  `    if (selectedItem.itemKind === "cloud_service") {\n      try {\n        await setCloudServiceApproval({ id: selectedItem.id, status: "rejected" }).unwrap();\n        toast.success("Cloud service rejected");\n        refetchPendingCloudServices();\n      } catch (e) {\n        toast.error(e?.data?.message || e?.message || "Reject failed");\n      }\n      setRejectDialogOpen(false);\n      setRejectionReason("");\n      setSelectedItem(null);\n      return;\n    }\n    if (selectedItem.itemKind === "course") {`
);

// 9. TabsList Trigger
content = content.replace(
  `          </TabsTrigger>\n        </TabsList>`,
  `          </TabsTrigger>\n          <TabsTrigger value="cloud-services" className="gap-2">\n            <Cloud className="w-4 h-4" />\n            Cloud Services\n            {pendingCloudServicesCount > 0 && (\n              <Badge variant="secondary" className="ml-1 bg-amber-100 text-amber-700">\n                {pendingCloudServicesCount}\n              </Badge>\n            )}\n          </TabsTrigger>\n        </TabsList>`
);

content = content.replace(
  `className="grid w-full max-w-2xl grid-cols-3"`,
  `className="grid w-full max-w-3xl grid-cols-4"`
);

// 10. TabsContent for Cloud Services
const cloudServicesTabContent = `
        <TabsContent value="cloud-services">
          <GlobalListManager
            title="Cloud Services Approval"
            description="Review and approve submitted cloud services"
            showAddButton={false}
            showExportButton={false}
            showRefreshButton={false}
            searchConfig={{
              value: cloudServicesSearch,
              onChange: setCloudServicesSearch,
              onPageReset: () => setCloudServicesPage(1),
              placeholder: "Search cloud services...",
            }}
            filters={[
              {
                value: cloudServicesStatus,
                onChange: setCloudServicesStatus,
                onPageReset: () => setCloudServicesPage(1),
                placeholder: "Status",
                width: "w-40",
                options: [
                  { value: "pending", label: "Pending" },
                  { value: "approved", label: "Approved" },
                  { value: "rejected", label: "Rejected" },
                ],
                allOptionText: "All Status",
              },
            ]}
          >
            {cloudServicesQueryLoading && cloudServicesSource.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin" />
                <p className="text-sm">Loading pending cloud services…</p>
              </div>
            ) : (
              <>
                <div className="mb-4">
                  <p className="text-sm text-muted-foreground">
                    Showing <span className="font-semibold text-foreground">{paginatedCloudServices.length}</span> of <span className="font-semibold text-foreground">{totalCloudServices}</span> cloud services
                  </p>
                </div>
                <div className="rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead>Type</TableHead>
                        <TableHead>Service</TableHead>
                        <TableHead>Author</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Submitted</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedCloudServices.map((service) => (
                        <TableRow key={service.id} className="hover:bg-muted/30">
                          <TableCell><ContentTypeBadge kind="cloud_service" /></TableCell>
                          <TableCell className="font-medium max-w-xs">
                            <div className="flex items-center gap-2">
                              <Cloud className="h-4 w-4 text-primary flex-shrink-0" />
                              <span className="truncate">{service.title}</span>
                            </div>
                          </TableCell>
                          <TableCell>{service.author}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getStatusIcon(service.status)}
                              {getStatusBadge(service.status)}
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {service.submitted_at ? new Date(service.submitted_at).toLocaleDateString() : "—"}
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handlePreview(service, "cloud_service")}>
                                  <Eye className="mr-2 h-4 w-4" /> Preview Content
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                {canApproveCloudServices && service.status === "pending" && (
                                  <>
                                    <DropdownMenuItem className="text-green-600" onClick={() => handleQuickApprove(service.id, "cloud_service")}>
                                      <Check className="mr-2 h-4 w-4" /> Quick Approve
                                    </DropdownMenuItem>
                                    <DropdownMenuItem className="text-red-600" onClick={() => { setSelectedItem({ ...service, itemKind: "cloud_service" }); setRejectDialogOpen(true); }}>
                                      <X className="mr-2 h-4 w-4" /> Quick Reject
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {paginatedCloudServices.length === 0 && (
                  <div className="text-center py-12">
                    <Cloud className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">No cloud services found</h3>
                    <p className="text-muted-foreground">Try adjusting your filters or search query</p>
                  </div>
                )}
                {totalCloudServicesPages > 1 && (
                  <div className="mt-6">
                    <GlobalPagination
                      page={cloudServicesPage}
                      totalPages={totalCloudServicesPages}
                      totalItems={totalCloudServices}
                      itemsPerPage={cloudServicesLimit}
                      onPageChange={(page) => {
                        setCloudServicesPage(page);
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      showInfo={true}
                    />
                  </div>
                )}
              </>
            )}
          </GlobalListManager>
        </TabsContent>
`;

content = content.replace(
  `      {/* Quick Reject Dialog */}`,
  cloudServicesTabContent + `\n      {/* Quick Reject Dialog */}`
);

// Preview icon fix
content = content.replace(
  `? (\n                <BookOpen className="h-5 w-5" />\n              ) : selectedItem?.itemKind === "course"`,
  `? (\n                <BookOpen className="h-5 w-5" />\n              ) : selectedItem?.itemKind === "cloud_service" ? (\n                <Cloud className="h-5 w-5" />\n              ) : selectedItem?.itemKind === "course"`
);

content = content.replace(
  `selectedItem?.itemKind === "course"\n                  ? "Course"\n                  : "Lab"}{" "}`,
  `selectedItem?.itemKind === "course"\n                  ? "Course"\n                  : selectedItem?.itemKind === "cloud_service"\n                  ? "Cloud Service"\n                  : "Lab"}{" "}`
);

// Quick reject label fix
content = content.replace(
  `? "Course"\n                  : "Lab"`,
  `? "Course"\n                  : selectedItem?.itemKind === "cloud_service"\n                  ? "Cloud Service"\n                  : "Lab"`
);

fs.writeFileSync(path, content);
console.log('AdminCourseApproval updated');
