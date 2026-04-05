import { useState } from "react";
import { motion } from "framer-motion";
import { BIRKAT_HAMAZONE } from "@/lib/brakhot-data";

interface Props {
  onBack: () => void;
}

const BirkatHamazoneReader = ({ onBack }: Props) => {
  const [selectedVersion, setSelectedVersion] = useState("sefarade");
  const version = BIRKAT_HAMAZONE.find((v) => v.id === selectedVersion) || BIRKAT_HAMAZONE[0];

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="h-9 w-9 rounded-full bg-muted flex items-center justify-center border-none cursor-pointer text-foreground font-bold text-sm"
        >
          ←
        </button>
        <div>
          <h3 className="font-display text-base font-bold text-foreground">🍞 Birkat HaMazone</h3>
          <p className="text-[11px] text-muted-foreground">Bénédiction après le repas avec pain</p>
        </div>
      </div>

      {/* Version selector */}
      <div className="flex gap-2">
        {BIRKAT_HAMAZONE.map((v) => (
          <button
            key={v.id}
            onClick={() => setSelectedVersion(v.id)}
            className="flex-1 py-2.5 rounded-xl text-[11px] font-bold border-none cursor-pointer transition-all"
            style={{
              background: selectedVersion === v.id ? "hsl(var(--gold) / 0.15)" : "hsl(var(--muted))",
              color: selectedVersion === v.id ? "hsl(var(--gold-matte))" : "hsl(var(--muted-foreground))",
            }}
          >
            {v.name}
          </button>
        ))}
      </div>

      {/* Reading mode */}
      <div
        className="rounded-2xl border border-border p-5 space-y-6"
        style={{ background: "hsl(var(--card))", boxShadow: "var(--shadow-card)" }}
      >
        <p className="text-center text-xs font-bold uppercase tracking-wider" style={{ color: "hsl(var(--gold-matte))" }}>
          {version.name}
        </p>

        {version.paragraphs.map((para, i) => (
          <div key={i} className="space-y-2">
            <p
              className="text-lg leading-[2.4] font-semibold text-right"
              style={{
                direction: "rtl",
                fontFamily: "'Frank Ruhl Libre', 'Noto Serif Hebrew', serif",
                fontFeatureSettings: "'kern', 'mark', 'mkmk'",
                color: "hsl(var(--foreground))",
              }}
            >
              {para.hebrew}
            </p>
            {para.transliteration && (
              <p className="text-xs text-muted-foreground italic">{para.transliteration}</p>
            )}
            {i < version.paragraphs.length - 1 && (
              <div className="border-t border-border/50 pt-2" />
            )}
          </div>
        ))}
      </div>

      {/* Note */}
      <div className="rounded-xl p-3 border border-primary/15 text-center" style={{ background: "hsl(var(--gold) / 0.04)" }}>
        <p className="text-[11px] text-muted-foreground">
          ⚠️ Le Birkat HaMazone est obligatoire après avoir mangé du pain (≥27g).
          <br />En cas de doute sur le nossakh, consultez votre Rav.
        </p>
      </div>
    </motion.div>
  );
};

export default BirkatHamazoneReader;
