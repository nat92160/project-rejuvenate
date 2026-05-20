import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Building2, MapPin, Phone, Mail, Save, Search } from "lucide-react";
import { notifySynagoguesChanged } from "@/hooks/useManagedSynagogues";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export interface SynagogueEditData {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  shacharit_time: string | null;
  minha_time: string | null;
  arvit_time: string | null;
  signature: string | null;
  president_id: string;
}

interface SynagogueFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
  /** Admin mode: allows assigning a president by email */
  adminMode?: boolean;
  /** If provided, the form will be in edit mode */
  editData?: SynagogueEditData | null;
}

const RITE_OPTIONS = ["Séfarade", "Ashkénaze", "Mixte", "Autre"];

const inputCls =
  "w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30";

const SynagogueFormSheet = ({
  open,
  onOpenChange,
  onCreated,
  adminMode = false,
  editData = null,
}: SynagogueFormSheetProps) => {
  const { user, isPresident } = useAuth();
  const [saving, setSaving] = useState(false);
  const [mapsQuery, setMapsQuery] = useState("");
  const [mapsResults, setMapsResults] = useState<Array<{ id: string; name: string; address: string; lat: number | null; lng: number | null }>>([]);
  const [mapsSearching, setMapsSearching] = useState(false);
  const [mapsPicked, setMapsPicked] = useState<{ lat: number | null; lng: number | null; place_id: string } | null>(null);
  const mapsTimer = useRef<number | null>(null);
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

  const isEdit = !!editData;

  // Pre-fill form when editing
  useEffect(() => {
    if (editData && open) {
      const addr = editData.address || "";
      setForm({
        name: editData.name || "",
        address: addr,
        city: "",
        zip: "",
        phone: editData.phone || "",
        email: editData.email || "",
        rite: "Séfarade",
        shacharit_time: editData.shacharit_time || "",
        minha_time: editData.minha_time || "",
        arvit_time: editData.arvit_time || "",
        notes: editData.signature || "",
        presidentEmail: "",
      });
    } else if (!editData && open) {
      resetForm();
    }
  }, [editData, open]);

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

  // Maps Places search (debounced)
  useEffect(() => {
    if (isEdit) return;
    if (mapsTimer.current) window.clearTimeout(mapsTimer.current);
    const q = mapsQuery.trim();
    if (q.length < 3) { setMapsResults([]); return; }
    mapsTimer.current = window.setTimeout(async () => {
      setMapsSearching(true);
      try {
        const { data } = await supabase.functions.invoke("places-search", { body: { query: q } });
        setMapsResults(data?.results || []);
      } catch { setMapsResults([]); }
      setMapsSearching(false);
    }, 350);
  }, [mapsQuery, isEdit]);

  const pickPlace = async (r: { id: string; name: string; address: string; lat: number | null; lng: number | null }) => {
    // Fetch full details (phone, address components)
    let phone = "";
    let zip = "";
    let city = "";
    let street = r.address;
    try {
      const { data } = await supabase.functions.invoke("places-search", { body: { place_id: r.id } });
      const p = data?.place || {};
      phone = p.internationalPhoneNumber || p.nationalPhoneNumber || "";
      const comps: any[] = p.addressComponents || [];
      const get = (t: string) => comps.find((c) => (c.types || []).includes(t))?.longText || "";
      const num = get("street_number");
      const route = get("route");
      street = [num, route].filter(Boolean).join(" ") || r.address;
      zip = get("postal_code");
      city = get("locality") || get("administrative_area_level_2");
    } catch { /* ignore */ }

    setForm((f) => ({
      ...f,
      name: f.name || r.name,
      address: street || r.address,
      city: city || f.city,
      zip: zip || f.zip,
      phone: f.phone || phone,
    }));
    setMapsPicked({ lat: r.lat, lng: r.lng, place_id: r.id });
    setMapsResults([]);
    setMapsQuery(r.name);
    toast.success("📍 Fiche importée — complétez les infos puis enregistrez");
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      toast.error("Le nom est obligatoire");
      return;
    }
    if (!isEdit && (!form.address.trim() || !form.city.trim())) {
      toast.error("Adresse et ville sont obligatoires");
      return;
    }

    setSaving(true);

    let presidentId = isEdit ? editData!.president_id : user?.id;

    // Admin mode: resolve president by email (only for creation)
    if (adminMode && !isEdit && form.presidentEmail.trim()) {
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
    const fullAddress = isEdit
      ? form.address.trim()
      : [form.address, form.zip, form.city].filter(Boolean).join(", ");

    if (mapsPicked?.lat != null && mapsPicked?.lng != null) {
      latitude = mapsPicked.lat;
      longitude = mapsPicked.lng;
    } else if (fullAddress) {
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
    }

    const payload: Record<string, any> = {
      name: form.name.trim(),
      address: fullAddress || null,
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      shacharit_time: form.shacharit_time || null,
      minha_time: form.minha_time || null,
      arvit_time: form.arvit_time || null,
      signature: form.notes.trim() || "",
    };

    if (latitude !== null) {
      payload.latitude = latitude;
      payload.longitude = longitude;
    }

    let error;
    if (isEdit) {
      // Detect schedule changes before update
      const scheduleChanged = isEdit && (
        (editData?.shacharit_time || null) !== (form.shacharit_time || null) ||
        (editData?.minha_time || null) !== (form.minha_time || null) ||
        (editData?.arvit_time || null) !== (form.arvit_time || null)
      );
      // Update existing
      ({ error } = await supabase
        .from("synagogue_profiles")
        .update(payload as any)
        .eq("id", editData!.id));
      if (!error && scheduleChanged && editData?.id) {
        try {
          const changes: string[] = [];
          if ((editData?.shacharit_time || null) !== (form.shacharit_time || null))
            changes.push(`Cha'harit ${form.shacharit_time || "—"}`);
          if ((editData?.minha_time || null) !== (form.minha_time || null))
            changes.push(`Min'ha ${form.minha_time || "—"}`);
          if ((editData?.arvit_time || null) !== (form.arvit_time || null))
            changes.push(`Arvit ${form.arvit_time || "—"}`);
          await supabase.functions.invoke("send-push", {
            body: {
              synagogue_id: editData.id,
              title: `🕐 Horaires mis à jour — ${form.name.trim()}`,
              body: changes.join(" · ").slice(0, 180),
              sender_id: presidentId,
            },
          });
        } catch (e) { console.error("Push horaires error:", e); }
      }
    } else {
      // Create new
      payload.president_id = presidentId;
      ({ error } = await supabase
        .from("synagogue_profiles")
        .insert(payload as any));
    }

    setSaving(false);

    if (error) {
      console.error(error);
      toast.error(isEdit ? "Erreur lors de la modification" : "Erreur lors de la création");
    } else {
      toast.success(isEdit ? "✅ Fiche synagogue modifiée !" : "🏛️ Synagogue créée avec succès !");
      notifySynagoguesChanged();
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
            {isEdit ? "Modifier la Synagogue" : "Nouvelle Synagogue"}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-4 pb-6">
          {/* Maps import (creation only) */}
          {!isEdit && (
            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-3">
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-foreground">
                <Search className="h-3.5 w-3.5 text-primary" /> Importer depuis Google Maps
              </label>
              <input
                className={inputCls}
                value={mapsQuery}
                onChange={(e) => { setMapsQuery(e.target.value); setMapsPicked(null); }}
                placeholder="Ex : Beth Abraham Charenton…"
                style={{ fontSize: 16 }}
              />
              {mapsSearching && <p className="mt-1 text-[10px] text-muted-foreground">⏳ Recherche…</p>}
              {mapsResults.length > 0 && (
                <div className="mt-2 space-y-1 max-h-56 overflow-y-auto">
                  {mapsResults.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => pickPlace(r)}
                      className="w-full text-left rounded-lg border border-border bg-card px-3 py-2 cursor-pointer hover:bg-muted transition-all"
                      style={{ minHeight: 48 }}
                    >
                      <p className="text-xs font-bold text-foreground truncate">{r.name}</p>
                      <p className="text-[10px] text-muted-foreground truncate">📍 {r.address}</p>
                    </button>
                  ))}
                </div>
              )}
              {mapsPicked && (
                <p className="mt-1.5 text-[10px] text-primary font-semibold">✅ Fiche importée — vérifiez et complétez ci-dessous</p>
              )}
              {!adminMode && (
                <p className="mt-1 text-[10px] text-muted-foreground">La fiche sera créée en attente de vérification par un admin.</p>
              )}
            </div>
          )}

          {/* Admin: president email (only for creation) */}
          {adminMode && !isEdit && (
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
              <MapPin className="h-3.5 w-3.5 text-primary/60" /> Adresse {!isEdit && "*"}
            </label>
            <input
              className={inputCls}
              value={form.address}
              onChange={(e) => set("address", e.target.value)}
              placeholder="12 Rue de la Paix"
            />
          </div>

          {/* City + Zip (only for creation) */}
          {!isEdit && (
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
          )}

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
            {isEdit ? (
              <>
                <Save className="h-4 w-4" />
                {saving ? "⏳ Enregistrement…" : "✅ Enregistrer les modifications"}
              </>
            ) : (
              saving ? "⏳ Création en cours…" : "🏛️ Créer la synagogue"
            )}
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default SynagogueFormSheet;
