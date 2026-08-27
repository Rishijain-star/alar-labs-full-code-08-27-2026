import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export const SUPPORT_CHAT_PAGE_SIZE = 50;
/** When the 5th message from the top is visible, load the next older page (50 − 45 = 5). */
export const SUPPORT_CHAT_LOAD_OLDER_INDEX = 4;

function mergeMessages(chunks, live) {
  const byId = new Map();
  for (const chunk of chunks) {
    for (const m of chunk) {
      if (m?.id) byId.set(m.id, m);
    }
  }
  for (const m of live) {
    if (m?.id) byId.set(m.id, m);
  }
  return Array.from(byId.values()).sort(
    (a, b) => new Date(a.created_at) - new Date(b.created_at)
  );
}

/**
 * Paginated support chat: newest 50 first, older pages prepended on scroll-up.
 */
export function useSupportChatMessages({
  ticketId,
  initialPayload,
  isInitialLoading,
  fetchOlderPage,
  live,
  setLive,
}) {
  const [chunks, setChunks] = useState([]);
  const [loadedPage, setLoadedPage] = useState(1);
  const [hasOlder, setHasOlder] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);

  const scrollRef = useRef(null);
  const bottomRef = useRef(null);
  const anchorRef = useRef(null);
  const loadOlderLock = useRef(false);
  const didInitialScroll = useRef(false);
  const prevLiveLen = useRef(0);

  useEffect(() => {
    setChunks([]);
    setLoadedPage(1);
    setHasOlder(false);
    setLoadingOlder(false);
    setLive([]);
    loadOlderLock.current = false;
    didInitialScroll.current = false;
    prevLiveLen.current = 0;
  }, [ticketId, setLive]);

  useEffect(() => {
    if (!initialPayload?.messages) return;
    setChunks((prev) => {
      if (prev.length === 0) return [initialPayload.messages];
      return [...prev.slice(0, -1), initialPayload.messages];
    });
  }, [ticketId, initialPayload]);

  useEffect(() => {
    if (!initialPayload?.pagination || chunks.length > 1) return;
    setHasOlder(!!initialPayload.pagination.has_older);
  }, [initialPayload, chunks.length]);

  const merged = useMemo(() => mergeMessages(chunks, live), [chunks, live]);

  const scrollToBottom = useCallback((behavior = "auto") => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior });
  }, []);

  const isNearBottom = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  }, []);

  const loadOlder = useCallback(async () => {
    if (!ticketId || !hasOlder || loadingOlder || loadOlderLock.current) return;
    loadOlderLock.current = true;
    setLoadingOlder(true);

    const scrollEl = scrollRef.current;
    const prevHeight = scrollEl?.scrollHeight ?? 0;
    const prevTop = scrollEl?.scrollTop ?? 0;

    try {
      const nextPage = loadedPage + 1;
      const payload = await fetchOlderPage(nextPage);
      const older = payload?.messages || [];
      const pagination = payload?.pagination;

      setChunks((prev) => [older, ...prev]);
      setLoadedPage(nextPage);
      setHasOlder(!!pagination?.has_older);

      requestAnimationFrame(() => {
        if (scrollEl) {
          scrollEl.scrollTop = prevTop + (scrollEl.scrollHeight - prevHeight);
        }
      });
    } finally {
      setLoadingOlder(false);
      loadOlderLock.current = false;
    }
  }, [ticketId, hasOlder, loadingOlder, loadedPage, fetchOlderPage]);

  useEffect(() => {
    if (isInitialLoading || !merged.length || didInitialScroll.current) return;
    scrollToBottom();
    didInitialScroll.current = true;
  }, [isInitialLoading, merged.length, ticketId, scrollToBottom]);

  useEffect(() => {
    if (!didInitialScroll.current) return;
    if (live.length > prevLiveLen.current && isNearBottom()) {
      scrollToBottom("smooth");
    }
    prevLiveLen.current = live.length;
  }, [live.length, isNearBottom, scrollToBottom]);

  useEffect(() => {
    const root = scrollRef.current;
    const anchor = anchorRef.current;
    if (!root || !anchor || !hasOlder || loadingOlder) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadOlder();
      },
      { root, threshold: 0.1 }
    );
    observer.observe(anchor);
    return () => observer.disconnect();
  }, [hasOlder, loadingOlder, loadOlder, merged.length]);

  const anchorMessageIndex =
    merged.length > SUPPORT_CHAT_LOAD_OLDER_INDEX ? SUPPORT_CHAT_LOAD_OLDER_INDEX : -1;

  return {
    merged,
    scrollRef,
    bottomRef,
    anchorRef,
    anchorMessageIndex,
    loadingOlder,
    hasOlder,
    scrollToBottom,
  };
}
