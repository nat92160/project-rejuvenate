import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Droplets, Phone, MapPin, Save } from "lucide-react";

const MikveManager = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [winterHours, setWinterHours] = useState("");
  const [summerHours, setSummerHours] = useState("");
  const [phone, setPhone] = useState("");
  const [mapsLink, setMapsLink] = useState("");
  const [profileId, setProfileId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: rows } = await (supabase
        .from("synagogue_profiles")
        .select("id, mikve_enabled, mikve_winter_hours, mikve_summer_hours, mikve_phone, mikve_maps_link") as any)
        .eq("president_id", user.id)
        .order("created_at", { ascending: true })
        .limit(1);
      const data = rows && rows[0];
      if (data) {
        setProfileId(data.id);
        setEnabled(data.mikve_enabled || false);
        setWinterHours(data.mikve_winter_hours || "");
        setSummerHours(data.mikve_summer_hours || "");
        setPhone(data.mikve_phone || "");
        setMapsLink(data.mikve_maps_link || "");
      }
      setLoading(false);
    })();
  }, [user]);

  const handleSave = async () => {
    if (!profileId) return;
    setSaving(true);
    const { error } = await (supabase
      .from("synagogue_profiles")
      .update({
        mikve_enabled: enabled,
        mikve_winter_hours: winterHours || null,
        mikve_summer_hours: summerHours || null,
        mikve_phone: phone || null,
        mikve_maps_link: mapsLink || null,
      } as any) as any)
      .eq("id", profileId);
    setSaving(false);
    if (error) toast.error("Erreur lors de la sauvegarde");
    else toast.success("Module Mikvé mis à jour ✓");
  };

  if (loading) return <div className="text-center py-8 text-muted-foreground text-sm">Chargement…</div>;
  if (!profileId) return <div className="text-center py-8 text-muted-foreground text-sm">Créez d'abord votre profil synagogue.</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <Droplets className="w-5 h-5 text-primary" />
        <h3 className="font-display text-base font-bold text-foreground">Module Mikvé</h3>
      </div>

      <div className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
        <div>
          <p className="text-sm font-semibold text-foreground">Activer le module Mikvé</p>
          <p className="text-xs text-muted-foreground">Visible par vos fidèles si activé</p>
        </div>
        <Switch checked={enabled} onCheckedChange={setEnabled} />
      </div>

      {enabled && (
        <div className="space-y-4 rounded-xl border border-border bg-card p-4">
          <div className="space-y-2">
            <Label className="text-xs font-semibold">🧊 Horaires Hiver</Label>
            <Input placeholder="Ex: Dim-Jeu 19h-22h" value={winterHours} onChange={(e) => setWinterHours(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-semibold">☀️ Horaires Été</Label>
            <Input placeholder="Ex: Dim-Jeu 20h-23h" value={summerHours} onChange={(e) => setSummerHours(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-semibold flex items-center gap-1"><Phone className="w-3 h-3" /> Téléphone responsable</Label>
            <Input placeholder="06 xx xx xx xx" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-semibold flex items-center gap-1"><MapPin className="w-3 h-3" /> Lien Google Maps</Label>
            <Input placeholder="https://maps.google.com/..." value={mapsLink} onChange={(e) => setMapsLink(e.target.value)} />
          </div>
        </div>
      )}

      <Button onClick={handleSave} disabled={saving} className="w-full">
        <Save className="w-4 h-4 mr-2" />
        {saving ? "Enregistrement…" : "Enregistrer"}
      </Button>
    </div>
  );
};

export default MikveManager;
