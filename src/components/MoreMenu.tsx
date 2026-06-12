import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { usePendingRequests } from "@/hooks/usePendingRequests";
import { type BottomNavMode } from "@/lib/navigation";
import { clearAllCaches } from "@/lib/cacheUtils";
import { toast } from "sonner";
import AuthModal from "@/components/AuthModal";
import BottomNavCustomizer from "@/components/BottomNavCustomizer";

interface MoreMenuProps {
  isOpen: boolean;
  mode: BottomNavMode;
  onClose: () => void;
  onNavigate: (tab: string) => void;
}

/** Catégorisation pro des fonctions secondaires de l'app. */
const CATEGORIES: Array<{
  id: string;
  title: string;
  icon: string;
  items: Array<{ id: string; icon: string; label: string; keywords?: string }>;
}> = [
  {
    id: "priere",
    title: "Prière",
    icon: "🙏",
    items: [
      { id: "siddour", icon: "📖", label: "Siddour", keywords: "prière office tefila" },
      { id: "tehilimlibre", icon: "📜", label: "Tehilim", keywords: "psaumes" },
      { id: "refoua", icon: "🙏", label: "Refoua", keywords: "guérison malade" },
      { id: "brakhot", icon: "🙌", label: "Brakhot", keywords: "bénédictions" },
      { id: "zoharbrit", icon: "📖", label: "Zohar de la Brit", keywords: "zohar brit mila veille milah" },
    ],
  },
  {
    id: "calendrier",
    title: "Calendrier",
    icon: "📅",
    items: [
      { id: "fetes", icon: "🎉", label: "Fêtes", keywords: "yom tov pessah pourim" },
      { id: "roshhodesh", icon: "🌙", label: "Roch Hodech", keywords: "nouveau mois" },
      { id: "shabbatspec", icon: "✨", label: "Chabbatot spéciaux" },
      { id: "mariages", icon: "💍", label: "Mariages & Hazkara" },
      { id: "convertisseur", icon: "🔄", label: "Convertir une date", keywords: "hébraïque civil" },
    ],
  },
  {
    id: "outils",
    title: "Outils",
    icon: "🛠️",
    items: [
      { id: "mizrah", icon: "🧭", label: "Mizra'h", keywords: "direction jérusalem boussole" },
      { id: "reveil", icon: "🔔", label: "Réveil & Alarme" },
    ],
  },
  {
    id: "communaute",
    title: "Communauté",
    icon: "🤝",
    items: [
      { id: "annonces", icon: "📢", label: "Annonces" },
      { id: "evenements", icon: "📅", label: "Évènements" },
      { id: "coursvirtuel", icon: "🎥", label: "Cours de Torah", keywords: "zoom vidéo" },
      { id: "minyan", icon: "🚨", label: "Urgence Minyan", keywords: "quorum prière" },
    ],
  },
  {
    id: "perso",
    title: "Mon espace",
    icon: "👤",
    items: [
      { id: "perso", icon: "👤", label: "Espace personnel", keywords: "dates azkara anniversaire" },
    ],
  },
];

const MoreMenu = ({ isOpen, onClose, onNavigate }: MoreMenuProps) => {
  const { user, isAdmin, signOut } = useAuth();
  const pendingCount = usePendingRequests();
  const [authOpen, setAuthOpen] = useState(false);
  const [customizerOpen, setCustomizerOpen] = useState(false);
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return CATEGORIES;
    return CATEGORIES.map((cat) => ({
      ...cat,
      items: cat.items.filter((it) =>
        (it.label + " " + (it.keywords || "")).toLowerCase().includes(q),
      ),
    })).filter((cat) => cat.items.length > 0);
  }, [query]);

  const toggleAccount = (checked: boolean) => {
    if (checked) {
      setAuthOpen(true);
    } else {
      void signOut();
    }
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-[200] bottom-sheet-backdrop"
              style={{ background: "hsl(var(--navy) / 0.25)" }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
            />

            <motion.div
              className="fixed bottom-0 left-0 right-0 z-[210] overflow-y-auto rounded-t-3xl"
              style={{
                background: "hsl(var(--card))",
                borderTop: "2px solid hsl(var(--gold) / 0.15)",
                maxHeight: "85vh",
                padding: "20px 20px calc(20px + env(safe-area-inset-bottom, 0px))",
                boxShadow: "var(--shadow-elevated)",
                WebkitOverflowScrolling: "touch",
                overscrollBehavior: "contain",
              }}
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
            >
              <div className="mb-4 flex justify-center">
                <div className="h-1 w-10 rounded-full bg-border" />
              </div>

              <div className="mb-4 flex items-center justify-between border-b border-border pb-3">
                <h2 className="font-display text-lg font-bold text-foreground">Menu</h2>
                <button
                  onClick={onClose}
                  className="flex items-center justify-center rounded-full border-none bg-muted text-lg text-muted-foreground cursor-pointer"
                  style={{ width: 44, height: 44, WebkitTapHighlightColor: "transparent" }}
                >
                  ✕
                </button>
              </div>

              {/* Personnaliser la barre menu */}
              <button
                onClick={() => setCustomizerOpen(true)}
                className="mb-4 w-full flex items-center gap-3 rounded-xl border px-4 py-3 text-left cursor-pointer transition-all"
                style={{
                  background: "hsl(var(--gold) / 0.06)",
                  borderColor: "hsl(var(--gold) / 0.25)",
                }}
              >
                <span className="text-xl">✏️</span>
                <div className="flex-1">
                  <div className="text-sm font-bold text-foreground">Personnaliser la barre menu</div>
                  <div className="text-[11px] text-muted-foreground">Choisis tes 3 widgets favoris</div>
                </div>
              </button>

              {/* Recherche instantanée */}
              <div className="mb-4 relative">
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="🔎 Rechercher une fonction…"
                  className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  style={{ fontSize: 16 }}
                />
              </div>

              {/* Sections catégorisées */}
              <div className="space-y-5">
                {filtered.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground py-8">
                    Aucune fonction ne correspond.
                  </p>
                ) : (
                  filtered.map((cat) => (
                    <div key={cat.id}>
                      <div className="flex items-center gap-2 mb-2 px-1">
                        <span className="text-base">{cat.icon}</span>
                        <h3 className="text-[11px] uppercase tracking-[2px] font-bold text-muted-foreground">
                          {cat.title}
                        </h3>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {cat.items.map((item) => (
                          <button
                            key={item.id}
                            onClick={() => onNavigate(item.id)}
                            className="flex min-h-[88px] flex-col items-center justify-center gap-2 rounded-2xl border border-border bg-card px-2 py-3 text-center cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/20 hover:bg-muted active:scale-95"
                          >
                            <span className="text-2xl">{item.icon}</span>
                            <span className="text-[11px] font-medium leading-tight text-foreground">{item.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Admin link */}
              {user && isAdmin && (
                <button
                  onClick={() => { onClose(); navigate("/admin"); }}
                  className="mt-5 w-full flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-left cursor-pointer transition-all hover:border-primary/30 relative"
                >
                  <span className="text-xl">🛡️</span>
                  <div className="flex-1">
                    <div className="text-sm font-bold text-foreground">Administration</div>
                    <div className="text-[11px] text-muted-foreground">Gérer les demandes de présidents</div>
                  </div>
                  {pendingCount > 0 && (
                    <span className="h-6 min-w-[24px] flex items-center justify-center rounded-full bg-destructive text-[11px] font-bold text-destructive-foreground px-1.5 animate-pulse">
                      {pendingCount}
                    </span>
                  )}
                </button>
              )}

              {/* Account switch */}
              <div className="mt-5 space-y-3 border-t border-border pt-4">
                {/* Clear cache button */}
                <button
                  onClick={async () => {
                    try {
                      await clearAllCaches();
                      toast.success("✅ Cache vidé avec succès !");
                      setTimeout(() => window.location.reload(), 800);
                    } catch {
                      toast.error("Erreur lors du vidage du cache");
                    }
                  }}
                  className="w-full flex items-center gap-3 rounded-xl border border-border bg-muted/50 px-4 py-3 text-left cursor-pointer transition-all hover:border-primary/20"
                >
                  <span className="text-sm">🗑️</span>
                  <div>
                    <div className="text-xs font-bold text-foreground">Vider le cache</div>
                    <div className="text-[10px] text-muted-foreground">Forcer le rechargement des données</div>
                  </div>
                </button>

                {/* Account toggle */}
                <div className="rounded-xl border border-border bg-muted/50 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm">👤</span>
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-foreground">Compte</span>
                        {user && (
                          <p className="truncate text-[10px] text-muted-foreground">
                            {user.user_metadata?.full_name || user.email?.split("@")[0] || "Connecté"}
                          </p>
                        )}
                      </div>
                    </div>
                    <label className="relative inline-flex cursor-pointer items-center">
                      <input
                        type="checkbox"
                        checked={!!user}
                        onChange={(event) => toggleAccount(event.target.checked)}
                        className="peer sr-only"
                      />
                      <div className="h-5 w-9 rounded-full bg-border transition-colors peer-checked:bg-primary after:absolute after:left-[2px] after:top-0.5 after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full" />
                    </label>
                  </div>
                </div>

              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
      <BottomNavCustomizer open={customizerOpen} onClose={() => setCustomizerOpen(false)} />
    </>
  );
};

export default MoreMenu;
