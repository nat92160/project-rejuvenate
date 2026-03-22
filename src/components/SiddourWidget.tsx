import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Slider } from "@/components/ui/slider";

type Office = "shacharit" | "minha" | "arvit" | "shabbat" | "hallel" | "birkat" | "kaddish";

interface Section {
  index: number;
  title: string;
  heTitle: string;
}

interface SectionContent {
  hebrew: string[];
  french: string[];
  title: string;
  heTitle: string;
}

const OFFICES: { key: Office; label: string; icon: string }[] = [
  { key: "shacharit", label: "Cha'harit", icon: "🌅" },
  { key: "minha", label: "Min'ha", icon: "🌇" },
  { key: "arvit", label: "Arvit", icon: "🌙" },
  { key: "shabbat", label: "Chabbat", icon: "🕯️" },
  { key: "hallel", label: "Hallel", icon: "🎶" },
  { key: "birkat", label: "Birkat", icon: "🍞" },
  { key: "kaddish", label: "Kaddich", icon: "📜" },
];

const CACHE_PREFIX = "siddour_v5_";

const SiddourWidget = () => {
  const [office, setOffice] = useState<Office>("shacharit");
  const [sections, setSections] = useState<Section[]>([]);
  const [activeSection, setActiveSection] = useState<number | null>(null);
  const [content, setContent] = useState<SectionContent | null>(null);
  const [loading, setLoading] = useState(false);
  const [tocLoading, setTocLoading] = useState(true);
  const [fontSize, setFontSize] = useState(22);
  const [showFrench, setShowFrench] = useState(false);

  const fetchToc = useCallback(async (off: Office) => {
    setTocLoading(true);
    setSections([]);
    setActiveSection(null);
    setContent(null);

    const cacheKey = `${CACHE_PREFIX}toc_${off}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        setSections(JSON.parse(cached));
        setTocLoading(false);
        return;
      } catch { /* ignore */ }
    }

    try {
      const { data, error } = await supabase.functions.invoke("get-siddour", { body: { office: off } });
      if (error) throw error;
      if (data?.sections) {
        setSections(data.sections);
        try { localStorage.setItem(cacheKey, JSON.stringify(data.sections)); } catch { /* */ }
      }
    } catch (err) {
      console.error("Error fetching siddour toc:", err);
    }
    setTocLoading(false);
  }, []);

  const fetchSection = useCallback(async (off: Office, idx: number) => {
    setLoading(true);
    setContent(null);

    const cacheKey = `${CACHE_PREFIX}${off}_${idx}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        setContent(JSON.parse(cached));
        setLoading(false);
        return;
      } catch { /* ignore */ }
    }

    try {
      const { data, error } = await supabase.functions.invoke("get-siddour", { body: { office: off, section: idx } });
      if (error) throw error;
      if (data?.hebrew) {
        const c: SectionContent = { hebrew: data.hebrew, french: data.french || [], title: data.title, heTitle: data.heTitle };
        setContent(c);
        try { localStorage.setItem(cacheKey, JSON.stringify(c)); } catch { /* */ }
      }
    } catch (err) {
      console.error("Error fetching section:", err);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchToc(office); }, [office, fetchToc]);
  useEffect(() => { if (activeSection !== null) fetchSection(office, activeSection); }, [activeSection, office, fetchSection]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      {/* Header */}
      <div className="rounded-2xl border border-primary/15 p-5 text-center" style={{ background: "linear-gradient(135deg, hsl(var(--gold) / 0.08), hsl(var(--gold) / 0.02))" }}>
        <span className="text-3xl">📖</span>
        <h3 className="mt-2 font-display text-lg font-bold text-foreground">Siddour Complet</h3>
        <p className="mt-1 text-xs text-muted-foreground">Navigation libre — Hébreu & Traduction</p>
      </div>

      {/* Office selector — scrollable row */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {OFFICES.map((off) => (
          <button
            key={off.key}
            onClick={() => { setOffice(off.key); setActiveSection(null); }}
            className="shrink-0 flex items-center gap-1 rounded-xl border-none px-3 py-2 text-[10px] font-bold transition-all cursor-pointer active:scale-95 whitespace-nowrap"
            style={{
              background: office === off.key ? "var(--gradient-gold)" : "hsl(var(--muted))",
              color: office === off.key ? "hsl(var(--primary-foreground))" : "hsl(var(--muted-foreground))",
              boxShadow: office === off.key ? "var(--shadow-gold)" : "none",
            }}
          >
            <span>{off.icon}</span>
            <span>{off.label}</span>
          </button>
        ))}
      </div>

      {/* Font size slider + translation toggle */}
      <div className="rounded-2xl border border-border bg-card p-3" style={{ boxShadow: "var(--shadow-card)" }}>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground font-bold">A-</span>
          <Slider value={[fontSize]} onValueChange={(v) => setFontSize(v[0])} min={16} max={36} step={1} className="flex-1" />
          <span className="text-sm font-bold text-muted-foreground">A+</span>
          <button
            onClick={() => setShowFrench(!showFrench)}
            className="ml-1 shrink-0 rounded-xl border px-3 py-1.5 text-[10px] font-bold cursor-pointer transition-all active:scale-95"
            style={{
              borderColor: showFrench ? "hsl(var(--gold-matte))" : "hsl(var(--border))",
              background: showFrench ? "hsl(var(--gold) / 0.1)" : "transparent",
              color: showFrench ? "hsl(var(--gold-matte))" : "hsl(var(--muted-foreground))",
            }}
          >
            🇫🇷 Trad.
          </button>
        </div>
      </div>

      {/* Table of Contents or Reading content */}
      <AnimatePresence mode="wait">
        {activeSection === null ? (
          <motion.div key="toc" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2">
            {tocLoading ? (
              <div className="py-10 text-center text-sm text-muted-foreground">Chargement du sommaire…</div>
            ) : sections.length === 0 ? (
              <div className="rounded-2xl border border-border bg-card p-8 text-center" style={{ boxShadow: "var(--shadow-card)" }}>
                <span className="text-4xl">📖</span>
                <p className="mt-3 text-sm text-muted-foreground">Aucune section disponible.</p>
              </div>
            ) : (
              sections.map((sec, i) => (
                <motion.button
                  key={sec.index}
                  onClick={() => setActiveSection(sec.index)}
                  className="w-full flex items-center gap-4 rounded-2xl border border-border bg-card p-4 text-left cursor-pointer transition-all hover:border-primary/20 hover:-translate-y-0.5 active:scale-[0.98]"
                  style={{ boxShadow: "var(--shadow-card)" }}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold" style={{ background: "linear-gradient(135deg, hsl(var(--gold) / 0.15), hsl(var(--gold) / 0.05))", color: "hsl(var(--gold-matte))" }}>
                    {i + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-sm font-bold text-foreground">{sec.title}</p>
                    <p className="text-xs text-muted-foreground" style={{ fontFamily: "'Frank Ruhl Libre', serif" }}>{sec.heTitle}</p>
                  </div>
                  <span className="text-muted-foreground/50">›</span>
                </motion.button>
              ))
            )}
          </motion.div>
        ) : (
          <motion.div key="content" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <button
              onClick={() => { setActiveSection(null); setContent(null); }}
              className="flex items-center gap-2 mb-4 text-sm font-bold text-primary bg-transparent border-none cursor-pointer hover:underline"
            >
              ← Sommaire
            </button>

            {loading ? (
              <div className="py-10 text-center text-sm text-muted-foreground">Chargement du texte…</div>
            ) : content ? (
              <div className="rounded-2xl border border-border p-6 px-7" style={{ boxShadow: "var(--shadow-card)", background: "#FDFDFD" }}>
                <h4 className="text-center font-display text-base font-bold text-foreground mb-0.5">{content.title}</h4>
                <p className="text-center text-lg text-muted-foreground mb-6" style={{ fontFamily: "'Frank Ruhl Libre', serif" }}>{content.heTitle}</p>

                <div dir="rtl" style={{ fontFamily: "'Frank Ruhl Libre', serif", fontSize: `${fontSize}px`, lineHeight: 2, textAlign: "justify" }} className="text-foreground">
                  {content.hebrew.map((verse, i) => (
                    <span key={i}>
                      <span className="text-muted-foreground/40 font-bold" style={{ fontSize: `${Math.max(fontSize - 6, 11)}px`, marginInlineEnd: "4px" }}>{i + 1}</span>
                      <span dangerouslySetInnerHTML={{ __html: verse }} />{" "}
                      {showFrench && content.french[i] && (
                        <p
                          dir="ltr"
                          className="text-muted-foreground leading-relaxed my-1"
                          style={{ fontSize: `${Math.max(fontSize - 6, 12)}px`, textAlign: "left" }}
                          dangerouslySetInnerHTML={{ __html: content.french[i] }}
                        />
                      )}
                    </span>
                  ))}
                </div>

                {/* Section navigation */}
                <div className="flex justify-between mt-6 pt-4 border-t border-border">
                  <button
                    onClick={() => activeSection > 0 && setActiveSection(activeSection - 1)}
                    disabled={activeSection <= 0}
                    className="rounded-xl border border-border px-4 py-2 text-xs font-bold cursor-pointer disabled:opacity-30 bg-transparent text-foreground"
                  >
                    ← Précédent
                  </button>
                  <button
                    onClick={() => activeSection < sections.length - 1 && setActiveSection(activeSection + 1)}
                    disabled={activeSection >= sections.length - 1}
                    className="rounded-xl border-none px-4 py-2 text-xs font-bold cursor-pointer disabled:opacity-30 text-primary-foreground"
                    style={{ background: "var(--gradient-gold)" }}
                  >
                    Suivant →
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-10 text-center text-sm text-muted-foreground">Erreur de chargement.</div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default SiddourWidget;
