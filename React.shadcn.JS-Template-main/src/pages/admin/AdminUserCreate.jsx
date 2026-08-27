import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, UserPlus } from "lucide-react";
import { useCreateUserMutation } from "@/store/api/userApi";
import { useGetAllRolesQuery } from "@/store/api/roleAndPermissionApi";
import { hasAnyPermission } from "@/utils/permissions";
import { toast } from "@/lib/toast";

export default function AdminUserCreate() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
    phone: "",
    roleId: "",
  });
  const [createUser, { isLoading }] = useCreateUserMutation();
  const { data: rolesData, isLoading: loadingRoles, refetch: refetchRoles } = useGetAllRolesQuery(
    { page: 1, limit: 1000 },
    {
      refetchOnMountOrArgChange: true,
    },
  );

  const roles = useMemo(() => {
    const raw = rolesData?.data?.roles ?? rolesData?.data ?? rolesData ?? [];
    return Array.isArray(raw) ? raw : [];
  }, [rolesData]);

  const defaultRoleId = useMemo(() => {
    const student = roles.find((r) => String(r.name).toLowerCase() === "student");
    return student?.id || roles[0]?.id || "";
  }, [roles]);

  const canCreate = hasAnyPermission(["create_users", "manage_users"]);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!canCreate) return;

    const roleId = form.roleId || defaultRoleId;
    if (!roleId) {
      toast.error("Please select a role");
      return;
    }

    const phoneDigits = form.phone.replace(/\D/g, "");
    if (phoneDigits.length < 10) {
      toast.error("Enter a valid 10-digit phone number");
      return;
    }

    try {
      await createUser({
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        password: form.password,
        roleId,
        phone: phoneDigits,
      }).unwrap();
      navigate("/app/users");
    } catch (error) {
      const message =
        error?.data?.message ||
        error?.message ||
        "Failed to create user";
      toast.error(message);
    }
  };

  const onChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <UserPlus className="h-5 w-5" /> Add User
        </h1>
        <p className="text-sm text-muted-foreground">
          Create a new user and assign a role.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Basic Details</CardTitle>
          <CardDescription>All fields are required to create a user.</CardDescription>
        </CardHeader>
        <Separator />
        <CardContent className="space-y-4 pt-6">
          <div className="grid gap-2">
            <Label htmlFor="full_name">Full Name</Label>
            <Input
              id="full_name"
              name="full_name"
              placeholder="Jane Doe"
              value={form.full_name}
              onChange={onChange}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="jane@example.com"
              value={form.email}
              onChange={onChange}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              placeholder="10-digit mobile number"
              value={form.phone}
              onChange={onChange}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="Min 8 characters"
              value={form.password}
              onChange={onChange}
              required
              minLength={8}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="roleId">Role</Label>
            <Select
              value={form.roleId || defaultRoleId || undefined}
              onValueChange={(value) => setForm((f) => ({ ...f, roleId: value }))}
              disabled={loadingRoles || roles.length === 0}
            >
              <SelectTrigger id="roleId">
                <SelectValue
                  placeholder={loadingRoles ? "Loading roles…" : "Select role"}
                />
              </SelectTrigger>
              <SelectContent>
                {roles.map((role) => (
                  <SelectItem key={role.id} value={String(role.id)}>
                    {role.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!loadingRoles && roles.length === 0 && (
              <p className="text-xs text-destructive">
                No roles found.{" "}
                <button
                  type="button"
                  className="underline"
                  onClick={() => refetchRoles()}
                >
                  Refresh roles
                </button>
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 pt-2">
            <Button variant="outline" type="button" onClick={() => navigate(-1)}>
              Cancel
            </Button>
            {canCreate && (
              <Button
                type="submit"
                onClick={onSubmit}
                disabled={
                  isLoading ||
                  loadingRoles ||
                  !defaultRoleId ||
                  !form.full_name.trim() ||
                  !form.email.trim() ||
                  !form.password ||
                  form.phone.replace(/\D/g, "").length < 10
                }
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating…
                  </>
                ) : (
                  "Create User"
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
