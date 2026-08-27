import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Settings, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useGetCurrentUserQuery, useUpdateCurrentUserMutation } from "@/store/api/userApi";
import { setUser } from "@/store/slices/authSlice";

export default function AccountSettings() {
  const dispatch = useDispatch();
  const authUser = useSelector((state) => state.auth.user);
  const { data: profileData, isLoading } = useGetCurrentUserQuery(undefined, {
    refetchOnMountOrArgChange: true,
  });
  const [updateCurrentUser, { isLoading: saving }] = useUpdateCurrentUserMutation();

  const profile = profileData?.data || profileData || authUser || {};
  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    email: "",
  });

  useEffect(() => {
    setForm({
      full_name: profile.full_name || profile.name || "",
      phone: profile.phone || profile.mobile || "",
      email: profile.email || "",
    });
  }, [profile.full_name, profile.name, profile.phone, profile.mobile, profile.email]);

  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    const resp = await updateCurrentUser({
      full_name: form.full_name.trim(),
      phone: form.phone.replace(/\D/g, ""),
    }).unwrap();
    const updated = resp?.data || resp;
    const merged = { ...authUser, ...updated, full_name: form.full_name.trim(), phone: form.phone };
    dispatch(setUser(merged));
    try {
      localStorage.setItem("user", JSON.stringify(merged));
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Account Settings
        </h1>
        <p className="text-sm text-muted-foreground">
          Update your profile information.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Your name and contact details.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-8">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading profile…
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="full_name">Full Name</Label>
                <Input
                  id="full_name"
                  name="full_name"
                  value={form.full_name}
                  onChange={onChange}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" value={form.email} disabled />
                <p className="text-xs text-muted-foreground">Email cannot be changed here.</p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={form.phone}
                  onChange={onChange}
                  placeholder="10-digit mobile number"
                />
              </div>
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving…
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
