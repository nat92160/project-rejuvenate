import { COMPLEX_CASES } from "@/lib/brakhot-data";

const ComplexCasesSection = () => {
  return (
    <div className="space-y-2 pt-1">
      {COMPLEX_CASES.map((c) => (
        <div
          key={c.title}
          className="rounded-xl border border-border p-4"
          style={{ background: "hsl(var(--card))" }}
        >
          <p className="text-sm font-bold text-foreground flex items-center gap-2 mb-2">
            <span>{c.icon}</span> {c.title}
          </p>
          <p className="text-[11px] text-muted-foreground leading-relaxed">{c.explanation}</p>
        </div>
      ))}
    </div>
  );
};

export default ComplexCasesSection;
