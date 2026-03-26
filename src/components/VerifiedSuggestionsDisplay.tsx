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

const OFFICE_EMOJI: Record<string, string> = {
  shacharit: "🌅",
  minha: "🌇",
  arvit: "🌙",
};

const OFFICE_ORDER = ["shacharit", "minha", "arvit"];

const formatSuggestionDate = (value: string) =>
  new Date(value).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });

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

interface Props {
  synagogueId?: string;
  placeId?: string;
}

const VerifiedSuggestionsDisplay = ({ synagogueId, placeId }: Props) => {
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
      const pending = rows.filter((row) => row.status === "pending");
      const approved = rows.filter((row) => row.status === "approved" && row.verified);

      const approvedOffices = new Set(approved.map((r) => r.office_name));
      setPendingSuggestions(dedup(pending).filter((r) => !approvedOffices.has(r.office_name)));
      setApprovedSuggestions(dedup(approved));
    };

    void loadSuggestions();
    const intervalId = window.setInterval(() => void loadSuggestions(), 2000);

    return () => {
      isActive = false;
      window.clearInterval(intervalId);
    };
  }, [synagogueId, placeId]);

  if (pendingSuggestions.length === 0 && approvedSuggestions.length === 0) return null;

  // Sort by office order
  const sortByOffice = (a: SuggestionRow, b: SuggestionRow) =>
    OFFICE_ORDER.indexOf(a.office_name) - OFFICE_ORDER.indexOf(b.office_name);

  const sortedApproved = [...approvedSuggestions].sort(sortByOffice);
  const sortedPending = [...pendingSuggestions].sort(sortByOffice);

  return (
    <div className="mt-2 space-y-2">
      {/* Inline compact display like partner cards */}
      {sortedApproved.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {sortedApproved.map((s) => (
            <span key={s.id} className="text-[10px] font-bold text-primary/80">
              {OFFICE_EMOJI[s.office_name] || "⏰"} {s.time_value?.slice(0, 5) || s.time_rule}
            </span>
          ))}
        </div>
      )}

      {/* Pending suggestions */}
      {sortedPending.length > 0 && (
        <div className="space-y-1">
          <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            <span>⏳</span> Horaires proposés en attente
          </p>
          {sortedPending.map((suggestion) => (
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
    </div>
  );
};

export default VerifiedSuggestionsDisplay;
