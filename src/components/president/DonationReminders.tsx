import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Send, Users, BellRing, Mail } from "lucide-react";

interface Props {
  synagogueId: string | null;
  synagogueName: string;
}

interface FideleEntry {
  user_id: string;
  display_name: string;
  email: string | null;
  has_donated: boolean;
}

const DonationReminders = ({ synagogueId, synagogueName }: Props) => {
  const [loading, setLoading] = useState(true);
  const [fideles, setFideles] = useState<FideleEntry[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState(
    `Chalom, votre soutien à ${synagogueName} est précieux. Pensez à votre don annuel — déductible à 66% des impôts. Merci ! 🙏`
  );

  useEffect(() => {
    if (!synagogueId) return;
    loadFideles();
  }, [synagogueId]);

  useEffect(() => {
    setMessage(
      `Chalom, votre soutien à ${synagogueName} est précieux. Pensez à votre don annuel — déductible à 66% des impôts. Merci ! 🙏`
    );
  }, [synagogueName]);

  const loadFideles = async () => {
    if (!synagogueId) return;
    setLoading(true);
    try {
      const currentYear = new Date().getFullYear();

      // 1. Abonnés à la synagogue
      const { data: subs } = await (supabase
        .from("synagogue_subscriptions") as any)
        .select("user_id")
        .eq("synagogue_id", synagogueId);

      const userIds = (subs || []).map((s: any) => s.user_id);
      if (userIds.length === 0) {
        setFideles([]);
        setLoading(false);
        return;
      }

      // 2. Profils
      const { data: profiles } = await (supabase
        .from("profiles") as any)
        .select("user_id, display_name, first_name, last_name")
        .in("user_id", userIds);

      // 3. Donateurs cette année
      const { data: donsYear } = await (supabase
        .from("donations") as any)
        .select("donor_user_id, donor_email")
        .eq("synagogue_id", synagogueId)
        .eq("fiscal_year", currentYear);

      const donorIds = new Set(
        (donsYear || []).map((d: any) => d.donor_user_id).filter(Boolean)
      );
      const donorEmails = new Set(
        (donsYear || []).map((d: any) => (d.donor_email || "").toLowerCase()).filter(Boolean)
      );

      const list: FideleEntry[] = (profiles || []).map((p: any) => {
        const name =
          p.display_name ||
          [p.first_name, p.last_name].filter(Boolean).join(" ") ||
          "Fidèle";
        return {
          user_id: p.user_id,
          display_name: name,
          email: null, // email non accessible via profiles RLS
          has_donated: donorIds.has(p.user_id),
        };
      });

      // Tri : non-donateurs en premier
      list.sort((a, b) => Number(a.has_donated) - Number(b.has_donated));
      setFideles(list);
    } catch (e) {
      console.error(e);
      toast.error("Erreur de chargement");
    } finally {
      setLoading(false);
    }
  };

  const nonDonors = fideles.filter((f) => !f.has_donated);
  const donors = fideles.filter((f) => f.has_donated);

  const toggleAll = () => {
    if (selected.size === nonDonors.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(nonDonors.map((f) => f.user_id)));
    }
  };

  const toggleOne = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const sendReminders = async () => {
    if (selected.size === 0) {
      toast.error("Sélectionnez au moins un fidèle");
      return;
    }
    if (!message.trim()) {
      toast.error("Message requis");
      return;
    }
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-push", {
        body: {
          user_ids: Array.from(selected),
          title: `💛 ${synagogueName}`,
          body: message.slice(0, 200),
          url: "/?tab=communaute",
        },
      });
      if (error) throw error;
      toast.success(`Relance envoyée à ${selected.size} fidèle(s)`);
      setSelected(new Set());
      console.log("Push debug:", data);
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Erreur d'envoi");
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-center">
        <Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" />
      </div>
    );
  }

  if (fideles.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card p-6 text-center space-y-2">
        <Users className="w-8 h-8 mx-auto text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Aucun fidèle abonné pour le moment.
        </p>
        <p className="text-[11px] text-muted-foreground">
          Les fidèles qui suivent votre synagogue apparaîtront ici.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* KPI */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-border bg-card p-3">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">À relancer</p>
          <p className="text-2xl font-bold text-amber-600">{nonDonors.length}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Donateurs {new Date().getFullYear()}</p>
          <p className="text-2xl font-bold text-green-600">{donors.length}</p>
        </div>
      </div>

      {/* Message */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-2">
        <Label className="text-xs font-semibold flex items-center gap-1.5">
          <BellRing className="w-3.5 h-3.5" /> Message de relance
        </Label>
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          maxLength={200}
          className="text-xs"
          placeholder="Votre message..."
        />
        <p className="text-[10px] text-muted-foreground text-right">
          {message.length}/200
        </p>
      </div>

      {/* Liste */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-semibold">
            Fidèles non-donateurs ({nonDonors.length})
          </Label>
          {nonDonors.length > 0 && (
            <button
              onClick={toggleAll}
              className="text-[11px] text-primary hover:underline bg-transparent border-none cursor-pointer"
            >
              {selected.size === nonDonors.length ? "Tout désélectionner" : "Tout sélectionner"}
            </button>
          )}
        </div>

        {nonDonors.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">
            🎉 Tous vos fidèles ont déjà donné cette année !
          </p>
        ) : (
          <div className="max-h-64 overflow-y-auto space-y-1">
            {nonDonors.map((f) => (
              <label
                key={f.user_id}
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selected.has(f.user_id)}
                  onChange={() => toggleOne(f.user_id)}
                  className="w-4 h-4 accent-primary"
                />
                <span className="text-xs flex-1 truncate">{f.display_name}</span>
              </label>
            ))}
          </div>
        )}

        {nonDonors.length > 0 && (
          <Button
            onClick={sendReminders}
            disabled={sending || selected.size === 0}
            className="w-full"
          >
            {sending ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Send className="w-4 h-4 mr-2" />
            )}
            Envoyer la relance ({selected.size})
          </Button>
        )}
      </div>

      {/* Donateurs déjà actifs */}
      {donors.length > 0 && (
        <details className="rounded-xl border border-border bg-card p-4">
          <summary className="text-xs font-semibold cursor-pointer flex items-center gap-1.5">
            <Mail className="w-3.5 h-3.5 text-green-600" />
            Donateurs déjà actifs ({donors.length})
          </summary>
          <div className="mt-3 space-y-1">
            {donors.map((f) => (
              <div key={f.user_id} className="text-xs text-muted-foreground py-1 px-2">
                ✓ {f.display_name}
              </div>
            ))}
          </div>
        </details>
      )}

      <p className="text-[10px] text-muted-foreground text-center px-2">
        Les relances sont envoyées via notification push aux fidèles ayant activé les notifications.
      </p>
    </div>
  );
};

export default DonationReminders;
