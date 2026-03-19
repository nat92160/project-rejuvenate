import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { useCity } from "@/hooks/useCity";
import { fetchShabbatTimes, ShabbatTimes } from "@/lib/hebcal";
import { TimeInputRow } from "@/components/affiche-chabbat/TimeInputRow";

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
  torahReader: string;
  shiourSamedi: string;
  freeNote: string;
}

const loadSaved = (): Partial<SavedFormData> => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
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
  const [torahReader, setTorahReader] = useState(saved.current.torahReader || "");
  const [shiourSamedi, setShiourSamedi] = useState(saved.current.shiourSamedi || "");
  const [step, setStep] = useState(1);

  const setNote = useCallback((key: string, val: string) => {
    setNotes((prev) => ({ ...prev, [key]: val }));
  }, []);

  useEffect(() => {
    const toSave: SavedFormData = {
      synaName, synaAddress, synaRav, minhaFri, kabbalat, arvitFri,
      shaharit, moussaf, minhaSat, arvitMotse, sponsor, announce, ravMessage,
      notes, theme, font, torahReader, shiourSamedi,
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    } catch {}
  }, [synaName, synaAddress, synaRav, minhaFri, kabbalat, arvitFri, shaharit, moussaf, minhaSat, arvitMotse, sponsor, announce, ravMessage, notes, theme, font, torahReader, shiourSamedi]);

  useEffect(() => {
    setLoading(true);
    fetchShabbatTimes(city).then((result) => {
      setData(result);
      setLoading(false);
    });
  }, [city]);

  const t = themeConfig[theme];
  const f = fontConfig[font];
  const cornerBg = cornerSvg(t.ornamentColor);

  const generatePosterBlob = async () => {
    if (!canvasRef.current) return null;
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(canvasRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        onclone: (clonedDoc) => {
          clonedDoc.documentElement.classList.remove("dark");
          const el = clonedDoc.getElementById("affiche-export-canvas") as HTMLDivElement | null;
          if (el) {
            el.style.background = t.bg;
            el.style.colorScheme = "light";
          }
        },
      });
      return await new Promise<Blob | null>((resolve) => canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.95));
    } catch {
      return null;
    }
  };

  const handleExport = async () => {
    const blob = await generatePosterBlob();
    if (!blob) {
      alert("Export non disponible.");
      return;
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.download = `affiche-chabbat-${city.name}.jpg`;
    a.href = url;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const sharePoster = async () => {
    const blob = await generatePosterBlob();
    const file = blob ? new File([blob], `affiche-chabbat-${city.name}.jpg`, { type: "image/jpeg" }) : null;
    const baseText = `🕯️ Chabbat Chalom !\n\n🏛️ ${synaName}\n⏰ Allumage : ${data?.candleLighting || ""}\n🌙 Havdala : ${data?.havdalah || ""}\n📖 Paracha : ${data?.parasha || ""}`;
    try {
      if (file && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "Affiche de Chabbat", text: baseText });
        return;
      }
      if (navigator.share) {
        await navigator.share({ title: "Affiche de Chabbat", text: baseText });
        return;
      }
    } catch (err: any) {
      if (err?.name === "AbortError") return;
    }
    if (blob) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.download = `affiche-chabbat-${city.name}.jpg`;
      a.href = url;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
    try {
      await navigator.clipboard.writeText(baseText);
    } catch {}
    toast.success("Image téléchargée et texte copié !");
  };

  const inputClass = "w-full px-4 py-4 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 placeholder:text-muted-foreground/50";

  const PosterSection = ({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) => (
    <div style={{ border: `1px solid ${t.blockBorder}`, borderRadius: "6px", marginBottom: "6px", overflow: "hidden" }}>
      <div style={{ padding: "4px 10px", borderBottom: `1px solid ${t.blockBorder}` }}>
        <span style={{ fontFamily: "'Playfair Display', serif", fontSize: "0.72rem", fontWeight: 700, color: t.h4Color }}>{icon} {title}</span>
      </div>
      <div style={{ padding: "5px 10px" }}>{children}</div>
    </div>
  );

  const TimeLine = ({ label, value, note, big }: { label: string; value: string; note?: string; big?: boolean }) => (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "6px", padding: "3px 0", borderBottom: `1px solid ${t.blockBorder}22` }}>
      <span style={{ color: t.labelColor, fontSize: "0.7rem", fontWeight: 400 }}>{label}</span>
      <span style={{ fontWeight: big ? 700 : 600, color: big ? t.accent : t.valueColor, textAlign: "right", fontSize: big ? "0.8rem" : "0.75rem", whiteSpace: "nowrap" }}>
        {value}{note && <span style={{ fontWeight: 400, fontSize: "0.6rem", color: t.labelColor, fontStyle: "italic", marginLeft: "4px" }}>({note})</span>}
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
            <input value={synaName} onChange={(e) => setSynaName(e.target.value)} placeholder="🏛️ Nom de la synagogue (ex: Beth Hamidrach)" className={inputClass} />
            <input value={synaAddress} onChange={(e) => setSynaAddress(e.target.value)} placeholder="📍 Adresse (ex: 12 rue de la Paix, Paris)" className={inputClass} />
            <input value={synaRav} onChange={(e) => setSynaRav(e.target.value)} placeholder="👤 Rav (ex: Rav David Cohen)" className={inputClass} />
          </div>

          <div className="rounded-2xl bg-card p-4 border border-border" style={{ boxShadow: "var(--shadow-card)" }}>
            <h4 className="font-display text-sm font-bold text-foreground mb-1">⏰ Horaires des offices</h4>
            <p className="text-[10px] text-muted-foreground mb-3">Sur mobile, le libellé passe au-dessus pour garder des champs stables et sans chevauchement.</p>

            <div className="space-y-1">
              <p className="text-[10px] font-bold text-primary uppercase tracking-wider px-1 py-1.5 border-b border-primary/20">🕯️ Vendredi soir</p>
              <TimeInputRow label="🕯️ Allumage (auto)" value={data?.candleLighting || ""} noteValue={notes.candleLighting || ""} onNoteChange={(value) => setNote("candleLighting", value)} readOnly />
              <TimeInputRow label="Minha vendredi" value={minhaFri} noteValue={notes.minhaFri || ""} onChange={setMinhaFri} onNoteChange={(value) => setNote("minhaFri", value)} />
              <TimeInputRow label="Kabbalat Chabbat" value={kabbalat} noteValue={notes.kabbalat || ""} onChange={setKabbalat} onNoteChange={(value) => setNote("kabbalat", value)} />
              <TimeInputRow label="Arvit vendredi" value={arvitFri} noteValue={notes.arvitFri || ""} onChange={setArvitFri} onNoteChange={(value) => setNote("arvitFri", value)} />

              <p className="text-[10px] font-bold text-primary uppercase tracking-wider px-1 py-1.5 border-b border-primary/20 mt-2">☀️ Chabbat matin</p>
              <TimeInputRow label="Shaharit samedi" value={shaharit} noteValue={notes.shaharit || ""} onChange={setShaharit} onNoteChange={(value) => setNote("shaharit", value)} />

              {/* Lecteur de Torah */}
              <div className="space-y-2 py-1.5 sm:grid sm:grid-cols-[minmax(0,1fr)_1fr] sm:items-center sm:gap-2 sm:space-y-0">
                <span className="min-w-0 text-[11px] font-semibold leading-tight text-foreground">📜 Lecteur</span>
                <input
                  type="text"
                  value={torahReader}
                  onChange={(e) => setTorahReader(e.target.value)}
                  placeholder="Nom du lecteur de Torah"
                  className="h-10 w-full rounded-xl border border-input bg-background px-3 text-[11px] text-foreground outline-none transition-colors focus:border-primary/40 focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/60"
                />
              </div>

              <div className="space-y-2 py-1.5 sm:grid sm:grid-cols-[minmax(0,1fr)_1fr] sm:items-center sm:gap-2 sm:space-y-0">
                <span className="min-w-0 text-[11px] font-semibold leading-tight text-foreground">📖 Paracha</span>
                <div className="flex h-10 items-center justify-center rounded-xl border border-border bg-muted px-3 text-center text-xs font-bold text-foreground">
                  {data?.parasha?.replace("Parashat ", "") || "…"}
                </div>
              </div>

              <TimeInputRow label="Moussaf" value={moussaf} noteValue={notes.moussaf || ""} onChange={setMoussaf} onNoteChange={(value) => setNote("moussaf", value)} />
              <TimeInputRow label="Minha samedi" value={minhaSat} noteValue={notes.minhaSat || ""} onChange={setMinhaSat} onNoteChange={(value) => setNote("minhaSat", value)} />

              {/* Shiour après Minha */}
              <div className="space-y-2 py-1.5 sm:grid sm:grid-cols-[minmax(0,1fr)_1fr] sm:items-center sm:gap-2 sm:space-y-0">
                <span className="min-w-0 text-[11px] font-semibold leading-tight text-foreground">📚 Shiour</span>
                <input
                  type="text"
                  value={shiourSamedi}
                  onChange={(e) => setShiourSamedi(e.target.value)}
                  placeholder="Sujet ou Rav du shiour"
                  className="h-10 w-full rounded-xl border border-input bg-background px-3 text-[11px] text-foreground outline-none transition-colors focus:border-primary/40 focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/60"
                />
              </div>

              <p className="text-[10px] font-bold text-primary uppercase tracking-wider px-1 py-1.5 border-b border-primary/20 mt-2">✨ Sortie de Chabbat</p>
              <TimeInputRow label="✨ Havdala (auto)" value={data?.havdalah || ""} noteValue={notes.havdalah || ""} onNoteChange={(value) => setNote("havdalah", value)} readOnly />
              <TimeInputRow label="Arvit Motsé Chabbat" value={arvitMotse} noteValue={notes.arvitMotse || ""} onChange={setArvitMotse} onNoteChange={(value) => setNote("arvitMotse", value)} />
            </div>
          </div>

          <div className="rounded-2xl bg-card p-5 border border-border" style={{ boxShadow: "var(--shadow-card)" }}>
            <h4 className="font-display text-sm font-bold text-foreground mb-3 flex items-center gap-2">🎨 Thème de l'affiche</h4>
            <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-5">
              {(Object.keys(themeConfig) as Theme[]).map((key) => {
                const tc = themeConfig[key];
                return (
                  <button key={key} onClick={() => setTheme(key)} className={`rounded-xl p-2.5 text-center cursor-pointer transition-all border-2 active:scale-95 ${theme === key ? "border-primary shadow-md" : "border-border"}`}>
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
                  <button key={key} onClick={() => setFont(key)} className={`rounded-xl p-3 text-center cursor-pointer transition-all border-2 active:scale-95 ${font === key ? "border-primary shadow-md" : "border-border"}`}>
                    <div style={{ fontFamily: fc.family, fontSize: key === "greatvibes" ? "1.3rem" : "1.1rem", fontWeight: 700, lineHeight: 1.3 }} className="text-foreground mb-1">{fc.sample}</div>
                    <span className="text-[10px] text-muted-foreground font-medium">{fc.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <button onClick={() => setStep(2)} className="w-full py-4 rounded-xl font-bold text-sm text-primary-foreground border-none cursor-pointer active:scale-[0.98] transition-transform" style={{ background: "var(--gradient-gold)", boxShadow: "var(--shadow-gold)" }}>
            Suivant → Annonces
          </button>
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
              <input value={sponsor} onChange={(e) => setSponsor(e.target.value)} placeholder="Ex : Famille Cohen pour la naissance de…" className={inputClass} style={{ minHeight: "52px" }} />
            </div>
            <div>
              <label className="text-xs font-bold text-muted-foreground mb-1.5 block">📢 Annonce communautaire</label>
              <textarea value={announce} onChange={(e) => setAnnounce(e.target.value)} placeholder="Ex : Cours spécial dimanche à 20h, Bar Mitsva de…" rows={3} className={`${inputClass} resize-none`} style={{ minHeight: "88px" }} />
            </div>
            <div>
              <label className="text-xs font-bold text-muted-foreground mb-1.5 block">💬 Message du Rav</label>
              <textarea value={ravMessage} onChange={(e) => setRavMessage(e.target.value)} placeholder="Ex : Pensée de la semaine, message inspirant…" rows={3} className={`${inputClass} resize-none`} style={{ minHeight: "88px" }} />
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
                padding: "18px 14px 12px",
                position: "relative",
                overflow: "hidden",
                color: t.text,
                boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
                colorScheme: "light",
                maxWidth: "100%",
                width: "100%",
              }}
            >
              {["top:5px;left:5px", "top:5px;right:5px;transform:rotate(90deg)", "bottom:5px;left:5px;transform:rotate(270deg)", "bottom:5px;right:5px;transform:rotate(180deg)"].map((pos, index) => (
                <div key={index} style={{ position: "absolute", width: "32px", height: "32px", pointerEvents: "none", zIndex: 2, backgroundImage: cornerBg, backgroundSize: "contain", backgroundRepeat: "no-repeat", ...(Object.fromEntries(pos.split(";").map((part) => { const [property, value] = part.split(":"); return [property.trim(), value.trim()]; })) as Record<string, string>) }} />
              ))}
              <div style={{ position: "absolute", inset: "8px", border: `0.5px solid ${t.border}33`, pointerEvents: "none", zIndex: 1 }} />

              <div style={{ textAlign: "center", marginBottom: "8px" }}>
                <div style={{ fontFamily: f.family, fontSize: "clamp(0.95rem, 4vw, 1.2rem)", fontWeight: 700, color: t.valueColor }}>{synaName || "Nom de votre synagogue"}</div>
                {synaAddress && <div style={{ fontSize: "0.6rem", color: t.labelColor, marginTop: "2px" }}>{synaAddress}</div>}
                {synaRav && <div style={{ fontSize: "0.6rem", color: t.labelColor, marginTop: "1px", fontStyle: "italic" }}>{synaRav}</div>}
              </div>

              <div style={{ width: "40px", height: "1.5px", background: `linear-gradient(90deg, transparent, ${t.accent}, transparent)`, margin: "0 auto 8px" }} />

              <div style={{ textAlign: "center", marginBottom: "10px" }}>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: "0.65rem", color: t.accent, letterSpacing: "2px", textTransform: "uppercase", marginBottom: "2px" }}>CHABBAT PARACHA</div>
                <div style={{ fontFamily: f.family, fontSize: "clamp(1rem, 5vw, 1.3rem)", fontWeight: 800, color: t.valueColor }}>{data?.parasha?.replace("Parashat ", "") || "..."}</div>
                <div style={{ fontSize: "0.65rem", color: t.labelColor, marginTop: "2px" }}>{data?.candleLightingDate || ""}</div>
              </div>

              {loading ? <div style={{ textAlign: "center", padding: "20px" }}>Chargement...</div> : (
                <>
                  <PosterSection icon="🕯️" title="Vendredi soir">
                    <TimeLine label="Allumage des bougies" value={data?.candleLighting || "--:--"} note={notes.candleLighting} big />
                    {minhaFri && <TimeLine label="Minha" value={minhaFri} note={notes.minhaFri} big />}
                    {kabbalat && <TimeLine label="Kabbalat Chabbat" value={kabbalat} note={notes.kabbalat} />}
                    {arvitFri && <TimeLine label="Arvit" value={arvitFri} note={notes.arvitFri} />}
                  </PosterSection>

                  <PosterSection icon="🌅" title="Chabbat matin">
                    {shaharit && <TimeLine label="Shaharit" value={shaharit} note={notes.shaharit} big />}
                    {torahReader && <TimeLine label="Lecteur" value={torahReader} />}
                    <TimeLine label="Lecture de la Torah" value={data?.parasha?.replace("Parashat ", "") || ""} note={notes.torahReading} />
                    {moussaf && <TimeLine label="Moussaf" value={moussaf} note={notes.moussaf} />}
                  </PosterSection>

                  {(minhaSat || notes.minhaSat || shiourSamedi) && (
                    <PosterSection icon="📚" title="Chabbat après-midi">
                      {minhaSat && <TimeLine label="Minha" value={minhaSat} note={notes.minhaSat} big />}
                      {shiourSamedi && <TimeLine label="Shiour" value={shiourSamedi} />}
                    </PosterSection>
                  )}

                  <PosterSection icon="✨" title="Motsé Chabbat">
                    <TimeLine label="Havdala" value={data?.havdalah || "--:--"} note={notes.havdalah} big />
                    {arvitMotse && <TimeLine label="Arvit" value={arvitMotse} note={notes.arvitMotse} />}
                  </PosterSection>
                </>
              )}

              {sponsor && <div style={{ background: t.blockBg, borderLeft: `2px solid ${t.accent}`, padding: "5px 10px", borderRadius: "0 4px 4px 0", marginBottom: "4px" }}><h4 style={{ color: t.h4Color, fontSize: "0.65rem", marginBottom: "2px" }}>🎉 Séouda / Kiddouch</h4><p style={{ fontSize: "0.6rem", color: t.labelColor }}>{sponsor}</p></div>}
              {announce && <div style={{ background: t.blockBg, borderLeft: `2px solid ${t.accent}`, padding: "5px 10px", borderRadius: "0 4px 4px 0", marginBottom: "4px" }}><h4 style={{ color: t.h4Color, fontSize: "0.65rem", marginBottom: "2px" }}>📢 Annonce</h4><p style={{ fontSize: "0.6rem", color: t.labelColor, textTransform: "uppercase" }}>{announce}</p></div>}
              {ravMessage && <div style={{ background: t.blockBg, borderLeft: `2px solid ${t.accent}`, padding: "5px 10px", borderRadius: "0 4px 4px 0", marginBottom: "4px" }}><h4 style={{ color: t.h4Color, fontSize: "0.65rem", marginBottom: "2px" }}>💬 Message du Rav</h4><p style={{ fontSize: "0.6rem", color: t.labelColor }}>{ravMessage}</p></div>}

              <div style={{ textAlign: "center", marginTop: "8px", paddingTop: "6px", borderTop: `1px solid ${t.blockBorder}` }}>
                <div style={{ fontFamily: f.family, fontSize: "0.75rem", fontWeight: 700, color: t.valueColor }}>{synaName} — <span style={{ color: t.accent }}>Chabbat Chalom !</span></div>
                <div style={{ fontSize: "0.45rem", color: t.footerColor, marginTop: "3px", letterSpacing: "1px", textTransform: "uppercase" }}>Généré sur chabbat-chalom.com</div>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={handleExport} className="flex-1 py-4 rounded-xl font-bold text-sm text-primary-foreground border-none cursor-pointer active:scale-95 transition-transform" style={{ background: "var(--gradient-gold)", boxShadow: "var(--shadow-gold)" }}>💾 Télécharger JPG</button>
            <button onClick={sharePoster} className="flex-1 py-4 rounded-xl font-bold text-sm text-primary-foreground border-none cursor-pointer active:scale-95 transition-transform" style={{ background: "var(--gradient-gold)" }}>📤 Partager</button>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default AfficheChabbatWidget;
