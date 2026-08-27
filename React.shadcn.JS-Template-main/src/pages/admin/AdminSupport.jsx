import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import GlobalPagination from "@/components/common/Pagination";
import {
  useGetAdminSupportTicketsQuery,
  useGetAdminSupportChatQuery,
  useLazyGetAdminSupportChatQuery,
  usePostAdminSupportChatMutation,
} from "@/store/api/supportApi";
import { useSupportChatWebSocket } from "@/hooks/useSupportChatWebSocket";
import { useSupportTypingIndicator } from "@/hooks/useSupportTypingIndicator";
import { useSupportChatMessages, SUPPORT_CHAT_PAGE_SIZE } from "@/hooks/useSupportChatMessages";
import { SupportTypingBar } from "@/components/support/SupportTypingBar";
import { SupportChatThread } from "@/components/support/SupportChatThread";
import { formatSupportTicketLabel } from "@/lib/supportTicketRef";
import { Loader2 } from "lucide-react";

const AdminSupport = () => {
  const [searchParams] = useSearchParams();
  const ticketFromUrl = searchParams.get("ticket");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const limit = 15;
  const { data, isLoading, refetch } = useGetAdminSupportTicketsQuery({ q: query, page, limit });
  const rows = data?.data?.rows || [];
  const pagination = data?.data?.pagination || { page: 1, total_pages: 1, total: 0 };

  const [selectedId, setSelectedId] = useState(null);
  const selected = rows.find((t) => t.id === selectedId) || null;

  const { data: chatData, isLoading: chatLoading, refetch: refetchChat } = useGetAdminSupportChatQuery(
    { id: selectedId, page: 1, limit: SUPPORT_CHAT_PAGE_SIZE },
    { skip: !selectedId }
  );
  const [fetchOlderPage] = useLazyGetAdminSupportChatQuery();
  const [postChat, { isLoading: sending }] = usePostAdminSupportChatMutation();
  const [text, setText] = useState("");
  const [live, setLive] = useState([]);

  const fetchOlder = useCallback(
    async (page) => {
      const res = await fetchOlderPage({
        id: selectedId,
        page,
        limit: SUPPORT_CHAT_PAGE_SIZE,
      }).unwrap();
      return res?.data || res;
    },
    [fetchOlderPage, selectedId]
  );

  const {
    merged,
    scrollRef,
    bottomRef,
    anchorRef,
    anchorMessageIndex,
    loadingOlder,
    scrollToBottom,
  } = useSupportChatMessages({
    ticketId: selectedId,
    initialPayload: chatData?.data,
    isInitialLoading: chatLoading,
    fetchOlderPage: fetchOlder,
    live,
    setLive,
  });

  useEffect(() => {
    setText("");
  }, [selectedId]);

  const typingHandlerRef = useRef(null);

  const { connected, sendTyping, sendTypingStop } = useSupportChatWebSocket(selectedId, {
    enabled: !!selectedId,
    onReady: () => refetchChat(),
    onMessage: (msg) => setLive((prev) => [...prev, msg]),
    onTyping: (payload) => typingHandlerRef.current?.(payload),
  });

  const { remoteTyping, handleRemoteTyping, notifyLocalTyping, stopLocalTyping } =
    useSupportTypingIndicator({ sendTyping, sendTypingStop });
  typingHandlerRef.current = handleRemoteTyping;

  useEffect(() => {
    if (ticketFromUrl) {
      setSelectedId(ticketFromUrl);
      return;
    }
    if (!selectedId && rows.length) {
      setSelectedId(rows[0].id);
    }
  }, [rows, selectedId, ticketFromUrl]);

  const onSend = async () => {
    const msg = text.trim();
    if (!msg || !selectedId) return;
    stopLocalTyping();
    setText("");
    await postChat({ id: selectedId, message: msg }).unwrap();
    await refetchChat();
    refetch();
    scrollToBottom("smooth");
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
                    {formatSupportTicketLabel(t) || "Ticket"} · {t.name} · {t.status}
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
                {formatSupportTicketLabel(selected) || "Ticket"} — {selected.name} ({selected.email}) — {selected.status}
              </p>
            ) : null}
          </CardHeader>
          <CardContent className="p-0 flex flex-1 flex-col min-h-0 overflow-hidden">
            {!selectedId ? (
              <div className="flex-1 min-h-0 flex items-center justify-center p-4">
                <p className="text-sm text-muted-foreground">Choose a ticket to view messages.</p>
              </div>
            ) : (
              <SupportChatThread
                messages={merged}
                isLoading={chatLoading}
                loadingOlder={loadingOlder}
                scrollRef={scrollRef}
                bottomRef={bottomRef}
                anchorRef={anchorRef}
                anchorMessageIndex={anchorMessageIndex}
                mineRole="admin"
              />
            )}
            <div className="shrink-0 p-3 border-t flex flex-col gap-2 bg-background">
              <SupportTypingBar remoteTyping={remoteTyping} connected={connected} />
              <div className="flex gap-2">
              <Textarea
                rows={2}
                className="resize-none"
                placeholder="Write a message…"
                value={text}
                disabled={!selectedId}
                onChange={(e) => {
                  setText(e.target.value);
                  if (e.target.value.trim()) notifyLocalTyping();
                  else stopLocalTyping();
                }}
                onBlur={stopLocalTyping}
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
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminSupport;
