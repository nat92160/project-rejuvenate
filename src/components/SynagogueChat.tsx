import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface Message {
  id: string;
  synagogue_id: string;
  user_id: string;
  display_name: string;
  content: string;
  is_president: boolean;
  created_at: string;
}

interface SynagogueChatProps {
  synagogueId: string;
  synagogueName: string;
  isPresident?: boolean;
}

const SynagogueChat = ({ synagogueId, synagogueName, isPresident = false }: SynagogueChatProps) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  // Fetch display name
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from("profiles").select("display_name").eq("user_id", user.id).single();
      setDisplayName(data?.display_name || user.email?.split("@")[0] || "Membre");
    })();
  }, [user]);

  // Fetch messages
  const fetchMessages = useCallback(async () => {
    const { data } = await supabase
      .from("synagogue_messages")
      .select("*")
      .eq("synagogue_id", synagogueId)
      .order("created_at", { ascending: true })
      .limit(100);
    setMessages((data as Message[]) || []);
    setLoading(false);
  }, [synagogueId]);

  useEffect(() => { fetchMessages(); }, [fetchMessages]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`chat-${synagogueId}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "synagogue_messages",
        filter: `synagogue_id=eq.${synagogueId}`,
      }, () => fetchMessages())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [synagogueId, fetchMessages]);

  // Auto scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!user || !newMessage.trim()) return;
    setSending(true);
    const { error } = await supabase.from("synagogue_messages").insert({
      synagogue_id: synagogueId,
      user_id: user.id,
      display_name: isPresident ? `🏛️ ${synagogueName}` : displayName,
      content: newMessage.trim(),
      is_president: isPresident,
    } as any);
    if (error) toast.error("Erreur d'envoi");
    else setNewMessage("");
    setSending(false);
  };

  const handleDelete = async (msgId: string) => {
    await supabase.from("synagogue_messages").delete().eq("id", msgId);
  };

  const formatTime = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const time = d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
    if (isToday) return time;
    return `${d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })} ${time}`;
  };

  if (!user) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center" style={{ boxShadow: "var(--shadow-card)" }}>
        <span className="text-4xl">💬</span>
        <p className="mt-3 text-sm text-muted-foreground">Connectez-vous pour accéder au chat.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col rounded-2xl border border-border bg-card overflow-hidden" style={{ boxShadow: "var(--shadow-card)", height: "min(500px, 60vh)" }}>
      {/* Header */}
      <div className="shrink-0 px-4 py-3 border-b border-border" style={{ background: "linear-gradient(135deg, hsl(var(--gold) / 0.06), hsl(var(--gold) / 0.02))" }}>
        <h4 className="font-display text-sm font-bold text-foreground flex items-center gap-2">
          💬 Chat — {synagogueName}
        </h4>
        <p className="text-[10px] text-muted-foreground mt-0.5">
          {isPresident ? "Vos messages sont identifiés comme la synagogue" : "Échangez avec votre communauté"}
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
        {loading ? (
          <div className="text-center py-10 text-sm text-muted-foreground">Chargement…</div>
        ) : messages.length === 0 ? (
          <div className="text-center py-10">
            <span className="text-4xl">🤝</span>
            <p className="mt-3 text-sm text-muted-foreground">Aucun message pour le moment.</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Soyez le premier à écrire !</p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {messages.map((msg) => {
              const isMine = msg.user_id === user.id;
              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`relative max-w-[80%] rounded-2xl px-3.5 py-2.5 ${
                      msg.is_president
                        ? "border border-primary/20"
                        : isMine
                        ? "text-primary-foreground"
                        : "border border-border"
                    }`}
                    style={
                      msg.is_president
                        ? { background: "linear-gradient(135deg, hsl(var(--gold) / 0.1), hsl(var(--gold) / 0.04))" }
                        : isMine
                        ? { background: "var(--gradient-gold)" }
                        : { background: "hsl(var(--muted))" }
                    }
                  >
                    {!isMine && (
                      <p className={`text-[10px] font-bold mb-0.5 ${msg.is_president ? "text-primary" : "text-muted-foreground"}`}>
                        {msg.display_name}
                      </p>
                    )}
                    <p className={`text-sm leading-relaxed ${isMine && !msg.is_president ? "text-primary-foreground" : "text-foreground"}`}>
                      {msg.content}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-[9px] ${isMine && !msg.is_president ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                        {formatTime(msg.created_at)}
                      </span>
                      {(isMine || isPresident) && (
                        <button
                          onClick={() => handleDelete(msg.id)}
                          className="text-[9px] text-destructive/60 hover:text-destructive bg-transparent border-none cursor-pointer p-0"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="shrink-0 border-t border-border p-3 flex gap-2">
        <input
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          placeholder="Écrire un message…"
          className="flex-1 px-4 py-2.5 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          disabled={sending}
        />
        <button
          onClick={handleSend}
          disabled={sending || !newMessage.trim()}
          className="shrink-0 px-4 py-2.5 rounded-xl text-sm font-bold text-primary-foreground border-none cursor-pointer disabled:opacity-50 transition-all active:scale-95"
          style={{ background: "var(--gradient-gold)" }}
        >
          {sending ? "…" : "📨"}
        </button>
      </div>
    </div>
  );
};

export default SynagogueChat;
