import { useSiddourCommentary } from "@/hooks/useSiddourCommentary";
import type { SiddourRite } from "@/hooks/useSiddourRite";
import { Loader2, Quote, RefreshCw } from "lucide-react";

interface Props {
  rite: SiddourRite;
  office: string;
  sectionIndex: number;
  sectionTitle: string;
  hebrew: string[];
}

export default function SiddourSectionCommentary({
  rite, office, sectionIndex, sectionTitle, hebrew,
}: Props) {
  const { paragraphs, loading, error, generate } = useSiddourCommentary(rite, office, sectionIndex);

  if (hebrew.length === 0) return null;

  if (!paragraphs && !loading && !error) {
    return (
      <div className="mt-4 flex justify-center">
        <button
          onClick={() => generate(hebrew, sectionTitle)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold border transition-all active:scale-95"
          style={{
            borderColor: "hsl(var(--primary) / 0.3)",
            color: "hsl(var(--primary))",
            background: "hsl(var(--primary) / 0.05)",
          }}
        >
          <Quote className="w-3.5 h-3.5" />
          Lire un commentaire d'étude
        </button>
      </div>
    );
  }

  if (loading && !paragraphs) {
    return (
      <div className="mt-4 flex justify-center items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        Préparation du commentaire…
      </div>
    );
  }

  if (error && !paragraphs) {
    return (
      <div className="mt-4 flex flex-col items-center gap-2">
        <p className="text-xs text-destructive">{error}</p>
        <button
          onClick={() => generate(hebrew, sectionTitle)}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs border"
          style={{ borderColor: "hsl(var(--border))" }}
        >
          <RefreshCw className="w-3 h-3" /> Réessayer
        </button>
      </div>
    );
  }

  if (!paragraphs) return null;

  return (
    <div
      className="mt-4 px-4 sm:px-6 py-5 rounded-lg"
      style={{ background: "hsl(var(--primary) / 0.04)", borderLeft: "3px solid hsl(var(--primary) / 0.4)" }}
    >
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider inline-flex items-center gap-1.5"
           style={{ color: "hsl(var(--primary))" }}>
          <Quote className="w-3 h-3" /> Commentaire d'étude (IA)
        </p>
        <button
          onClick={() => generate(hebrew, sectionTitle)}
          disabled={loading}
          className="text-[10px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1 disabled:opacity-50"
          aria-label="Régénérer le commentaire"
        >
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
        </button>
      </div>
      <div style={{ fontFamily: "'Lora', 'Georgia', serif", fontSize: "15px", lineHeight: 1.7 }}>
        {paragraphs.map((p, i) => (
          <p key={i} className="mb-3 last:mb-0 text-foreground/90">{p}</p>
        ))}
      </div>
    </div>
  );
}