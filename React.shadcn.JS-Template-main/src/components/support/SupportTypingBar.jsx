export function SupportTypingBar({ remoteTyping, connected }) {
  if (!connected) {
    return (
      <p className="text-[11px] text-muted-foreground px-1 min-h-[16px]">Connecting to live chat…</p>
    );
  }
  if (!remoteTyping) {
    return <div className="min-h-[16px]" aria-hidden />;
  }
  return (
    <p className="text-[11px] text-muted-foreground px-1 min-h-[16px] animate-pulse">
      {remoteTyping.displayName} is typing…
    </p>
  );
}
