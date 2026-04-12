import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Building2, MapPin, Phone, Mail, Save } from "lucide-react";
import { useRef } from "react";

interface SynaProfile {
  id?: string;
  name: string;
  logo_url: string | null;
  signature: string;
  primary_color: string;
  secondary_color: string;
  font_family: string;
  speakers: string[];
  president_first_name: string;
  president_last_name: string;
  address: string;
  phone: string;
  email: string;
}

const FONT_OPTIONS = ["Lora", "Playfair Display", "Georgia", "Merriweather", "Noto Serif"];

const DEFAULT_PROFILE: SynaProfile = {
  name: "",
  logo_url: null,
  signature: "",
  primary_color: "#1e3a5f",
  secondary_color: "#c9a84c",
  font_family: "Lora",
  speakers: [],
  president_first_name: "",
  president_last_name: "",
  address: "",
  phone: "",
  email: "",
};

const SynaProfileManager = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<SynaProfile>(DEFAULT_PROFILE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newSpeaker, setNewSpeaker] = useState("");

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from("synagogue_profiles")
        .select("*")
        .eq("president_id", user.id)
        .maybeSingle();
      if (data) {
        setProfile({
          id: data.id,
          name: data.name || "",
          logo_url: data.logo_url,
          signature: data.signature || "",
          primary_color: data.primary_color || "#1e3a5f",
          secondary_color: data.secondary_color || "#c9a84c",
          font_family: data.font_family || "Lora",
          speakers: Array.isArray(data.speakers) ? (data.speakers as string[]) : [],
          president_first_name: (data as any).president_first_name || "",
          president_last_name: (data as any).president_last_name || "",
          address: (data as any).address || "",
          phone: (data as any).phone || "",
          email: (data as any).email || "",
        });
      }
      setLoading(false);
    };
    void load();
  }, [user]);


  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    // Geocode address
    let latitude: number | null = null;
    let longitude: number | null = null;
    if (profile.address.trim()) {
      try {
        const { data: funcData } = await supabase.functions.invoke("geocode-address", {
          body: { address: profile.address },
        });
        if (funcData?.lat && funcData?.lng) {
          latitude = funcData.lat;
          longitude = funcData.lng;
        }
      } catch {
        // Geocoding is optional
      }
    }

    const payload: Record<string, any> = {
      president_id: user.id,
      name: profile.name,
      logo_url: profile.logo_url,
      signature: profile.signature,
      primary_color: profile.primary_color,
      secondary_color: profile.secondary_color,
      font_family: profile.font_family,
      speakers: profile.speakers,
      president_first_name: profile.president_first_name,
      president_last_name: profile.president_last_name,
      address: profile.address || null,
      phone: profile.phone || null,
      email: profile.email || null,
    };
    if (latitude !== null) {
      payload.latitude = latitude;
      payload.longitude = longitude;
    }

    let error;
    if (profile.id) {
      ({ error } = await supabase.from("synagogue_profiles").update(payload as any).eq("id", profile.id));
    } else {
      const { data, error: insertError } = await supabase.from("synagogue_profiles").insert(payload as any).select().single();
      error = insertError;
      if (data) setProfile((p) => ({ ...p, id: data.id }));
    }

    setSaving(false);
    if (error) {
      toast.error("Erreur lors de la sauvegarde");
      console.error(error);
    } else {
      toast.success("Profil de la synagogue enregistré ✅");
    }
  };

  const addSpeaker = () => {
    const trimmed = newSpeaker.trim();
    if (!trimmed || profile.speakers.includes(trimmed)) return;
    setProfile((p) => ({ ...p, speakers: [...p.speakers, trimmed] }));
    setNewSpeaker("");
  };

  const removeSpeaker = (name: string) => {
    setProfile((p) => ({ ...p, speakers: p.speakers.filter((s) => s !== name) }));
  };

  if (loading) {
    return <div className="py-10 text-center text-sm text-muted-foreground">Chargement du profil…</div>;
  }

  const inputCls = "w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30";

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      {/* Header */}
      <div className="rounded-2xl border border-primary/15 p-5 text-center" style={{ background: "linear-gradient(135deg, hsl(var(--gold) / 0.08), hsl(var(--gold) / 0.02))" }}>
        <Building2 className="mx-auto h-8 w-8 text-primary/70" />
        <h3 className="mt-2 font-display text-lg font-bold text-foreground">Infos Synagogue</h3>
        <p className="mt-1 text-xs text-muted-foreground">Identité visuelle et coordonnées de votre synagogue</p>
      </div>

      {/* ───── COORDONNÉES ───── */}
      <div className="rounded-2xl border border-primary/10 bg-primary/[0.02] p-4">
        <h4 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary/70">
          <MapPin className="h-4 w-4" /> Coordonnées
        </h4>
        <div className="space-y-3">
          {/* Name */}
          <div className="rounded-2xl border border-border bg-card p-4" style={{ boxShadow: "var(--shadow-card)" }}>
            <label className="mb-2 flex items-center gap-2 text-xs font-bold text-foreground">
              <Building2 className="h-4 w-4 text-primary/60" /> Nom de la Synagogue
            </label>
            <input className={inputCls} value={profile.name} onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))} placeholder="Beth Abraham" />
          </div>

          {/* Address */}
          <div className="rounded-2xl border border-border bg-card p-4" style={{ boxShadow: "var(--shadow-card)" }}>
            <label className="mb-2 flex items-center gap-2 text-xs font-bold text-foreground">
              <MapPin className="h-4 w-4 text-primary/60" /> Adresse complète
            </label>
            <input className={inputCls} value={profile.address} onChange={(e) => setProfile((p) => ({ ...p, address: e.target.value }))} placeholder="12 Rue de la Paix, 75002 Paris" />
            <p className="mt-1 text-[10px] text-muted-foreground">📍 Les coordonnées GPS seront calculées automatiquement</p>
          </div>

          {/* Phone */}
          <div className="rounded-2xl border border-border bg-card p-4" style={{ boxShadow: "var(--shadow-card)" }}>
            <label className="mb-2 flex items-center gap-2 text-xs font-bold text-foreground">
              <Phone className="h-4 w-4 text-primary/60" /> Téléphone
            </label>
            <input className={inputCls} type="tel" inputMode="tel" value={profile.phone} onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))} placeholder="01 23 45 67 89" />
          </div>

          {/* Email */}
          <div className="rounded-2xl border border-border bg-card p-4" style={{ boxShadow: "var(--shadow-card)" }}>
            <label className="mb-2 flex items-center gap-2 text-xs font-bold text-foreground">
              <Mail className="h-4 w-4 text-primary/60" /> Email de contact
            </label>
            <input className={inputCls} type="email" inputMode="email" value={profile.email} onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))} placeholder="contact@synagogue.fr" />
          </div>
        </div>
      </div>

      {/* ───── IDENTITÉ VISUELLE ───── */}
      <div className="rounded-2xl border border-primary/10 bg-primary/[0.02] p-4">
        <h4 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary/70">
          🎨 Identité visuelle
        </h4>
        <div className="space-y-3">
          {/* Président */}
          <div className="rounded-2xl border border-border bg-card p-4" style={{ boxShadow: "var(--shadow-card)" }}>
            <label className="mb-2 block text-xs font-bold text-foreground">Président de la synagogue</label>
            <div className="flex gap-2">
              <input className={`${inputCls} flex-1`} value={profile.president_first_name} onChange={(e) => setProfile((p) => ({ ...p, president_first_name: e.target.value }))} placeholder="Prénom" />
              <input className={`${inputCls} flex-1`} value={profile.president_last_name} onChange={(e) => setProfile((p) => ({ ...p, president_last_name: e.target.value }))} placeholder="Nom" />
            </div>
          </div>

          {/* Logo — fixed synagogue icon */}
          <div className="rounded-2xl border border-border bg-card p-4" style={{ boxShadow: "var(--shadow-card)" }}>
            <label className="mb-2 block text-xs font-bold text-foreground">Logo de la synagogue</label>
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-xl border border-border bg-primary/5">
                <Building2 className="h-8 w-8 text-primary" />
              </div>
              <p className="text-xs text-muted-foreground">Le logo synagogue est appliqué automatiquement</p>
            </div>
          </div>

          {/* Couleurs */}
          <div className="rounded-2xl border border-border bg-card p-4" style={{ boxShadow: "var(--shadow-card)" }}>
            <label className="mb-3 block text-xs font-bold text-foreground">Couleurs maîtresses</label>
            <div className="flex gap-4">
              <div className="flex-1">
                <p className="mb-1 text-[10px] text-muted-foreground">Couleur principale</p>
                <div className="flex items-center gap-2">
                  <input type="color" value={profile.primary_color} onChange={(e) => setProfile((p) => ({ ...p, primary_color: e.target.value }))} className="h-10 w-10 cursor-pointer rounded-lg border border-border" />
                  <span className="text-xs text-muted-foreground">{profile.primary_color}</span>
                </div>
              </div>
              <div className="flex-1">
                <p className="mb-1 text-[10px] text-muted-foreground">Couleur secondaire</p>
                <div className="flex items-center gap-2">
                  <input type="color" value={profile.secondary_color} onChange={(e) => setProfile((p) => ({ ...p, secondary_color: e.target.value }))} className="h-10 w-10 cursor-pointer rounded-lg border border-border" />
                  <span className="text-xs text-muted-foreground">{profile.secondary_color}</span>
                </div>
              </div>
            </div>
            <div className="mt-3 flex h-12 items-center justify-center gap-2 rounded-xl" style={{ background: `linear-gradient(135deg, ${profile.primary_color}, ${profile.primary_color}cc)` }}>
              <span className="text-sm font-bold" style={{ color: profile.secondary_color, fontFamily: profile.font_family }}>{profile.name || "Aperçu"}</span>
            </div>
          </div>

          {/* Police */}
          <div className="rounded-2xl border border-border bg-card p-4" style={{ boxShadow: "var(--shadow-card)" }}>
            <label className="mb-2 block text-xs font-bold text-foreground">Typographie</label>
            <div className="flex flex-wrap gap-2">
              {FONT_OPTIONS.map((font) => (
                <button key={font} onClick={() => setProfile((p) => ({ ...p, font_family: font }))} className="rounded-xl border px-3 py-2 text-xs font-bold cursor-pointer transition-all" style={{
                  fontFamily: font,
                  borderColor: profile.font_family === font ? "hsl(var(--gold-matte))" : "hsl(var(--border))",
                  background: profile.font_family === font ? "hsl(var(--gold) / 0.1)" : "transparent",
                  color: profile.font_family === font ? "hsl(var(--gold-matte))" : "hsl(var(--foreground))",
                }}>
                  {font}
                </button>
              ))}
            </div>
          </div>

          {/* Signature */}
          <div className="rounded-2xl border border-border bg-card p-4" style={{ boxShadow: "var(--shadow-card)" }}>
            <label className="mb-2 block text-xs font-bold text-foreground">Signature automatique</label>
            <textarea className={`${inputCls} min-h-[60px] resize-y`} value={profile.signature} onChange={(e) => setProfile((p) => ({ ...p, signature: e.target.value }))} placeholder="Le comité Beth Abraham vous souhaite Chabbat Chalom" />
          </div>

          {/* Intervenants */}
          <div className="rounded-2xl border border-border bg-card p-4" style={{ boxShadow: "var(--shadow-card)" }}>
            <label className="mb-2 block text-xs font-bold text-foreground">Intervenants / Rabbanim</label>
            <div className="flex gap-2">
              <input className={`${inputCls} flex-1`} value={newSpeaker} onChange={(e) => setNewSpeaker(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addSpeaker()} placeholder="Nom du Rav ou conférencier" />
              <button onClick={addSpeaker} className="shrink-0 rounded-xl border-none px-4 py-2 text-xs font-bold text-primary-foreground cursor-pointer" style={{ background: "var(--gradient-gold)" }}>+</button>
            </div>
            {profile.speakers.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {profile.speakers.map((s) => (
                  <span key={s} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-foreground">
                    {s}
                    <button onClick={() => removeSpeaker(s)} className="ml-0.5 text-destructive/70 hover:text-destructive bg-transparent border-none cursor-pointer text-xs">✕</button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Save */}
      <button onClick={handleSave} disabled={saving || !profile.name.trim()} className="flex w-full items-center justify-center gap-2 rounded-2xl border-none py-4 text-sm font-bold text-primary-foreground cursor-pointer transition-all hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-50" style={{ background: "var(--gradient-gold)", boxShadow: "var(--shadow-gold)" }}>
        <Save className="h-4 w-4" />
        {saving ? "Enregistrement…" : "Enregistrer le profil"}
      </button>
    </motion.div>
  );
};

export default SynaProfileManager;
