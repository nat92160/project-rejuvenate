import { useState, useMemo } from "react";
import { Search, X } from "lucide-react";

interface Section {
  index: number;
  title: string;
  heTitle: string;
}

interface SiddourSearchProps {
  sections: Section[];
  onSelect: (index: number) => void;
  prayerMode?: boolean;
}

const SiddourSearch = ({ sections, onSelect, prayerMode = false }: SiddourSearchProps) => {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return sections.filter(
      s => s.title.toLowerCase().includes(q) || s.heTitle.includes(query)
    );
  }, [query, sections]);

  const pmCard = prayerMode ? "#111" : undefined;
  const pmText = prayerMode ? "#e8e0d0" : undefined;
  const pmMuted = prayerMode ? "#999" : undefined;
  const pmBorder = prayerMode ? "rgba(255,255,255,0.08)" : undefined;

  return (
    <div className="relative">
      <div
        className="flex items-center gap-2 rounded-xl border px-3 py-2 transition-all"
        style={{
          background: prayerMode ? "rgba(255,255,255,0.05)" : "hsl(var(--muted) / 0.5)",
          borderColor: open ? "hsl(var(--gold) / 0.3)" : (pmBorder || "hsl(var(--border) / 0.5)"),
        }}
      >
        <Search className="w-3.5 h-3.5 shrink-0" style={{ color: pmMuted || "hsl(var(--muted-foreground))" }} />
        <input
          type="text"
          placeholder="Rechercher une prière…"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          className="flex-1 bg-transparent border-none outline-none text-xs"
          style={{ color: pmText || "hsl(var(--foreground))" }}
        />
        {query && (
          <button onClick={() => { setQuery(""); setOpen(false); }} className="bg-transparent border-none cursor-pointer p-0">
            <X className="w-3.5 h-3.5" style={{ color: pmMuted || "hsl(var(--muted-foreground))" }} />
          </button>
        )}
      </div>

      {open && query && (
        <div
          className="absolute top-full left-0 right-0 mt-1 rounded-xl border shadow-lg z-40 max-h-[200px] overflow-y-auto"
          style={{
            background: prayerMode ? "#1a1a1a" : "hsl(var(--card))",
            borderColor: pmBorder || "hsl(var(--border))",
          }}
        >
          {results.length === 0 ? (
            <p className="p-3 text-xs text-center" style={{ color: pmMuted }}>Aucun résultat</p>
          ) : (
            results.map(sec => (
              <button
                key={sec.index}
                onClick={() => { onSelect(sec.index); setQuery(""); setOpen(false); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-left bg-transparent border-none cursor-pointer transition-colors hover:bg-black/5"
                style={{ borderBottom: `1px solid ${pmBorder || "hsl(var(--border) / 0.3)"}` }}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold" style={{ color: pmText }}>{sec.title}</p>
                  <p className="text-[10px]" style={{ fontFamily: "'Frank Ruhl Libre', serif", color: pmMuted }}>{sec.heTitle}</p>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default SiddourSearch;
