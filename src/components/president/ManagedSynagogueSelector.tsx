import { Building2, ChevronDown } from "lucide-react";
import { useManagedSynagogues } from "@/hooks/useManagedSynagogues";

interface ManagedSynagogueSelectorProps {
  label?: string;
  compact?: boolean;
}

const ManagedSynagogueSelector = ({ label = "Synagogue concernée", compact = false }: ManagedSynagogueSelectorProps) => {
  const { synagogues, selectedId, selectedSynagogue, setSelectedId, loading } = useManagedSynagogues();

  if (loading || synagogues.length === 0 || !selectedSynagogue) return null;

  if (synagogues.length === 1) {
    return (
      <div className="rounded-xl border border-border bg-muted/30 px-3 py-2.5 text-sm text-foreground">
        <div className="flex items-center gap-2 min-w-0">
          <Building2 className="h-4 w-4 shrink-0 text-primary/70" />
          <span className="truncate font-semibold">{selectedSynagogue.name}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={compact ? "space-y-1.5" : "rounded-2xl border border-primary/15 bg-card p-3"} style={compact ? undefined : { boxShadow: "var(--shadow-card)" }}>
      <label className="mb-1.5 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-primary/70">
        <Building2 className="h-3.5 w-3.5" /> {label} ({synagogues.length})
      </label>
      <div className="relative">
        <select
          value={selectedId || ""}
          onChange={(e) => setSelectedId(e.target.value)}
          className="w-full appearance-none rounded-xl border border-border bg-background px-3 py-2.5 pr-9 text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer"
        >
          {synagogues.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      </div>
    </div>
  );
};

export default ManagedSynagogueSelector;