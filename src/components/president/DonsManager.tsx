import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Heart, Save, ExternalLink } from "lucide-react";

const DonsManager = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [donationLink, setDonationLink] = useState("");
  const [profileId, setProfileId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await (supabase
        .from("synagogue_profiles")
        .select("id, donation_link") as any)
        .eq("president_id", user.id)
        .maybeSingle();
      if (data) {
        setProfileId(data.id);
        setDonationLink(data.donation_link || "");
      }
      setLoading(false);
    })();
  }, [user]);

  const handleSave = async () => {
    if (!profileId) return;
    setSaving(true);
    const { error } = await (supabase
      .from("synagogue_profiles")
      .update({ donation_link: donationLink || null } as any) as any)
      .eq("id", profileId);
    setSaving(false);
    if (error) toast.error("Erreur lors de la sauvegarde");
    else toast.success("Lien de don mis à jour ✓");
  };

  if (loading) return <div className="text-center py-8 text-muted-foreground text-sm">Chargement…</div>;
  if (!profileId) return <div className="text-center py-8 text-muted-foreground text-sm">Créez d'abord votre profil synagogue.</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <Heart className="w-5 h-5 text-primary" />
        <h3 className="font-display text-base font-bold text-foreground">Module Dons</h3>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <Label className="text-xs font-semibold">Lien de collecte (ex: Allodon, PayPal, etc.)</Label>
        <Input
          placeholder="https://www.allodon.com/ma-synagogue"
          value={donationLink}
          onChange={(e) => setDonationLink(e.target.value)}
        />
        <p className="text-[11px] text-muted-foreground">
          Si renseigné, un bouton « Faire un don » apparaîtra pour vos fidèles.
        </p>
        {donationLink && (
          <a href={donationLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
            <ExternalLink className="w-3 h-3" /> Tester le lien
          </a>
        )}
      </div>

      <Button onClick={handleSave} disabled={saving} className="w-full">
        <Save className="w-4 h-4 mr-2" />
        {saving ? "Enregistrement…" : "Enregistrer"}
      </Button>
    </div>
  );
};

export default DonsManager;
