import { useMemo } from "react";

interface ZmanPoint {
  label: string;
  hour: number; // decimal hours (e.g. 6.5 = 06:30)
}

/** Thin horizontal progress bar representing the Jewish day with zmanim markers */
const SpiritualTimeline = () => {
  const now = new Date();
  const currentDecimal = now.getHours() + now.getMinutes() / 60;

  // Approximate zmanim for display (visual only)
  const zmanim: ZmanPoint[] = useMemo(() => [
    { label: "Ha'netz", hour: 6.5 },
    { label: "Cha'harit", hour: 8 },
    { label: "Min'ha", hour: 13.5 },
    { label: "Chki'a", hour: 19 },
    { label: "Arvit", hour: 20 },
  ], []);

  // Day window: 5:00 → 22:00
  const dayStart = 5;
  const dayEnd = 22;
  const range = dayEnd - dayStart;
  const progress = Math.max(0, Math.min(100, ((currentDecimal - dayStart) / range) * 100));

  return (
    <div className="mb-8 px-1">
      <div className="text-[9px] uppercase tracking-[2.5px] text-muted-foreground/50 font-medium mb-3">
        Journée spirituelle
      </div>
      <div className="relative">
        {/* Track */}
        <div className="h-1 rounded-full bg-muted/60 relative overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 rounded-full transition-all duration-1000"
            style={{
              width: `${progress}%`,
              background: "linear-gradient(90deg, hsl(var(--gold) / 0.3), hsl(var(--gold-matte)))",
            }}
          />
        </div>

        {/* Zmanim dots */}
        {zmanim.map((z) => {
          const left = ((z.hour - dayStart) / range) * 100;
          if (left < 0 || left > 100) return null;
          const isPast = currentDecimal >= z.hour;
          return (
            <div
              key={z.label}
              className="absolute -top-1 flex flex-col items-center"
              style={{ left: `${left}%`, transform: "translateX(-50%)" }}
            >
              <div
                className="w-2.5 h-2.5 rounded-full border-2 transition-colors"
                style={{
                  borderColor: isPast ? "hsl(var(--gold-matte))" : "hsl(var(--muted-foreground) / 0.25)",
                  background: isPast ? "hsl(var(--gold-matte))" : "hsl(var(--background))",
                }}
              />
              <span
                className="text-[8px] mt-1.5 font-medium whitespace-nowrap"
                style={{ color: isPast ? "hsl(var(--gold-matte))" : "hsl(var(--muted-foreground) / 0.4)" }}
              >
                {z.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SpiritualTimeline;
