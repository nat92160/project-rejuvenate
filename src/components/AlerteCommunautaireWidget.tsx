import { useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSynaProfile } from "@/hooks/useSynaProfile";
import { toast } from "sonner";

const AlerteCommunautaireWidget = () => {
  const { user, dbRole } = useAuth();
  const { synagogueId } = useSynaProfile();
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const isPresident = dbRole === "president";

  const handleSend = async () => {
    if (!message.trim() || !user || !isPresident || !synagogueId) return;
    setSending(true);

    try {
      const { data, error } = await supabase.functions.invoke("send-push", {
        body: {
          synagogue_id: synagogueId,
          title: "📢 Alerte Communautaire",
          body: message.trim(),
          sender_id: user.id,
        },
      });

      if (error) throw error;
      toast.success(`✅ Alerte envoyée à ${data?.sent || 0} fidèles !`);
      setMessage("");
      setSent(true);
      setTimeout(() => setSent(false), 5000);
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de l'envoi");
    }
    setSending(false);
  };

  if (!isPresident) return null;

  return (
    <motion.div className="rounded-2xl bg-card p-5 mb-4 border border-border" style={{ boxShadow: "var(--shadow-card)" }}
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <h3 className="font-display text-base font-bold flex items-center gap-2 text-foreground mb-1">
        📡 Alerte Communautaire
      </h3>
      <p className="text-xs text-muted-foreground mb-4">
        Envoyez une notification push instantanée à tous vos fidèles abonnés.
      </p>

      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Rédigez votre message court..."
        maxLength={200}
        rows={3}
        className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
      />

      <div className="flex items-center justify-between mt-3">
        <span className="text-[10px] text-muted-foreground">{message.length}/200</span>
        <button
          onClick={handleSend}
          disabled={sending || !message.trim()}
          className="px-6 py-2.5 rounded-xl text-sm font-bold text-primary-foreground border-none cursor-pointer disabled:opacity-50 transition-all active:scale-95"
          style={{ background: "var(--gradient-gold)" }}
        >
          {sending ? "⏳ Envoi..." : sent ? "✅ Envoyé !" : "📤 Envoyer l'alerte"}
        </button>
      </div>

      <div className="mt-3 p-3 rounded-xl border border-primary/10 text-center" style={{ background: "hsl(var(--gold) / 0.04)" }}>
        <p className="text-[10px] text-muted-foreground">
          ⚠️ Utilisez avec parcimonie. Les fidèles recevront cette notification même si l'app est fermée.
        </p>
      </div>
    </motion.div>
  );
};

export default AlerteCommunautaireWidget;
