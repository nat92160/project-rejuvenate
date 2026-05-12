import { Info, AlertTriangle, Sparkles } from "lucide-react";
import type { LiturgicalNote } from "@/lib/siddourLiturgicalNotes";

interface Props {
  notes: LiturgicalNote[];
  compact?: boolean;
}

const TONE_STYLE: Record<LiturgicalNote["tone"], { bg: string; border: string; text: string; icon: JSX.Element }> = {
  info: {
    bg: "hsl(var(--gold) / 0.06)",
    border: "hsl(var(--gold) / 0.25)",
    text: "hsl(var(--gold-matte))",
    icon: <Info className="w-3.5 h-3.5" />,
  },
  warn: {
    bg: "hsl(35 90% 55% / 0.08)",
    border: "hsl(35 90% 45% / 0.4)",
    text: "hsl(28 80% 35%)",
    icon: <AlertTriangle className="w-3.5 h-3.5" />,
  },
  fete: {
    bg: "hsl(var(--primary) / 0.06)",
    border: "hsl(var(--primary) / 0.3)",
    text: "hsl(var(--primary))",
    icon: <Sparkles className="w-3.5 h-3.5" />,
  },
};

const SiddourSectionNotes = ({ notes, compact = false }: Props) => {
  if (!notes || notes.length === 0) return null;

  return (
    <div dir="ltr" className={`${compact ? "my-3" : "mb-6"} space-y-2.5`}>
      {notes.map(n => {
        const s = TONE_STYLE[n.tone];
        return (
          <div
            key={n.id}
            className={`${compact ? "rounded-lg px-3 py-2.5" : "rounded-xl px-3.5 py-3"} flex gap-2.5 text-left`}
            style={{ background: s.bg, border: `1px solid ${s.border}` }}
          >
            <span className="shrink-0 mt-0.5" style={{ color: s.text }}>{s.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="text-[12px] font-bold uppercase tracking-wide" style={{ color: s.text }}>
                {n.title}
              </div>
              <p className="text-[12.5px] sm:text-sm mt-1 leading-relaxed" style={{ color: "hsl(25 30% 22%)" }}>
                {n.body}
              </p>
              {n.todaySay && (
                <div className="mt-2 inline-flex items-center gap-2 rounded-md px-2.5 py-1.5"
                  style={{ background: "hsl(var(--background) / 0.7)", border: `1px dashed ${s.border}` }}>
                  <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: s.text }}>
                    Aujourd'hui :
                  </span>
                  <span dir="rtl" style={{
                    fontFamily: "'Frank Ruhl Libre', 'Noto Serif Hebrew', serif",
                    fontSize: "17px",
                    fontWeight: 700,
                    color: "#111",
                  }}>
                    {n.todaySay}
                  </span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default SiddourSectionNotes;