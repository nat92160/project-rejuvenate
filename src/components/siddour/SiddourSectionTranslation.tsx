import { useSiddourTranslation } from "@/hooks/useSiddourTranslation";
import type { SiddourRite } from "@/hooks/useSiddourRite";
import { Languages, Loader2, RefreshCw } from "lucide-react";
import { useEffect } from "react";

interface Props {
  rite: SiddourRite;
  office: string;
  sectionIndex: number;
  sectionTitle: string;
  hebrew: string[];
  fontSize: number;
  /** Si true, déclenche automatiquement la traduction au montage si pas en cache */
  autoTranslate?: boolean;
}

export default function SiddourSectionTranslation({
  rite, office, sectionIndex, sectionTitle, hebrew, fontSize, autoTranslate,
}: Props) {
  const { french, loading, error, translate } = useSiddourTranslation(rite, office, sectionIndex);

  useEffect(() => {
    if (autoTranslate && !french && !loading && hebrew.length > 0) {
      translate(hebrew, sectionTitle);
    }
  }, [autoTranslate, french, loading, hebrew, sectionTitle, translate]);

  if (hebrew.length === 0) return null;

  if (!french && !loading && !error) {
    return (
      <div className="mt-6 flex justify-center">
        <button
          onClick={() => translate(hebrew, sectionTitle)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold border transition-all active:scale-95"
          style={{
            borderColor: "hsl(var(--gold) / 0.4)",
            color: "hsl(var(--gold-matte))",
            background: "hsl(var(--gold) / 0.05)",
          }}
        >
          <Languages className="w-3.5 h-3.5" />
          Afficher la traduction française
        </button>
      </div>
    );
  }

  if (loading && !french) {
    return (
      <div className="mt-6 flex justify-center items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        Traduction en cours…
      </div>
    );
  }

  if (error && !french) {
    return (
      <div className="mt-6 flex flex-col items-center gap-2">
        <p className="text-xs text-destructive">{error}</p>
        <button
          onClick={() => translate(hebrew, sectionTitle)}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs border"
          style={{ borderColor: "hsl(var(--border))" }}
        >
          <RefreshCw className="w-3 h-3" /> Réessayer
        </button>
      </div>
    );
  }

  if (!french) return null;

  return (
    <div
      className="mt-6 px-4 sm:px-6 py-5 rounded-lg"
      style={{ background: "hsl(var(--muted) / 0.4)", borderLeft: "3px solid hsl(var(--gold) / 0.45)" }}
    >
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "hsl(var(--gold-matte))" }}>
          Traduction française
        </p>
        <button
          onClick={() => translate(hebrew, sectionTitle)}
          disabled={loading}
          className="text-[10px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1 disabled:opacity-50"
          aria-label="Régénérer la traduction"
        >
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
        </button>
      </div>
      <div
        style={{
          fontFamily: "'Lora', 'Georgia', serif",
          fontSize: `${Math.max(14, fontSize - 6)}px`,
          lineHeight: 1.7,
          color: "hsl(var(--foreground))",
        }}
      >
        {french.map((line, i) =>
          line.trim() ? (
            <p key={i} className="mb-2 last:mb-0">{line}</p>
          ) : null
        )}
      </div>
    </div>
  );
}