import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface SuggestionRow {
  id: string;
  office_name: string;
  time_value: string | null;
  time_rule: string | null;
  status: string;
  verified: boolean;
  updated_at: string;
}

const OFFICE_LABELS: Record<string, string> = {
  shacharit: "🌅 Cha'harit",
  minha: "🌇 Min'ha",
  arvit: "🌙 Arvit",
};

const formatSuggestionDate = (value: string) =>
  new Date(value).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });

const VerifiedSuggestionsDisplay = ({ synagogueId, placeId }: { synagogueId?: string; placeId?: string }) => {
  const [approvedSuggestions, setApprovedSuggestions] = useState<SuggestionRow[]>([]);
  const [pendingSuggestions, setPendingSuggestions] = useState<SuggestionRow[]>([]);

  useEffect(() => {
    if (!synagogueId && !placeId) {
      setApprovedSuggestions([]);
      setPendingSuggestions([]);
      return;
    }

    let isActive = true;

    const loadSuggestions = async () => {
      let query = (supabase as any)
        .from("prayer_time_suggestions")
        .select("id, office_name, time_value, time_rule, status, verified, updated_at")
        .order("updated_at", { ascending: false });

      if (synagogueId) {
        query = query.eq("synagogue_id", synagogueId);
      } else if (placeId) {
        query = query.eq("place_id", placeId);
      }

      const { data } = await query;
      if (!isActive) return;

      const rows = (data || []) as SuggestionRow[];

      // Deduplicate: keep only the most recent entry per office_name per status group
      const dedup = (list: SuggestionRow[]) => {
        const seen = new Map<string, SuggestionRow>();
        for (const row of list) {
          const existing = seen.get(row.office_name);
          if (!existing || new Date(row.updated_at) > new Date(existing.updated_at)) {
            seen.set(row.office_name, row);
          }
        }
        return Array.from(seen.values());
      };

      const pending = rows.filter((row) => row.status === "pending");
      const approved = rows.filter((row) => row.status === "approved" && row.verified);

      // For pending, exclude offices that already have an approved entry
      const approvedOffices = new Set(approved.map((r) => r.office_name));
      setPendingSuggestions(dedup(pending).filter((r) => !approvedOffices.has(r.office_name)));
      setApprovedSuggestions(dedup(approved));
    };

    void loadSuggestions();
    const intervalId = window.setInterval(() => {
      void loadSuggestions();
    }, 2000);

    return () => {
      isActive = false;
      window.clearInterval(intervalId);
    };
  }, [synagogueId, placeId]);

  if (pendingSuggestions.length === 0 && approvedSuggestions.length === 0) return null;

  return (
    <div className="mt-3 space-y-3">
      {pendingSuggestions.length > 0 && (
        <div className="space-y-1.5">
          <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            <span>⏳</span> Horaires proposés en attente
          </p>
          {pendingSuggestions.map((suggestion) => (
            <div key={suggestion.id} className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 p-2">
              <span className="text-xs font-bold">{OFFICE_LABELS[suggestion.office_name] || suggestion.office_name}</span>
              <span className="text-sm font-bold text-foreground">{suggestion.time_value || suggestion.time_rule}</span>
              <span className="ml-auto rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-bold text-muted-foreground">
                En attente
              </span>
              <span className="text-[9px] text-muted-foreground">{formatSuggestionDate(suggestion.updated_at)}</span>
            </div>
          ))}
        </div>
      )}

      {approvedSuggestions.length > 0 && (
        <div className="space-y-1.5">
          <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            <span style={{ color: "hsl(var(--gold-matte))" }}>✓</span> Horaires vérifiés par la communauté
          </p>
          {approvedSuggestions.map((suggestion) => (
            <div
              key={suggestion.id}
              className="flex items-center gap-2 rounded-lg border p-2"
              style={{ borderColor: "hsl(var(--gold) / 0.2)", background: "hsl(var(--gold) / 0.03)" }}
            >
              <span className="text-xs font-bold">{OFFICE_LABELS[suggestion.office_name] || suggestion.office_name}</span>
              <span className="text-sm font-bold text-foreground">{suggestion.time_value || suggestion.time_rule}</span>
              <span
                className="ml-auto rounded-full px-1.5 py-0.5 text-[9px] font-bold"
                style={{ background: "hsl(var(--gold) / 0.15)", color: "hsl(var(--gold-matte))" }}
              >
                ✓ Vérifié
              </span>
              <span className="text-[9px] text-muted-foreground">{formatSuggestionDate(suggestion.updated_at)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default VerifiedSuggestionsDisplay;
