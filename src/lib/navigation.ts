export type BottomNavMode = "president" | "fidele";

export interface NavItem {
  id: string;
  icon: string;
  label: string;
  modes: BottomNavMode[];
}

export const NAV_ITEMS: NavItem[] = [
  { id: "dashboard", icon: "🏠", label: "Accueil", modes: ["fidele", "president"] },
  { id: "chabbat", icon: "🕯️", label: "Chabbat", modes: ["fidele", "president"] },
  { id: "zmanim", icon: "⏰", label: "Zmanim", modes: ["fidele", "president"] },
  { id: "synagogue", icon: "🏛️", label: "Synagogues", modes: ["fidele"] },
  { id: "siddour", icon: "📖", label: "Siddour", modes: ["fidele", "president"] },
  { id: "tehilimlibre", icon: "📜", label: "Tehilim", modes: ["fidele", "president"] },
  
  { id: "fetes", icon: "📅", label: "Fêtes", modes: ["fidele", "president"] },
  { id: "roshhodesh", icon: "🌙", label: "Roch Hodech", modes: ["fidele", "president"] },
  { id: "shabbatspec", icon: "✨", label: "Chabbatot", modes: ["fidele", "president"] },
  { id: "mariages", icon: "💍", label: "Mariages", modes: ["fidele", "president"] },
  { id: "convertisseur", icon: "🔄", label: "Convertir", modes: ["fidele", "president"] },
  { id: "mizrah", icon: "🧭", label: "Mizra'h", modes: ["fidele", "president"] },
  { id: "reveil", icon: "⏰", label: "Réveil", modes: ["fidele", "president"] },
  { id: "annonces", icon: "📢", label: "Annonces", modes: ["fidele", "president"] },
  { id: "refoua", icon: "🙏", label: "Refoua", modes: ["fidele", "president"] },
  { id: "minyan", icon: "👥", label: "Minyan", modes: ["fidele", "president"] },
  { id: "evenements", icon: "📅", label: "Événements", modes: ["fidele", "president"] },
  { id: "coursvirtuel", icon: "🎥", label: "Cours", modes: ["fidele", "president"] },
  { id: "affiche", icon: "📋", label: "Affiche", modes: ["president"] },
  { id: "horaires", icon: "🕐", label: "Horaires", modes: ["president"] },
  { id: "infosyna", icon: "🏛️", label: "Infos Syna", modes: ["president"] },
];

export const DEFAULT_BOTTOM_TABS_BY_MODE: Record<BottomNavMode, string[]> = {
  fidele: ["dashboard", "chabbat", "zmanim", "synagogue"],
  president: ["dashboard", "affiche", "infosyna", "annonces"],
};

export function getBottomNavStorageKey(mode: BottomNavMode) {
  return `calj_bottom_tabs:${mode}`;
}

export function getAvailableTabs(mode: BottomNavMode) {
  return NAV_ITEMS.filter((item) => item.modes.includes(mode));
}

export function sanitizeBottomTabs(selectedTabs: string[], mode: BottomNavMode) {
  const allowedIds = getAvailableTabs(mode).map((item) => item.id);
  const allowedSet = new Set(allowedIds);
  const uniqueSelected = selectedTabs.filter((id, index) => selectedTabs.indexOf(id) === index);
  const sanitized = uniqueSelected.filter((id) => allowedSet.has(id)).slice(0, 4);

  if (sanitized.length > 0) {
    return sanitized;
  }

  return DEFAULT_BOTTOM_TABS_BY_MODE[mode].filter((id) => allowedSet.has(id)).slice(0, 4);
}
