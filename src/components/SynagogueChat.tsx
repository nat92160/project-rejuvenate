import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePushSubscription } from "@/hooks/usePushSubscription";
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

type ChatRequestStatus = "pending" | "approved" | "rejected" | "blocked";

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
  const [chatEnabled, setChatEnabled] = useState(false);
  const [chatEnabledLoading, setChatEnabledLoading] = useState(true);
  const [isApproved, setIsApproved] = useState(false);
  const [requestStatus, setRequestStatus] = useState<ChatRequestStatus | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [presidentId, setPresidentId] = useState<string | null>(null);
  const [adjointId, setAdjointId] = useState<string | null>(null);
  const [viewerIsPresident, setViewerIsPresident] = useState(isPresident);
  const bottomRef = useRef<HTMLDivElement>(null);
  const { isSubscribed, subscribe: pushSubscribe, unsubscribe: pushUnsubscribe, supported: pushSupported } = usePushSubscription(synagogueId);
  const [notifEnabled, setNotifEnabled] = useState(() => {
    const stored = localStorage.getItem(`chat-notif-${synagogueId}`);
    return stored === null ? true : stored === "true";
  });
  const prevMsgCountRef = useRef(0);

  const canAccessMessages = viewerIsPresident || isApproved;

  // Auto-subscribe to push when notifications are enabled and user has access
  useEffect(() => {
    if (notifEnabled && canAccessMessages && pushSupported && !isSubscribed) {
      pushSubscribe();
    }
  }, [notifEnabled, canAccessMessages, pushSupported, isSubscribed, pushSubscribe]);

  const toggleNotif = async () => {
    const next = !notifEnabled;
    setNotifEnabled(next);
    localStorage.setItem(`chat-notif-${synagogueId}`, String(next));
    
    if (next && pushSupported) {
      const ok = await pushSubscribe();
      if (ok) {
        toast.success("🔔 Notifications push activées");
      } else {
        toast.success("🔔 Notifications activées (in-app uniquement)");
      }
    } else if (!next && pushSupported) {
      await pushUnsubscribe();
      toast.success("🔕 Notifications désactivées");
    } else {
      toast.success(next ? "🔔 Notifications activées" : "🔕 Notifications désactivées");
    }
  };

  useEffect(() => {
    if (!user) return;

    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("first_name, last_name, display_name")
        .eq("user_id", user.id)
        .maybeSingle();

      const fullName = [data?.first_name, data?.last_name].filter(Boolean).join(" ").trim();
      setDisplayName(fullName || data?.display_name || user.email?.split("@")[0] || "Membre");
    })();
  }, [user]);

  const refreshAccess = useCallback(async () => {
    if (!user) return;

    setChatEnabledLoading(true);

    const { data: syna } = await supabase
      .from("synagogue_profiles")
      .select("chat_enabled, president_id")
      .eq("id", synagogueId)
      .maybeSingle();

    // Fetch adjoint_id separately since it's not in types yet
    const { data: synaFull } = await (supabase
      .from("synagogue_profiles")
      .select("adjoint_id") as any)
      .eq("id", synagogueId)
      .maybeSingle();

    const enabled = syna?.chat_enabled ?? false;
    const resolvedPresidentId = syna?.president_id ?? null;
    const resolvedAdjointId = synaFull?.adjoint_id ?? null;
    const isOwner = resolvedPresidentId === user.id;
    const isAdjoint = resolvedAdjointId === user.id;

    setChatEnabled(enabled);
    setPresidentId(resolvedPresidentId);
    setAdjointId(resolvedAdjointId);
    setViewerIsPresident(isPresident || isOwner || isAdjoint);

    if (isPresident || isOwner || isAdjoint) {
      setIsApproved(true);
      setRequestStatus("approved");
      setChatEnabledLoading(false);
      return;
    }

    const { data: req } = await supabase
      .from("synagogue_chat_requests")
      .select("status")
      .eq("synagogue_id", synagogueId)
      .eq("user_id", user.id)
      .maybeSingle();

    const nextStatus = (req?.status as ChatRequestStatus | null) ?? null;
    setRequestStatus(nextStatus);
    setIsApproved(nextStatus === "approved");
    setChatEnabledLoading(false);
  }, [isPresident, synagogueId, user]);

  useEffect(() => {
    void refreshAccess();
  }, [refreshAccess]);

  useEffect(() => {
    if (!user || viewerIsPresident) return;

    const channel = supabase
      .channel(`chat-access-${synagogueId}-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "synagogue_chat_requests",
          filter: `synagogue_id=eq.${synagogueId}`,
        },
        () => {
          void refreshAccess();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [refreshAccess, synagogueId, user, viewerIsPresident]);

  const fetchMessages = useCallback(async () => {
    if (!canAccessMessages) {
      setMessages([]);
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from("synagogue_messages")
      .select("*")
      .eq("synagogue_id", synagogueId)
      .order("created_at", { ascending: true })
      .limit(100);

    setMessages((data as Message[]) || []);
    setLoading(false);
  }, [canAccessMessages, synagogueId]);

  useEffect(() => {
    if (!chatEnabled || !canAccessMessages) {
      setLoading(false);
      return;
    }

    void fetchMessages();
  }, [chatEnabled, canAccessMessages, fetchMessages]);

  useEffect(() => {
    if (!chatEnabled || !canAccessMessages) return;

    const channel = supabase
      .channel(`chat-${synagogueId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "synagogue_messages",
          filter: `synagogue_id=eq.${synagogueId}`,
        },
        () => {
          void fetchMessages();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [canAccessMessages, chatEnabled, fetchMessages, synagogueId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Send browser notification for new messages from others
  useEffect(() => {
    if (!notifEnabled || !canAccessMessages) return;
    if (prevMsgCountRef.current === 0) {
      prevMsgCountRef.current = messages.length;
      return;
    }
    if (messages.length > prevMsgCountRef.current) {
      const newest = messages[messages.length - 1];
      if (newest && newest.user_id !== user?.id) {
        if ("Notification" in window && Notification.permission === "granted" && document.hidden) {
          new Notification(`💬 ${newest.display_name}`, {
            body: newest.content.slice(0, 100),
            icon: "/placeholder.svg",
            tag: `chat-${synagogueId}`,
          });
        }
        if (!document.hidden) {
          toast(`💬 ${newest.display_name}: ${newest.content.slice(0, 60)}`, { duration: 3000 });
        }
      }
    }
    prevMsgCountRef.current = messages.length;
  }, [messages, notifEnabled, canAccessMessages, user, synagogueId]);

  const handleSend = async () => {
    if (!user) return;

    const content = newMessage.trim().slice(0, 1000);
    if (!content) return;
    if (!viewerIsPresident && !isApproved) {
      toast.error("Votre accès au chat doit être approuvé par le président.");
      return;
    }

    setSending(true);

    const { error } = await supabase.from("synagogue_messages").insert({
      synagogue_id: synagogueId,
      user_id: user.id,
      display_name: viewerIsPresident ? synagogueName : displayName.slice(0, 100),
      content,
      is_president: viewerIsPresident,
    } as never);

    if (error) {
      toast.error("Erreur d'envoi");
    } else {
      setNewMessage("");
      // Trigger push notifications to other subscribers
      const pushDisplayName = viewerIsPresident ? synagogueName : displayName;
      supabase.functions.invoke("send-push", {
        body: {
          synagogue_id: synagogueId,
          title: `💬 ${pushDisplayName}`,
          body: content.slice(0, 100),
          sender_id: user.id,
        },
      }).catch((e) => console.error("Push trigger error:", e));
    }

    setSending(false);
  };

  const handleDelete = async (msgId: string) => {
    const { error } = await supabase.from("synagogue_messages").delete().eq("id", msgId);
    if (error) toast.error("Erreur de suppression");
    else toast.success("Message supprimé");
  };

  const handleEdit = async (msgId: string) => {
    const content = editContent.trim().slice(0, 1000);
    if (!content) return;

    const { error } = await supabase
      .from("synagogue_messages")
      .update({ content } as never)
      .eq("id", msgId);

    if (error) {
      toast.error("Erreur de modification");
    } else {
      setEditingId(null);
      setEditContent("");
    }
  };

  const handleRequestAccess = async () => {
    if (!user) return;

    const { error } = await supabase.from("synagogue_chat_requests").insert({
      synagogue_id: synagogueId,
      user_id: user.id,
      display_name: displayName.slice(0, 100),
    } as never);

    if (error) {
      if (error.code === "23505") {
        toast("Demande déjà envoyée");
      } else {
        toast.error("Erreur");
      }
      return;
    }

    setRequestStatus("pending");
    toast.success("Demande envoyée au président !");
  };

  const formatTime = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const time = d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
    if (isToday) return `Aujourd'hui ${time}`;
    return `${d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })} ${time}`;
  };

  if (!user) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center" style={{ boxShadow: "var(--shadow-card)" }}>
        <span className="text-4xl">💬</span>
        <p className="mt-3 text-sm text-muted-foreground">Connectez-vous pour accéder au chat.</p>
      </div>
    );
  }

  if (chatEnabledLoading) {
    return <div className="py-10 text-center text-sm text-muted-foreground">Chargement…</div>;
  }

  if (!chatEnabled && !viewerIsPresident) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center" style={{ boxShadow: "var(--shadow-card)" }}>
        <span className="text-4xl">🔒</span>
        <p className="mt-3 text-sm text-muted-foreground">Le chat n'est pas encore activé par la synagogue.</p>
      </div>
    );
  }

  if (!viewerIsPresident && !isApproved) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center" style={{ boxShadow: "var(--shadow-card)" }}>
        <span className="text-4xl">🙋</span>
        {requestStatus === "pending" ? (
          <>
            <p className="mt-3 text-sm text-muted-foreground">Votre demande est en attente d'approbation par le président.</p>
            <p className="mt-1 text-xs text-muted-foreground/60">Vous pourrez écrire dès validation.</p>
          </>
        ) : requestStatus === "blocked" ? (
          <>
            <p className="mt-3 text-sm text-destructive">Votre accès au chat a été bloqué par le président.</p>
            <p className="mt-1 text-xs text-muted-foreground">Vous ne pouvez plus lire ni écrire tant qu'il ne vous débloque pas.</p>
          </>
        ) : requestStatus === "rejected" ? (
          <>
            <p className="mt-3 text-sm text-muted-foreground">Votre demande a été refusée.</p>
            <button
              onClick={handleRequestAccess}
              className="mt-4 rounded-xl border-none px-6 py-2.5 text-sm font-bold text-primary-foreground transition-all active:scale-95"
              style={{ background: "var(--gradient-gold)", boxShadow: "var(--shadow-gold)" }}
            >
              🔁 Redemander l'accès
            </button>
          </>
        ) : (
          <>
            <p className="mt-3 text-sm text-muted-foreground">Demandez l'accès au chat pour participer aux discussions.</p>
            <button
              onClick={handleRequestAccess}
              className="mt-4 rounded-xl border-none px-6 py-2.5 text-sm font-bold text-primary-foreground transition-all active:scale-95"
              style={{ background: "var(--gradient-gold)", boxShadow: "var(--shadow-gold)" }}
            >
              ✋ Demander l'accès
            </button>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card" style={{ boxShadow: "var(--shadow-card)", height: "min(520px, 62vh)" }}>
      <div className="shrink-0 border-b border-border px-4 py-3" style={{ background: "linear-gradient(135deg, hsl(var(--gold) / 0.06), hsl(var(--gold) / 0.02))" }}>
        <div className="flex items-center justify-between">
          <h4 className="flex items-center gap-2 font-display text-sm font-bold text-foreground">
            💬 Chat — {synagogueName}
          </h4>
          <button
            onClick={toggleNotif}
            className="flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 text-[10px] font-bold text-muted-foreground transition-all hover:border-primary/30 active:scale-95 cursor-pointer"
            title={notifEnabled ? "Désactiver les notifications" : "Activer les notifications"}
          >
            {notifEnabled ? "🔔" : "🔕"}
          </button>
        </div>
        <p className="mt-0.5 text-[10px] text-muted-foreground">
          {viewerIsPresident ? "Vos messages portent automatiquement le badge président." : "Échangez avec votre communauté après approbation."}
        </p>
      </div>

      <div className="flex-1 space-y-2.5 overflow-y-auto px-3 py-3">
        {loading ? (
          <div className="py-10 text-center text-sm text-muted-foreground">Chargement…</div>
        ) : messages.length === 0 ? (
          <div className="py-10 text-center">
            <span className="text-4xl">🤝</span>
            <p className="mt-3 text-sm text-muted-foreground">Aucun message pour le moment.</p>
            <p className="mt-1 text-xs text-muted-foreground/60">Soyez le premier à écrire !</p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {messages.map((msg) => {
              const isMine = msg.user_id === user.id;
              const isEditing = editingId === msg.id;
              const msgFromPresident = msg.is_president || (!!presidentId && msg.user_id === presidentId) || (!!adjointId && msg.user_id === adjointId);
              const isAdjointMsg = !!adjointId && msg.user_id === adjointId;

              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`relative max-w-[82%] rounded-2xl px-3.5 py-2.5 ${
                      msgFromPresident
                        ? "border border-primary/20"
                        : isMine
                          ? "text-primary-foreground"
                          : "border border-border"
                    }`}
                    style={
                      msgFromPresident
                        ? { background: "linear-gradient(135deg, hsl(var(--gold) / 0.12), hsl(var(--gold) / 0.04))" }
                        : isMine
                          ? { background: "var(--gradient-gold)" }
                          : { background: "hsl(var(--muted))" }
                    }
                  >
                    {!isMine && (
                      <div className="mb-0.5 flex items-center gap-1.5">
                        <p className={`text-[11px] font-bold ${msgFromPresident ? "text-primary" : "text-muted-foreground"}`}>
                          {msg.display_name}
                        </p>
                        {msgFromPresident && (
                          <span
                            className="inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[8px] font-extrabold uppercase tracking-wider"
                            style={{ background: "hsl(var(--gold) / 0.15)", color: "hsl(var(--gold-matte))" }}
                          >
                            {isAdjointMsg ? "🏅 Adjoint" : "🏛️ Président"}
                          </span>
                        )}
                      </div>
                    )}

                    {isMine && msgFromPresident && (
                      <div className="mb-0.5 flex items-center gap-1.5">
                        <span
                          className="inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[8px] font-extrabold uppercase tracking-wider"
                          style={{ background: "hsla(0,0%,100%,0.2)", color: "hsl(var(--primary-foreground))" }}
                        >
                          🏛️ Président
                        </span>
                      </div>
                    )}

                    {isEditing ? (
                      <div className="mt-1 flex gap-1.5">
                        <input
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleEdit(msg.id);
                            if (e.key === "Escape") setEditingId(null);
                          }}
                          className="flex-1 rounded-lg border border-border bg-background px-2 py-1 text-xs text-foreground focus:outline-none"
                          maxLength={1000}
                          autoFocus
                        />
                        <button onClick={() => handleEdit(msg.id)} className="border-none bg-transparent text-[10px] font-bold text-primary cursor-pointer">✓</button>
                        <button onClick={() => setEditingId(null)} className="border-none bg-transparent text-[10px] text-muted-foreground cursor-pointer">✕</button>
                      </div>
                    ) : (
                      <p className={`text-sm leading-relaxed ${isMine && !msgFromPresident ? "text-primary-foreground" : "text-foreground"}`}>
                        {msg.content}
                      </p>
                    )}

                    <div className="mt-1 flex items-center gap-2">
                      <span className={`text-[9px] ${isMine && !msgFromPresident ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                        {formatTime(msg.created_at)}
                      </span>
                      {isMine && !isEditing && (
                        <>
                          <button
                            onClick={() => {
                              setEditingId(msg.id);
                              setEditContent(msg.content);
                            }}
                            className="border-none bg-transparent p-0 text-[9px] text-muted-foreground/60 hover:text-foreground cursor-pointer"
                            style={isMine && !msgFromPresident ? { color: "hsla(0,0%,100%,0.5)" } : {}}
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleDelete(msg.id)}
                            className="border-none bg-transparent p-0 text-[9px] text-destructive/60 hover:text-destructive cursor-pointer"
                          >
                            🗑️
                          </button>
                        </>
                      )}
                      {viewerIsPresident && !isMine && (
                        <button
                          onClick={() => handleDelete(msg.id)}
                          className="border-none bg-transparent p-0 text-[9px] text-destructive/60 hover:text-destructive cursor-pointer"
                        >
                          🗑️
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

      <div className="flex shrink-0 gap-2 border-t border-border p-3">
        <input
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void handleSend();
            }
          }}
          placeholder={viewerIsPresident ? "Écrire en tant que synagogue…" : "Écrire un message…"}
          className="flex-1 rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          disabled={sending || (!viewerIsPresident && !isApproved)}
          maxLength={1000}
        />
        <button
          onClick={() => void handleSend()}
          disabled={sending || !newMessage.trim() || (!viewerIsPresident && !isApproved)}
          className="shrink-0 rounded-xl border-none px-4 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50 transition-all active:scale-95 cursor-pointer"
          style={{ background: "var(--gradient-gold)" }}
        >
          {sending ? "…" : "📨"}
        </button>
      </div>
    </div>
  );
};

export default SynagogueChat;
