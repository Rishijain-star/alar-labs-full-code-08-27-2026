import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { HelpCircle, Loader2, MessageSquare, SendHorizontal } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  useGetMySupportTicketsQuery,
  useSubmitMySupportMutation,
} from "@/store/api/supportApi";
import { formatSupportTicketLabel } from "@/lib/supportTicketRef";

export default function HelpSupport() {
  const navigate = useNavigate();
  const user = useSelector((state) => state.auth.user);
  const displayName = user?.full_name || user?.name || "";
  const displayEmail = user?.email || "";

  const { data, isLoading, refetch } = useGetMySupportTicketsQuery(
    { page: 1, limit: 20 },
    { refetchOnMountOrArgChange: true },
  );
  const [submitSupport, { isLoading: submitting }] = useSubmitMySupportMutation();

  const [form, setForm] = useState({
    subject: "",
    message: "",
  });

  const tickets = data?.data?.rows || data?.rows || [];

  const onSubmit = async (e) => {
    e.preventDefault();
    const subject = form.subject.trim();
    const message = form.message.trim();
    if (!subject || !message) return;

    const res = await submitSupport({
      name: displayName || "User",
      email: displayEmail,
      subject,
      message,
    }).unwrap();

    setForm({ subject: "", message: "" });
    refetch();

    const ticketId = res?.data?.ticket?.id;
    if (ticketId) {
      navigate(`/support/chat/${ticketId}`);
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <HelpCircle className="h-5 w-5" />
          Help & Support
        </h1>
        <p className="text-sm text-muted-foreground">
          Submit a request or continue an existing conversation.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>New request</CardTitle>
          <CardDescription>Describe your issue and our team will respond.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                value={form.subject}
                onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                placeholder="Brief summary of your issue"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                value={form.message}
                onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                placeholder="Tell us how we can help"
                className="min-h-[120px]"
                required
              />
            </div>
            <Button type="submit" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting…
                </>
              ) : (
                <>
                  <SendHorizontal className="mr-2 h-4 w-4" />
                  Submit request
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your tickets</CardTitle>
          <CardDescription>Previous support conversations.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading tickets…
            </div>
          ) : tickets.length === 0 ? (
            <p className="text-sm text-muted-foreground">No support tickets yet.</p>
          ) : (
            <ul className="divide-y divide-border rounded-lg border">
              {tickets.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{t.subject}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatSupportTicketLabel(t) || "Ticket"} · {new Date(t.created_at).toLocaleString()}
                    </p>
                  </div>
                  <Badge variant="outline" className="capitalize shrink-0">
                    {t.status || "open"}
                  </Badge>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => navigate(`/support/chat/${t.id}`)}
                  >
                    <MessageSquare className="h-4 w-4 mr-1" />
                    Chat
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
