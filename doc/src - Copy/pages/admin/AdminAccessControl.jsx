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
    permissions: [],
  });

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

  /* ===== FILTER PERMISSIONS (dialog search) ===== */
  const filteredPermissions = allPermissions.filter((perm) => {
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
    setRoleForm({ name: "", description: "", permissions: [] });
    setOriginalPermissions([]);
    setSelectedRole(null);
    setSelectedRoleId(null);
    setIsEditMode(false);
    setIsRoleDialogOpen(true);
  };

  const handleEditRole = (role) => {
    if (!role || !role.id) {
      //t.error("Invalid role data");
      return;
    }

    const rolePermissions = role.permissions?.map((p) => p.id || p) || [];

    setRoleForm({
      name: role.name,
      description: role.description,
      permissions: rolePermissions,
    });

    setOriginalPermissions(rolePermissions);
    setSelectedRole(role);
    setSelectedRoleId(role.id);
    setIsEditMode(true);
    setIsRoleDialogOpen(true);
  };

  const handleDuplicateRole = (role) => {
    setRoleForm({
      name: `${role.name} (Copy)`,
      description: role.description,
      permissions: role.permissions?.map((p) => p.id || p) || [],
    });
    setOriginalPermissions([]);
    setSelectedRole(null);
    setSelectedRoleId(null);
    setIsEditMode(false);
    setIsRoleDialogOpen(true);
  };

  const handleSaveRole = async () => {
    if (!roleForm.name.trim()) {
      //t.error("Role name is required");
      return;
    }

    if (roleForm.name.length < 2 || roleForm.name.length > 100) {
      //t.error("Role name must be between 2 and 100 characters");
      return;
    }

    if (roleForm.description && roleForm.description.length > 500) {
      //t.error("Description must not exceed 500 characters");
      return;
    }

    if (isEditMode && !selectedRoleId) {
      //t.error("Role ID is missing. Please try again.");
      return;
    }

    const validPermissionIds = roleForm.permissions.filter(
      (id) => id && typeof id === "string"
    );

    try {
      if (isEditMode && selectedRoleId) {
        // ── EDIT MODE ──────────────────────────────────────────────
        const rolePayload = {
          name: roleForm.name.trim(),
          description: roleForm.description.trim(),
          is_active: true,
        };

        await updateRole({
          roleId: selectedRoleId,
          data: rolePayload,
        }).unwrap();

        const permissionsChanged = havePermissionsChanged(
          validPermissionIds,
          originalPermissions,
        );

        if (permissionsChanged) {
          await assignPermissionsToRole({
            roleId: selectedRoleId,
            permissionIds: validPermissionIds,
          }).unwrap();
         
        } 
      } else {
        // ── CREATE MODE ────────────────────────────────────────────
        const rolePayload = {
          name: roleForm.name.trim(),
          description: roleForm.description.trim(),
          is_active: true,
          permissions: validPermissionIds,
        };

        const createdRole = await createRole(rolePayload).unwrap();
        const roleId = createdRole?.data?.id || createdRole?.id;

        if (!roleId) {
          console.error("Created role response missing ID:", createdRole);
          //t.success("Role created successfully");
          setIsRoleDialogOpen(false);
          return;
        }

        if (validPermissionIds.length > 0) {
          await assignPermissionsToRole({
            roleId,
            permissionIds: validPermissionIds,
          }).unwrap();
          //t.success("Role created with permissions successfully");
        } else {
          //t.success("Role created successfully");
        }
      }

      setIsRoleDialogOpen(false);
    } catch (error) {
      console.error("Error saving role:", error);
      //t.error(error?.data?.message || "Failed to save role");
    }
  };

  const handleDeleteRole = async (roleId) => {
    if (confirm("Are you sure you want to delete this role?")) {
      try {
        await deleteRole(roleId).unwrap();
        //t.success("Role deleted successfully");
      } catch (error) {
        console.error("Error deleting role:", error);
        //t.error(error?.data?.message || "Failed to delete role");
      }
    }
  };

  const togglePermission = (permissionId) => {
    setRoleForm((prev) => {
      const isCurrentlySelected = prev.permissions.includes(permissionId);
      return {
        ...prev,
        permissions: isCurrentlySelected
          ? prev.permissions.filter((p) => p !== permissionId)
          : [...prev.permissions, permissionId],
      };
    });
  };

  const toggleAllPermissions = () => {
    if (roleForm.permissions.length === allPermissions.length) {
      setRoleForm((prev) => ({ ...prev, permissions: [] }));
    } else {
      setRoleForm((prev) => ({
        ...prev,
        permissions: allPermissions.map((p) => p.id),
      }));
    }
  };

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
                      <span className="text-muted-foreground">Permissions</span>
                      <Badge variant="secondary">
                        {role.permissions?.length || 0}
                      </Badge>
                    </div>

                    <Separator />

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleEditRole(role)}
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
            {filteredPermissions.map((permission) => (
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

          {filteredPermissions.length === 0 && (
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

            {/* Permissions Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Assign Permissions</h3>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={toggleAllPermissions}
                  >
                    {roleForm.permissions.length === allPermissions.length
                      ? "Deselect All"
                      : "Select All"}
                  </Button>
                  <Badge variant="secondary">
                    {roleForm.permissions.length} / {allPermissions.length} selected
                  </Badge>
                  {isEditMode &&
                    havePermissionsChanged(roleForm.permissions, originalPermissions) && (
                      <Badge variant="destructive" className="text-xs">
                        Modified
                      </Badge>
                    )}
                </div>
              </div>

              {/* Permissions List with Search */}
              <div className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search permissions..."
                    className="pl-10"
                    value={permissionSearchQuery}
                    onChange={(e) => setPermissionSearchQuery(e.target.value)}
                  />
                </div>

                <div className="max-h-96 overflow-y-auto rounded-lg border">
                  <div className="divide-y">
                    {filteredPermissions.map((permission) => (
                      <div
                        key={permission.id}
                        className="flex items-start gap-3 p-3 transition-colors hover:bg-muted/50"
                      >
                        <Switch
                          checked={roleForm.permissions.includes(permission.id)}
                          onCheckedChange={() => togglePermission(permission.id)}
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">
                              {permission.label}
                            </span>
                            {roleForm.permissions.includes(permission.id) && (
                              <Check className="h-4 w-4 text-primary" />
                            )}
                            {permission.action && (
                              <Badge variant="outline" className="text-xs">
                                {permission.action}
                              </Badge>
                            )}
                          </div>
                          <code className="mt-1 block text-xs text-muted-foreground">
                            {permission.id}
                          </code>
                          {permission.description && (
                            <p className="mt-1 text-xs text-muted-foreground">
                              {permission.description}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {filteredPermissions.length === 0 && (
                    <div className="py-8 text-center">
                      <p className="text-sm text-muted-foreground">
                        No permissions found
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsRoleDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveRole} disabled={isSaving}>
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