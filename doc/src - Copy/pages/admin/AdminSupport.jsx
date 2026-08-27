import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import GlobalPagination from "@/components/common/Pagination";
import {
  useGetAdminSupportTicketsQuery,
  useGetAdminSupportChatQuery,
  usePostAdminSupportChatMutation,
} from "@/store/api/supportApi";
import { useSupportChatWebSocket } from "@/hooks/useSupportChatWebSocket";
import { Loader2 } from "lucide-react";

const AdminSupport = () => {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const limit = 15;
  const { data, isLoading, refetch } = useGetAdminSupportTicketsQuery({ q: query, page, limit });
  const rows = data?.data?.rows || [];
  const pagination = data?.data?.pagination || { page: 1, total_pages: 1, total: 0 };

  const [selectedId, setSelectedId] = useState(null);
  const selected = rows.find((t) => t.id === selectedId) || null;

  const { data: chatData, isLoading: chatLoading, refetch: refetchChat } = useGetAdminSupportChatQuery(selectedId, {
    skip: !selectedId,
  });
  const [postChat, { isLoading: sending }] = usePostAdminSupportChatMutation();
  const [text, setText] = useState("");
  const [live, setLive] = useState([]);
  const bottomRef = useRef(null);

  const initial = chatData?.data?.messages || [];
  const merged = useMemo(() => {
    const byId = new Map();
    [...initial, ...live].forEach((m) => {
      if (m?.id) byId.set(m.id, m);
    });
    return Array.from(byId.values()).sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  }, [initial, live]);

  useEffect(() => {
    setLive([]);
    setText("");
  }, [selectedId]);

  useSupportChatWebSocket(selectedId, {
    enabled: !!selectedId,
    onReady: () => refetchChat(),
    onMessage: (msg) => setLive((prev) => [...prev, msg]),
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [merged.length]);

  useEffect(() => {
    if (!selectedId && rows.length) {
      setSelectedId(rows[0].id);
    }
  }, [rows, selectedId]);

  const onSend = async () => {
    const msg = text.trim();
    if (!msg || !selectedId) return;
    setText("");
    await postChat({ id: selectedId, message: msg }).unwrap();
    refetchChat();
    refetch();
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4">
          <Input
            placeholder="Search support tickets..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
          />
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-5 gap-4 lg:min-h-[520px] lg:items-stretch">
        <Card className="lg:col-span-2 border shadow-sm overflow-hidden flex flex-col min-h-0 max-h-[calc(100vh-10rem)]">
          <CardHeader className="py-3 border-b">
            <CardTitle className="text-base">Tickets</CardTitle>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-y-auto max-h-[520px]">
            {isLoading ? (
              <div className="p-4 space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : rows.length === 0 ? (
              <p className="text-sm text-muted-foreground p-4">No support tickets found.</p>
            ) : (
              rows.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSelectedId(t.id)}
                  className={`w-full text-left px-4 py-3 border-b text-sm hover:bg-muted/50 ${t.id === selectedId ? "bg-primary/10 border-l-4 border-l-primary" : ""
                    }`}
                >
                  <div className="font-medium line-clamp-2">{t.subject}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {t.name} · {t.status}
                  </div>
                </button>
              ))
            )}
            <div className="p-2 border-t flex justify-end">
              <GlobalPagination page={pagination.page || page} totalPages={pagination.total_pages || 1} onPageChange={setPage} />
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3 border shadow-sm flex flex-col overflow-hidden min-h-0 max-h-[calc(100vh-10rem)]">
          <CardHeader className="shrink-0 py-3 border-b bg-muted/30">
            <CardTitle className="text-base">{selected ? selected.subject : "Select a ticket"}</CardTitle>
            {selected ? (
              <p className="text-xs text-muted-foreground">
                {selected.name} ({selected.email}) — {selected.status}
              </p>
            ) : null}
          </CardHeader>
          <CardContent className="p-0 flex flex-1 flex-col min-h-0 overflow-hidden">
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 space-y-3 bg-muted/15 [scrollbar-gutter:stable]">
              {!selectedId ? (
                <p className="text-sm text-muted-foreground">Choose a ticket to view messages.</p>
              ) : chatLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-10 w-2/3" />
                  <Skeleton className="h-10 w-2/3 ml-auto" />
                </div>
              ) : merged.length === 0 ? (
                <p className="text-sm text-muted-foreground">No messages yet.</p>
              ) : (
                merged.map((m) => {
                  const admin = m.sender_role === "admin";
                  return (
                    <div key={m.id} className={`flex ${admin ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm shadow-sm ${admin ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-background border rounded-bl-sm"
                          }`}
                      >
                        <div className={`text-[10px] uppercase tracking-wide mb-0.5 ${admin ? "opacity-90" : "text-muted-foreground"}`}>
                          {m.display_name || (admin ? "Admin" : "User")}
                        </div>
                        <div className="whitespace-pre-wrap break-words">{m.body}</div>
                        <div className={`text-[10px] mt-1 ${admin ? "opacity-80" : "text-muted-foreground"}`}>
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
                className="resize-none"
                placeholder="Write a message…"
                value={text}
                disabled={!selectedId}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    onSend();
                  }
                }}
              />
              <Button className="self-end shrink-0" disabled={!selectedId || sending || !text.trim()} onClick={onSend}>
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminSupport;
