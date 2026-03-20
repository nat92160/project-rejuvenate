import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSynaProfile } from "@/hooks/useSynaProfile";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import SynagogueChat from "./SynagogueChat";

interface ChatRequest {
  id: string;
  user_id: string;
  display_name: string;
  status: string;
  created_at: string;
}

const ChatManagement = () => {
  const { user } = useAuth();
  const { synagogueId, profile: synaProfile } = useSynaProfile();
  const [chatEnabled, setChatEnabled] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [requests, setRequests] = useState<ChatRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"chat" | "requests">("chat");

  // Fetch chat status + requests
  const fetchData = async () => {
    if (!synagogueId) return;
    setLoading(true);

    const [synaRes, reqRes] = await Promise.all([
      supabase.from("synagogue_profiles").select("chat_enabled").eq("id", synagogueId).single(),
      supabase.from("synagogue_chat_requests").select("*").eq("synagogue_id", synagogueId).order("created_at", { ascending: false }),
    ]);

    setChatEnabled(synaRes.data?.chat_enabled ?? false);
    setRequests((reqRes.data as ChatRequest[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [synagogueId]);

  // Realtime for requests
  useEffect(() => {
    if (!synagogueId) return;
    const channel = supabase
      .channel(`chat-req-${synagogueId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "synagogue_chat_requests", filter: `synagogue_id=eq.${synagogueId}` }, () => fetchData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [synagogueId]);

  const toggleChat = async () => {
    if (!synagogueId) return;
    setToggling(true);
    const newVal = !chatEnabled;
    const { error } = await supabase
      .from("synagogue_profiles")
      .update({ chat_enabled: newVal } as any)
      .eq("id", synagogueId);
    if (error) toast.error("Erreur");
    else {
      setChatEnabled(newVal);
      toast.success(newVal ? "Chat activé !" : "Chat désactivé");
    }
    setToggling(false);
  };

  const handleRequest = async (reqId: string, status: "approved" | "rejected") => {
    const { error } = await supabase
      .from("synagogue_chat_requests")
      .update({ status, reviewed_at: new Date().toISOString() } as any)
      .eq("id", reqId);
    if (error) toast.error("Erreur");
    else {
      toast.success(status === "approved" ? "Accès accordé !" : "Demande refusée");
      fetchData();
    }
  };

  const handleRemoveAccess = async (reqId: string) => {
    await supabase.from("synagogue_chat_requests").delete().eq("id", reqId);
    toast.success("Accès retiré");
    fetchData();
  };

  const pendingCount = requests.filter(r => r.status === "pending").length;
  const approvedCount = requests.filter(r => r.status === "approved").length;

  if (!synagogueId) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center" style={{ boxShadow: "var(--shadow-card)" }}>
        <span className="text-4xl">💬</span>
        <p className="mt-3 text-sm text-muted-foreground">Créez d'abord votre profil synagogue dans "Mon Espace Syna".</p>
      </div>
    );
  }

  if (loading) return <div className="py-10 text-center text-sm text-muted-foreground">Chargement…</div>;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      {/* Toggle + info */}
      <div className="rounded-2xl border border-border bg-card p-5" style={{ boxShadow: "var(--shadow-card)" }}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-display text-sm font-bold text-foreground flex items-center gap-2">💬 Chat communautaire</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {chatEnabled ? `Activé — ${approvedCount} membre${approvedCount !== 1 ? "s" : ""} autorisé${approvedCount !== 1 ? "s" : ""}` : "Désactivé — les fidèles ne peuvent pas accéder au chat"}
            </p>
          </div>
          <Switch checked={chatEnabled} onCheckedChange={toggleChat} disabled={toggling} />
        </div>
      </div>

      {chatEnabled && (
        <>
          {/* Sub-tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => setTab("chat")}
              className="flex-1 py-2 rounded-xl text-xs font-bold border-none cursor-pointer transition-all active:scale-95"
              style={{
                background: tab === "chat" ? "var(--gradient-gold)" : "hsl(var(--muted))",
                color: tab === "chat" ? "hsl(var(--primary-foreground))" : "hsl(var(--muted-foreground))",
                boxShadow: tab === "chat" ? "var(--shadow-gold)" : "none",
              }}
            >
              💬 Chat
            </button>
            <button
              onClick={() => setTab("requests")}
              className="flex-1 py-2 rounded-xl text-xs font-bold border-none cursor-pointer transition-all active:scale-95 relative"
              style={{
                background: tab === "requests" ? "var(--gradient-gold)" : "hsl(var(--muted))",
                color: tab === "requests" ? "hsl(var(--primary-foreground))" : "hsl(var(--muted-foreground))",
                boxShadow: tab === "requests" ? "var(--shadow-gold)" : "none",
              }}
            >
              🙋 Demandes
              {pendingCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground text-[9px] font-bold rounded-full h-4 w-4 flex items-center justify-center">
                  {pendingCount}
                </span>
              )}
            </button>
          </div>

          {tab === "chat" && (
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
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-bold text-foreground">{req.display_name || "Utilisateur"}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {new Date(req.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {req.status === "pending" && (
                            <>
                              <button
                                onClick={() => handleRequest(req.id, "approved")}
                                className="px-3 py-1.5 rounded-lg text-[11px] font-bold border-none cursor-pointer transition-all active:scale-95 text-primary-foreground"
                                style={{ background: "var(--gradient-gold)" }}
                              >
                                ✅ Accepter
                              </button>
                              <button
                                onClick={() => handleRequest(req.id, "rejected")}
                                className="px-3 py-1.5 rounded-lg text-[11px] font-bold border border-border bg-muted text-muted-foreground cursor-pointer transition-all active:scale-95"
                              >
                                ❌ Refuser
                              </button>
                            </>
                          )}
                          {req.status === "approved" && (
                            <>
                              <span className="text-[10px] font-bold text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400 px-2 py-1 rounded-full">✅ Autorisé</span>
                              <button
                                onClick={() => handleRemoveAccess(req.id)}
                                className="text-[10px] text-destructive/60 hover:text-destructive bg-transparent border-none cursor-pointer"
                              >
                                Retirer
                              </button>
                            </>
                          )}
                          {req.status === "rejected" && (
                            <span className="text-[10px] font-bold text-destructive/70 bg-destructive/10 px-2 py-1 rounded-full">❌ Refusé</span>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </div>
          )}
        </>
      )}
    </motion.div>
  );
};

export default ChatManagement;
