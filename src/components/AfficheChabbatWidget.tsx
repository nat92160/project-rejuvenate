import { useState, useEffect, useRef, memo, useCallback } from "react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { useCity } from "@/hooks/useCity";
import { fetchShabbatTimes, ShabbatTimes } from "@/lib/hebcal";
import { supabase } from "@/integrations/supabase/client";

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

const STORAGE_KEY = "affiche_chabbat_data";

interface SavedFormData {
  synaName: string;
  synaAddress: string;
  synaRav: string;
  minhaFri: string;
  kabbalat: string;
  arvitFri: string;
  shaharit: string;
  moussaf: string;
  minhaSat: string;
  arvitMotse: string;
  sponsor: string;
  announce: string;
  ravMessage: string;
  notes: Record<string, string>;
  theme: Theme;
  font: FontChoice;
}

const loadSaved = (): Partial<SavedFormData> => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
};

const AfficheChabbatWidget = () => {
  const { city } = useCity();
  const [data, setData] = useState<ShabbatTimes | null>(null);
  const [loading, setLoading] = useState(true);
  const canvasRef = useRef<HTMLDivElement>(null);
  const saved = useRef(loadSaved());

  const [theme, setTheme] = useState<Theme>(saved.current.theme || "prestige");
  const [font, setFont] = useState<FontChoice>(saved.current.font || "greatvibes");
  const [synaName, setSynaName] = useState(saved.current.synaName || "Ma Synagogue");
  const [synaAddress, setSynaAddress] = useState(saved.current.synaAddress || "");
  const [synaRav, setSynaRav] = useState(saved.current.synaRav || "");
  const [notes, setNotes] = useState<Record<string, string>>(saved.current.notes || {
    candleLighting: "", minhaFri: "", kabbalat: "", arvitFri: "",
    shaharit: "", torahReading: "", moussaf: "", minhaSat: "",
    havdalah: "", arvitMotse: "",
  });
  const [minhaFri, setMinhaFri] = useState(saved.current.minhaFri || "");
  const [kabbalat, setKabbalat] = useState(saved.current.kabbalat || "");
  const [arvitFri, setArvitFri] = useState(saved.current.arvitFri || "");
  const [shaharit, setShaharit] = useState(saved.current.shaharit || "08:30");
  const [moussaf, setMoussaf] = useState(saved.current.moussaf || "");
  const [minhaSat, setMinhaSat] = useState(saved.current.minhaSat || "");
  const [arvitMotse, setArvitMotse] = useState(saved.current.arvitMotse || "");
  const [sponsor, setSponsor] = useState(saved.current.sponsor || "");
  const [announce, setAnnounce] = useState(saved.current.announce || "");
  const [ravMessage, setRavMessage] = useState(saved.current.ravMessage || "");
  const [step, setStep] = useState(1);

  const setNote = useCallback((key: string, val: string) => {
    setNotes(prev => ({ ...prev, [key]: val }));
  }, []);

  // Save to localStorage on every relevant change
  useEffect(() => {
    const toSave: SavedFormData = {
      synaName, synaAddress, synaRav, minhaFri, kabbalat, arvitFri,
      shaharit, moussaf, minhaSat, arvitMotse, sponsor, announce, ravMessage,
      notes, theme, font,
    };
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave)); } catch {}
  }, [synaName, synaAddress, synaRav, minhaFri, kabbalat, arvitFri, shaharit, moussaf, minhaSat, arvitMotse, sponsor, announce, ravMessage, notes, theme, font]);

  useEffect(() => { setLoading(true); fetchShabbatTimes(city).then(d => { setData(d); setLoading(false); }); }, [city]);

  const t = themeConfig[theme];
  const f = fontConfig[font];
  const cornerBg = cornerSvg(t.ornamentColor);

  const generatePosterBlob = async () => {
    if (!canvasRef.current) return null;
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(canvasRef.current, {
        scale: 2, useCORS: true, backgroundColor: "#ffffff",
        onclone: (clonedDoc) => {
          clonedDoc.documentElement.classList.remove("dark");
          const el = clonedDoc.getElementById("affiche-export-canvas") as HTMLDivElement | null;
          if (el) { el.style.background = t.bg; el.style.colorScheme = "light"; }
        },
      });
      return await new Promise<Blob | null>(resolve => canvas.toBlob(b => resolve(b), "image/jpeg", 0.95));
    } catch { return null; }
  };

  const handleExport = async () => {
    const blob = await generatePosterBlob();
    if (!blob) { alert("Export non disponible."); return; }
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.download = `affiche-chabbat-${city.name}.jpg`; a.href = url; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const sharePoster = async () => {
    const blob = await generatePosterBlob();
    const file = blob ? new File([blob], `affiche-chabbat-${city.name}.jpg`, { type: "image/jpeg" }) : null;
    const baseText = `🕯️ Chabbat Chalom !\n\n🏛️ ${synaName}\n⏰ Allumage : ${data?.candleLighting || ""}\n🌙 Havdala : ${data?.havdalah || ""}\n📖 Paracha : ${data?.parasha || ""}`;
    if (file && navigator.share && navigator.canShare?.({ files: [file] })) {
      try { await navigator.share({ files: [file], title: "Affiche de Chabbat", text: baseText }); } catch {}
      return;
    }
    if (navigator.share) {
      try { await navigator.share({ title: "Affiche de Chabbat", text: baseText }); return; } catch {}
    }
    // Fallback: download JPG + copy text
    if (blob) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.download = `affiche-chabbat-${city.name}.jpg`; a.href = url; a.click();
      URL.revokeObjectURL(url);
    }
    await navigator.clipboard?.writeText(baseText);
    toast.success("Image téléchargée et texte copié !");
  };

  /** Time input row — uses defaultValue+onBlur to avoid cursor jumping on mobile */
  const TimeInputRow = memo(({ label, value, onChange, noteKey, readOnly = false }: {
    label: string; value: string; onChange?: (v: string) => void; noteKey: string; readOnly?: boolean;
  }) => (
    <div className="rounded-xl border border-border bg-muted/30 p-3">
      <label className="text-xs font-bold text-foreground block mb-2">{label}</label>
      <div className="flex items-center gap-2">
        {readOnly ? (
          <div className="flex-1 px-3 py-2.5 rounded-lg bg-muted border border-border text-foreground text-center text-base font-semibold" style={{ minHeight: "44px", lineHeight: "24px" }}>
            {value || "--:--"}
          </div>
        ) : (
          <input
            key={`time-${noteKey}`}
            type="time"
            defaultValue={value}
            onBlur={e => onChange?.(e.target.value)}
            placeholder="HH:MM"
            className="flex-1 px-3 py-2.5 rounded-lg bg-background border border-border text-foreground text-center text-base font-semibold"
            style={{ minHeight: "44px" }}
          />
        )}
        {!readOnly && value && (
          <button type="button" onClick={() => onChange?.("")}
            className="shrink-0 w-10 h-10 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center text-sm border-none cursor-pointer">
            ✕
          </button>
        )}
      </div>
      {!readOnly && !value && (
        <p className="text-[10px] text-muted-foreground mt-1.5 italic">Saisissez un horaire (ex: 19:30)</p>
      )}
      <input
        key={`note-${noteKey}`}
        defaultValue={notes[noteKey] || ""}
        onBlur={e => setNote(noteKey, e.target.value)}
        placeholder="📝 Note libre (ex: nom de l'officiant)"
        className="w-full mt-2 px-3 py-2 rounded-lg bg-background border border-border text-foreground text-xs"
        style={{ minHeight: "38px" }}
      />
    </div>
  ));

  /** Poster section block */
  const PosterSection = ({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) => (
    <div style={{ border: `1px solid ${t.blockBorder}`, borderRadius: "8px", marginBottom: "8px", overflow: "hidden" }}>
      <div style={{ padding: "6px 12px", borderBottom: `1px solid ${t.blockBorder}` }}>
        <span style={{ fontFamily: "'Playfair Display', serif", fontSize: "0.85rem", fontWeight: 700, color: t.h4Color }}>{icon} {title}</span>
      </div>
      <div style={{ padding: "8px 12px" }}>{children}</div>
    </div>
  );

  const TimeLine = ({ label, value, note, big }: { label: string; value: string; note?: string; big?: boolean }) => (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "8px", padding: "4px 0", borderBottom: `1px solid ${t.blockBorder}22` }}>
      <span style={{ color: t.labelColor, fontSize: big ? "0.85rem" : "0.8rem", fontWeight: 400 }}>{label}</span>
      <span style={{ fontWeight: big ? 800 : 700, color: big ? t.accent : t.valueColor, textAlign: "right", fontSize: big ? "1.1rem" : "0.95rem", whiteSpace: "nowrap" }}>
        {value}{note && <span style={{ fontWeight: 400, fontSize: "0.7rem", color: t.labelColor, fontStyle: "italic", marginLeft: "6px" }}>({note})</span>}
      </span>
    </div>
  );

  const inputClass = "w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30";

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      {/* Step navigation */}
      <div className="grid grid-cols-3 gap-2 mb-5">
        {[1, 2, 3].map(s => (
          <button key={s} onClick={() => setStep(s)} className="flex flex-col items-center justify-center gap-1.5 px-2 py-2.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer border min-h-[56px]"
            style={{ background: step === s ? "hsl(var(--gold) / 0.1)" : "transparent", borderColor: step === s ? "hsl(var(--gold-matte))" : "hsl(var(--border))", color: step === s ? "hsl(var(--gold-matte))" : "hsl(var(--muted-foreground))" }}>
            <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ background: step >= s ? "hsl(var(--gold-matte))" : "hsl(var(--muted))", color: step >= s ? "#fff" : "hsl(var(--muted-foreground))" }}>{s}</span>
            <span className="leading-tight text-center">{s === 1 ? "Horaires" : s === 2 ? "Annonces" : "Partager"}</span>
          </button>
        ))}
      </div>

      {step === 1 && (
        <div className="space-y-4">
          {/* Synagogue info */}
          <div className="rounded-2xl bg-card p-4 border border-border" style={{ boxShadow: "var(--shadow-card)" }}>
            <h4 className="font-display text-sm font-bold text-foreground mb-3">🏛️ Informations</h4>
            <div className="space-y-2.5">
              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1 block">Nom de la synagogue</label>
                <input value={synaName} onChange={e => setSynaName(e.target.value)} placeholder="Ex: Beth Hamidrach..." className={inputClass} />
              </div>
              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1 block">Adresse</label>
                <input value={synaAddress} onChange={e => setSynaAddress(e.target.value)} placeholder="123 rue..." className={inputClass} />
              </div>
              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1 block">Rav de la communauté</label>
                <input value={synaRav} onChange={e => setSynaRav(e.target.value)} placeholder="Rav..." className={inputClass} />
              </div>
            </div>
          </div>

          {/* Horaires */}
          <div className="rounded-2xl bg-card p-4 border border-border" style={{ boxShadow: "var(--shadow-card)" }}>
            <h4 className="font-display text-sm font-bold text-foreground mb-2">⏰ Horaires des offices</h4>
            <p className="text-[10px] text-muted-foreground mb-4">Remplissez uniquement les horaires souhaités. Appuyez sur ✕ pour effacer.</p>
            
            <div className="space-y-3">
              <TimeInputRow label="🕯️ Allumage des bougies" value={data?.candleLighting || ""} noteKey="candleLighting" readOnly />
              <TimeInputRow label="Minha — Vendredi" value={minhaFri} onChange={setMinhaFri} noteKey="minhaFri" />
              <TimeInputRow label="Kabbalat Chabbat" value={kabbalat} onChange={setKabbalat} noteKey="kabbalat" />
              <TimeInputRow label="Arvit — Vendredi soir" value={arvitFri} onChange={setArvitFri} noteKey="arvitFri" />
              
              <div className="border-t border-border pt-3">
                <p className="text-[10px] font-bold text-muted-foreground uppercase mb-3">☀️ Chabbat matin</p>
              </div>
              <TimeInputRow label="Shaharit — Samedi" value={shaharit} onChange={setShaharit} noteKey="shaharit" />
              
              {/* Torah reading — special */}
              <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-2">
                <label className="text-xs font-bold text-foreground block">📖 Lecture de la Torah</label>
                <input value={`Paracha ${data?.parasha || "..."}`} readOnly className="w-full px-3 py-2.5 rounded-lg bg-muted border border-border text-foreground text-sm opacity-60" />
                <input
                  defaultValue={notes.torahReading || ""}
                  onBlur={e => setNote("torahReading", e.target.value)}
                  placeholder="📝 Montée, Haftara, officiant..."
                  className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-xs"
                />
              </div>
              
              <TimeInputRow label="Moussaf" value={moussaf} onChange={setMoussaf} noteKey="moussaf" />
              <TimeInputRow label="Minha — Samedi après-midi" value={minhaSat} onChange={setMinhaSat} noteKey="minhaSat" />
              
              <div className="border-t border-border pt-3">
                <p className="text-[10px] font-bold text-muted-foreground uppercase mb-3">✨ Sortie de Chabbat</p>
              </div>
              <TimeInputRow label="✨ Havdala" value={data?.havdalah || ""} noteKey="havdalah" readOnly />
              <TimeInputRow label="Arvit — Motsé Chabbat" value={arvitMotse} onChange={setArvitMotse} noteKey="arvitMotse" />
            </div>
          </div>

          {/* Theme */}
          <div className="rounded-2xl bg-card p-4 border border-border" style={{ boxShadow: "var(--shadow-card)" }}>
            <h4 className="font-display text-sm font-bold text-foreground mb-3">🎨 Thème</h4>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {(Object.keys(themeConfig) as Theme[]).map(key => {
                const tc = themeConfig[key];
                return (
                  <button key={key} onClick={() => setTheme(key)} className={`rounded-xl p-2 text-center cursor-pointer transition-all border-2 ${theme === key ? "border-primary shadow-md" : "border-border"}`}>
                    <div className="flex rounded-lg overflow-hidden h-5 mb-1">{tc.swatch.map((c, i) => <div key={i} style={{ background: c, flex: 1 }} />)}</div>
                    <span className="text-[9px] font-semibold text-foreground">{tc.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Font */}
          <div className="rounded-2xl bg-card p-4 border border-border" style={{ boxShadow: "var(--shadow-card)" }}>
            <h4 className="font-display text-sm font-bold text-foreground mb-3">✒️ Calligraphie</h4>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(fontConfig) as FontChoice[]).map(key => {
                const fc = fontConfig[key];
                return (
                  <button key={key} onClick={() => setFont(key)} className={`rounded-xl p-2.5 text-center cursor-pointer transition-all border-2 ${font === key ? "border-primary" : "border-border"}`}>
                    <div style={{ fontFamily: fc.family, fontSize: key === "greatvibes" ? "1.2rem" : "1rem", fontWeight: 700 }} className="text-foreground mb-0.5">{fc.sample}</div>
                    <span className="text-[9px] text-muted-foreground">{fc.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <button onClick={() => setStep(2)} className="w-full py-3.5 rounded-xl font-bold text-sm text-primary-foreground border-none cursor-pointer" style={{ background: "var(--gradient-gold)", boxShadow: "var(--shadow-gold)" }}>Suivant → Annonces</button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div className="rounded-2xl bg-card p-4 border border-border" style={{ boxShadow: "var(--shadow-card)" }}>
            <h4 className="font-display text-sm font-bold text-foreground mb-3">📢 Annonces (optionnel)</h4>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">🎉 Séouda / Kiddouch</label>
                <input value={sponsor} onChange={e => setSponsor(e.target.value)} placeholder="Famille Cohen..." className={inputClass} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">📢 Annonce</label>
                <textarea value={announce} onChange={e => setAnnounce(e.target.value)} placeholder="Cours spécial..." rows={2} className={`${inputClass} resize-none`} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">💬 Message du Rav</label>
                <textarea value={ravMessage} onChange={e => setRavMessage(e.target.value)} placeholder="Message inspirant..." rows={2} className={`${inputClass} resize-none`} />
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setStep(1)} className="flex-1 py-3 rounded-xl font-bold text-sm bg-muted text-muted-foreground border border-border cursor-pointer">← Retour</button>
            <button onClick={() => setStep(3)} className="flex-1 py-3 rounded-xl font-bold text-sm text-primary-foreground border-none cursor-pointer" style={{ background: "var(--gradient-gold)" }}>Aperçu →</button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <button onClick={() => setStep(2)} className="text-sm font-bold text-primary bg-transparent border-none cursor-pointer hover:underline">← Modifier</button>
          
          {/* Poster — vertical section layout matching reference */}
          <div className="rounded-2xl overflow-hidden" style={{ padding: "6px", background: "hsl(var(--muted))" }}>
            <div
              id="affiche-export-canvas"
              ref={canvasRef}
              style={{
                background: t.bg,
                border: `2px solid ${t.border}`,
                outline: `0.5px solid ${t.border}`,
                outlineOffset: "3px",
                borderRadius: "6px",
                padding: "24px 18px 16px",
                position: "relative",
                overflow: "hidden",
                color: t.text,
                boxShadow: "0 8px 40px rgba(0,0,0,0.12)",
                colorScheme: "light",
                maxWidth: "100%",
                width: "100%",
              }}
            >
              {/* Corner ornaments */}
              {["top:5px;left:5px", "top:5px;right:5px;transform:rotate(90deg)", "bottom:5px;left:5px;transform:rotate(270deg)", "bottom:5px;right:5px;transform:rotate(180deg)"].map((pos, i) => (
                <div key={i} style={{ position: "absolute", width: "32px", height: "32px", pointerEvents: "none", zIndex: 2, backgroundImage: cornerBg, backgroundSize: "contain", backgroundRepeat: "no-repeat", ...(Object.fromEntries(pos.split(";").map(p => { const [k, v] = p.split(":"); return [k.trim(), v.trim()]; })) as Record<string, string>) }} />
              ))}
              <div style={{ position: "absolute", inset: "8px", border: `0.5px solid ${t.border}33`, pointerEvents: "none", zIndex: 1 }} />

              {/* Header — Synagogue name */}
              <div style={{ textAlign: "center", marginBottom: "10px" }}>
                <div style={{ fontFamily: f.family, fontSize: "clamp(1.1rem, 5vw, 1.5rem)", fontWeight: 700, color: t.valueColor }}>{synaName || "Nom de votre synagogue"}</div>
                {synaAddress && <div style={{ fontSize: "0.65rem", color: t.labelColor, marginTop: "3px" }}>{synaAddress}</div>}
                {synaRav && <div style={{ fontSize: "0.65rem", color: t.labelColor, marginTop: "1px", fontStyle: "italic" }}>{synaRav}</div>}
              </div>

              <div style={{ width: "50px", height: "2px", background: `linear-gradient(90deg, transparent, ${t.accent}, transparent)`, margin: "0 auto 10px" }} />

              {/* Parasha & date */}
              <div style={{ textAlign: "center", marginBottom: "14px" }}>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: "0.8rem", color: t.accent, letterSpacing: "2px", textTransform: "uppercase", marginBottom: "2px" }}>CHABBAT PARACHA</div>
                <div style={{ fontFamily: f.family, fontSize: "clamp(1.3rem, 6vw, 1.8rem)", fontWeight: 800, color: t.valueColor }}>{data?.parasha?.replace("Parashat ", "") || "..."}</div>
                <div style={{ fontSize: "0.75rem", color: t.labelColor, marginTop: "3px" }}>{data?.candleLightingDate || ""}</div>
              </div>

              {loading ? <div style={{ textAlign: "center", padding: "20px" }}>Chargement...</div> : (
                <>
                  {/* Section: Vendredi soir */}
                  <PosterSection icon="🕯️" title="Vendredi soir">
                    <TimeLine label="Allumage des bougies" value={data?.candleLighting || "--:--"} note={notes.candleLighting} big />
                    {minhaFri && <TimeLine label="Minha" value={minhaFri} note={notes.minhaFri} big />}
                    {kabbalat && <TimeLine label="Kabbalat Chabbat" value={kabbalat} note={notes.kabbalat} />}
                    {arvitFri && <TimeLine label="Arvit" value={arvitFri} note={notes.arvitFri} />}
                  </PosterSection>

                  {/* Section: Chabbat matin */}
                  <PosterSection icon="🌅" title="Chabbat matin">
                    {shaharit && <TimeLine label="Shaharit" value={shaharit} note={notes.shaharit} big />}
                    <TimeLine label="Lecture de la Torah" value={data?.parasha?.replace("Parashat ", "") || ""} note={notes.torahReading} />
                    {moussaf && <TimeLine label="Moussaf" value={moussaf} note={notes.moussaf} />}
                  </PosterSection>

                  {/* Section: Chabbat après-midi */}
                  {(minhaSat || notes.minhaSat) && (
                    <PosterSection icon="📚" title="Chabbat après-midi">
                      {minhaSat && <TimeLine label="Minha" value={minhaSat} note={notes.minhaSat} big />}
                    </PosterSection>
                  )}

                  {/* Section: Motsé Chabbat */}
                  <PosterSection icon="✨" title="Motsé Chabbat">
                    <TimeLine label="Havdala" value={data?.havdalah || "--:--"} note={notes.havdalah} big />
                    {arvitMotse && <TimeLine label="Arvit" value={arvitMotse} note={notes.arvitMotse} />}
                  </PosterSection>
                </>
              )}

              {/* Announcements */}
              {sponsor && <div style={{ background: t.blockBg, borderLeft: `3px solid ${t.accent}`, padding: "8px 12px", borderRadius: "0 6px 6px 0", marginBottom: "6px" }}><h4 style={{ color: t.h4Color, fontSize: "0.72rem", marginBottom: "3px" }}>🎉 Séouda / Kiddouch</h4><p style={{ fontSize: "0.68rem", color: t.labelColor }}>{sponsor}</p></div>}
              {announce && <div style={{ background: t.blockBg, borderLeft: `3px solid ${t.accent}`, padding: "8px 12px", borderRadius: "0 6px 6px 0", marginBottom: "6px" }}><h4 style={{ color: t.h4Color, fontSize: "0.72rem", marginBottom: "3px" }}>📢 Annonce</h4><p style={{ fontSize: "0.68rem", color: t.labelColor, textTransform: "uppercase" }}>{announce}</p></div>}
              {ravMessage && <div style={{ background: t.blockBg, borderLeft: `3px solid ${t.accent}`, padding: "8px 12px", borderRadius: "0 6px 6px 0", marginBottom: "6px" }}><h4 style={{ color: t.h4Color, fontSize: "0.72rem", marginBottom: "3px" }}>💬 Message du Rav</h4><p style={{ fontSize: "0.68rem", color: t.labelColor }}>{ravMessage}</p></div>}

              {/* Footer */}
              <div style={{ textAlign: "center", marginTop: "12px", paddingTop: "8px", borderTop: `1px solid ${t.blockBorder}` }}>
                <div style={{ fontFamily: f.family, fontSize: "0.85rem", fontWeight: 700, color: t.valueColor }}>{synaName} — <span style={{ color: t.accent }}>Chabbat Chalom !</span></div>
                <div style={{ fontSize: "0.5rem", color: t.footerColor, marginTop: "4px", letterSpacing: "1px", textTransform: "uppercase" }}>Généré sur chabbat-chalom.com</div>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={handleExport} className="flex-1 py-3 rounded-xl font-bold text-sm text-primary-foreground border-none cursor-pointer" style={{ background: "var(--gradient-gold)", boxShadow: "var(--shadow-gold)" }}>💾 JPG</button>
            <button onClick={sharePoster} className="flex-1 py-3 rounded-xl font-bold text-sm text-primary-foreground border-none cursor-pointer" style={{ background: "var(--gradient-gold)" }}>📤 Partager</button>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default AfficheChabbatWidget;
