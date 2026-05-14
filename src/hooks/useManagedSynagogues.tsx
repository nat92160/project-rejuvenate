import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const SYNAGOGUES_CHANGED_EVENT = "calj:synagogues-changed";

export interface ManagedSynagogue {
  id: string;
  name: string;
  logo_url: string | null;
  signature: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  font_family: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  president_id?: string | null;
  adjoint_id?: string | null;
  created_at?: string | null;
}

const SELECT_FIELDS = "id, name, logo_url, signature, primary_color, secondary_color, font_family, address, phone, email, president_id, adjoint_id, created_at";

export const managedSynagogueStorageKey = (userId: string) => `calj_selected_synagogue_id_${userId}`;

export const notifySynagoguesChanged = () => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(SYNAGOGUES_CHANGED_EVENT));
  }
};

export const useManagedSynagogues = () => {
  const { user } = useAuth();
  const userId = user?.id || null;
  const [synagogues, setSynagogues] = useState<ManagedSynagogue[]>([]);
  const [selectedId, setSelectedIdState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const setSelectedId = useCallback((id: string | null) => {
    setSelectedIdState(id);
    if (userId && id) localStorage.setItem(managedSynagogueStorageKey(userId), id);
    notifySynagoguesChanged();
  }, [userId]);

  const refresh = useCallback(async () => {
    if (!userId) {
      setSynagogues([]);
      setSelectedIdState(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const [presidentRes, adjointRes] = await Promise.all([
      (supabase.from("synagogue_profiles").select(SELECT_FIELDS) as any).eq("president_id", userId).order("created_at", { ascending: true }),
      (supabase.from("synagogue_profiles").select(SELECT_FIELDS) as any).eq("adjoint_id", userId).order("created_at", { ascending: true }),
    ]);

    const merged = [...(presidentRes.data || []), ...(adjointRes.data || [])];
    const byId = new Map<string, ManagedSynagogue>();
    merged.forEach((row: any) => {
      if (row?.id) byId.set(row.id, { ...row, name: row.name || "Sans nom" });
    });
    const list = Array.from(byId.values()).sort((a, b) => (a.created_at || "").localeCompare(b.created_at || ""));

    setSynagogues(list);
    setSelectedIdState((current) => {
      const saved = localStorage.getItem(managedSynagogueStorageKey(userId));
      const candidate = saved || current;
      const next = candidate && list.some((s) => s.id === candidate) ? candidate : (list[0]?.id || null);
      if (next) localStorage.setItem(managedSynagogueStorageKey(userId), next);
      return next;
    });
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const onChanged = () => void refresh();
    window.addEventListener(SYNAGOGUES_CHANGED_EVENT, onChanged);
    return () => window.removeEventListener(SYNAGOGUES_CHANGED_EVENT, onChanged);
  }, [refresh]);

  const selectedSynagogue = useMemo(
    () => synagogues.find((s) => s.id === selectedId) || null,
    [synagogues, selectedId]
  );

  return {
    synagogues,
    selectedId,
    selectedSynagogue,
    synagogueId: selectedId,
    setSelectedId,
    loading,
    refresh,
  };
};