import { useState, useCallback, useEffect } from "react";

const FAV_KEY = "siddour_favorites_v1";

export interface SiddourFavorite {
  office: string;
  sectionIndex: number;
  title: string;
  heTitle: string;
}

export function useSiddourFavorites() {
  const [favorites, setFavorites] = useState<SiddourFavorite[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(FAV_KEY);
      if (raw) setFavorites(JSON.parse(raw));
    } catch { /* */ }
  }, []);

  const persist = useCallback((favs: SiddourFavorite[]) => {
    setFavorites(favs);
    try { localStorage.setItem(FAV_KEY, JSON.stringify(favs)); } catch { /* */ }
  }, []);

  const toggle = useCallback((fav: SiddourFavorite) => {
    setFavorites(prev => {
      const exists = prev.some(f => f.office === fav.office && f.sectionIndex === fav.sectionIndex);
      const next = exists
        ? prev.filter(f => !(f.office === fav.office && f.sectionIndex === fav.sectionIndex))
        : [...prev, fav];
      try { localStorage.setItem(FAV_KEY, JSON.stringify(next)); } catch { /* */ }
      return next;
    });
  }, []);

  const isFavorite = useCallback((office: string, sectionIndex: number) => {
    return favorites.some(f => f.office === office && f.sectionIndex === sectionIndex);
  }, [favorites]);

  return { favorites, toggle, isFavorite };
}
