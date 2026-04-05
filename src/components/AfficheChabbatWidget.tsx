import { useState, useEffect, useRef, useCallback, useLayoutEffect } from "react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { useCity } from "@/hooks/useCity";
import { useSynaProfile } from "@/hooks/useSynaProfile";
import { useShabbatPosterData, type ShabbatFormData } from "@/hooks/useShabbatPosterData";
import { fetchShabbatTimes, ShabbatTimes } from "@/lib/hebcal";
import { TimeInputRow } from "@/components/affiche-chabbat/TimeInputRow";
import MasterPosterTemplate, { type PosterContentBlock } from "@/components/poster/MasterPosterTemplate";
import CardPosterTemplate, { type CardPosterContent } from "@/components/poster/CardPosterTemplate";
import { sharePosterPng } from "@/components/poster/usePosterExport";

type Theme = "tradition" | "moderne" | "chaud" | "prestige" | "blanc";
type FontChoice = "greatvibes" | "playfairsc" | "playfair" | "lora";

const themeConfig: Record<Theme, { name: string; swatch: string[]; bg: string; accent: string; text: string; border: string; blockBg: string; blockBorder: string; h4Color: string; valueColor: string; labelColor: string; footerColor: string; ornamentColor: string }> = {
  tradition: { name: "Tradition", swatch: ["#D4AF37", "#1a3a6b", "#fdfaf3"], bg: "radial-gradient(ellipse at center, #ffffff 0%, #fdfaf3 70%, #f8f0e0 100%)", accent: "#D4AF37", text: "#1a1a2e", border: "#D4AF37", blockBg: "rgba(253,248,237,0.6)", blockBorder: "rgba(212,175,55,0.2)", h4Color: "#8b6914", valueColor: "#1a3a6b", labelColor: "#666", footerColor: "#b0a080", ornamentColor: "%23D4AF37" },
  moderne: { name: "Moderne", swatch: ["#475569", "#2563eb", "#f1f5f9"], bg: "radial-gradient(ellipse at center, #f8f9fb 0%, #f1f5f9 70%, #e8ecf1 100%)", accent: "#2563eb", text: "#334155", border: "#475569", blockBg: "rgba(226,232,240,0.4)", blockBorder: "rgba(51,65,85,0.15)", h4Color: "#334155", valueColor: "#1e40af", labelColor: "#64748b", footerColor: "#94a3b8", ornamentColor: "%23475569" },
  chaud: { name: "Chaud", swatch: ["#92400e", "#991b1b", "#fdf5e8"], bg: "radial-gradient(ellipse at center, #fffbf5 0%, #fdf5e8 70%, #f5e8d0 100%)", accent: "#92400e", text: "#44403c", border: "#92400e", blockBg: "rgba(254,243,226,0.5)", blockBorder: "rgba(146,64,14,0.15)", h4Color: "#78350f", valueColor: "#92400e", labelColor: "#78716c", footerColor: "#a8a29e", ornamentColor: "%2392400e" },
  prestige: { name: "Prestige", swatch: ["#D4AF37", "#2c1810", "#fffef9"], bg: "radial-gradient(ellipse at center, #fffef9 0%, #fdf8ef 50%, #f8f0e0 100%)", accent: "#D4AF37", text: "#2c2c2c", border: "#D4AF37", blockBg: "#fff", blockBorder: "rgba(212,175,55,0.12)", h4Color: "#D4AF37", valueColor: "#1a1a2e", labelColor: "#888", footerColor: "#b0a080", ornamentColor: "%23D4AF37" },
  blanc: { name: "Blanc", swatch: ["#D4AF37", "#1a1a1a", "#ffffff"], bg: "#ffffff", accent: "#D4AF37", text: "#333", border: "#D4AF37", blockBg: "#fafafa", blockBorder: "#eee", h4Color: "#D4AF37", valueColor: "#1a1a1a", labelColor: "#888", footerColor: "#bbb", ornamentColor: "%23D4AF37" },
};

const fontConfig: Record<FontChoice, { name: string; sample: string; family: string }> = {
  greatvibes: { name: "Great Vibes", sample: "Chabbat Chalom", family: "'Great Vibes', cursive" },
  playfairsc: { name: "Playfair SC", sample: "CHABBAT", family: "'Playfair Display SC', serif" },
  playfair: { name: "Playfair", sample: "Chabbat", family: "'Playfair Display', serif" },
  lora: { name: "Lora", sample: "Chabbat", family: "'Lora', serif" },
};

const cornerSvg = (color: string) => `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'%3E%3Cpath d='M2 2 L14 2 L14 5 L5 5 L5 14 L2 14 Z' fill='${color}'/%3E%3Cpath d='M8 8 L16 8 L16 10 L10 10 L10 16 L8 16 Z' fill='${color}' opacity='0.4'/%3E%3C/svg%3E")`;

// Form data is now managed by useShabbatPosterData hook

/** Helper: renders a 1080px-wide poster scaled down to fit container, with correct height */
const ScaledPreview = ({ scale, refCallback, children }: { scale: number; refCallback: (el: HTMLDivElement | null) => void; children: React.ReactNode }) => {
  const innerRef = useRef<HTMLDivElement>(null);
  const [h, setH] = useState(0);

  useLayoutEffect(() => {
    if (!innerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setH(entry.contentRect.height * scale);
      }
    });
    ro.observe(innerRef.current);
    setH(innerRef.current.scrollHeight * scale);
    return () => ro.disconnect();
  }, [scale]);

  return (
    <div className="rounded-2xl overflow-hidden" style={{ padding: "6px", background: "hsl(var(--muted))" }}>
      <div style={{ width: "100%", height: h || "auto", overflow: "hidden", position: "relative" }}>
        <div
          ref={(el) => { (innerRef as any).current = el; refCallback(el); }}
          style={{ transform: `scale(${scale})`, transformOrigin: "top left", width: 1080 }}
        >
          {children}
        </div>
      </div>
    </div>
  );
};

const AfficheChabbatWidget = () => {
  const { city } = useCity();
  const { profile: synaProfile } = useSynaProfile();
  const { data: formData, setData: setFormData, saving, save } = useShabbatPosterData();
  const [shabbatData, setShabbatData] = useState<ShabbatTimes | null>(null);
  const [loading, setLoading] = useState(true);
  const canvasRef = useRef<HTMLDivElement>(null);

  const theme = (formData.theme || "prestige") as Theme;
  const font = (formData.font || "greatvibes") as FontChoice;
  const { synaName, synaAddress, synaRav, minhaFri, kabbalat, arvitFri, shaharit, moussaf, minhaSat, arvitMotse, sponsor, announce, ravMessage, torahReader, shiourSamedi, freeNote, notes } = formData;

  const setField = useCallback(<K extends keyof ShabbatFormData>(key: K, val: ShabbatFormData[K]) => {
    setFormData((prev) => ({ ...prev, [key]: val }));
  }, [setFormData]);

  const setNote = useCallback((key: string, val: string) => {
    setFormData((prev) => ({ ...prev, notes: { ...prev.notes, [key]: val } }));
  }, [setFormData]);

  const [step, setStep] = useState(1);
  const [posterFormat, setPosterFormat] = useState<"full" | "card">("full");

  useEffect(() => {
    setLoading(true);
    fetchShabbatTimes(city).then((result) => {
      setShabbatData(result);
      setLoading(false);
    });
  }, [city]);

  const t = themeConfig[theme];
  const f = fontConfig[font];
  const cornerBg = cornerSvg(t.ornamentColor);

  const posterContent: PosterContentBlock = {
    category: "PARASHAT",
    title: shabbatData?.parasha?.replace("Parashat ", "") || "Chabbat",
    date: shabbatData?.candleLightingDate || "",
    details: [
      { section: "VENDREDI SOIR", label: "Allumage des bougies", value: shabbatData?.candleLighting || "--:--" },
      ...(minhaFri || notes.minhaFri ? [{ section: "VENDREDI SOIR", label: "Minha", value: minhaFri || "—", sub: notes.minhaFri || undefined }] : []),
      ...(kabbalat || notes.kabbalat ? [{ section: "VENDREDI SOIR", label: "Kabbalat Chabbat", value: kabbalat || "—", sub: notes.kabbalat || undefined }] : []),
      ...(arvitFri || notes.arvitFri ? [{ section: "VENDREDI SOIR", label: "Arvit", value: arvitFri || "—", sub: notes.arvitFri || undefined }] : []),
      ...(shaharit || notes.shaharit ? [{ section: "CHABBAT MATIN", label: "Shaharit", value: shaharit || "—", sub: notes.shaharit || undefined }] : []),
      {
        section: "CHABBAT MATIN",
        label: "Lecture de la Torah",
        value: shabbatData?.parasha?.replace("Parashat ", "") || "",
        sub: torahReader || notes.torahReading || undefined,
      },
      ...(moussaf || notes.moussaf ? [{ section: "CHABBAT MATIN", label: "Moussaf", value: moussaf || "—", sub: notes.moussaf || undefined }] : []),
      ...(minhaSat || notes.minhaSat ? [{ section: "CHABBAT APRÈS-MIDI", label: "Minha", value: minhaSat || "—", sub: notes.minhaSat || undefined }] : []),
      ...(shiourSamedi ? [{ section: "CHABBAT APRÈS-MIDI", label: "Shiour", value: shiourSamedi }] : []),
      { section: "MOTSÉ CHABBAT", label: "Havdala", value: shabbatData?.havdalah || "--:--", sub: notes.havdalah || undefined },
      ...(arvitMotse || notes.arvitMotse ? [{ section: "MOTSÉ CHABBAT", label: "Arvit", value: arvitMotse || "—", sub: notes.arvitMotse || undefined }] : []),
      ...(sponsor ? [{ section: "ANNONCES", label: "Séouda / Kiddouch", value: sponsor }] : []),
      ...(announce ? [{ section: "ANNONCES", label: "Annonce", value: announce }] : []),
      ...(ravMessage ? [{ section: "ANNONCES", label: "Message du Rav", value: ravMessage }] : []),
      ...(freeNote ? [{ section: "ANNONCES", label: "Note", value: freeNote }] : []),
    ],
    description: undefined,
  };

  const cardContent: CardPosterContent = {
    topEmoji: "🕯️",
    badge: "CHABBAT CHALOM",
    badgeColor: t.accent,
    title: shabbatData?.parasha?.replace("Parashat ", "") || "Chabbat",
    description: shabbatData?.candleLightingDate || undefined,
    date: `🕯️ ${shabbatData?.candleLighting || "--:--"}  •  ✨ ${shabbatData?.havdalah || "--:--"}`,
    dateEmoji: "",
    details: [
      ...(minhaFri || notes.minhaFri ? [{ icon: "🌅", text: `Minha vendredi ${minhaFri || notes.minhaFri}` }] : []),
      ...(kabbalat || notes.kabbalat ? [{ icon: "🕯️", text: `Kabbalat Chabbat ${kabbalat || notes.kabbalat}` }] : []),
      ...(shaharit || notes.shaharit ? [{ icon: "☀️", text: `Shaharit samedi ${shaharit || notes.shaharit}` }] : []),
      ...(minhaSat || notes.minhaSat ? [{ icon: "🌇", text: `Minha samedi ${minhaSat || notes.minhaSat}` }] : []),
      ...(sponsor ? [{ icon: "🎉", text: sponsor }] : []),
    ],
    accentColor: t.accent,
    bgColor: t.swatch[2] || "#FDFAF3",
  };

  const handleSharePoster = async () => {
    const filename = `affiche-chabbat-${city.name}.png`;
    await sharePosterPng(canvasRef.current, filename, `Chabbat Chalom — ${synaProfile.name || synaName}`);
  };

  const inputClass = "w-full px-4 py-4 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 placeholder:text-muted-foreground/50";

  const PosterSection = ({ title, children }: { icon?: string; title: string; children: React.ReactNode }) => (
    <div style={{ marginBottom: "10px", textAlign: "center" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", marginBottom: "6px" }}>
        <div style={{ flex: 1, maxWidth: "40px", height: "0.5px", background: `linear-gradient(90deg, transparent, #c8b47a)` }} />
        <span style={{ fontFamily: "'Lora', serif", fontSize: "0.62rem", fontWeight: 400, color: "#c8b47a", letterSpacing: "1.5px", textTransform: "uppercase" }}>{title}</span>
        <div style={{ flex: 1, maxWidth: "40px", height: "0.5px", background: `linear-gradient(90deg, #c8b47a, transparent)` }} />
      </div>
      <div>{children}</div>
    </div>
  );

  const TimeLine = ({ label, value, note }: { label: string; value: string; note?: string; big?: boolean }) => (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "baseline", gap: "8px", padding: "2.5px 0" }}>
      <span style={{ color: "#6b6b6b", fontSize: "0.65rem", fontFamily: "'Lora', serif", fontWeight: 400 }}>{label}</span>
      <span style={{ fontFamily: "'Lora', serif", fontWeight: 400, color: "#2F2F2F", fontSize: "0.72rem" }}>
        {value}{note && <span style={{ fontSize: "0.55rem", color: "#999", fontStyle: "italic", marginLeft: "4px" }}>({note})</span>}
      </span>
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="flex gap-1.5 mb-5 p-1.5 rounded-2xl bg-muted/60 border border-border">
        {[
          { n: 1, icon: "⏰", label: "Horaires" },
          { n: 2, icon: "📢", label: "Annonces" },
          { n: 3, icon: "📤", label: "Aperçu" },
        ].map((section) => (
          <button
            key={section.n}
            onClick={() => setStep(section.n)}
            className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer border-none active:scale-95"
            style={{
              background: step === section.n ? "var(--gradient-gold)" : "transparent",
              color: step === section.n ? "hsl(var(--primary-foreground))" : "hsl(var(--muted-foreground))",
              boxShadow: step === section.n ? "var(--shadow-gold)" : "none",
            }}
          >
            <span>{section.icon}</span>
            <span>{section.label}</span>
          </button>
        ))}
      </div>

      {step === 1 && (
        <div className="space-y-4">
          <div className="rounded-2xl bg-card p-4 border border-border space-y-3" style={{ boxShadow: "var(--shadow-card)" }}>
            <h4 className="font-display text-sm font-bold text-foreground flex items-center gap-2">🏛️ Votre synagogue</h4>
            <input value={synaName} onChange={(e) => setField("synaName", e.target.value)} placeholder="🏛️ Nom de la synagogue (ex: Beth Hamidrach)" className={inputClass} />
            <input value={synaAddress} onChange={(e) => setField("synaAddress", e.target.value)} placeholder="📍 Adresse (ex: 12 rue de la Paix, Paris)" className={inputClass} />
            <input value={synaRav} onChange={(e) => setField("synaRav", e.target.value)} placeholder="👤 Rav (ex: Rav David Cohen)" className={inputClass} />
          </div>

          <div className="rounded-2xl bg-card p-4 border border-border" style={{ boxShadow: "var(--shadow-card)" }}>
            <h4 className="font-display text-sm font-bold text-foreground mb-1">⏰ Horaires des offices</h4>
            <p className="text-[10px] text-muted-foreground mb-3">Sur mobile, le libellé passe au-dessus pour garder des champs stables et sans chevauchement.</p>

            <div className="space-y-1">
              <p className="text-[10px] font-bold text-primary uppercase tracking-wider px-1 py-1.5 border-b border-primary/20">🕯️ Vendredi soir</p>
              <TimeInputRow label="🕯️ Allumage (auto)" value={shabbatData?.candleLighting || ""} noteValue={notes.candleLighting || ""} onNoteChange={(value) => setNote("candleLighting", value)} readOnly />
              <TimeInputRow label="Minha vendredi" value={minhaFri} noteValue={notes.minhaFri || ""} onChange={(v) => setField("minhaFri", v)} onNoteChange={(value) => setNote("minhaFri", value)} />
              <TimeInputRow label="Kabbalat Chabbat" value={kabbalat} noteValue={notes.kabbalat || ""} onChange={(v) => setField("kabbalat", v)} onNoteChange={(value) => setNote("kabbalat", value)} />
              <TimeInputRow label="Arvit vendredi" value={arvitFri} noteValue={notes.arvitFri || ""} onChange={(v) => setField("arvitFri", v)} onNoteChange={(value) => setNote("arvitFri", value)} />

              <p className="text-[10px] font-bold text-primary uppercase tracking-wider px-1 py-1.5 border-b border-primary/20 mt-2">☀️ Chabbat matin</p>
              <TimeInputRow label="Shaharit samedi" value={shaharit} noteValue={notes.shaharit || ""} onChange={(v) => setField("shaharit", v)} onNoteChange={(value) => setNote("shaharit", value)} />

              {/* Lecteur de Torah */}
              <div className="space-y-2 py-1.5 sm:grid sm:grid-cols-[minmax(0,1fr)_1fr] sm:items-center sm:gap-2 sm:space-y-0">
                <span className="min-w-0 text-[11px] font-semibold leading-tight text-foreground">📜 Lecteur</span>
                <input
                  type="text"
                  value={torahReader}
                  onChange={(e) => setField("torahReader", e.target.value)}
                  placeholder="Nom du lecteur de Torah"
                  className="h-10 w-full rounded-xl border border-input bg-background px-3 text-[11px] text-foreground outline-none transition-colors focus:border-primary/40 focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/60"
                />
              </div>

              <div className="space-y-2 py-1.5 sm:grid sm:grid-cols-[minmax(0,1fr)_1fr] sm:items-center sm:gap-2 sm:space-y-0">
                <span className="min-w-0 text-[11px] font-semibold leading-tight text-foreground">📖 Paracha</span>
                <div className="flex h-10 items-center justify-center rounded-xl border border-border bg-muted px-3 text-center text-xs font-bold text-foreground">
                  {shabbatData?.parasha?.replace("Parashat ", "") || "…"}
                </div>
              </div>

              <TimeInputRow label="Moussaf" value={moussaf} noteValue={notes.moussaf || ""} onChange={(v) => setField("moussaf", v)} onNoteChange={(value) => setNote("moussaf", value)} />
              <TimeInputRow label="Minha samedi" value={minhaSat} noteValue={notes.minhaSat || ""} onChange={(v) => setField("minhaSat", v)} onNoteChange={(value) => setNote("minhaSat", value)} />

              {/* Shiour après Minha */}
              <div className="space-y-2 py-1.5 sm:grid sm:grid-cols-[minmax(0,1fr)_1fr] sm:items-center sm:gap-2 sm:space-y-0">
                <span className="min-w-0 text-[11px] font-semibold leading-tight text-foreground">📚 Shiour</span>
                <input
                  type="text"
                  value={shiourSamedi}
                  onChange={(e) => setField("shiourSamedi", e.target.value)}
                  placeholder="Sujet ou Rav du shiour"
                  className="h-10 w-full rounded-xl border border-input bg-background px-3 text-[11px] text-foreground outline-none transition-colors focus:border-primary/40 focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/60"
                />
              </div>

              <p className="text-[10px] font-bold text-primary uppercase tracking-wider px-1 py-1.5 border-b border-primary/20 mt-2">✨ Sortie de Chabbat</p>
              <TimeInputRow label="✨ Havdala (auto)" value={shabbatData?.havdalah || ""} noteValue={notes.havdalah || ""} onNoteChange={(value) => setNote("havdalah", value)} readOnly />
              <TimeInputRow label="Arvit Motsé Chabbat" value={arvitMotse} noteValue={notes.arvitMotse || ""} onChange={(v) => setField("arvitMotse", v)} onNoteChange={(value) => setNote("arvitMotse", value)} />
            </div>
          </div>

          <div className="rounded-2xl bg-card p-5 border border-border" style={{ boxShadow: "var(--shadow-card)" }}>
            <h4 className="font-display text-sm font-bold text-foreground mb-3 flex items-center gap-2">🎨 Thème de l'affiche</h4>
            <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-5">
              {(Object.keys(themeConfig) as Theme[]).map((key) => {
                const tc = themeConfig[key];
                return (
                  <button key={key} onClick={() => setField("theme", key)} className={`rounded-xl p-2.5 text-center cursor-pointer transition-all border-2 active:scale-95 ${theme === key ? "border-primary shadow-md" : "border-border"}`}>
                    <div className="flex rounded-lg overflow-hidden h-6 mb-1.5">{tc.swatch.map((color, index) => <div key={index} style={{ background: color, flex: 1 }} />)}</div>
                    <span className="text-[10px] font-bold text-foreground">{tc.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl bg-card p-5 border border-border" style={{ boxShadow: "var(--shadow-card)" }}>
            <h4 className="font-display text-sm font-bold text-foreground mb-3 flex items-center gap-2">✒️ Calligraphie</h4>
            <div className="grid grid-cols-2 gap-2.5">
              {(Object.keys(fontConfig) as FontChoice[]).map((key) => {
                const fc = fontConfig[key];
                return (
                  <button key={key} onClick={() => setField("font", key)} className={`rounded-xl p-3 text-center cursor-pointer transition-all border-2 active:scale-95 ${font === key ? "border-primary shadow-md" : "border-border"}`}>
                    <div style={{ fontFamily: fc.family, fontSize: key === "greatvibes" ? "1.3rem" : "1.1rem", fontWeight: 700, lineHeight: 1.3 }} className="text-foreground mb-1">{fc.sample}</div>
                    <span className="text-[10px] text-muted-foreground font-medium">{fc.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Save + Next */}
          <div className="flex gap-3">
            <button onClick={save} disabled={saving} className="flex-1 py-4 rounded-xl font-bold text-sm bg-card text-foreground border border-border cursor-pointer active:scale-95 transition-transform disabled:opacity-50">
              {saving ? "💾 Sauvegarde…" : "💾 Sauvegarder"}
            </button>
            <button onClick={() => setStep(2)} className="flex-1 py-4 rounded-xl font-bold text-sm text-primary-foreground border-none cursor-pointer active:scale-[0.98] transition-transform" style={{ background: "var(--gradient-gold)", boxShadow: "var(--shadow-gold)" }}>
              Suivant →
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-5">
          <div className="rounded-2xl bg-card p-5 border border-border space-y-5" style={{ boxShadow: "var(--shadow-card)" }}>
            <div>
              <h4 className="font-display text-sm font-bold text-foreground flex items-center gap-2">📢 Annonces & messages</h4>
              <p className="text-[11px] text-muted-foreground mt-1">Tous ces champs sont optionnels. Ils apparaîtront en bas de l'affiche.</p>
            </div>
            <div>
              <label className="text-xs font-bold text-muted-foreground mb-1.5 block">🎉 Séouda / Kiddouch offert par</label>
              <input value={sponsor} onChange={(e) => setField("sponsor", e.target.value)} placeholder="Ex : Famille Cohen pour la naissance de…" className={inputClass} style={{ minHeight: "52px" }} />
            </div>
            <div>
              <label className="text-xs font-bold text-muted-foreground mb-1.5 block">📢 Annonce communautaire</label>
              <textarea value={announce} onChange={(e) => setField("announce", e.target.value)} placeholder="Ex : Cours spécial dimanche à 20h, Bar Mitsva de…" rows={3} className={`${inputClass} resize-none`} style={{ minHeight: "88px" }} />
            </div>
            <div>
              <label className="text-xs font-bold text-muted-foreground mb-1.5 block">💬 Message du Rav</label>
              <textarea value={ravMessage} onChange={(e) => setField("ravMessage", e.target.value)} placeholder="Ex : Pensée de la semaine, message inspirant…" rows={3} className={`${inputClass} resize-none`} style={{ minHeight: "88px" }} />
            </div>
            <div>
              <label className="text-xs font-bold text-muted-foreground mb-1.5 block">✏️ Champ libre (bas de l'affiche)</label>
              <textarea value={freeNote} onChange={(e) => setField("freeNote", e.target.value)} placeholder="Ex : Mazal Tov à la famille…, Horaire spécial…" rows={3} className={`${inputClass} resize-none`} style={{ minHeight: "88px" }} />
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setStep(1)} className="flex-1 py-4 rounded-xl font-bold text-sm bg-muted text-muted-foreground border border-border cursor-pointer active:scale-95 transition-transform">← Retour</button>
            <button onClick={() => setStep(3)} className="flex-1 py-4 rounded-xl font-bold text-sm text-primary-foreground border-none cursor-pointer active:scale-95 transition-transform" style={{ background: "var(--gradient-gold)" }}>Aperçu →</button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <button onClick={() => setStep(2)} className="text-sm font-bold text-primary bg-transparent border-none cursor-pointer hover:underline">← Modifier</button>

          {/* Format toggle */}
          <div className="flex rounded-xl overflow-hidden border border-border">
            <button
              onClick={() => setPosterFormat("full")}
              className={`flex-1 py-2.5 text-xs font-bold border-none cursor-pointer transition-all ${posterFormat === "full" ? "bg-foreground text-background" : "bg-card text-muted-foreground"}`}
            >
              📋 Affiche complète
            </button>
            <button
              onClick={() => setPosterFormat("card")}
              className={`flex-1 py-2.5 text-xs font-bold border-none cursor-pointer transition-all ${posterFormat === "card" ? "bg-foreground text-background" : "bg-card text-muted-foreground"}`}
            >
              🎴 Carte résumé
            </button>
          </div>

          <ScaledPreview scale={0.3} refCallback={(el) => { (canvasRef as any).current = el; }}>
            {posterFormat === "full" ? (
              <MasterPosterTemplate
                profile={{
                  ...synaProfile,
                  name: synaProfile.name || synaName,
                  signature: `${synaProfile.name || synaName} — Chabbat Chalom`,
                  primary_color: t.text,
                  secondary_color: t.accent,
                }}
                content={posterContent}
              />
            ) : (
              <CardPosterTemplate
                profile={{ name: synaProfile.name || synaName, logo_url: synaProfile.logo_url, website: "chabbat-chalom.com" }}
                content={cardContent}
              />
            )}
          </ScaledPreview>

          <div className="flex gap-3">
            <button onClick={save} disabled={saving} className="flex-1 py-4 rounded-xl font-bold text-sm bg-card text-foreground border border-border cursor-pointer active:scale-95 transition-transform disabled:opacity-50">
              {saving ? "💾…" : "💾 Sauvegarder"}
            </button>
            <button onClick={handleExport} className="flex-1 py-4 rounded-xl font-bold text-sm text-primary-foreground border-none cursor-pointer active:scale-95 transition-transform" style={{ background: "var(--gradient-gold)", boxShadow: "var(--shadow-gold)" }}>📥 Télécharger PNG</button>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default AfficheChabbatWidget;
