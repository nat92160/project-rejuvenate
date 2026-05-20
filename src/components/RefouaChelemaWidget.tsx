import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSubscribedSynaIds } from "@/hooks/useSubscribedSynaIds";
import { useManagedSynagogues } from "@/hooks/useManagedSynagogues";
import { toast } from "sonner";
import RefouaPatientDetail from "./RefouaPatientDetail";

interface Patient {
  id: string;
  hebrew_name: string;
  mother_name: string;
  gender: "ben" | "bat";
  created_at: string;
  added_by: string | null;
  synagogue_ids: string[] | null;
}

interface SynaOption { id: string; name: string; }

const RefouaChelemaWidget = () => {
  const { user, isPresident, isAdmin } = useAuth();
  const { subIds } = useSubscribedSynaIds();
  const { synagogues: managedSynas } = useManagedSynagogues();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [mother, setMother] = useState("");
  const [gender, setGender] = useState<"ben" | "bat">("ben");
  const [submitting, setSubmitting] = useState(false);
  const [synaOptions, setSynaOptions] = useState<SynaOption[]>([]);
  const [selectedSynaIds, setSelectedSynaIds] = useState<string[]>([]);
  const [filterSynaId, setFilterSynaId] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [manageMode, setManageMode] = useState(false);

  const managedSynaIds = useMemo(() => managedSynas.map((s) => s.id), [managedSynas]);
  const canManageAsPresident = isPresident || isAdmin;
  const isManagedPatient = (p: Patient) =>
    canManageAsPresident &&
    (isAdmin || (p.synagogue_ids?.some((id) => managedSynaIds.includes(id)) ?? false));

  // Load synagogue names for the user's subscribed + managed synagogues
  useEffect(() => {
    const ids = Array.from(new Set([...subIds, ...managedSynas.map(s => s.id)]));
    if (ids.length === 0) { setSynaOptions([]); return; }
    supabase.from("synagogue_profiles").select("id, name").in("id", ids).then(({ data }) => {
      setSynaOptions((data || []).map((d: any) => ({ id: d.id, name: d.name || "Synagogue" })));
    });
  }, [subIds, managedSynas]);

  useEffect(() => {
    const fetchPatients = async () => {
      const { data } = await supabase
        .from("refoua_chelema")
        .select("*")
        .order("created_at", { ascending: false });
      setPatients((data as unknown as Patient[]) || []);
      setLoading(false);
    };
    fetchPatients();

    // Realtime
    const channel = supabase
      .channel("refoua-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "refoua_chelema" }, () => {
        fetchPatients();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const toggleSyna = (id: string) => {
    setSelectedSynaIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleAdd = async () => {
    if (!name.trim()) {
      toast.error("Veuillez entrer un prénom hébreu");
      return;
    }
    if (!user) {
      toast.error("Vous devez être connecté pour ajouter un nom");
      return;
    }
    setSubmitting(true);
    const { data, error } = await (supabase.from("refoua_chelema").insert({
      hebrew_name: name.trim(),
      mother_name: mother.trim(),
      gender,
      added_by: user.id,
      synagogue_ids: selectedSynaIds.length > 0 ? selectedSynaIds : null,
    } as any)).select().single();

    if (error) {
      toast.error("Erreur lors de l'ajout. Vérifiez votre connexion.");
      console.error("Refoua add error:", error);
    } else if (data) {
      setPatients((prev) => [data as unknown as Patient, ...prev]);
      setShowForm(false);
      setName("");
      setMother("");
      setGender("ben");
      setSelectedSynaIds([]);
      toast.success("✅ Nom ajouté à la liste !");
    }
    setSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Retirer ce nom de la liste ?")) return;
    const { error } = await supabase.from("refoua_chelema").delete().eq("id", id);
    if (error) {
      toast.error("Erreur lors de la suppression");
    } else {
      setPatients((prev) => prev.filter((p) => p.id !== id));
      toast.success("Nom retiré de la liste");
    }
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

  const synaNameById = (id: string) => synaOptions.find(s => s.id === id)?.name || "Synagogue";

  // Quick-launch a default prayer chain in 1 click (Tehilim complet · 7 jours · 10 personnes)
  const quickLaunchChain = async (patientId: string, patientName: string) => {
    if (!user) {
      toast.error("Connectez-vous pour lancer une chaîne");
      return;
    }
    // If a campaign already exists for this patient, just open the detail
    const { data: existing } = await supabase
      .from("refoua_campaigns")
      .select("id")
      .eq("refoua_id", patientId)
      .limit(1);
    if (existing && existing.length > 0) {
      toast.success("Chaîne déjà active — ouverture du tableau");
      setExpandedId(patientId);
      return;
    }
    const today = new Date().toISOString().slice(0, 10);
    const { error } = await supabase.from("refoua_campaigns").insert({
      refoua_id: patientId,
      created_by: user.id,
      prayer_type: "tehilim_full",
      days_count: 7,
      slots_per_day: 10,
      start_date: today,
      title: `Refoua ${patientName}`,
    } as any);
    if (error) {
      toast.error("Erreur lors du lancement");
      console.error(error);
    } else {
      toast.success("🗓️ Chaîne lancée — invitez vos proches à réserver un créneau");
      setExpandedId(patientId);
    }
  };

  // Fidèle ne voit que les noms partagés dans ses synagogues (abonnées + gérées).
  // Si l'utilisateur n'a aucune synagogue, on retombe sur la liste générale.
  const userSynaIds = synaOptions.map((s) => s.id);
  const hasSynas = userSynaIds.length > 0;
  const visiblePatients = patients.filter((p) => {
    const isGeneral = !p.synagogue_ids || p.synagogue_ids.length === 0;
    if (!hasSynas) return isGeneral;
    if (filterSynaId === "all") {
      // Show general (non-attached) names AND those shared in any of the user's synagogues
      return isGeneral || p.synagogue_ids?.some((id) => userSynaIds.includes(id));
    }
    return p.synagogue_ids?.includes(filterSynaId);
  });

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="rounded-2xl p-6 mb-4 border border-primary/15"
        style={{ background: "linear-gradient(135deg, hsl(var(--gold) / 0.06), hsl(var(--gold) / 0.02))" }}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display text-base font-bold text-foreground flex items-center gap-2">
            🙏 Refoua Chelema
          </h3>
          <div className="flex items-center gap-2">
            {canManageAsPresident && (
              <button
                onClick={() => setManageMode((v) => !v)}
                className="px-3 py-2 rounded-xl text-[11px] font-bold border cursor-pointer"
                style={{
                  background: manageMode ? "hsl(var(--gold) / 0.18)" : "transparent",
                  borderColor: "hsl(var(--gold) / 0.5)",
                  color: "hsl(var(--foreground))",
                }}
                title="Outils du président"
              >
                {manageMode ? "✓ Gestion" : "👑 Gérer"}
              </button>
            )}
            {user && (
              <button
                onClick={() => setShowForm(!showForm)}
                className="px-4 py-2 rounded-xl text-xs font-bold border-none cursor-pointer text-primary-foreground"
                style={{ background: "var(--gradient-gold)" }}
              >
                + Ajouter
              </button>
            )}
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Liste des malades à mentionner pendant la prière
        </p>
        {manageMode && canManageAsPresident && (
          <div className="mt-3 rounded-xl bg-background/60 border border-primary/20 p-3 text-[11px] text-muted-foreground leading-relaxed">
            Mode président actif — vous pouvez supprimer tout nom partagé dans vos synagogues, et lancer / gérer leurs programmes de prière.
          </div>
        )}
      </div>

      {/* Filter chips by synagogue (uniquement les synagogues du fidèle) */}
      {synaOptions.length > 1 && (
        <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
          {[{ id: "all", name: "Toutes mes synagogues" }, ...synaOptions].map((opt) => (
            <button
              key={opt.id}
              onClick={() => setFilterSynaId(opt.id)}
              className={`px-3 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap border cursor-pointer transition-all ${filterSynaId === opt.id ? "border-primary/40 text-foreground" : "border-border text-muted-foreground bg-card"}`}
              style={filterSynaId === opt.id ? { background: "hsl(var(--gold) / 0.12)" } : {}}
            >
              {opt.name}
            </button>
          ))}
        </div>
      )}

      <AnimatePresence>
        {showForm && (
          <motion.div
            className="rounded-2xl bg-card p-5 mb-4 border border-primary/20"
            style={{ boxShadow: "var(--shadow-card)" }}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Prénom du malade (hébreu ou latin)"
              dir="auto"
              style={{ unicodeBidi: "plaintext" }}
              className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 mb-3 font-hebrew"
            />
            <div className="grid grid-cols-2 gap-2 mb-3">
              {([
                { id: "ben", label: "👨 Ben (fils de)", he: "בן" },
                { id: "bat", label: "👩 Bat (fille de)", he: "בת" },
              ] as const).map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setGender(g.id)}
                  className={`py-3 rounded-xl text-sm font-bold border cursor-pointer transition-all ${
                    gender === g.id ? "border-primary/40 text-foreground" : "border-border text-muted-foreground bg-card"
                  }`}
                  style={gender === g.id ? { background: "hsl(var(--gold) / 0.12)" } : {}}
                >
                  {g.label} <span className="font-hebrew">{g.he}</span>
                </button>
              ))}
            </div>
            <input
              value={mother}
              onChange={(e) => setMother(e.target.value)}
              placeholder="Prénom de la mère (hébreu ou latin)"
              dir="auto"
              style={{ unicodeBidi: "plaintext" }}
              className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 mb-3 font-hebrew"
            />
            {synaOptions.length > 0 && (
              <div className="mb-3 p-3 rounded-xl bg-background border border-border">
                <p className="text-[11px] font-bold text-muted-foreground mb-2">Partager dans <span className="font-normal italic">(optionnel)</span> :</p>
                <div className="flex flex-wrap gap-2">
                  {synaOptions.map((s) => (
                    <label key={s.id} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border cursor-pointer text-[11px] font-semibold text-foreground" style={selectedSynaIds.includes(s.id) ? { background: "hsl(var(--gold) / 0.12)", borderColor: "hsl(var(--gold) / 0.4)" } : {}}>
                      <input type="checkbox" checked={selectedSynaIds.includes(s.id)} onChange={() => toggleSyna(s.id)} className="cursor-pointer" />
                      {s.name}
                    </label>
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground mt-2">
                  {selectedSynaIds.length === 0 ? "Aucune synagogue sélectionnée — le nom sera visible dans la liste générale." : `Visible dans ${selectedSynaIds.length} synagogue${selectedSynaIds.length > 1 ? "s" : ""}.`}
                </p>
              </div>
            )}
            <button
              onClick={handleAdd}
              disabled={submitting || !name.trim()}
              className="w-full py-3 rounded-xl font-bold text-sm text-primary-foreground border-none cursor-pointer disabled:opacity-50"
              style={{ background: "var(--gradient-gold)" }}
            >
              {submitting ? "Ajout..." : "Ajouter à la liste"}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="text-center py-8 text-sm text-muted-foreground">Chargement...</div>
      ) : visiblePatients.length === 0 ? (
        <div className="rounded-2xl bg-card p-8 text-center border border-border" style={{ boxShadow: "var(--shadow-card)" }}>
          <p className="text-sm text-muted-foreground">Aucun nom pour le moment.</p>
          {!user && <p className="text-xs text-muted-foreground/60 mt-2">Connectez-vous pour ajouter un nom.</p>}
        </div>
      ) : (
        <div className="space-y-2">
          {visiblePatients.map((p, i) => (
            <motion.div
              key={p.id}
              className="rounded-xl bg-card p-4 border border-border"
              style={{ boxShadow: "var(--shadow-soft)" }}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                <span className="text-xl">🕯️</span>
                <div>
                  <span className="font-hebrew text-base font-bold text-foreground" dir="ltr" style={{ unicodeBidi: "plaintext" }}>
                    <bdi>{p.hebrew_name}</bdi>
                    {p.mother_name ? (
                      <>
                        {" "}
                        <span className="italic text-muted-foreground">{p.gender === "bat" ? "bat" : "ben"}</span>{" "}
                        <bdi>{p.mother_name}</bdi>
                      </>
                    ) : null}
                  </span>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Ajouté le {formatDate(p.created_at)}</p>
                  {p.synagogue_ids && p.synagogue_ids.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {p.synagogue_ids.map((sid) => (
                        <span key={sid} className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">
                          🏛️ {synaNameById(sid)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setExpandedId(p.id)}
                    className="px-3 py-1.5 rounded-lg text-[10px] font-bold border-none cursor-pointer text-primary-foreground"
                    style={{ background: "var(--gradient-gold)" }}
                    title="Configurer une chaîne de prière (durée et nombre de participants au choix)"
                  >
                    🗓️ Lancer chaîne
                  </button>
                  <button
                    onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}
                    className="px-3 py-1.5 rounded-lg text-[10px] font-bold border cursor-pointer"
                    style={{ background: expandedId === p.id ? "hsl(var(--gold) / 0.12)" : "transparent", borderColor: "hsl(var(--border))", color: "hsl(var(--foreground))" }}
                  >
                    {expandedId === p.id ? "✕ Fermer" : "📖 Prier"}
                  </button>
                  {user && p.added_by === user.id && (
                    <button
                      onClick={() => handleDelete(p.id)}
                      className="text-[10px] text-destructive bg-transparent border-none cursor-pointer hover:underline"
                    >
                      🗑️
                    </button>
                  )}
                  {manageMode && isManagedPatient(p) && p.added_by !== user?.id && (
                    <button
                      onClick={() => handleDelete(p.id)}
                      className="text-[10px] text-destructive bg-transparent border border-destructive/30 rounded-lg px-2 py-1 cursor-pointer"
                      title="Supprimer (président)"
                    >
                      🗑️
                    </button>
                  )}
                </div>
              </div>
              <AnimatePresence>
                {expandedId === p.id && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                    <RefouaPatientDetail refouaId={p.id} hebrewName={p.hebrew_name} motherName={p.mother_name} gender={p.gender} />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      )}

      {/* Prayer text */}
      <div className="rounded-2xl bg-card p-5 mt-4 border border-border text-center" style={{ boxShadow: "var(--shadow-card)" }}>
        <p className="font-hebrew text-sm text-foreground leading-relaxed" dir="rtl">
          מִי שֶׁבֵּרַךְ אֲבוֹתֵינוּ אַבְרָהָם יִצְחָק וְיַעֲקֹב הוּא יְבָרֵךְ וִירַפֵּא אֶת הַחוֹלִים
        </p>
        <p className="text-xs text-muted-foreground mt-3 italic">
          Que le Tout-Puissant accorde une guérison complète à tous les malades
        </p>
      </div>
    </motion.div>
  );
};

export default RefouaChelemaWidget;
