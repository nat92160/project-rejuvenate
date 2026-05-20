import { useEffect, useState, useCallback } from "react";

export interface BottomNavOption {
  id: string;
  icon: string;
  label: string;
}

/** Catalogue de widgets sélectionnables pour la barre du bas. */
export const BOTTOM_NAV_OPTIONS: BottomNavOption[] = [
  { id: "dashboard", icon: "🏠", label: "Accueil" },
  { id: "synagogue", icon: "🏛️", label: "Ma Syna" },
  { id: "chabbat", icon: "🕯️", label: "Chabbat" },
  { id: "zmanim", icon: "🌅", label: "Zmanim" },
  { id: "siddour", icon: "📖", label: "Siddour" },
  { id: "tehilim", icon: "📜", label: "Tehilim" },
  { id: "refoua", icon: "🙏", label: "Refoua" },
  { id: "minyan", icon: "🚨", label: "Minyan" },
  { id: "perso", icon: "👤", label: "Mon espace" },
  { id: "mizrah", icon: "🧭", label: "Mizra'h" },
  { id: "fetes", icon: "🎉", label: "Fêtes" },
  { id: "brakhot", icon: "🙌", label: "Brakhot" },
  { id: "annonces", icon: "📢", label: "Annonces" },
  { id: "evenements", icon: "📅", label: "Évènements" },
  { id: "coursvirtuel", icon: "🎥", label: "Cours" },
  { id: "reveil", icon: "🔔", label: "Réveil" },
];

const STORAGE_KEY = "bottomnav_custom_v1";
export const DEFAULT_TABS: string[] = ["dashboard", "synagogue", "chabbat"];

function readStored(): string[] {
  if (typeof window === "undefined") return DEFAULT_TABS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_TABS;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length !== 3) return DEFAULT_TABS;
    const valid = parsed.filter((id) => BOTTOM_NAV_OPTIONS.some((o) => o.id === id));
    if (valid.length !== 3) return DEFAULT_TABS;
    return valid;
  } catch {
    return DEFAULT_TABS;
  }
}

export function useCustomBottomTabs() {
  const [tabs, setTabs] = useState<string[]>(() => readStored());

  useEffect(() => {
    const onChange = () => setTabs(readStored());
    window.addEventListener("bottomnav-changed", onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener("bottomnav-changed", onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  const save = useCallback((next: string[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch { /* ignore */ }
    setTabs(next);
    window.dispatchEvent(new CustomEvent("bottomnav-changed"));
  }, []);

  return { tabs, save };
}

export function getOption(id: string): BottomNavOption | undefined {
  return BOTTOM_NAV_OPTIONS.find((o) => o.id === id);
}
