import { Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function SupportChatThread({
  messages,
  isLoading,
  loadingOlder,
  scrollRef,
  bottomRef,
  anchorRef,
  anchorMessageIndex,
  mineRole = "user",
  emptyText = "No messages yet.",
}) {
  return (
    <div
      ref={scrollRef}
      className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 space-y-3 bg-muted/20 [scrollbar-gutter:stable]"
    >
      {loadingOlder ? (
        <div className="flex justify-center py-2">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      ) : null}

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-10 w-2/3 ml-auto" />
        </div>
      ) : messages.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyText}</p>
      ) : (
        messages.map((m, index) => {
          const mine = m.sender_role === mineRole;
          const isAnchor = index === anchorMessageIndex;
          return (
            <div
              key={m.id}
              ref={isAnchor ? anchorRef : undefined}
              className={cn("flex", mine ? "justify-end" : "justify-start")}
            >
              <div
                className={cn(
                  "max-w-[85%] rounded-2xl px-3 py-2 text-sm shadow-sm",
                  mine
                    ? "bg-primary text-primary-foreground rounded-br-sm"
                    : "bg-background border rounded-bl-sm"
                )}
              >
                <div
                  className={cn(
                    "text-[10px] uppercase tracking-wide mb-0.5",
                    mine ? "opacity-90" : "text-muted-foreground"
                  )}
                >
                  {m.display_name || (mine ? "You" : mineRole === "user" ? "Admin" : "User")}
                </div>
                <div className="whitespace-pre-wrap break-words">{m.body}</div>
                <div
                  className={cn(
                    "text-[10px] mt-1",
                    mine ? "opacity-80" : "text-muted-foreground"
                  )}
                >
                  {m.created_at ? new Date(m.created_at).toLocaleString() : ""}
                </div>
              </div>
            </div>
          );
        })
      )}
      <div ref={bottomRef} />
    </div>
  );
}
