import { useCallback, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  useGetSupportChatQuery,
  useLazyGetSupportChatQuery,
  usePostSupportChatMutation,
} from "@/store/api/supportApi";
import { useSupportChatWebSocket } from "@/hooks/useSupportChatWebSocket";
import { useSupportTypingIndicator } from "@/hooks/useSupportTypingIndicator";
import { useSupportChatMessages, SUPPORT_CHAT_PAGE_SIZE } from "@/hooks/useSupportChatMessages";
import { SupportTypingBar } from "@/components/support/SupportTypingBar";
import { SupportChatThread } from "@/components/support/SupportChatThread";
import { getSupportTicketLabel } from "@/lib/supportTicketRef";
import { Loader2 } from "lucide-react";
import { useSiteTopbar } from "@/hooks/useSiteTopbar";
import { siteViewportBelowNavHeightClass } from "@/lib/siteHeaderLayout";
import { cn } from "@/lib/utils";

export default function SupportChatPage() {
  const topbar = useSiteTopbar();
  const { ticketId } = useParams();
  const { data, isLoading, refetch } = useGetSupportChatQuery(
    { id: ticketId, page: 1, limit: SUPPORT_CHAT_PAGE_SIZE },
    { skip: !ticketId }
  );
  const [fetchOlderPage] = useLazyGetSupportChatQuery();
  const [postMessage, { isLoading: sending }] = usePostSupportChatMutation();
  const [text, setText] = useState("");
  const [live, setLive] = useState([]);

  const fetchOlder = useCallback(
    async (page) => {
      const res = await fetchOlderPage({
        id: ticketId,
        page,
        limit: SUPPORT_CHAT_PAGE_SIZE,
      }).unwrap();
      return res?.data || res;
    },
    [fetchOlderPage, ticketId]
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
    ticketId,
    initialPayload: data?.data,
    isInitialLoading: isLoading,
    fetchOlderPage: fetchOlder,
    live,
    setLive,
  });

  const typingHandlerRef = useRef(null);

  const { connected, sendTyping, sendTypingStop } = useSupportChatWebSocket(ticketId, {
    enabled: !!ticketId,
    onReady: () => refetch(),
    onMessage: (msg) => setLive((prev) => [...prev, msg]),
    onTyping: (payload) => typingHandlerRef.current?.(payload),
  });

  const { remoteTyping, handleRemoteTyping, notifyLocalTyping, stopLocalTyping } =
    useSupportTypingIndicator({ sendTyping, sendTypingStop });
  typingHandlerRef.current = handleRemoteTyping;

  const ticketLabel = getSupportTicketLabel(data?.data?.ticket);

  const onSend = async () => {
    const msg = text.trim();
    if (!msg || !ticketId) return;
    stopLocalTyping();
    setText("");
    await postMessage({ id: ticketId, message: msg }).unwrap();
    await refetch();
    scrollToBottom("smooth");
  };

  return (
    <main className={cn("flex flex-col overflow-hidden", siteViewportBelowNavHeightClass(topbar.visible))}>
      <div className="flex-1 min-h-0 max-w-2xl mx-auto px-4 w-full pb-4">
        <Card className="h-full border shadow-sm overflow-hidden flex flex-col">
          <CardHeader className="shrink-0 border-b bg-muted/40">
            <CardTitle className="text-lg">Support chat</CardTitle>
            <p className="text-sm text-muted-foreground">{ticketLabel}</p>
          </CardHeader>
          <CardContent className="p-0 flex flex-col flex-1 min-h-0 overflow-hidden">
            <SupportChatThread
              messages={merged}
              isLoading={isLoading}
              loadingOlder={loadingOlder}
              scrollRef={scrollRef}
              bottomRef={bottomRef}
              anchorRef={anchorRef}
              anchorMessageIndex={anchorMessageIndex}
              mineRole="user"
            />
            <div className="shrink-0 p-3 border-t flex flex-col gap-2 bg-background">
              <SupportTypingBar remoteTyping={remoteTyping} connected={connected} />
              <div className="flex gap-2">
                <Textarea
                  rows={2}
                  className="resize-none min-h-[44px]"
                  placeholder="Type a message…"
                  value={text}
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
                <Button className="self-end shrink-0" onClick={onSend} disabled={sending || !text.trim()}>
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
