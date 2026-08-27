import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetSupportChatQuery, usePostSupportChatMutation } from "@/store/api/supportApi";
import { useSupportChatWebSocket } from "@/hooks/useSupportChatWebSocket";
import { Loader2 } from "lucide-react";

export default function SupportChatPage() {
  const { ticketId } = useParams();
  const { data, isLoading, refetch } = useGetSupportChatQuery(ticketId, { skip: !ticketId });
  const [postMessage, { isLoading: sending }] = usePostSupportChatMutation();
  const [text, setText] = useState("");
  const [live, setLive] = useState([]);
  const bottomRef = useRef(null);

  const initial = data?.data?.messages || [];
  const merged = useMemo(() => {
    const byId = new Map();
    [...initial, ...live].forEach((m) => {
      if (m?.id) byId.set(m.id, m);
    });
    return Array.from(byId.values()).sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  }, [initial, live]);

  useEffect(() => {
    setLive([]);
  }, [ticketId]);

  useSupportChatWebSocket(ticketId, {
    enabled: !!ticketId,
    onReady: () => refetch(),
    onMessage: (msg) => setLive((prev) => [...prev, msg]),
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [merged.length]);

  const onSend = async () => {
    const msg = text.trim();
    if (!msg || !ticketId) return;
    setText("");
    await postMessage({ id: ticketId, message: msg }).unwrap();
    refetch();
  };

  return (
    <main className="pt-24 pb-16">
      <div className="max-w-2xl mx-auto px-4">
        <Card className="border shadow-sm overflow-hidden flex flex-col max-h-[calc(100vh-7rem)]">
          <CardHeader className="shrink-0 border-b bg-muted/40">
            <CardTitle className="text-lg">Support chat</CardTitle>
            <p className="text-sm text-muted-foreground">Ticket #{ticketId}</p>
          </CardHeader>
          <CardContent className="p-0 flex flex-col flex-1 min-h-0">
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 space-y-3 bg-muted/20 [scrollbar-gutter:stable]">
              {isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-10 w-3/4" />
                  <Skeleton className="h-10 w-2/3 ml-auto" />
                </div>
              ) : merged.length === 0 ? (
                <p className="text-sm text-muted-foreground">No messages yet.</p>
              ) : (
                merged.map((m) => {
                  const mine = m.sender_role === "user";
                  return (
                    <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm shadow-sm ${mine ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-background border rounded-bl-sm"
                          }`}
                      >
                        <div className={`text-[10px] uppercase tracking-wide mb-0.5 ${mine ? "opacity-90" : "text-muted-foreground"}`}>
                          {m.display_name || (mine ? "You" : "Admin")}
                        </div>
                        <div className="whitespace-pre-wrap break-words">{m.body}</div>
                        <div className={`text-[10px] mt-1 ${mine ? "opacity-80" : "text-muted-foreground"}`}>
                          {m.created_at ? new Date(m.created_at).toLocaleString() : ""}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={bottomRef} />
            </div>
            <div className="shrink-0 p-3 border-t flex gap-2 bg-background">
              <Textarea
                rows={2}
                className="resize-none min-h-[44px]"
                placeholder="Type a message…"
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    onSend();
                  }
                }}
              />
              <Button className="self-end shrink-0" onClick={onSend} disabled={sending || !text.trim()}>
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
