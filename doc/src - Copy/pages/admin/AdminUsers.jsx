import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MoreHorizontal,
  UserPlus,
  Edit,
  Trash2,
  Shield,
  Mail,
  Check,
  Loader2,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import TableSkeleton from "../../components/common/TableSkeleton";
import GlobalPagination from "../../components/common/Pagination";
import GlobalListManager from "../../components/common/Globallistmanager";
import { toast } from "@/lib/toast";
import { useNavigate } from "react-router-dom";

import {
  useGetAllUsersQuery,
  useAssignRoleToUserMutation,
  useBulkAssignRoleMutation,
  useDeleteUserMutation,
  useBulkDeleteUsersMutation,
  useUpdateUserMutation,
} from "@/store/api/userApi";

import { useGetAllRolesQuery } from "@/store/api/roleAndPermissionApi";
import { hasAnyPermission } from "@/utils/permissions";

const AdminUsers = () => {
  const navigate = useNavigate();

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [newRoleId, setNewRoleId] = useState("");

  const {
    data: usersData,
    isLoading: loadingUsers,
    isFetching: fetchingUsers,
    refetch: refetchUsers,
  } = useGetAllUsersQuery({
    page,
    limit,
    search: searchQuery,
    roleId: roleFilter === "all" ? "" : roleFilter,
    status: statusFilter === "all" ? "" : statusFilter,
  });

  // Fetch roles only once
  const { data: rolesData, isLoading: loadingRoles } = useGetAllRolesQuery(
    { page: 1, limit: 1000 },
    {
      refetchOnMountOrArgChange: false,
      refetchOnFocus: false,
      refetchOnReconnect: false,
    }
  );
  const handleAddUser = () => {
    navigate("/app/users/new");
  };

  const [assignRole, { isLoading: assigningRole }] =
    useAssignRoleToUserMutation();
  const [updateUser, { isLoading: updatingUser }] = useUpdateUserMutation();
  const [bulkAssignRole, { isLoading: bulkAssigning }] =
    useBulkAssignRoleMutation();
  const [deleteUser, { isLoading: deletingUser }] = useDeleteUserMutation();
  const [bulkDeleteUsers, { isLoading: bulkDeleting }] =
    useBulkDeleteUsersMutation();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    full_name: "",
    phone: "",
    is_active: true,
  });

  const users = Array.isArray(usersData?.data)
    ? usersData.data
    : usersData?.data?.users || [];

  const totalUsers = usersData?.data?.pagination?.total
    ?? usersData?.data?.total
    ?? users.length;

  const totalPages = usersData?.data?.pagination?.totalPages
    ?? usersData?.data?.totalPages
    ?? Math.ceil(totalUsers / limit);

  const roles = rolesData?.data?.roles || rolesData?.data || [];

  const isLoading = loadingUsers || loadingRoles;

  const getRole = (roleId) => roles.find((r) => r.id === roleId);

  const getRoleName = (roleId) => {
    const role = getRole(roleId);
    return role ? role.name : "Unknown";
  };

  const getRoleBadgeColor = (roleId) => {
    const role = getRole(roleId);
    if (!role) return "bg-gray-100 text-gray-700 border-gray-200";
    const roleName = role.name?.toLowerCase();
    if (roleName?.includes("super") || roleName?.includes("admin"))
      return "bg-purple-100 text-purple-700 border-purple-200";
    if (roleName?.includes("manager"))
      return "bg-blue-100 text-blue-700 border-blue-200";
    if (roleName?.includes("instructor"))
      return "bg-orange-100 text-orange-700 border-orange-200";
    if (roleName?.includes("support"))
      return "bg-yellow-100 text-yellow-700 border-yellow-200";
    if (roleName?.includes("student"))
      return "bg-green-100 text-green-700 border-green-200";
    return "bg-gray-100 text-gray-700 border-gray-200";
  };

  const getStatusBadgeColor = (isActive) => {
    return isActive
      ? "bg-green-100 text-green-700"
      : "bg-yellow-100 text-yellow-700";
  };

  const toggleSelectAll = () => {
    if (selectedUsers.length === users.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(users.map((u) => u.user_id));
    }
  };

  const toggleSelectUser = (userId) => {
    if (selectedUsers.includes(userId)) {
      setSelectedUsers(selectedUsers.filter((id) => id !== userId));
    } else {
      setSelectedUsers([...selectedUsers, userId]);
    }
  };

  const openRoleDialog = (user) => {
    setSelectedUser(user);
    setNewRoleId(user.role_id || "");
    setIsRoleDialogOpen(true);
  };

  const openEditDialog = (user) => {
    setSelectedUser(user);
    setEditForm({
      full_name: user?.full_name || "",
      phone: user?.phone || "",
      is_active: !!user?.is_active,
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateUser = async () => {
    if (!selectedUser?.user_id) return;
    try {
      await updateUser({
        userId: selectedUser.user_id,
        data: editForm,
      }).unwrap();
      toast.success("User updated successfully");
      setIsEditDialogOpen(false);
      setSelectedUser(null);
    } catch (error) {
      console.error("Error updating user:", error);
      toast.error(error?.data?.message || "Failed to update user");
    }
  };

  const handleAssignRole = async () => {
    if (!selectedUser || !newRoleId) {
      toast.error("Please select a role");
      return;
    }
    try {
      await assignRole({
        userId: selectedUser.user_id,
        roleId: newRoleId,
      }).unwrap();
      setIsRoleDialogOpen(false);
      setSelectedUser(null);
      setNewRoleId("");
      toast.success("Role assigned successfully");
    } catch (error) {
      console.error("Error assigning role:", error);
      toast.error("Failed to assign role");
    }
  };

  const handleBulkRoleAssignment = async (roleId) => {
    if (selectedUsers.length === 0) {
      toast.error("No users selected");
      return;
    }
    try {
      await bulkAssignRole({ userIds: selectedUsers, roleId }).unwrap();
      setSelectedUsers([]);
      toast.success("Roles assigned successfully");
    } catch (error) {
      console.error("Error bulk assigning roles:", error);
      toast.error("Failed to assign roles");
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!confirm("Are you sure you want to delete this user?")) return;
    try {
      await deleteUser(userId).unwrap();
      toast.success("User deleted successfully");
    } catch (error) {
      console.error("Error deleting user:", error);
      toast.error("Failed to delete user");
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedUsers.length === 0) {
      toast.error("No users selected");
      return;
    }
    if (!confirm(`Delete ${selectedUsers.length} user(s)?`)) return;
    try {
      await bulkDeleteUsers({ userIds: selectedUsers }).unwrap();
      setSelectedUsers([]);
      toast.success("Users deleted successfully");
    } catch (error) {
      console.error("Error deleting users:", error);
      toast.error("Failed to delete users");
    }
  };

  const handlePageChange = (newPage) => {
    setPage(newPage);
    setSelectedUsers([]);
  };

  const getInitials = (fullName) =>
    fullName
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase() || "U";

  if (isLoading) {
    return (
      <TableSkeleton
        rows={8}
        columns={6}
        showHeader={true}
        showActions={true}
        showCheckbox={true}
      />
    );
  }

  return (
    <>
      <GlobalListManager
        title="User Management"
        description="Manage users and assign roles with dynamic permissions"
        addButtonText="Add User"
        addButtonIcon={UserPlus}
        onAdd={() => handleAddUser()}
        onExport={() => console.log("Export clicked")}
        onRefresh={refetchUsers}
        isRefreshing={fetchingUsers}
        searchConfig={{
          value: searchQuery,
          onChange: setSearchQuery,
          onPageReset: () => setPage(1),
          placeholder: "Search users...",
        }}
        permissions={{
          checkPermissions: true,
          resource: "user",
          actions: {
            create: "create_users",
            export: "courses_export",
          },
          showLockedButtons: false, // ⚡ Hide instead of showing disabled
        }}
        filters={[
          {
            value: roleFilter,
            onChange: setRoleFilter,
            onPageReset: () => setPage(1),
            placeholder: "Role",
            width: "w-48",
            options: roles.map((role) => ({
              value: role.id,
              label: role.name,
            })),
            allOptionText: "All Roles",
          },
          {
            value: statusFilter,
            onChange: setStatusFilter,
            onPageReset: () => setPage(1),
            placeholder: "Status",
            width: "w-40",
            options: [
              { value: "active", label: "Active" },
              { value: "inactive", label: "Inactive" },
              { value: "suspended", label: "Suspended" },
            ],
            allOptionText: "All Status",
          },
        ]}
      >
        {/* Bulk Actions */}
        {selectedUsers.length > 0 && (
          <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border-2 border-primary/20 bg-primary/5 p-4">
            <span className="text-sm font-semibold">
              {selectedUsers.length} selected
            </span>
            <Separator orientation="vertical" className="h-6" />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" disabled={bulkAssigning}>
                  {bulkAssigning ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Shield className="mr-2 h-4 w-4" />
                  )}
                  Assign Role
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel>Select Role</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {roles.map((role) => (
                  <DropdownMenuItem
                    key={role.id}
                    onClick={() => handleBulkRoleAssignment(role.id)}
                  >
                    <div className="flex flex-col items-start">
                      <span className="font-medium">{role.name}</span>
                    </div>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="outline" size="sm">
              <Mail className="mr-2 h-4 w-4" />
              Send Email
            </Button>
            {hasAnyPermission(["delete_users"]) && (
              <Button
                variant="outline"
                size="sm"
                className="text-red-600 hover:text-red-700"
                onClick={handleDeleteSelected}
                disabled={bulkDeleting}
              >
                {bulkDeleting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="mr-2 h-4 w-4" />
                )}
                Delete
              </Button>
            )}
          </div>
        )}

        {fetchingUsers && (
          <div className="mb-4 flex items-center gap-2 rounded-lg bg-blue-50 p-3 text-sm text-blue-900">
            <Loader2 className="h-4 w-4 animate-spin" />
            Updating data...
          </div>
        )}

        {/* Table */}
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-12">
                  <Checkbox
                    checked={
                      selectedUsers.length === users.length && users.length > 0
                    }
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.user_id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedUsers.includes(user.user_id)}
                      onCheckedChange={() => toggleSelectUser(user.user_id)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                        <span className="text-sm font-medium text-primary">
                          {getInitials(user.full_name)}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium">{user.full_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {user.email}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={getRoleBadgeColor(user.role_id)}
                    >
                      <Shield className="mr-1 h-3 w-3" />
                      {user.role?.name || getRoleName(user.role_id)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={getStatusBadgeColor(user.is_active)}
                    >
                      {user.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {user.created_at
                      ? new Date(user.created_at).toLocaleDateString()
                      : "N/A"}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {hasAnyPermission(["manage_user_roles", "manage_access_control"]) && (
                          <DropdownMenuItem onClick={() => openRoleDialog(user)}>
                            <Shield className="mr-2 h-4 w-4" />
                            Change Role
                          </DropdownMenuItem>
                        )}
                        {hasAnyPermission(["edit_users"]) && (
                          <DropdownMenuItem onClick={() => openEditDialog(user)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit User
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem>
                          <Mail className="mr-2 h-4 w-4" />
                          Send Email
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {hasAnyPermission(["delete_users"]) && (
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => handleDeleteUser(user.user_id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete User
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {users.length === 0 && !fetchingUsers && (
          <div className="py-12 text-center text-muted-foreground">
            No users found matching your filters
          </div>
        )}

        {totalPages > 1 && (
          <div className="mt-4">
            <GlobalPagination
              page={page}
              totalPages={totalPages}
              totalItems={totalUsers}
              itemsPerPage={limit}
              onPageChange={handlePageChange}
              showInfo={true}
            />
          </div>
        )}
      </GlobalListManager>

      {/* Role Assignment Dialog */}
      <Dialog open={isRoleDialogOpen} onOpenChange={setIsRoleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change User Role</DialogTitle>
            <DialogDescription>
              Assign a new role to {selectedUser?.full_name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Current Role</Label>
              <div className="rounded-lg bg-muted p-3">
                <Badge
                  variant="outline"
                  className={getRoleBadgeColor(selectedUser?.role_id)}
                >
                  <Shield className="mr-1 h-3 w-3" />
                  {selectedUser?.role?.name || getRoleName(selectedUser?.role_id)}
                </Badge>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-role">New Role *</Label>
              <Select value={newRoleId} onValueChange={setNewRoleId}>
                <SelectTrigger id="new-role">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      <div className="flex flex-col items-start">
                        <span className="font-medium">{role.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {role.permissions?.length || 0} permissions
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {newRoleId && newRoleId !== selectedUser?.role_id && (
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                <p className="text-sm text-blue-900">
                  <Check className="mr-1 inline h-4 w-4" />
                  This will grant{" "}
                  {getRole(newRoleId)?.permissions?.length || 0} permissions
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsRoleDialogOpen(false)}
              disabled={assigningRole}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAssignRole}
              disabled={
                !newRoleId ||
                newRoleId === selectedUser?.role_id ||
                assigningRole
              }
            >
              {assigningRole ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Assigning...
                </>
              ) : (
                "Assign Role"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>Update basic user profile fields.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="edit_full_name">Full Name</Label>
              <input
                id="edit_full_name"
                className="w-full rounded-md border px-3 py-2 text-sm"
                value={editForm.full_name}
                onChange={(e) =>
                  setEditForm((p) => ({ ...p, full_name: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_phone">Phone</Label>
              <input
                id="edit_phone"
                className="w-full rounded-md border px-3 py-2 text-sm"
                value={editForm.phone}
                onChange={(e) =>
                  setEditForm((p) => ({ ...p, phone: e.target.value }))
                }
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={!!editForm.is_active}
                onCheckedChange={(v) =>
                  setEditForm((p) => ({ ...p, is_active: !!v }))
                }
              />
              Active user
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateUser} disabled={updatingUser}>
              {updatingUser ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AdminUsers;
