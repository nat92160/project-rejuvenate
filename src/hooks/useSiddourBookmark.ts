import { useCallback, useEffect, useRef } from "react";

const BOOKMARK_KEY = "siddour_bookmark_v1";

export interface SiddourBookmark {
  office: string;
  sectionIndex: number;
  scrollY: number;
  timestamp: number;
}

export function useSiddourBookmark() {
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const save = useCallback((office: string, sectionIndex: number) => {
    const scrollY = scrollRef.current?.scrollTop ?? window.scrollY;
    const bookmark: SiddourBookmark = { office, sectionIndex, scrollY, timestamp: Date.now() };
    try { localStorage.setItem(BOOKMARK_KEY, JSON.stringify(bookmark)); } catch { /* */ }
  }, []);

  const load = useCallback((): SiddourBookmark | null => {
    try {
      const raw = localStorage.getItem(BOOKMARK_KEY);
      if (!raw) return null;
      const bm = JSON.parse(raw) as SiddourBookmark;
      // Expire after 24h
      if (Date.now() - bm.timestamp > 24 * 60 * 60 * 1000) {
        localStorage.removeItem(BOOKMARK_KEY);
        return null;
      }
      return bm;
    } catch { return null; }
  }, []);

  const restoreScroll = useCallback((bookmark: SiddourBookmark) => {
    setTimeout(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = bookmark.scrollY;
      } else {
        window.scrollTo(0, bookmark.scrollY);
      }
    }, 300);
  }, []);

  const clear = useCallback(() => {
    localStorage.removeItem(BOOKMARK_KEY);
  }, []);

  // Auto-save on page unload
  const autoSaveRef = useRef<(() => void) | null>(null);

  const startAutoSave = useCallback((office: string, sectionIndex: number) => {
    autoSaveRef.current = () => save(office, sectionIndex);
  }, [save]);

  useEffect(() => {
    const handler = () => autoSaveRef.current?.();
    window.addEventListener("beforeunload", handler);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") autoSaveRef.current?.();
    });
    return () => {
      window.removeEventListener("beforeunload", handler);
    };
  }, []);

  return { save, load, restoreScroll, clear, scrollRef, startAutoSave };
}
