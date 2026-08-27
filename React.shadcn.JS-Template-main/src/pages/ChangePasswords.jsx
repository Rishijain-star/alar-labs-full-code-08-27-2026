import { useState } from "react";
import { KeyRound, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useChangePasswordMutation } from "@/store/api/userApi";

export default function ChangePassword() {
  const [changePassword, { isLoading }] = useChangePasswordMutation();
  const [form, setForm] = useState({
    old_password: "",
    new_password: "",
    confirm_password: "",
  });
  const [error, setError] = useState("");

  const onChange = (e) => {
    setError("");
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (form.new_password.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    if (form.new_password !== form.confirm_password) {
      setError("New password and confirm password do not match.");
      return;
    }
    if (form.old_password === form.new_password) {
      setError("New password must be different from current password.");
      return;
    }

    try {
      await changePassword({
        old_password: form.old_password,
        new_password: form.new_password,
      }).unwrap();
      setForm({ old_password: "", new_password: "", confirm_password: "" });
    } catch (err) {
      setError(err?.data?.message || err?.message || "Failed to change password.");
    }
  };

  return (
    <div className="max-w-md">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <KeyRound className="h-5 w-5" />
          Change Password
        </h1>
        <p className="text-sm text-muted-foreground">
          Use a strong password with at least 8 characters.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Update password</CardTitle>
          <CardDescription>Enter your current password and choose a new one.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="old_password">Current Password</Label>
              <Input
                id="old_password"
                name="old_password"
                type="password"
                value={form.old_password}
                onChange={onChange}
                required
                minLength={8}
                autoComplete="current-password"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="new_password">New Password</Label>
              <Input
                id="new_password"
                name="new_password"
                type="password"
                value={form.new_password}
                onChange={onChange}
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="confirm_password">Confirm New Password</Label>
              <Input
                id="confirm_password"
                name="confirm_password"
                type="password"
                value={form.confirm_password}
                onChange={onChange}
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating…
                </>
              ) : (
                "Change Password"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
