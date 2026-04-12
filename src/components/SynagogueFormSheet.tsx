import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Building2, MapPin, Phone, Mail, X } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

interface SynagogueFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
  /** Admin mode: allows assigning a president by email */
  adminMode?: boolean;
}

const RITE_OPTIONS = ["Séfarade", "Ashkénaze", "Mixte", "Autre"];

const inputCls =
  "w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30";

const SynagogueFormSheet = ({
  open,
  onOpenChange,
  onCreated,
  adminMode = false,
}: SynagogueFormSheetProps) => {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    address: "",
    city: "",
    zip: "",
    phone: "",
    email: "",
    rite: "Séfarade",
    shacharit_time: "",
    minha_time: "",
    arvit_time: "",
    notes: "",
    presidentEmail: "",
  });

  const set = (key: string, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const resetForm = () =>
    setForm({
      name: "",
      address: "",
      city: "",
      zip: "",
      phone: "",
      email: "",
      rite: "Séfarade",
      shacharit_time: "",
      minha_time: "",
      arvit_time: "",
      notes: "",
      presidentEmail: "",
    });

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.address.trim() || !form.city.trim()) {
      toast.error("Nom, adresse et ville sont obligatoires");
      return;
    }

    setSaving(true);

    let presidentId = user?.id;

    // Admin mode: resolve president by email
    if (adminMode && form.presidentEmail.trim()) {
      const { data: profileData } = await supabase.functions.invoke(
        "admin-users",
        { body: { action: "list" } }
      );
      const found = (profileData?.users || []).find(
        (u: any) =>
          u.email?.toLowerCase() === form.presidentEmail.trim().toLowerCase()
      );
      if (!found) {
        toast.error("Utilisateur introuvable avec cet email");
        setSaving(false);
        return;
      }
      presidentId = found.id;
    }

    if (!presidentId) {
      toast.error("Impossible de déterminer le président");
      setSaving(false);
      return;
    }

    // Geocode
    let latitude: number | null = null;
    let longitude: number | null = null;
    const fullAddress = [form.address, form.zip, form.city]
      .filter(Boolean)
      .join(", ");
    try {
      const { data: geo } = await supabase.functions.invoke(
        "geocode-address",
        { body: { address: fullAddress } }
      );
      if (geo?.lat && geo?.lng) {
        latitude = geo.lat;
        longitude = geo.lng;
      }
    } catch {
      // optional
    }

    const payload: Record<string, any> = {
      president_id: presidentId,
      name: form.name.trim(),
      address: fullAddress,
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      shacharit_time: form.shacharit_time || null,
      minha_time: form.minha_time || null,
      arvit_time: form.arvit_time || null,
      signature: form.notes.trim() || "",
      latitude,
      longitude,
    };

    const { error } = await supabase
      .from("synagogue_profiles")
      .insert(payload as any);

    setSaving(false);

    if (error) {
      console.error(error);
      toast.error("Erreur lors de la création");
    } else {
      toast.success("🏛️ Synagogue créée avec succès !");
      resetForm();
      onOpenChange(false);
      onCreated?.();
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto rounded-t-2xl">
        <SheetHeader className="mb-4">
          <SheetTitle className="flex items-center gap-2 font-display">
            <Building2 className="h-5 w-5 text-primary" />
            Nouvelle Synagogue
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-4 pb-6">
          {/* Admin: president email */}
          {adminMode && (
            <div>
              <label className="mb-1 block text-xs font-bold text-foreground">
                👤 Email du président (optionnel)
              </label>
              <input
                className={inputCls}
                type="email"
                value={form.presidentEmail}
                onChange={(e) => set("presidentEmail", e.target.value)}
                placeholder="president@email.com"
              />
              <p className="mt-0.5 text-[10px] text-muted-foreground">
                Laissez vide pour vous assigner comme président
              </p>
            </div>
          )}

          {/* Name */}
          <div>
            <label className="mb-1 flex items-center gap-1.5 text-xs font-bold text-foreground">
              <Building2 className="h-3.5 w-3.5 text-primary/60" /> Nom de la
              synagogue *
            </label>
            <input
              className={inputCls}
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Beth Abraham"
            />
          </div>

          {/* Address */}
          <div>
            <label className="mb-1 flex items-center gap-1.5 text-xs font-bold text-foreground">
              <MapPin className="h-3.5 w-3.5 text-primary/60" /> Adresse *
            </label>
            <input
              className={inputCls}
              value={form.address}
              onChange={(e) => set("address", e.target.value)}
              placeholder="12 Rue de la Paix"
            />
          </div>

          {/* City + Zip */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="mb-1 block text-xs font-bold text-foreground">
                Ville *
              </label>
              <input
                className={inputCls}
                value={form.city}
                onChange={(e) => set("city", e.target.value)}
                placeholder="Paris"
              />
            </div>
            <div className="w-28">
              <label className="mb-1 block text-xs font-bold text-foreground">
                Code postal
              </label>
              <input
                className={inputCls}
                value={form.zip}
                onChange={(e) => set("zip", e.target.value)}
                placeholder="75002"
                inputMode="numeric"
              />
            </div>
          </div>

          {/* Phone + Email */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="mb-1 flex items-center gap-1.5 text-xs font-bold text-foreground">
                <Phone className="h-3.5 w-3.5 text-primary/60" /> Téléphone
              </label>
              <input
                className={inputCls}
                type="tel"
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                placeholder="01 23 45 67 89"
              />
            </div>
            <div className="flex-1">
              <label className="mb-1 flex items-center gap-1.5 text-xs font-bold text-foreground">
                <Mail className="h-3.5 w-3.5 text-primary/60" /> Email
              </label>
              <input
                className={inputCls}
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                placeholder="contact@syna.fr"
              />
            </div>
          </div>

          {/* Rite */}
          <div>
            <label className="mb-1 block text-xs font-bold text-foreground">
              Rite
            </label>
            <div className="flex gap-2 flex-wrap">
              {RITE_OPTIONS.map((r) => (
                <button
                  key={r}
                  onClick={() => set("rite", r)}
                  className="rounded-full border px-3 py-1.5 text-xs font-semibold cursor-pointer transition-all"
                  style={{
                    borderColor:
                      form.rite === r
                        ? "hsl(var(--primary))"
                        : "hsl(var(--border))",
                    background:
                      form.rite === r
                        ? "hsl(var(--primary) / 0.08)"
                        : "transparent",
                    color:
                      form.rite === r
                        ? "hsl(var(--primary))"
                        : "hsl(var(--muted-foreground))",
                  }}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Horaires */}
          <div>
            <label className="mb-2 block text-xs font-bold text-foreground">
              🕐 Horaires des offices
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { key: "shacharit_time", label: "Cha'harit" },
                { key: "minha_time", label: "Min'ha" },
                { key: "arvit_time", label: "Arvit" },
              ].map((h) => (
                <div key={h.key}>
                  <p className="mb-1 text-[10px] text-muted-foreground text-center">
                    {h.label}
                  </p>
                  <input
                    className={`${inputCls} text-center`}
                    type="time"
                    value={(form as any)[h.key]}
                    onChange={(e) => set(h.key, e.target.value)}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="mb-1 block text-xs font-bold text-foreground">
              📝 Description / Notes
            </label>
            <textarea
              className={`${inputCls} min-h-[60px] resize-y`}
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              placeholder="Informations supplémentaires..."
            />
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={saving || !form.name.trim()}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border-none py-4 text-sm font-bold text-primary-foreground cursor-pointer transition-all hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-50"
            style={{
              background: "var(--gradient-gold)",
              boxShadow: "var(--shadow-gold)",
            }}
          >
            {saving ? "⏳ Création en cours…" : "🏛️ Créer la synagogue"}
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default SynagogueFormSheet;
