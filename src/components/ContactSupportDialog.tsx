import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Send } from "lucide-react";

interface Msg {
  id: string;
  content: string;
  sender_role: "user" | "admin";
  created_at: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onLoginRequired?: () => void;
}

const ContactSupportDialog = ({ open, onClose, onLoginRequired }: Props) => {
  const { user } = useAuth();
  const [threadId, setThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    if (!user) {
      onLoginRequired?.();
      onClose();
      return;
    }

    let cancelled = false;
    const init = async () => {
      setLoading(true);
      // Find or create thread
      let { data: thread } = await supabase
        .from("support_threads")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!thread) {
        const { data: created, error } = await supabase
          .from("support_threads")
          .insert({ user_id: user.id, subject: "Contact support" })
          .select()
          .single();
        if (error) {
          toast.error("Impossible d'ouvrir le chat");
          setLoading(false);
          return;
        }
        thread = created;
      }
      if (cancelled) return;
      setThreadId(thread.id);

      // Mark as read for user
      if (thread.unread_for_user) {
        await supabase.from("support_threads").update({ unread_for_user: false }).eq("id", thread.id);
      }

      const { data: msgs } = await supabase
        .from("support_messages")
        .select("id, content, sender_role, created_at")
        .eq("thread_id", thread.id)
        .order("created_at", { ascending: true });
      if (!cancelled) setMessages((msgs ?? []) as Msg[]);
      setLoading(false);
    };
    init();
    return () => { cancelled = true; };
  }, [open, user]);

  // Realtime subscription
  useEffect(() => {
    if (!threadId || !open) return;
    const channel = supabase
      .channel(`support-${threadId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "support_messages",
        filter: `thread_id=eq.${threadId}`,
      }, (payload) => {
        const m = payload.new as Msg;
        setMessages((prev) => prev.some((x) => x.id === m.id) ? prev : [...prev, m]);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [threadId, open]);

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    const content = text.trim();
    if (!content || !threadId || !user) return;
    if (content.length > 4000) {
      toast.error("Message trop long (4000 caractères max)");
      return;
    }
    setSending(true);
    const { error } = await supabase.from("support_messages").insert({
      thread_id: threadId,
      sender_id: user.id,
      sender_role: "user",
      content,
    });
    setSending(false);
    if (error) {
      toast.error("Échec de l'envoi");
      return;
    }
    setText("");
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-border">
          <DialogTitle className="font-display text-base flex items-center gap-2">
            <span>💬</span> Contacter l'équipe
          </DialogTitle>
          <DialogDescription className="text-xs">
            Signalez un problème ou posez votre question. Un admin vous répondra.
          </DialogDescription>
        </DialogHeader>

        <div
          ref={scrollRef}
          className="h-[55vh] max-h-[480px] overflow-y-auto px-4 py-3 bg-muted/20"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          {loading ? (
            <p className="text-center text-xs text-muted-foreground mt-8">Chargement…</p>
          ) : messages.length === 0 ? (
            <div className="text-center mt-10">
              <span className="text-3xl">👋</span>
              <p className="text-sm font-bold text-foreground mt-2">Bonjour !</p>
              <p className="text-xs text-muted-foreground mt-1 px-4">
                Décrivez votre demande, on vous répond dès que possible.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm ${m.sender_role === "user"
                    ? "self-end bg-primary text-primary-foreground rounded-br-md"
                    : "self-start bg-card border border-border text-foreground rounded-bl-md"
                  }`}
                >
                  {m.sender_role === "admin" && (
                    <div className="text-[10px] font-bold uppercase tracking-wider mb-0.5" style={{ color: "hsl(var(--gold-matte))" }}>
                      Équipe
                    </div>
                  )}
                  <p className="whitespace-pre-wrap break-words leading-snug">{m.content}</p>
                  <div className="text-[9px] opacity-60 mt-1">
                    {new Date(m.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-2 p-3 border-t border-border bg-background" style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom, 0px))" }}>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            rows={1}
            placeholder="Votre message…"
            className="flex-1 resize-none rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary"
            style={{ fontSize: 16, minHeight: 40, maxHeight: 120 }}
          />
          <button
            onClick={send}
            disabled={sending || !text.trim()}
            className="shrink-0 h-10 w-10 rounded-xl flex items-center justify-center text-primary-foreground disabled:opacity-40 active:scale-95 transition-transform"
            style={{ background: "var(--gradient-gold)" }}
            aria-label="Envoyer"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ContactSupportDialog;