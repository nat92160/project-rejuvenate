import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useSynaProfile } from "@/hooks/useSynaProfile";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import SynagogueChat from "./SynagogueChat";

interface ChatRequest {
  id: string;
  user_id: string;
  display_name: string;
  status: "pending" | "approved" | "rejected" | "blocked";
  created_at: string;
}

const STATUS_ORDER: Record<ChatRequest["status"], number> = {
  pending: 0,
  approved: 1,
  blocked: 2,
  rejected: 3,
};

const ChatManagement = () => {
  const { synagogueId, profile: synaProfile } = useSynaProfile();
  const [chatEnabled, setChatEnabled] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [requests, setRequests] = useState<ChatRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"chat" | "requests">("requests");

  const fetchData = async () => {
    if (!synagogueId) return;
    setLoading(true);

    const [synaRes, reqRes] = await Promise.all([
      supabase.from("synagogue_profiles").select("chat_enabled").eq("id", synagogueId).maybeSingle(),
      supabase.from("synagogue_chat_requests").select("*").eq("synagogue_id", synagogueId).order("created_at", { ascending: false }),
    ]);

    setChatEnabled(synaRes.data?.chat_enabled ?? false);
    setRequests(((reqRes.data as ChatRequest[] | null) ?? []).sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]));
    setLoading(false);
  };

  useEffect(() => {
    void fetchData();
  }, [synagogueId]);

  useEffect(() => {
    if (!synagogueId) return;

    const channel = supabase
      .channel(`chat-req-${synagogueId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "synagogue_chat_requests", filter: `synagogue_id=eq.${synagogueId}` },
        () => {
          void fetchData();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [synagogueId]);

  const toggleChat = async () => {
    if (!synagogueId) return;

    setToggling(true);
    const nextValue = !chatEnabled;

    const { error } = await supabase
      .from("synagogue_profiles")
      .update({ chat_enabled: nextValue } as never)
      .eq("id", synagogueId);

    if (error) {
      toast.error("Erreur");
    } else {
      setChatEnabled(nextValue);
      if (!nextValue && tab === "chat") setTab("requests");
      toast.success(nextValue ? "Chat activé !" : "Chat désactivé");
    }

    setToggling(false);
  };

  const updateRequestStatus = async (reqId: string, status: ChatRequest["status"]) => {
    const { error } = await supabase
      .from("synagogue_chat_requests")
      .update({ status, reviewed_at: new Date().toISOString() } as never)
      .eq("id", reqId);

    if (error) {
      toast.error("Erreur");
      return;
    }

    toast.success(
      status === "approved"
        ? "Accès accordé !"
        : status === "blocked"
          ? "Utilisateur bloqué"
          : "Demande refusée"
    );

    void fetchData();
  };

  const pendingCount = requests.filter((request) => request.status === "pending").length;
  const approvedCount = requests.filter((request) => request.status === "approved").length;
  const blockedCount = requests.filter((request) => request.status === "blocked").length;

  if (!synagogueId) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center" style={{ boxShadow: "var(--shadow-card)" }}>
        <span className="text-4xl">💬</span>
        <p className="mt-3 text-sm text-muted-foreground">Créez d'abord votre profil synagogue dans "Mon Espace Syna".</p>
      </div>
    );
  }

  if (loading) {
    return <div className="py-10 text-center text-sm text-muted-foreground">Chargement…</div>;
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      <div className="rounded-2xl border border-border bg-card p-5" style={{ boxShadow: "var(--shadow-card)" }}>
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="flex items-center gap-2 font-display text-sm font-bold text-foreground">💬 Chat communautaire</h3>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {chatEnabled
                ? `${approvedCount} autorisé${approvedCount > 1 ? "s" : ""} · ${pendingCount} en attente · ${blockedCount} bloqué${blockedCount > 1 ? "s" : ""}`
                : "Désactivé — les fidèles doivent attendre votre activation et votre approbation."}
            </p>
          </div>
          <Switch checked={chatEnabled} onCheckedChange={toggleChat} disabled={toggling} />
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setTab("requests")}
          className="relative flex-1 rounded-xl border-none py-2 text-xs font-bold transition-all active:scale-95 cursor-pointer"
          style={{
            background: tab === "requests" ? "var(--gradient-gold)" : "hsl(var(--muted))",
            color: tab === "requests" ? "hsl(var(--primary-foreground))" : "hsl(var(--muted-foreground))",
            boxShadow: tab === "requests" ? "var(--shadow-gold)" : "none",
          }}
        >
          🙋 Accès & blocage
          {pendingCount > 0 && (
            <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground">
              {pendingCount}
            </span>
          )}
        </button>
        <button
          onClick={() => chatEnabled && setTab("chat")}
          disabled={!chatEnabled}
          className="flex-1 rounded-xl border-none py-2 text-xs font-bold transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
          style={{
            background: tab === "chat" ? "var(--gradient-gold)" : "hsl(var(--muted))",
            color: tab === "chat" ? "hsl(var(--primary-foreground))" : "hsl(var(--muted-foreground))",
            boxShadow: tab === "chat" ? "var(--shadow-gold)" : "none",
          }}
        >
          💬 Chat
        </button>
      </div>

      {tab === "chat" && chatEnabled && (
        <SynagogueChat synagogueId={synagogueId} synagogueName={synaProfile.name || "Ma Synagogue"} isPresident />
      )}

      {tab === "requests" && (
        <div className="space-y-2">
          {requests.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-8 text-center" style={{ boxShadow: "var(--shadow-card)" }}>
              <span className="text-3xl">📭</span>
              <p className="mt-3 text-sm text-muted-foreground">Aucune demande pour le moment.</p>
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {requests.map((req) => (
                <motion.div
                  key={req.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-2xl border border-border bg-card p-4"
                  style={{ boxShadow: "var(--shadow-card)" }}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-foreground">{req.display_name || "Utilisateur"}</p>
                      <p className="mt-0.5 text-[10px] text-muted-foreground">
                        {new Date(req.created_at).toLocaleDateString("fr-FR", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {req.status === "pending" && (
                        <>
                          <span className="rounded-full bg-muted px-2 py-1 text-[10px] font-bold text-muted-foreground">⏳ En attente</span>
                          <button
                            onClick={() => void updateRequestStatus(req.id, "approved")}
                            className="rounded-lg border-none px-3 py-1.5 text-[11px] font-bold text-primary-foreground transition-all active:scale-95 cursor-pointer"
                            style={{ background: "var(--gradient-gold)" }}
                          >
                            ✅ Accepter
                          </button>
                          <button
                            onClick={() => void updateRequestStatus(req.id, "rejected")}
                            className="rounded-lg border border-border bg-muted px-3 py-1.5 text-[11px] font-bold text-muted-foreground transition-all active:scale-95 cursor-pointer"
                          >
                            ❌ Refuser
                          </button>
                        </>
                      )}

                      {req.status === "approved" && (
                        <>
                          <span className="rounded-full bg-primary/10 px-2 py-1 text-[10px] font-bold text-primary">✅ Autorisé</span>
                          <button
                            onClick={() => void updateRequestStatus(req.id, "blocked")}
                            className="rounded-lg border-none px-3 py-1.5 text-[11px] font-bold transition-all active:scale-95 cursor-pointer"
                            style={{ background: "hsl(var(--destructive))", color: "hsl(var(--destructive-foreground))" }}
                          >
                            🚫 Bloquer
                          </button>
                        </>
                      )}

                      {req.status === "blocked" && (
                        <>
                          <span className="rounded-full bg-destructive/10 px-2 py-1 text-[10px] font-bold text-destructive">🚫 Bloqué</span>
                          <button
                            onClick={() => void updateRequestStatus(req.id, "approved")}
                            className="rounded-lg border-none px-3 py-1.5 text-[11px] font-bold text-primary-foreground transition-all active:scale-95 cursor-pointer"
                            style={{ background: "var(--gradient-gold)" }}
                          >
                            🔓 Débloquer
                          </button>
                        </>
                      )}

                      {req.status === "rejected" && (
                        <>
                          <span className="rounded-full bg-destructive/10 px-2 py-1 text-[10px] font-bold text-destructive">❌ Refusé</span>
                          <button
                            onClick={() => void updateRequestStatus(req.id, "approved")}
                            className="rounded-lg border border-border bg-muted px-3 py-1.5 text-[11px] font-bold text-foreground transition-all active:scale-95 cursor-pointer"
                          >
                            Autoriser
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      )}
    </motion.div>
  );
};

export default ChatManagement;
