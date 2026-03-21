import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { MapPin, Phone, Mail, Save, Building2 } from "lucide-react";

const SynaInfoWidget = () => {
  const { user } = useAuth();
  const [synaId, setSynaId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    address: "",
    phone: "",
    email: "",
  });

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("synagogue_profiles")
        .select("id, name, address, phone, email")
        .or(`president_id.eq.${user.id},adjoint_id.eq.${user.id}`)
        .maybeSingle();
      if (data) {
        setSynaId(data.id);
        setForm({
          name: data.name || "",
          address: (data as any).address || "",
          phone: (data as any).phone || "",
          email: (data as any).email || "",
        });
      }
      setLoading(false);
    })();
  }, [user]);

  const handleSave = async () => {
    if (!synaId) return;
    setSaving(true);

    // Try geocoding the address via Google Maps edge function
    let latitude: number | null = null;
    let longitude: number | null = null;
    if (form.address.trim()) {
      try {
        const { data: funcData } = await supabase.functions.invoke("geocode-address", {
          body: { address: form.address },
        });
        if (funcData?.lat && funcData?.lng) {
          latitude = funcData.lat;
          longitude = funcData.lng;
        }
      } catch {
        // Geocoding is optional, continue saving
      }
    }

    const payload: Record<string, any> = {
      name: form.name,
      address: form.address || null,
      phone: form.phone || null,
      email: form.email || null,
    };
    if (latitude !== null) {
      payload.latitude = latitude;
      payload.longitude = longitude;
    }

    const { error } = await supabase
      .from("synagogue_profiles")
      .update(payload)
      .eq("id", synaId);

    setSaving(false);
    if (error) {
      toast.error("Erreur lors de la sauvegarde");
      console.error(error);
    } else {
      toast.success("Informations enregistrées ✅");
    }
  };

  const inputCls =
    "w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-all focus:border-primary/40 focus:ring-2 focus:ring-primary/10";

  if (loading) {
    return <div className="py-10 text-center text-sm text-muted-foreground">Chargement…</div>;
  }

  if (!synaId) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center" style={{ boxShadow: "var(--shadow-card)" }}>
        <span className="text-4xl">🏛️</span>
        <p className="mt-3 text-sm text-muted-foreground">
          Créez d'abord votre profil de synagogue dans "Ma Synagogue".
        </p>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      {/* Header */}
      <div
        className="rounded-2xl border border-primary/15 p-5 text-center"
        style={{ background: "linear-gradient(135deg, hsl(var(--gold) / 0.08), hsl(var(--gold) / 0.02))" }}
      >
        <Building2 className="mx-auto h-8 w-8 text-primary/70" />
        <h3 className="mt-2 font-display text-lg font-bold text-foreground">Infos Synagogue</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Coordonnées affichées à vos fidèles
        </p>
      </div>

      {/* Name */}
      <div className="rounded-2xl border border-border bg-card p-4" style={{ boxShadow: "var(--shadow-card)" }}>
        <label className="mb-2 flex items-center gap-2 text-xs font-bold text-foreground">
          <Building2 className="h-4 w-4 text-primary/60" />
          Nom de la Synagogue
        </label>
        <input
          className={inputCls}
          value={form.name}
          onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
          placeholder="Beth Abraham"
        />
      </div>

      {/* Address */}
      <div className="rounded-2xl border border-border bg-card p-4" style={{ boxShadow: "var(--shadow-card)" }}>
        <label className="mb-2 flex items-center gap-2 text-xs font-bold text-foreground">
          <MapPin className="h-4 w-4 text-primary/60" />
          Adresse complète
        </label>
        <input
          className={inputCls}
          value={form.address}
          onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
          placeholder="12 Rue de la Paix, 75002 Paris"
        />
        <p className="mt-1 text-[10px] text-muted-foreground">
          📍 Les coordonnées GPS seront calculées automatiquement
        </p>
      </div>

      {/* Phone */}
      <div className="rounded-2xl border border-border bg-card p-4" style={{ boxShadow: "var(--shadow-card)" }}>
        <label className="mb-2 flex items-center gap-2 text-xs font-bold text-foreground">
          <Phone className="h-4 w-4 text-primary/60" />
          Téléphone
        </label>
        <input
          className={inputCls}
          type="tel"
          inputMode="tel"
          value={form.phone}
          onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
          placeholder="01 23 45 67 89"
        />
      </div>

      {/* Email */}
      <div className="rounded-2xl border border-border bg-card p-4" style={{ boxShadow: "var(--shadow-card)" }}>
        <label className="mb-2 flex items-center gap-2 text-xs font-bold text-foreground">
          <Mail className="h-4 w-4 text-primary/60" />
          Email de contact
        </label>
        <input
          className={inputCls}
          type="email"
          inputMode="email"
          value={form.email}
          onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
          placeholder="contact@synagogue.fr"
        />
      </div>

      {/* Save */}
      <button
        onClick={handleSave}
        disabled={saving || !form.name.trim()}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border-none py-4 text-sm font-bold text-primary-foreground cursor-pointer transition-all hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-50"
        style={{ background: "var(--gradient-gold)", boxShadow: "var(--shadow-gold)" }}
      >
        <Save className="h-4 w-4" />
        {saving ? "Enregistrement…" : "Enregistrer les infos"}
      </button>
    </motion.div>
  );
};

export default SynaInfoWidget;
