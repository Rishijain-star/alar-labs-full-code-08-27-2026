const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../React.shadcn.JS-Template-main/src/pages/admin/AdminCourseApproval.jsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add imports
content = content.replace(
  'import { useGetAdminCloudServicesQuery, useSetCloudServiceContentApprovalMutation } from "@/store/api/cloudServiceApi";',
  'import { useGetAdminCloudServicesQuery, useSetCloudServiceContentApprovalMutation } from "@/store/api/cloudServiceApi";\nimport { useGetAdminCareerOfferingsQuery, useSetCareerOfferingApprovalMutation } from "@/store/api/careerOfferingApi";\nimport { Briefcase } from "lucide-react";'
);

// 2. Add state
content = content.replace(
  '  // Cloud Services State',
  '  // Career Offerings State\n  const [careerOfferingsPage, setCareerOfferingsPage] = useState(1);\n  const [careerOfferingsLimit] = useState(10);\n  const [careerOfferingsSearch, setCareerOfferingsSearch] = useState("");\n  const [careerOfferingsStatus, setCareerOfferingsStatus] = useState("all");\n\n  // Cloud Services State'
);

// 3. Add queries
content = content.replace(
  '  const [setCloudServiceApproval] = useSetCloudServiceContentApprovalMutation();',
  '  const [setCloudServiceApproval] = useSetCloudServiceContentApprovalMutation();\n\n  const { data: pendingCOQ, isLoading: careerOfferingsQueryLoading, refetch: refetchPendingCareerOfferings } =\n    useGetAdminCareerOfferingsQuery({ approval: "pending", limit: 100 }, { refetchOnMountOrArgChange: true });\n  const [setCareerOfferingApproval] = useSetCareerOfferingApprovalMutation();'
);

// 4. Add memo mapping
content = content.replace(
  '  const cloudServicesSource = apiPendingCloudServices;',
  `  const cloudServicesSource = apiPendingCloudServices;

  const apiPendingCareerOfferings = useMemo(() => {
    const rows = pendingCOQ?.data?.rows || pendingCOQ?.rows || pendingCOQ?.data || [];
    return Array.isArray(rows) ? rows.map((c) => {
      const approval = c.metadata?.content_approval_status || "pending";
      const created = c.created_at || c.createdAt;
      return {
        id: c.id,
        title: c.title,
        author: c.author_name || "—",
        status: approval === "approved" ? "approved" : approval === "rejected" ? "rejected" : "pending",
        submitted_at: created ? String(created).slice(0, 10) : "",
        description: c.description || "",
      };
    }) : [];
  }, [pendingCOQ]);

  const careerOfferingsSource = apiPendingCareerOfferings;`
);

// 5. Add filtering
content = content.replace(
  '  const pendingCloudServicesCount = cloudServicesSource.filter((c) => c.status === "pending").length;',
  `  const pendingCloudServicesCount = cloudServicesSource.filter((c) => c.status === "pending").length;

  const filteredCareerOfferings = careerOfferingsSource.filter((item) => {
    const matchesSearch = item.title.toLowerCase().includes(careerOfferingsSearch.toLowerCase());
    const matchesStatus = careerOfferingsStatus === "all" || item.status === careerOfferingsStatus;
    return matchesSearch && matchesStatus;
  });

  const totalCareerOfferings = filteredCareerOfferings.length;
  const totalCareerOfferingsPages = Math.ceil(totalCareerOfferings / careerOfferingsLimit);
  const careerOfferingsStartIndex = (careerOfferingsPage - 1) * careerOfferingsLimit;
  const careerOfferingsEndIndex = careerOfferingsStartIndex + careerOfferingsLimit;
  const paginatedCareerOfferings = filteredCareerOfferings.slice(careerOfferingsStartIndex, careerOfferingsEndIndex);

  const pendingCareerOfferingsCount = careerOfferingsSource.filter((c) => c.status === "pending").length;`
);

// 6. Permissions
content = content.replace(
  'const canApproveCloudServices = hasPermission("approve_cloud_services") || hasPermission("approve_courses");',
  'const canApproveCloudServices = hasPermission("approve_cloud_services") || hasPermission("approve_courses");\n  const canApproveCareerOfferings = hasPermission("approve_career_offerings") || hasPermission("approve_courses");'
);

// 7. Quick Approve
content = content.replace(
  '    if (type === "cloud_service") {',
  `    if (type === "career_offering") {
      try {
        await setCareerOfferingApproval({ id: itemId, status: "approved" }).unwrap();
        toast.success("Career offering approved");
        refetchPendingCareerOfferings();
      } catch (e) {
        toast.error(e?.data?.message || e?.message || "Approval failed");
      }
      return;
    }
    if (type === "cloud_service") {`
);

// 8. Quick Reject
content = content.replace(
  '    if (selectedItem.itemKind === "cloud_service") {',
  `    if (selectedItem.itemKind === "career_offering") {
      try {
        await setCareerOfferingApproval({ id: selectedItem.id, status: "rejected" }).unwrap();
        toast.success("Career offering rejected");
        refetchPendingCareerOfferings();
      } catch (e) {
        toast.error(e?.data?.message || e?.message || "Reject failed");
      }
      setRejectDialogOpen(false);
      setRejectionReason("");
      setSelectedItem(null);
      return;
    }
    if (selectedItem.itemKind === "cloud_service") {`
);

// 9. TabsTrigger
content = content.replace(
  'className="grid w-full max-w-3xl grid-cols-4"',
  'className="grid w-full max-w-4xl grid-cols-5"'
);

content = content.replace(
  '          <TabsTrigger value="cloud-services" className="gap-2">',
  `          <TabsTrigger value="career-offerings" className="gap-2">
            <Briefcase className="w-4 h-4" />
            Career Offerings
            {pendingCareerOfferingsCount > 0 && (
              <Badge variant="secondary" className="ml-1 bg-amber-100 text-amber-700">
                {pendingCareerOfferingsCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="cloud-services" className="gap-2">`
);

// 10. TabsContent for career-offerings
const tabsContentCareerOfferings = `
        <TabsContent value="career-offerings">
          <GlobalListManager
            title="Career Offerings Approval"
            description="Review and approve submitted tech career pathways"
            showAddButton={false}
            showExportButton={false}
            showRefreshButton={false}
            searchConfig={{
              value: careerOfferingsSearch,
              onChange: setCareerOfferingsSearch,
              onPageReset: () => setCareerOfferingsPage(1),
              placeholder: "Search career offerings...",
            }}
            filters={[
              {
                value: careerOfferingsStatus,
                onChange: setCareerOfferingsStatus,
                onPageReset: () => setCareerOfferingsPage(1),
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
            {careerOfferingsQueryLoading && careerOfferingsSource.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin" />
                <p className="text-sm">Loading pending career offerings…</p>
              </div>
            ) : (
              <>
                <div className="mb-4">
                  <p className="text-sm text-muted-foreground">
                    Showing <span className="font-semibold text-foreground">{paginatedCareerOfferings.length}</span> of <span className="font-semibold text-foreground">{totalCareerOfferings}</span> career offerings
                  </p>
                </div>
                <div className="rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead>Type</TableHead>
                        <TableHead>Offering</TableHead>
                        <TableHead>Author</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Submitted</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedCareerOfferings.map((service) => (
                        <TableRow key={service.id} className="hover:bg-muted/30">
                          <TableCell><Badge variant="secondary">Career Pathway</Badge></TableCell>
                          <TableCell className="font-medium max-w-xs">
                            <div className="flex items-center gap-2">
                              <Briefcase className="h-4 w-4 text-primary flex-shrink-0" />
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
                                <DropdownMenuItem onClick={() => handlePreview(service, "career_offering")}>
                                  <Eye className="mr-2 h-4 w-4" /> Preview Content
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                {canApproveCareerOfferings && service.status === "pending" && (
                                  <>
                                    <DropdownMenuItem className="text-green-600" onClick={() => handleQuickApprove(service.id, "career_offering")}>
                                      <Check className="mr-2 h-4 w-4" /> Quick Approve
                                    </DropdownMenuItem>
                                    <DropdownMenuItem className="text-red-600" onClick={() => { setSelectedItem({ ...service, itemKind: "career_offering" }); setRejectDialogOpen(true); }}>
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
                {paginatedCareerOfferings.length === 0 && (
                  <div className="text-center py-12">
                    <Briefcase className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">No career offerings found</h3>
                    <p className="text-muted-foreground">Try adjusting your filters or search query</p>
                  </div>
                )}
                {totalCareerOfferingsPages > 1 && (
                  <div className="mt-6">
                    <GlobalPagination
                      page={careerOfferingsPage}
                      totalPages={totalCareerOfferingsPages}
                      totalItems={totalCareerOfferings}
                      itemsPerPage={careerOfferingsLimit}
                      onPageChange={(page) => {
                        setCareerOfferingsPage(page);
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
  '      </Tabs>\n\n      {/* Quick Reject Dialog */}',
  tabsContentCareerOfferings + '      </Tabs>\n\n      {/* Quick Reject Dialog */}'
);

// 11. Fix Preview Dialog text
content = content.replace(
  '? "Cloud Service"',
  '? "Cloud Service"\n                  : selectedItem?.itemKind === "career_offering"\n                  ? "Career Offering"'
);

content = content.replace(
  ') : selectedItem?.itemKind === "cloud_service" ? (',
  ') : selectedItem?.itemKind === "cloud_service" ? (\n                <Cloud className="h-5 w-5" />\n              ) : selectedItem?.itemKind === "career_offering" ? (\n                <Briefcase className="h-5 w-5" />'
);

content = content.replace(
  '                  ? "Cloud Service"',
  '                  ? "Cloud Service"\n                  : selectedItem?.itemKind === "career_offering"\n                  ? "Career Offering"'
);

fs.writeFileSync(filePath, content);
console.log("Patched AdminCourseApproval.jsx successfully");
