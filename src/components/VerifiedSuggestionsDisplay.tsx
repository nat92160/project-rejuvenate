import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface VerifiedSuggestion {
  id: string;
  office_name: string;
  time_value: string | null;
  time_rule: string | null;
  display_name: string;
  updated_at: string;
}

const OFFICE_LABELS: Record<string, string> = {
  shacharit: "🌅 Cha'harit",
  minha: "🌇 Min'ha",
  arvit: "🌙 Arvit",
};

const VerifiedSuggestionsDisplay = ({ synagogueId }: { synagogueId: string }) => {
  const [suggestions, setSuggestions] = useState<VerifiedSuggestion[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any)
        .from("prayer_time_suggestions")
        .select("id, office_name, time_value, time_rule, display_name, updated_at")
        .eq("synagogue_id", synagogueId)
        .eq("status", "approved")
        .eq("verified", true)
        .order("updated_at", { ascending: false });
      setSuggestions(data || []);
    })();
  }, [synagogueId]);

  if (suggestions.length === 0) return null;

  return (
    <div className="mt-3 space-y-1.5">
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
        <span style={{ color: "hsl(var(--gold-matte))" }}>✓</span> Horaires vérifiés par la communauté
      </p>
      {suggestions.map((s) => (
        <div
          key={s.id}
          className="flex items-center gap-2 rounded-lg border p-2"
          style={{ borderColor: "hsl(var(--gold) / 0.2)", background: "hsl(var(--gold) / 0.03)" }}
        >
          <span className="text-xs font-bold">{OFFICE_LABELS[s.office_name] || s.office_name}</span>
          <span className="text-sm font-bold text-foreground">{s.time_value || s.time_rule}</span>
          <span
            className="ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded-full"
            style={{ background: "hsl(var(--gold) / 0.15)", color: "hsl(var(--gold-matte))" }}
          >
            ✓ Vérifié
          </span>
          <span className="text-[9px] text-muted-foreground">
            {new Date(s.updated_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
          </span>
        </div>
      ))}
    </div>
  );
};

export default VerifiedSuggestionsDisplay;
