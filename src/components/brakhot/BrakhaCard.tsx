import { motion, AnimatePresence } from "framer-motion";
import type { BrakhaItem } from "@/lib/brakhot-data";

interface BrakhaCardProps {
  item: BrakhaItem;
  catId: string;
  isExpanded: boolean;
  isFavorite: boolean;
  onToggle: () => void;
  onToggleFavorite: () => void;
}

const BrakhaCard = ({ item, isExpanded, isFavorite, onToggle, onToggleFavorite }: BrakhaCardProps) => {
  return (
    <div
      className="rounded-xl border border-border overflow-hidden transition-all"
      style={{ background: isExpanded ? "hsl(var(--gold) / 0.04)" : "transparent" }}
    >
      <div className="flex items-center p-3 cursor-pointer" onClick={onToggle}>
        <span className="text-xl mr-2.5 shrink-0">{item.icon}</span>
        <span className="text-sm font-bold text-foreground flex-1">{item.name}</span>
        <button
          onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
          className="mr-2 text-base border-none bg-transparent cursor-pointer p-1 transition-transform active:scale-125"
          title={isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
        >
          {isFavorite ? "⭐" : "☆"}
        </button>
        <span className="text-[10px] text-muted-foreground">{isExpanded ? "▲" : "▼"}</span>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-4 space-y-4">
              {/* Brakha Rishona */}
              <div className="rounded-lg p-3 border border-primary/10" style={{ background: "hsl(var(--gold) / 0.06)" }}>
                <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: "hsl(var(--gold-matte))" }}>
                  Brakha Rishona (initiale)
                </p>
                <p
                  className="text-lg leading-[2.4] font-semibold text-right mb-2"
                  style={{
                    direction: "rtl",
                    fontFamily: "'Frank Ruhl Libre', 'Noto Serif Hebrew', serif",
                    fontFeatureSettings: "'kern', 'mark', 'mkmk'",
                    color: "hsl(var(--gold-matte))",
                  }}
                >
                  {item.rishona.hebrew}
                </p>
                <p className="text-xs text-foreground italic mb-1">{item.rishona.transliteration}</p>
                <p className="text-[11px] text-muted-foreground">{item.rishona.translation}</p>
              </div>

              {/* Brakha A'harona */}
              {item.aharona.hebrew && (
                <div className="rounded-lg p-3 border border-border" style={{ background: "hsl(var(--muted) / 0.3)" }}>
                  <p className="text-[10px] font-bold uppercase tracking-wider mb-2 text-foreground">
                    Brakha A'harona (finale) — {item.aharona.name}
                  </p>
                  {item.aharona.hebrew !== "Voir section Birkat HaMazone complète" ? (
                    <p
                      className="text-base leading-[2.4] font-semibold text-right mb-2"
                      style={{
                        direction: "rtl",
                        fontFamily: "'Frank Ruhl Libre', 'Noto Serif Hebrew', serif",
                        fontFeatureSettings: "'kern', 'mark', 'mkmk'",
                      }}
                    >
                      {item.aharona.hebrew}
                    </p>
                      {item.aharona.transliteration && (
                        <p className="text-xs text-foreground italic mb-1">{item.aharona.transliteration}</p>
                      )}
                    </>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">{item.aharona.translation}</p>
                  )}
                </div>
              )}

              {/* Shiur */}
              <div className="flex items-start gap-2 px-1">
                <span className="text-sm shrink-0">📏</span>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  <span className="font-bold text-foreground">Quantité (Chiour) :</span> {item.shiur}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default BrakhaCard;
