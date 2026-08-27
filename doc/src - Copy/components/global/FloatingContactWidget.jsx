import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { SendHorizontal, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useSubmitSupportMutation } from "@/store/api/supportApi";
import { hasValidSession } from "@/lib/auth-helpers";

export default function FloatingContactWidget() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [submitSupport, { isLoading }] = useSubmitSupportMutation();

  const onChange = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const onSubmit = (e) => {
    e.preventDefault();
    submitSupport({
      name: form.name,
      email: form.email,
      subject: `Contact request from ${form.name || "Website user"}`,
      message: form.message,
    })
      .unwrap()
      .then((res) => {
        setOpen(false);
        setForm({ name: "", email: "", message: "" });
        const ticketId = res?.data?.ticket?.id;
        if (hasValidSession() && ticketId) {
          navigate(`/support/chat/${ticketId}`);
        }
      })
      .catch(() => { });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label="Open contact form"
          style={{
            position: "fixed",
            right: 0,
            top: "50%",
            transform: "translateY(-50%)",
            zIndex: 1100,
            background: "#0ea5e9",
            color: "#fff",
            border: "none",
            borderTopLeftRadius: 10,
            borderBottomLeftRadius: 10,
            padding: "10px 8px",
            boxShadow: "0 8px 20px rgba(0,0,0,.2)",
            cursor: "pointer",
          }}
        >
          <ChevronLeft size={18} />
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Contact Us</DialogTitle>
          <DialogDescription>Share your query and we will connect with you.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3">
          <Input
            required
            placeholder="Your name"
            value={form.name}
            onChange={(e) => onChange("name", e.target.value)}
          />
          <Input
            required
            type="email"
            placeholder="Your email"
            value={form.email}
            onChange={(e) => onChange("email", e.target.value)}
          />
          <Textarea
            required
            placeholder="Your message"
            className="min-h-[120px]"
            value={form.message}
            onChange={(e) => onChange("message", e.target.value)}
          />
          <DialogFooter>
            <Button type="submit" className="w-full sm:w-auto" disabled={isLoading}>
              <SendHorizontal className="w-4 h-4 mr-2" />
              {isLoading ? "Sending..." : "Send"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
