import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Send } from "lucide-react";

interface Thread {
  id: string;
  user_id: string;
  subject: string;
  status: string;
  last_message_at: string;
  unread_for_admin: boolean;
  display_name?: string;
}

interface Msg {
  id: string;
  content: string;
  sender_role: "user" | "admin";
  created_at: string;
}

const AdminSupportTab = () => {
  const { user } = useAuth();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadThreads = useCallback(async () => {
    const { data: ts } = await supabase
      .from("support_threads")
      .select("*")
      .order("last_message_at", { ascending: false });
    if (!ts) return;
    const ids = ts.map((t) => t.user_id);
    let names = new Map<string, string>();
    if (ids.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, display_name, first_name, last_name")
        .in("user_id", ids);
      profs?.forEach((p) => {
        const n = (p.display_name || `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim()) || "Utilisateur";
        names.set(p.user_id, n);
      });
    }
    setThreads(ts.map((t) => ({ ...t, display_name: names.get(t.user_id) || "Utilisateur" })) as Thread[]);
  }, []);

  useEffect(() => {
    loadThreads();
    const ch = supabase
      .channel("admin-support-threads")
      .on("postgres_changes", { event: "*", schema: "public", table: "support_threads" }, () => loadThreads())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [loadThreads]);

  useEffect(() => {
    if (!activeId) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("support_messages")
        .select("id, content, sender_role, created_at")
        .eq("thread_id", activeId)
        .order("created_at", { ascending: true });
      if (!cancelled) setMessages((data ?? []) as Msg[]);
      // mark read for admin
      await supabase.from("support_threads").update({ unread_for_admin: false }).eq("id", activeId);
    })();
    const ch = supabase
      .channel(`admin-thread-${activeId}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "support_messages", filter: `thread_id=eq.${activeId}`,
      }, (payload) => {
        const m = payload.new as Msg;
        setMessages((prev) => prev.some((x) => x.id === m.id) ? prev : [...prev, m]);
      })
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(ch); };
  }, [activeId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  const send = async () => {
    const content = reply.trim();
    if (!content || !activeId || !user) return;
    setSending(true);
    const { error } = await supabase.from("support_messages").insert({
      thread_id: activeId,
      sender_id: user.id,
      sender_role: "admin",
      content,
    });
    setSending(false);
    if (error) {
      toast.error("Échec de l'envoi");
      return;
    }
    setReply("");
  };

  const closeThread = async () => {
    if (!activeId) return;
    if (!confirm("Supprimer cette conversation ?")) return;
    const { error } = await supabase.from("support_threads").delete().eq("id", activeId);
    if (error) { toast.error("Erreur"); return; }
    toast.success("Conversation supprimée");
    setActiveId(null);
    setMessages([]);
    loadThreads();
  };

  const active = threads.find((t) => t.id === activeId);

  return (
    <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-4">
      {/* Threads list */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h3 className="font-bold text-sm">Conversations ({threads.length})</h3>
        </div>
        <div className="max-h-[60vh] overflow-y-auto">
          {threads.length === 0 ? (
            <p className="text-xs text-muted-foreground p-4 text-center">Aucune conversation</p>
          ) : threads.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveId(t.id)}
              className={`w-full text-left px-4 py-3 border-b border-border/50 hover:bg-muted/40 transition-colors cursor-pointer ${activeId === t.id ? "bg-muted/60" : ""}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-bold truncate">{t.display_name}</span>
                {t.unread_for_admin && <span className="h-2 w-2 rounded-full bg-destructive shrink-0" />}
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {new Date(t.last_message_at).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Chat */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden flex flex-col min-h-[60vh]">
        {!active ? (
          <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
            Sélectionnez une conversation
          </div>
        ) : (
          <>
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <div>
                <p className="text-sm font-bold">{active.display_name}</p>
                <p className="text-[10px] text-muted-foreground">{active.subject}</p>
              </div>
              <button
                onClick={closeThread}
                className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border border-destructive/30 text-destructive hover:bg-destructive/10 cursor-pointer"
              >
                Supprimer
              </button>
            </div>
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 bg-muted/20" style={{ maxHeight: "50vh" }}>
              <div className="flex flex-col gap-2">
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm ${m.sender_role === "admin"
                      ? "self-end bg-primary text-primary-foreground rounded-br-md"
                      : "self-start bg-card border border-border text-foreground rounded-bl-md"
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words leading-snug">{m.content}</p>
                    <div className="text-[9px] opacity-60 mt-1">
                      {new Date(m.created_at).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-2 p-3 border-t border-border">
              <textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                rows={1}
                placeholder="Répondre…"
                className="flex-1 resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                style={{ fontSize: 14, minHeight: 40, maxHeight: 120 }}
              />
              <button
                onClick={send}
                disabled={sending || !reply.trim()}
                className="shrink-0 h-10 w-10 rounded-xl flex items-center justify-center text-primary-foreground disabled:opacity-40 active:scale-95 transition-transform"
                style={{ background: "var(--gradient-gold)" }}
                aria-label="Envoyer"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AdminSupportTab;