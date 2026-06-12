import DOMPurify from "dompurify";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ChevronDown, ChevronUp, List, Minus, Plus, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { FullSection } from "@/hooks/useSiddourFullOffice";

interface Props {
  open: boolean;
  onClose: () => void;
  office: string;
  officeLabel: string;
  officeIcon: string;
  sections: FullSection[];
  loading: boolean;
  error: string | null;
}

const FONT_KEY = "siddour_clean_font_v1";

/**
 * Consistoire-style cleanup:
 *  - keep <small> blocks (rubrics) but they'll be styled as italic grey
 *  - drop visually-empty entries
 */
function cleanHtml(html: string): string {
  if (!html) return "";
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ["b", "i", "em", "strong", "br", "sup", "sub", "small", "big"],
    ALLOWED_ATTR: [],
  });
}

function isEmpty(html: string): boolean {
  return html.replace(/<[^>]+>/g, "").trim().length === 0;
}

function isPureRubric(html: string): boolean {
  const t = html.trim();
  return /^<small>[\s\S]*<\/small>$/.test(t) || /^<i>[\s\S]*<\/i>$/.test(t) || /^<em>[\s\S]*<\/em>$/.test(t);
}

function isPureBoldTitle(html: string): boolean {
  const t = html.trim();
  return (/^<b>[\s\S]*<\/b>$/.test(t) || /^<big>\s*<b>[\s\S]*<\/b>\s*<\/big>$/.test(t)) && !t.includes("<small>");
}

export default function SiddourCleanReader({
  open, onClose, office, officeLabel, officeIcon, sections, loading, error,
}: Props) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [tocOpen, setTocOpen] = useState(false);
  const [fontSize, setFontSize] = useState<number>(() => {
    try { return Number(localStorage.getItem(FONT_KEY)) || 26; } catch { return 26; }
  });
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { try { localStorage.setItem(FONT_KEY, String(fontSize)); } catch { /* */ } }, [fontSize]);
  useEffect(() => { if (open) setActiveIdx(0); }, [open, office]);
  useEffect(() => { scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" }); }, [activeIdx]);

  const current = sections[activeIdx];
  // Consistoire-style: Hebrew-only flow with embedded rubric/title classification
  type Block = { kind: "rubric" | "title" | "text"; html: string };
  const blocks = useMemo<Block[]>(() => {
    if (!current) return [];
    return (current.hebrew || [])
      .map(cleanHtml)
      .filter(h => !isEmpty(h))
      .map<Block>(h => {
        if (isPureBoldTitle(h)) return { kind: "title", html: h };
        if (isPureRubric(h)) return { kind: "rubric", html: h };
        return { kind: "text", html: h };
      });
  }, [current]);

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[400] flex flex-col"
        style={{ background: "#FFFFFF", color: "#111" }}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
      >
        {/* Header */}
        <header
          className="shrink-0 border-b backdrop-blur"
          style={{
            paddingTop: "env(safe-area-inset-top, 0px)",
            background: "rgba(255, 255, 255, 0.94)",
            borderColor: "hsl(var(--gold) / 0.25)",
          }}
        >
          <div className="flex items-center gap-1 px-2 py-2">
            <button
              onClick={onClose}
              aria-label="Fermer"
              className="p-2.5 rounded-lg active:scale-95 transition shrink-0 hover:bg-black/5"
              style={{ minWidth: 44, minHeight: 44 }}
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <div className="flex-1 min-w-0 text-center px-2">
              <h1
                className="font-bold text-sm sm:text-base truncate"
                style={{
                  fontFamily: "'Cormorant Garamond', 'Lora', Georgia, serif",
                  color: "hsl(var(--primary))",
                }}
              >
                {current ? (
                  <>
                    {current.title}
                    <span className="mx-2 opacity-50">—</span>
                    <span
                      dir="rtl"
                      style={{ fontFamily: "'Frank Ruhl Libre', 'Noto Serif Hebrew', serif" }}
                    >
                      {current.heTitle}
                    </span>
                  </>
                ) : `${officeLabel}`}
              </h1>
            </div>

            {/* Up / Down navigation (Consistoire-style arrows) */}
            <button
              onClick={() => setActiveIdx(i => Math.max(0, i - 1))}
              disabled={activeIdx === 0}
              aria-label="Section précédente"
              className="p-2 rounded-lg active:scale-95 transition shrink-0 hover:bg-black/5 disabled:opacity-30"
              style={{ minWidth: 40, minHeight: 40 }}
            >
              <ChevronUp className="w-5 h-5" style={{ color: "hsl(var(--primary))" }} />
            </button>
            <button
              onClick={() => setActiveIdx(i => Math.min(sections.length - 1, i + 1))}
              disabled={activeIdx >= sections.length - 1}
              aria-label="Section suivante"
              className="p-2 rounded-lg active:scale-95 transition shrink-0 hover:bg-black/5 disabled:opacity-30"
              style={{ minWidth: 40, minHeight: 40 }}
            >
              <ChevronDown className="w-5 h-5" style={{ color: "hsl(var(--primary))" }} />
            </button>
            <button
              onClick={() => setTocOpen(true)}
              aria-label="Sommaire"
              className="p-2 rounded-lg active:scale-95 transition shrink-0 hover:bg-black/5"
              style={{ minWidth: 40, minHeight: 40 }}
            >
              <List className="w-5 h-5" style={{ color: "hsl(var(--primary))" }} />
            </button>
          </div>

          {/* Compact font controls bar */}
          <div className="flex items-center justify-end gap-1 px-3 pb-1.5">
            <span className="text-[10px] uppercase tracking-wider mr-1" style={{ color: "hsl(var(--muted-foreground))" }}>
              {activeIdx + 1} / {sections.length || "…"}
            </span>
            <button onClick={() => setFontSize(s => Math.max(18, s - 2))} className="p-1 rounded hover:bg-black/5 active:scale-95" aria-label="A-">
              <Minus className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => setFontSize(s => Math.min(44, s + 2))} className="p-1 rounded hover:bg-black/5 active:scale-95" aria-label="A+">
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </header>

        {/* Body */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto" style={{ WebkitOverflowScrolling: "touch" }}>
          {loading && sections.length === 0 ? (
            <div className="py-24 text-center">
              <div
                className="animate-spin w-8 h-8 border-2 border-t-transparent rounded-full mx-auto"
                style={{ borderColor: "hsl(var(--gold)) transparent transparent transparent" }}
              />
              <p className="text-sm mt-4 text-muted-foreground">Ouverture du Siddour…</p>
            </div>
          ) : error ? (
            <div className="py-16 px-6 text-center">
              <p className="text-sm text-destructive font-semibold">Erreur de chargement</p>
              <p className="text-xs mt-2 text-muted-foreground">{error}</p>
            </div>
          ) : current ? (
            <article className="max-w-2xl mx-auto px-5 sm:px-8 py-6 sm:py-8">
              {/* Hebrew-only flow, Consistoire style: rubrics in italic grey, bold inner titles, justified Hebrew */}
              {blocks.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-12">
                  Cette section ne contient pas de texte affichable.
                </p>
              ) : (
                <div className="siddour-flow">
                  {blocks.map((b, i) => {
                    if (b.kind === "rubric") {
                      return (
                        <p
                          key={i}
                          dir="rtl"
                          className="text-right my-5"
                          style={{
                            fontFamily: "'Lora', 'Cormorant Garamond', Georgia, serif",
                            fontStyle: "italic",
                            fontSize: `${Math.max(13, Math.round(fontSize * 0.55))}px`,
                            color: "#555",
                            lineHeight: 1.5,
                          }}
                          dangerouslySetInnerHTML={{ __html: b.html.replace(/<\/?small>/g, "") }}
                        />
                      );
                    }
                    if (b.kind === "title") {
                      return (
                        <h4
                          key={i}
                          dir="rtl"
                          className="text-right mt-6 mb-3 font-bold"
                          style={{
                            fontFamily: "'Frank Ruhl Libre', 'Noto Serif Hebrew', serif",
                            fontSize: `${Math.round(fontSize * 0.95)}px`,
                            color: "#000",
                          }}
                          dangerouslySetInnerHTML={{ __html: b.html.replace(/<\/?b>|<\/?big>/g, "") }}
                        />
                      );
                    }
                    return (
                      <p
                        key={i}
                        dir="rtl"
                        className="my-4"
                        style={{
                          fontFamily: "'Frank Ruhl Libre', 'Noto Serif Hebrew', serif",
                          fontSize: `${fontSize}px`,
                          lineHeight: 2.1,
                          fontWeight: 500,
                          color: "#0a0a0a",
                          textAlign: "justify",
                          textAlignLast: "right",
                        }}
                        dangerouslySetInnerHTML={{ __html: b.html }}
                      />
                    );
                  })}
                </div>
              )}

              {/* Footer nav */}
              <div className="mt-12 flex items-center justify-between gap-3 pt-6 border-t" style={{ borderColor: "hsl(var(--gold) / 0.25)" }}>
                <button
                  onClick={() => setActiveIdx(i => Math.max(0, i - 1))}
                  disabled={activeIdx === 0}
                  className="flex-1 py-3 rounded-xl text-sm font-bold disabled:opacity-30 active:scale-[0.98] transition"
                  style={{ background: "hsl(var(--muted))", color: "hsl(var(--foreground))" }}
                >
                  ← Précédent
                </button>
                <button
                  onClick={() => setActiveIdx(i => Math.min(sections.length - 1, i + 1))}
                  disabled={activeIdx >= sections.length - 1}
                  className="flex-1 py-3 rounded-xl text-sm font-bold disabled:opacity-30 text-primary-foreground active:scale-[0.98] transition"
                  style={{ background: "var(--gradient-gold)", boxShadow: "var(--shadow-gold)" }}
                >
                  Suivant →
                </button>
              </div>
            </article>
          ) : null}

          {/* Bottom safe-area */}
          <div style={{ height: "calc(env(safe-area-inset-bottom, 0px) + 1rem)" }} />
        </div>

        {/* TOC drawer */}
        <AnimatePresence>
          {tocOpen && (
            <>
              <motion.div
                className="fixed inset-0 z-[410] bg-black/30"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setTocOpen(false)}
              />
              <motion.aside
                className="fixed top-0 right-0 bottom-0 z-[420] w-[85vw] max-w-[340px] shadow-2xl flex flex-col"
                style={{
                  background: "#FEFCF7",
                  paddingTop: "env(safe-area-inset-top, 0px)",
                  paddingBottom: "env(safe-area-inset-bottom, 0px)",
                }}
                initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
                transition={{ type: "spring", damping: 28, stiffness: 280 }}
              >
                <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "hsl(var(--gold) / 0.25)" }}>
                  <h3 className="font-display text-sm font-bold" style={{ color: "hsl(var(--primary))" }}>
                    📖 Sommaire
                  </h3>
                  <button onClick={() => setTocOpen(false)} className="p-2 rounded-md hover:bg-black/5">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto py-2" style={{ WebkitOverflowScrolling: "touch" }}>
                  {sections.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => { setActiveIdx(i); setTocOpen(false); }}
                      className="w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-black/5 active:bg-black/10 transition"
                      style={i === activeIdx ? { background: "hsl(var(--gold) / 0.1)" } : {}}
                    >
                      <span
                        className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold"
                        style={{
                          background: i === activeIdx ? "var(--gradient-gold)" : "hsl(var(--muted))",
                          color: i === activeIdx ? "white" : "hsl(var(--muted-foreground))",
                        }}
                      >
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate" style={{ color: "hsl(var(--foreground))" }}>{s.title}</p>
                        <p className="text-xs truncate" dir="rtl" style={{ color: "hsl(var(--gold-matte))" }}>{s.heTitle}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </motion.aside>
            </>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
}