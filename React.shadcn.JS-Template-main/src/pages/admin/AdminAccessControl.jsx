import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Shield,
  Plus,
  Search,
  Edit2,
  Trash2,
  Copy,
  Loader2,
  Check,
  Key,
} from "lucide-react";
import {
  useGetAllRolesQuery,
  useGetAllPermissionsQuery,
  useCreateRoleMutation,
  useUpdateRoleMutation,
  useDeleteRoleMutation,
  useAssignPermissionsToRoleMutation,
} from "@/store/api/roleAndPermissionApi";
import GlobalPagination from "../../components/common/Pagination";
import { getUserRoles } from "@/utils/permissions";
import { toast } from "@/lib/toast";
import { confirmDelete } from "@/lib/confirmAction";
import {
  PERMISSION_BUNDLE_GROUPS,
  bundlesFromAssignedPermissions,
  expandBundlesForSave,
  getAdvancedPermissions,
  totalBundleCount,
} from "@/lib/permissionBundles";

const SUPER_ADMIN_ROLE_ID = "23ea22ce-e1f5-4435-8cd2-162756cb4be0";

function isSuperAdminRole(role) {
  if (!role) return false;
  const n = String(role.name || "").trim().toLowerCase();
  return n === "super admin" || n === "super_admin" || role.id === SUPER_ADMIN_ROLE_ID;
}

function currentUserIsSuperAdmin() {
  const roles = getUserRoles();
  return roles.some((r) => {
    const name = typeof r === "string" ? r : (r?.name || r?.id || "");
    const id = typeof r === "object" ? r?.id : "";
    const lower = String(name).toLowerCase();
    return lower.includes("super") || id === SUPER_ADMIN_ROLE_ID;
  });
}

const LIMIT = 12;

export default function AdminAccessControl() {
  const [activeTab, setActiveTab] = useState("roles");
  const [searchQuery, setSearchQuery] = useState("");
  const [permissionSearchQuery, setPermissionSearchQuery] = useState("");

  // ── Pagination state ──────────────────────────────────────────
  const [page, setPage] = useState(1);

  const { data: rolesData, isLoading: loadingRoles } = useGetAllRolesQuery({
    page,
    limit: LIMIT,
  });

  const { data: permissionsData, isLoading: loadingPermissions } =
    useGetAllPermissionsQuery({
      limit: 1000,
    });

  // Mutations
  const [createRole, { isLoading: creatingRole }] = useCreateRoleMutation();
  const [updateRole, { isLoading: updatingRole }] = useUpdateRoleMutation();
  const [deleteRole] = useDeleteRoleMutation();
  const [assignPermissionsToRole, { isLoading: assigningPermissions }] =
    useAssignPermissionsToRoleMutation();

  // Extract data arrays
  const roles = Array.isArray(rolesData?.data?.roles)
    ? rolesData.data.roles
    : Array.isArray(rolesData?.data)
      ? rolesData.data
      : Array.isArray(rolesData)
        ? rolesData
        : [];

  // ── Pagination meta from response ────────────────────────────
  const totalItems =
    rolesData?.data?.pagination?.total ??
    rolesData?.data?.total ??
    0;
  const totalPages =
    rolesData?.data?.pagination?.totalPages ??
    Math.ceil(totalItems / LIMIT);

  const allPermissions = Array.isArray(permissionsData?.data?.permissions)
    ? permissionsData.data.permissions
    : Array.isArray(permissionsData?.data)
      ? permissionsData.data
      : Array.isArray(permissionsData)
        ? permissionsData
        : [];

  // Role Dialog state
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);
  const [selectedRoleId, setSelectedRoleId] = useState(null);
  const [originalPermissions, setOriginalPermissions] = useState([]);

  const [roleForm, setRoleForm] = useState({
    name: "",
    description: "",
  });
  const [selectedBundles, setSelectedBundles] = useState([]);
  const [advancedPermissions, setAdvancedPermissions] = useState([]);
  const [showAdvanced, setShowAdvanced] = useState(false);

  /* ===== PAGINATION ===== */
  const handlePageChange = (newPage) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  /* ===== FILTER ROLES ===== */
  const filteredRoles = roles.filter((role) => {
    const query = searchQuery.toLowerCase();
    return (
      role.name?.toLowerCase().includes(query) ||
      role.description?.toLowerCase().includes(query)
    );
  });

  const advancedPermissionOptions = getAdvancedPermissions(allPermissions, selectedBundles);

  const resolvedPermissionIds = expandBundlesForSave(selectedBundles, advancedPermissions);

  /* ===== FILTER PERMISSIONS (dialog search) ===== */
  const filteredAdvancedPermissions = advancedPermissionOptions.filter((perm) => {
    const query = permissionSearchQuery.toLowerCase();
    return (
      perm.id?.toLowerCase().includes(query) ||
      perm.label?.toLowerCase().includes(query) ||
      perm.description?.toLowerCase().includes(query) ||
      perm.action?.toLowerCase().includes(query)
    );
  });

  /* ===== HELPER: Check if permissions have changed ===== */
  const havePermissionsChanged = (current, original) => {
    const currentSorted = [...current].sort();
    const originalSorted = [...original].sort();
    if (currentSorted.length !== originalSorted.length) return true;
    return !currentSorted.every((perm, index) => perm === originalSorted[index]);
  };

  /* ===== ROLE MANAGEMENT ===== */
  const handleCreateRole = () => {
    setRoleForm({ name: "", description: "" });
    setSelectedBundles([]);
    setAdvancedPermissions([]);
    setShowAdvanced(false);
    setOriginalPermissions([]);
    setSelectedRole(null);
    setSelectedRoleId(null);
    setIsEditMode(false);
    setIsRoleDialogOpen(true);
  };

  const loadPermissionsIntoForm = (permissionIds = []) => {
    const bundles = bundlesFromAssignedPermissions(permissionIds);
    const expandedFromBundles = new Set(expandBundlesForSave(bundles));
    const advanced = permissionIds.filter((id) => !expandedFromBundles.has(id));
    setSelectedBundles(bundles);
    setAdvancedPermissions(advanced);
    setShowAdvanced(advanced.length > 0);
  };

  const handleEditRole = (role) => {
    if (!role || !role.id) {
      return;
    }
    if (isSuperAdminRole(role) && !currentUserIsSuperAdmin()) {
      toast.error("Only Super Admin can edit the Super Admin role");
      return;
    }

    const rolePermissions = role.permissions?.map((p) => p.id || p) || [];

    setRoleForm({
      name: role.name,
      description: role.description,
    });
    loadPermissionsIntoForm(rolePermissions);

    setOriginalPermissions(rolePermissions);
    setSelectedRole(role);
    setSelectedRoleId(role.id);
    setIsEditMode(true);
    setIsRoleDialogOpen(true);
  };

  const handleDuplicateRole = (role) => {
    const rolePermissions = role.permissions?.map((p) => p.id || p) || [];
    setRoleForm({
      name: `${role.name} (Copy)`,
      description: role.description,
    });
    loadPermissionsIntoForm(rolePermissions);
    setOriginalPermissions([]);
    setSelectedRole(null);
    setSelectedRoleId(null);
    setIsEditMode(false);
    setIsRoleDialogOpen(true);
  };

  const handleSaveRole = async () => {
    if (!roleForm.name.trim()) {
      toast.error("Role name is required");
      return;
    }

    if (roleForm.name.length < 2 || roleForm.name.length > 100) {
      toast.error("Role name must be between 2 and 100 characters");
      return;
    }

    if (roleForm.description && roleForm.description.length > 500) {
      toast.error("Description must not exceed 500 characters");
      return;
    }

    if (isEditMode && !selectedRoleId) {
      toast.error("Role ID is missing. Please try again.");
      return;
    }

    const permissionPayload = [...selectedBundles, ...advancedPermissions];
    const validPermissionIds = expandBundlesForSave(selectedBundles, advancedPermissions).filter(
      (id) => id && typeof id === "string"
    );

    if (isEditMode && isSuperAdminRole(selectedRole) && !currentUserIsSuperAdmin()) {
      toast.error("Only Super Admin can change Super Admin permissions");
      return;
    }

    try {
      if (isEditMode && selectedRoleId) {
        const rolePayload = {
          name: roleForm.name.trim(),
          description: roleForm.description.trim(),
          is_active: true,
        };

        await updateRole({
          roleId: selectedRoleId,
          data: rolePayload,
        }).unwrap();

        await assignPermissionsToRole({
          roleId: selectedRoleId,
          permissionIds: permissionPayload,
        }).unwrap();

        toast.success("Role updated successfully");
      } else {
        const rolePayload = {
          name: roleForm.name.trim(),
          description: roleForm.description.trim(),
          is_active: true,
          permissions: permissionPayload,
        };

        const createdRole = await createRole(rolePayload).unwrap();
        const roleId =
          createdRole?.data?.role?.id ||
          createdRole?.data?.id ||
          createdRole?.role?.id ||
          createdRole?.id;

        if (!roleId) {
          console.error("Created role response missing ID:", createdRole);
          toast.error("Role may have been created but the response was incomplete. Please refresh.");
          setIsRoleDialogOpen(false);
          return;
        }

        toast.success(
          validPermissionIds.length > 0
            ? `Role created with ${validPermissionIds.length} permissions`
            : "Role created successfully"
        );
      }

      setIsRoleDialogOpen(false);
      setPermissionSearchQuery("");
    } catch (error) {
      console.error("Error saving role:", error);
      const message =
        error?.data?.message ||
        error?.message ||
        "Failed to save role";
      toast.error(message);
    }
  };

  const handleDeleteRole = async (roleId) => {
    if (!(await confirmDelete("this role"))) return;
    try {
      await deleteRole(roleId).unwrap();
      //t.success("Role deleted successfully");
    } catch (error) {
      console.error("Error deleting role:", error);
      //t.error(error?.data?.message || "Failed to delete role");
    }
  };

  const toggleBundle = (bundleId) => {
    setSelectedBundles((prev) =>
      prev.includes(bundleId)
        ? prev.filter((id) => id !== bundleId)
        : [...prev, bundleId]
    );
  };

  const toggleAdvancedPermission = (permissionId) => {
    setAdvancedPermissions((prev) =>
      prev.includes(permissionId)
        ? prev.filter((p) => p !== permissionId)
        : [...prev, permissionId]
    );
  };

  const toggleAllBundles = () => {
    const allBundleIds = PERMISSION_BUNDLE_GROUPS.flatMap((g) =>
      g.bundles.map((b) => b.id)
    );
    if (selectedBundles.length === allBundleIds.length) {
      setSelectedBundles([]);
    } else {
      setSelectedBundles(allBundleIds);
    }
  };

  const toggleAllAdvanced = () => {
    if (advancedPermissions.length === advancedPermissionOptions.length) {
      setAdvancedPermissions([]);
    } else {
      setAdvancedPermissions(advancedPermissionOptions.map((p) => p.id));
    }
  };

  const permissionsChanged = havePermissionsChanged(
    resolvedPermissionIds,
    originalPermissions
  );

  const isLoading = loadingRoles || loadingPermissions;
  const isSaving = creatingRole || updatingRole || assigningPermissions;

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Access Control</h1>
        <p className="mt-2 text-muted-foreground">
          Manage roles and assign permissions
        </p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="roles">
            <Shield className="mr-2 h-4 w-4" />
            Roles
          </TabsTrigger>
          <TabsTrigger value="permissions">
            <Key className="mr-2 h-4 w-4" />
            All Permissions
          </TabsTrigger>
        </TabsList>

        {/* Roles Tab */}
        <TabsContent value="roles" className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="relative max-w-md flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search roles..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1); // reset to page 1 on new search
                }}
              />
            </div>
            <Button onClick={handleCreateRole}>
              <Plus className="mr-2 h-4 w-4" />
              Create Role
            </Button>
          </div>

          {/* Roles Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredRoles.map((role) => (
              <Card key={role.id} className="transition-shadow hover:shadow-md">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <Shield className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{role.name}</CardTitle>
                        <Badge variant="outline" className="mt-1">
                          {role.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <CardDescription className="mt-3">
                    {role.description || "No description"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Modules Allowed</span>
                      <Badge variant="secondary">
                        {bundlesFromAssignedPermissions(role.permissions?.map((p) => p.id || p) || []).length} modules
                      </Badge>
                    </div>

                    <Separator />

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleEditRole(role)}
                        disabled={isSuperAdminRole(role) && !currentUserIsSuperAdmin()}
                        title={isSuperAdminRole(role) && !currentUserIsSuperAdmin() ? "Only Super Admin can edit this role" : undefined}
                      >
                        <Edit2 className="mr-2 h-3 w-3" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleDuplicateRole(role)}
                      >
                        <Copy className="mr-2 h-3 w-3" />
                        Copy
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteRole(role.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* ── Pagination ──────────────────────────────────────────── */}
          {totalPages > 1 && (
            <div className="mt-4">
              <GlobalPagination
                page={page}
                totalPages={totalPages}
                totalItems={totalItems}
                itemsPerPage={LIMIT}
                onPageChange={handlePageChange}
                showInfo={true}
              />
            </div>
          )}

          {filteredRoles.length === 0 && (
            <div className="py-12 text-center">
              <Shield className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="mb-2 text-lg font-semibold">No roles found</h3>
              <p className="mb-4 text-muted-foreground">
                {searchQuery
                  ? "Try a different search term"
                  : "Create your first role to get started"}
              </p>
              {!searchQuery && (
                <Button onClick={handleCreateRole}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Role
                </Button>
              )}
            </div>
          )}
        </TabsContent>

        {/* Permissions Tab - View Only */}
        <TabsContent value="permissions" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">All Permissions</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                View all available permissions in the system
              </p>
            </div>
            <Badge variant="secondary">
              {allPermissions.length} total permissions
            </Badge>
          </div>

          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search permissions..."
              className="pl-10"
              value={permissionSearchQuery}
              onChange={(e) => setPermissionSearchQuery(e.target.value)}
            />
          </div>

          <div className="grid gap-3">
            {allPermissions.filter((perm) => {
              const query = permissionSearchQuery.toLowerCase();
              return (
                perm.id?.toLowerCase().includes(query) ||
                perm.label?.toLowerCase().includes(query) ||
                perm.description?.toLowerCase().includes(query) ||
                perm.action?.toLowerCase().includes(query)
              );
            }).map((permission) => (
              <Card
                key={permission.id}
                className="transition-shadow hover:shadow-sm"
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-1 items-center gap-3">
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-blue-50">
                        <Key className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex items-center gap-2">
                          <h4 className="text-sm font-semibold">
                            {permission.label}
                          </h4>
                          {permission.action && (
                            <Badge variant="outline" className="text-xs">
                              {permission.action}
                            </Badge>
                          )}
                        </div>
                        <code className="mb-1 block text-xs text-muted-foreground">
                          {permission.id}
                        </code>
                        {permission.description && (
                          <p className="text-sm text-muted-foreground">
                            {permission.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {allPermissions.filter((perm) => {
            const query = permissionSearchQuery.toLowerCase();
            return (
              perm.id?.toLowerCase().includes(query) ||
              perm.label?.toLowerCase().includes(query) ||
              perm.description?.toLowerCase().includes(query) ||
              perm.action?.toLowerCase().includes(query)
            );
          }).length === 0 && (
            <div className="py-12 text-center">
              <Key className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="mb-2 text-lg font-semibold">
                No permissions found
              </h3>
              <p className="text-muted-foreground">
                {permissionSearchQuery
                  ? "Try a different search term"
                  : "No permissions available"}
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Role Dialog */}
      <Dialog open={isRoleDialogOpen} onOpenChange={setIsRoleDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isEditMode ? "Edit Role" : "Create New Role"}
            </DialogTitle>
            <DialogDescription>
              Configure role details and assign permissions
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Role Details */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Role Name *</Label>
                <Input
                  placeholder="e.g., Content Manager"
                  value={roleForm.name}
                  onChange={(e) =>
                    setRoleForm({ ...roleForm, name: e.target.value })
                  }
                  maxLength={100}
                />
                <p className="text-xs text-muted-foreground">2-100 characters</p>
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  placeholder="Describe this role..."
                  value={roleForm.description}
                  onChange={(e) =>
                    setRoleForm({ ...roleForm, description: e.target.value })
                  }
                  rows={2}
                  maxLength={500}
                />
                <p className="text-xs text-muted-foreground">Max 500 characters</p>
              </div>
            </div>

            <Separator />

            {/* Module permissions — one toggle grants the full flow */}
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="font-semibold">Module Permissions</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    One toggle automatically includes all internal permissions needed for that action.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={toggleAllBundles}>
                    {selectedBundles.length === totalBundleCount()
                      ? "Deselect All"
                      : "Select All"}
                  </Button>
                  <Badge variant="secondary">
                    {selectedBundles.length} / {totalBundleCount()} modules
                  </Badge>
                  {isEditMode && permissionsChanged && (
                    <Badge variant="destructive" className="text-xs">
                      Modified
                    </Badge>
                  )}
                </div>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search modules..."
                  className="pl-10"
                  value={permissionSearchQuery}
                  onChange={(e) => setPermissionSearchQuery(e.target.value)}
                />
              </div>

              <div className="max-h-[28rem] overflow-y-auto rounded-lg border space-y-4 p-3">
                {PERMISSION_BUNDLE_GROUPS.map((group) => {
                  const query = permissionSearchQuery.toLowerCase();
                  const visibleBundles = group.bundles.filter(
                    (b) =>
                      !query ||
                      b.label.toLowerCase().includes(query) ||
                      b.description.toLowerCase().includes(query) ||
                      b.id.toLowerCase().includes(query) ||
                      group.label.toLowerCase().includes(query)
                  );
                  if (visibleBundles.length === 0) return null;
                  return (
                    <div key={group.id} className="space-y-2">
                      <h4 className="text-sm font-semibold text-foreground px-1">
                        {group.label}
                      </h4>
                      <div className="divide-y rounded-md border bg-muted/20">
                        {visibleBundles.map((bundle) => (
                          <div
                            key={bundle.id}
                            role="button"
                            tabIndex={0}
                            className="flex items-start gap-3 p-3 transition-colors hover:bg-muted/50 cursor-pointer"
                            onClick={() => toggleBundle(bundle.id)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                toggleBundle(bundle.id);
                              }
                            }}
                          >
                            <div onClick={(e) => e.stopPropagation()}>
                              <Switch
                                checked={selectedBundles.includes(bundle.id)}
                                onCheckedChange={() => toggleBundle(bundle.id)}
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-medium">{bundle.label}</span>
                                {selectedBundles.includes(bundle.id) && (
                                  <Check className="h-4 w-4 text-primary shrink-0" />
                                )}
                              </div>
                              <p className="mt-1 text-xs text-muted-foreground">
                                {bundle.description}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Advanced granular permissions (optional) */}
              {advancedPermissionOptions.length > 0 && (
                <div className="space-y-3 pt-2 border-t">
                  <button
                    type="button"
                    className="flex w-full items-center justify-between text-left"
                    onClick={() => setShowAdvanced((v) => !v)}
                  >
                    <div>
                      <h4 className="text-sm font-semibold">Advanced permissions</h4>
                      <p className="text-xs text-muted-foreground">
                        Optional granular permissions not covered by module toggles ({advancedPermissionOptions.length})
                      </p>
                    </div>
                    <Badge variant="outline">
                      {advancedPermissions.length} selected
                    </Badge>
                  </button>

                  {showAdvanced && (
                    <div className="space-y-2">
                      <div className="flex justify-end">
                        <Button variant="ghost" size="sm" onClick={toggleAllAdvanced}>
                          {advancedPermissions.length === advancedPermissionOptions.length
                            ? "Deselect all advanced"
                            : "Select all advanced"}
                        </Button>
                      </div>
                      <div className="max-h-48 overflow-y-auto rounded-lg border divide-y">
                        {filteredAdvancedPermissions.map((permission) => (
                          <div
                            key={permission.id}
                            className="flex items-start gap-3 p-3 transition-colors hover:bg-muted/50"
                          >
                            <Switch
                              checked={advancedPermissions.includes(permission.id)}
                              onCheckedChange={() => toggleAdvancedPermission(permission.id)}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-medium">{permission.label}</span>
                                {permission.action && (
                                  <Badge variant="outline" className="text-xs">
                                    {permission.action}
                                  </Badge>
                                )}
                              </div>
                              <code className="mt-1 block text-xs text-muted-foreground">
                                {permission.id}
                              </code>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="rounded-lg border bg-muted/30 px-4 py-3 flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium">
                  {selectedBundles.length} module{selectedBundles.length === 1 ? "" : "s"} selected
                  {advancedPermissions.length > 0
                    ? ` · ${advancedPermissions.length} advanced`
                    : ""}
                </p>
                <p className="text-xs text-muted-foreground">
                  Saves as {resolvedPermissionIds.length} effective permission
                  {resolvedPermissionIds.length === 1 ? "" : "s"} (includes required internal access)
                </p>
              </div>
            </div>
          </div>

          <DialogFooter className="sticky bottom-0 bg-background border-t pt-4">
            <Button
              variant="outline"
              onClick={() => setIsRoleDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveRole} disabled={isSaving || !roleForm.name.trim()}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : isEditMode ? (
                "Save Changes"
              ) : (
                "Create Role"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}