import { useRef, useEffect } from "react";

interface Section {
  index: number;
  title: string;
}

interface SiddourQuickJumpProps {
  sections: Section[];
  activeIndex: number;
  onJump: (index: number) => void;
  prayerMode?: boolean;
}

const SiddourQuickJump = ({ sections, activeIndex, onJump, prayerMode = false }: SiddourQuickJumpProps) => {
  const activeRef = useRef<HTMLButtonElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeRef.current && containerRef.current) {
      const container = containerRef.current;
      const el = activeRef.current;
      const left = el.offsetLeft - container.offsetWidth / 2 + el.offsetWidth / 2;
      container.scrollTo({ left, behavior: "smooth" });
    }
  }, [activeIndex]);

  if (sections.length <= 1) return null;

  return (
    <div
      className="sticky top-0 z-30 backdrop-blur-md border-b"
      style={{
        background: prayerMode ? "rgba(0,0,0,0.85)" : "rgba(255,255,255,0.9)",
        borderColor: prayerMode ? "rgba(255,255,255,0.06)" : "hsl(var(--border) / 0.5)",
      }}
    >
      <div ref={containerRef} className="flex gap-1 overflow-x-auto scrollbar-none px-3 py-2">
        {sections.map((sec) => {
          const isActive = sec.index === activeIndex;
          return (
            <button
              key={sec.index}
              ref={isActive ? activeRef : undefined}
              onClick={() => onJump(sec.index)}
              className="shrink-0 rounded-lg border-none px-2.5 py-1.5 text-[9px] font-bold cursor-pointer transition-all whitespace-nowrap active:scale-95"
              style={{
                background: isActive ? "var(--gradient-gold)" : "transparent",
                color: isActive
                  ? "hsl(var(--primary-foreground))"
                  : (prayerMode ? "#777" : "hsl(var(--muted-foreground))"),
                boxShadow: isActive ? "var(--shadow-gold)" : "none",
              }}
            >
              {sec.title}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default SiddourQuickJump;
