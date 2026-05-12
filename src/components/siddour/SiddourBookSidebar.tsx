import { useEffect, useRef } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { SIDDOUR_CATEGORIES, getOfficeMeta } from "@/lib/siddourCatalog";
import type { FullSection } from "@/hooks/useSiddourFullOffice";

interface Props {
  currentOffice: string;
  onSelectOffice: (office: string) => void;
  sections: FullSection[];
  activeSectionIndex: number;
  onSelectSection: (index: number) => void;
}

const SiddourBookSidebar = ({
  currentOffice, onSelectOffice, sections, activeSectionIndex, onSelectSection,
}: Props) => {
  const activeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (activeRef.current) {
      activeRef.current.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [activeSectionIndex]);

  const currentMeta = getOfficeMeta(currentOffice);

  return (
    <nav className="h-full overflow-y-auto py-4 pr-2">
      {SIDDOUR_CATEGORIES.map((cat) => {
        const isCurrentCat = cat.offices.some(o => o.key === currentOffice);
        return (
          <div key={cat.id} className="mb-3">
            <div className="flex items-center gap-1.5 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
              <span>{cat.icon}</span>
              <span>{cat.label}</span>
            </div>
            <div className="space-y-px">
              {cat.offices.map((off) => {
                const isActive = off.key === currentOffice;
                return (
                  <div key={off.key}>
                    <button
                      onClick={() => onSelectOffice(off.key)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-left rounded-lg transition-colors text-[13px]"
                      style={{
                        background: isActive ? "hsl(var(--gold) / 0.1)" : "transparent",
                        color: isActive ? "hsl(var(--gold-matte))" : "hsl(var(--foreground))",
                        fontWeight: isActive ? 700 : 500,
                      }}
                    >
                      {isActive ? <ChevronDown className="w-3 h-3 shrink-0" /> : <ChevronRight className="w-3 h-3 shrink-0 opacity-40" />}
                      <span className="text-sm">{off.icon}</span>
                      <span className="flex-1 truncate">{off.label}</span>
                    </button>

                    {/* Sections de l'office actif */}
                    {isActive && sections.length > 0 && (
                      <div className="ml-6 mt-1 mb-2 border-l border-border/40 pl-2 space-y-px">
                        {sections.map((sec, idx) => {
                          const isSecActive = idx === activeSectionIndex;
                          return (
                            <button
                              key={sec.index}
                              ref={isSecActive ? activeRef : undefined}
                              onClick={() => onSelectSection(idx)}
                              className="w-full text-left px-2 py-1.5 rounded-md text-[12px] transition-colors leading-snug"
                              style={{
                                background: isSecActive ? "hsl(var(--gold) / 0.08)" : "transparent",
                                color: isSecActive ? "hsl(var(--gold-matte))" : "hsl(var(--muted-foreground))",
                                fontWeight: isSecActive ? 700 : 500,
                                borderLeft: isSecActive ? "2px solid hsl(var(--gold))" : "2px solid transparent",
                                marginLeft: -10,
                                paddingLeft: 10,
                              }}
                            >
                              <span className="block truncate">{sec.title}</span>
                              {sec.isHazara && (
                                <span className="text-[9px] opacity-60">↻ Hazara</span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </nav>
  );
};

export default SiddourBookSidebar;
