import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { NICHMAT_PRAYER } from "@/lib/nichmat-prayer";
import jsPDF from "jspdf";

interface Action {
  id: string;
  user_id: string;
  display_name: string;
  action_type: "tehilim" | "nichmat" | "prayed";
  psalm_number: number | null;
  action_date: string;
}

interface Props {
  refouaId: string;
  hebrewName: string;
  motherName: string;
}

const todayISO = () => new Date().toISOString().slice(0, 10);

const RefouaPatientDetail = ({ refouaId, hebrewName, motherName }: Props) => {
  const { user } = useAuth();
  const [tab, setTab] = useState<"tehilim" | "nichmat" | "prayed">("tehilim");
  const [actions, setActions] = useState<Action[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNichmat, setShowNichmat] = useState(false);
  const today = todayISO();

  useEffect(() => {
    const fetchActions = async () => {
      const { data } = await supabase
        .from("refoua_actions")
        .select("*")
        .eq("refoua_id", refouaId)
        .eq("action_date", today)
        .order("created_at", { ascending: false });
      setActions((data as Action[]) || []);
      setLoading(false);
    };
    fetchActions();

    const channel = supabase
      .channel(`refoua-actions-${refouaId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "refoua_actions", filter: `refoua_id=eq.${refouaId}` },
        () => fetchActions(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [refouaId, today]);

  const psalmsTaken = new Map(
    actions.filter((a) => a.action_type === "tehilim" && a.psalm_number).map((a) => [a.psalm_number!, a]),
  );
  const prayedCount = actions.filter((a) => a.action_type === "prayed").length;
  const nichmatCount = actions.filter((a) => a.action_type === "nichmat").length;
  const tehilimDone = psalmsTaken.size;
  const userPrayedToday = !!user && actions.some((a) => a.action_type === "prayed" && a.user_id === user.id);
  const userNichmatToday = !!user && actions.some((a) => a.action_type === "nichmat" && a.user_id === user.id);

  const ensureUser = () => {
    if (!user) {
      toast.error("Connectez-vous pour participer");
      return false;
    }
    return true;
  };

  const getDisplayName = async () => {
    if (!user) return "";
    const { data } = await supabase.from("profiles").select("display_name, first_name").eq("user_id", user.id).maybeSingle();
    return (data?.first_name || data?.display_name || "Anonyme").toString();
  };

  const claimPsalm = async (n: number) => {
    if (!ensureUser()) return;
    if (psalmsTaken.has(n)) {
      toast.error(`Psaume ${n} déjà pris aujourd'hui`);
      return;
    }
    const display_name = await getDisplayName();
    const { error } = await supabase.from("refoua_actions").insert({
      refoua_id: refouaId,
      user_id: user!.id,
      display_name,
      action_type: "tehilim",
      psalm_number: n,
    } as any);
    if (error) toast.error("Psaume déjà pris");
    else toast.success(`✅ Tehilim ${n} réservé pour vous`);
  };

  const releasePsalm = async (action: Action) => {
    if (!user || action.user_id !== user.id) return;
    await supabase.from("refoua_actions").delete().eq("id", action.id);
  };

  const markPrayed = async () => {
    if (!ensureUser()) return;
    if (userPrayedToday) {
      toast.info("Vous avez déjà prié aujourd'hui 🙏");
      return;
    }
    const display_name = await getDisplayName();
    const { error } = await supabase.from("refoua_actions").insert({
      refoua_id: refouaId,
      user_id: user!.id,
      display_name,
      action_type: "prayed",
    } as any);
    if (error) toast.error("Erreur");
    else toast.success("🙏 Merci pour votre prière !");
  };

  const markNichmat = async () => {
    if (!ensureUser()) return;
    const display_name = await getDisplayName();
    const { error } = await supabase.from("refoua_actions").insert({
      refoua_id: refouaId,
      user_id: user!.id,
      display_name,
      action_type: "nichmat",
    } as any);
    if (error) toast.error("Erreur");
    else toast.success("✨ Nichmat enregistré");
  };

  const sharePDF = async () => {
    try {
      const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const margin = 12;
      const colW = (pageW - margin * 3) / 2;

      // En-tête
      pdf.setFillColor(153, 101, 21);
      pdf.rect(0, 0, pageW, 22, "F");
      pdf.setTextColor(255, 255, 255);
      pdf.setFont("times", "bold");
      pdf.setFontSize(16);
      pdf.text("Refoua Chelema", pageW / 2, 10, { align: "center" });
      pdf.setFontSize(11);
      pdf.setFont("times", "italic");
      const nameLine = motherName ? `${hebrewName} ben/bat ${motherName}` : hebrewName;
      pdf.text(`Pour : ${nameLine}`, pageW / 2, 17, { align: "center" });

      // Séparateur central
      pdf.setDrawColor(200, 168, 76);
      pdf.setLineWidth(0.3);
      pdf.line(pageW / 2, 28, pageW / 2, pageH - 12);

      pdf.setTextColor(40, 40, 40);

      // Colonne gauche : Hébreu (rendu via canvas pour support RTL & glyphes)
      const hebrewCanvas = document.createElement("canvas");
      const scale = 3;
      hebrewCanvas.width = colW * scale * 3.78;
      hebrewCanvas.height = (pageH - 40) * scale * 3.78;
      const ctx = hebrewCanvas.getContext("2d")!;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, hebrewCanvas.width, hebrewCanvas.height);
      ctx.fillStyle = "#1a1a1a";
      ctx.direction = "rtl";
      ctx.textAlign = "right";
      ctx.font = `bold ${22 * scale}px "Times New Roman", serif`;
      ctx.fillText("נשמת כל חי", hebrewCanvas.width - 20 * scale, 30 * scale);

      ctx.font = `${18 * scale}px "Times New Roman", serif`;
      const words = NICHMAT_PRAYER.hebrew.split(" ");
      let line = "";
      let y = 70 * scale;
      const maxW = hebrewCanvas.width - 40 * scale;
      const lineH = 30 * scale;
      for (const word of words) {
        const testLine = line ? `${line} ${word}` : word;
        if (ctx.measureText(testLine).width > maxW) {
          ctx.fillText(line, hebrewCanvas.width - 20 * scale, y);
          line = word;
          y += lineH;
          if (y > hebrewCanvas.height - lineH) break;
        } else {
          line = testLine;
        }
      }
      if (line && y <= hebrewCanvas.height - lineH) ctx.fillText(line, hebrewCanvas.width - 20 * scale, y);

      const hebrewImg = hebrewCanvas.toDataURL("image/png");
      pdf.addImage(hebrewImg, "PNG", margin, 30, colW, pageH - 42);

      // En-tête colonne hébreu
      pdf.setFont("times", "bold");
      pdf.setFontSize(10);
      pdf.setTextColor(153, 101, 21);
      pdf.text("HEBREU", margin + colW / 2, 28, { align: "center" });

      // Colonne droite : Phonétique
      pdf.setFont("times", "bold");
      pdf.setFontSize(10);
      pdf.setTextColor(153, 101, 21);
      pdf.text("PHONETIQUE", margin * 2 + colW + colW / 2, 28, { align: "center" });

      pdf.setFont("times", "bold");
      pdf.setFontSize(14);
      pdf.setTextColor(40, 40, 40);
      pdf.text("Nichmat Kol Hai", margin * 2 + colW + colW / 2, 38, { align: "center" });

      pdf.setFont("times", "normal");
      pdf.setFontSize(11);
      const phoneticLines = pdf.splitTextToSize(NICHMAT_PRAYER.phonetic, colW);
      pdf.text(phoneticLines, margin * 2 + colW, 48);

      // Pied de page
      pdf.setFont("times", "italic");
      pdf.setFontSize(8);
      pdf.setTextColor(120, 120, 120);
      pdf.text(
        "Que le Tout-Puissant accorde une guerison complete a tous les malades d'Israel",
        pageW / 2,
        pageH - 6,
        { align: "center" },
      );

      const fileName = `refoua-${hebrewName.replace(/\s+/g, "-")}.pdf`;
      const blob = pdf.output("blob");
      const file = new File([blob], fileName, { type: "application/pdf" });

      if (navigator.share && (navigator.canShare?.({ files: [file] }) ?? false)) {
        await navigator.share({ files: [file], title: "Refoua Chelema", text: `Nichmat Kol Hai pour ${nameLine}` });
      } else {
        pdf.save(fileName);
      }
      toast.success("📄 PDF prêt à partager");
    } catch (e) {
      console.error(e);
      toast.error("Erreur lors de la génération du PDF");
    }
  };

  return (
    <div className="mt-3 pt-3 border-t border-border space-y-3">
      {/* Titre Refoua Chelema avec nom du malade */}
      <div
        className="rounded-xl p-4 text-center border border-primary/15"
        style={{ background: "linear-gradient(135deg, hsl(var(--gold) / 0.10), hsl(var(--gold) / 0.03))" }}
      >
        <p className="text-[10px] uppercase tracking-[3px] font-bold text-muted-foreground mb-1">
          🙏 Refoua Chelema pour
        </p>
        <p className="font-hebrew text-xl font-bold text-foreground" dir="rtl">
          {hebrewName} {motherName ? `בן/בת ${motherName}` : ""}
        </p>
      </div>

      {/* Stats du jour */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-background border border-border p-2">
          <div className="text-lg font-bold text-foreground">{tehilimDone}<span className="text-[10px] text-muted-foreground">/150</span></div>
          <div className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold">Tehilim</div>
        </div>
        <div className="rounded-xl bg-background border border-border p-2">
          <div className="text-lg font-bold text-foreground">{nichmatCount}</div>
          <div className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold">Nichmat</div>
        </div>
        <div className="rounded-xl bg-background border border-border p-2">
          <div className="text-lg font-bold text-foreground">{prayedCount}</div>
          <div className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold">Prières</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5">
        {([
          { id: "tehilim", label: "📖 Chaîne Tehilim" },
          { id: "nichmat", label: "✨ Nichmat" },
          { id: "prayed", label: "🙏 J'ai prié" },
        ] as const).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 px-2 py-2 rounded-lg text-[10px] font-bold border cursor-pointer transition-all ${
              tab === t.id ? "border-primary/40 text-foreground" : "border-border text-muted-foreground bg-card"
            }`}
            style={tab === t.id ? { background: "hsl(var(--gold) / 0.12)" } : {}}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-4 text-xs text-muted-foreground">Chargement...</div>
      ) : tab === "tehilim" ? (
        <div>
          <p className="text-[10px] text-muted-foreground mb-2 italic">
            Réservez un psaume pour le réciter aujourd'hui pour {hebrewName}. À minuit la chaîne repart à zéro.
          </p>
          <div className="grid grid-cols-10 gap-1">
            {Array.from({ length: 150 }, (_, i) => i + 1).map((n) => {
              const taken = psalmsTaken.get(n);
              const mine = !!taken && taken.user_id === user?.id;
              return (
                <button
                  key={n}
                  onClick={() => (mine ? releasePsalm(taken!) : claimPsalm(n))}
                  disabled={!!taken && !mine}
                  title={taken ? `Pris par ${taken.display_name}` : `Réserver le psaume ${n}`}
                  className="aspect-square rounded text-[9px] font-bold border cursor-pointer disabled:cursor-not-allowed transition-all"
                  style={{
                    background: mine
                      ? "hsl(var(--gold) / 0.3)"
                      : taken
                      ? "hsl(var(--muted) / 0.6)"
                      : "hsl(var(--background))",
                    borderColor: mine ? "hsl(var(--gold))" : "hsl(var(--border))",
                    color: taken ? "hsl(var(--muted-foreground))" : "hsl(var(--foreground))",
                    opacity: taken && !mine ? 0.55 : 1,
                  }}
                >
                  {mine ? "✓" : n}
                </button>
              );
            })}
          </div>
          {tehilimDone === 150 && (
            <p className="text-center text-xs text-primary font-bold mt-2">🎉 Chaîne complète !</p>
          )}
        </div>
      ) : tab === "nichmat" ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-muted-foreground">
              {nichmatCount} {nichmatCount > 1 ? "personnes l'ont récitée" : "personne l'a récitée"} aujourd'hui
            </p>
            <button
              onClick={markNichmat}
              disabled={!user}
              className="px-3 py-1.5 rounded-lg text-[10px] font-bold text-primary-foreground border-none cursor-pointer disabled:opacity-50"
              style={{ background: "var(--gradient-gold)" }}
            >
              {userNichmatToday ? "+ Encore une fois" : "✨ J'ai récité"}
            </button>
          </div>
          <button
            onClick={() => setShowNichmat((v) => !v)}
            className="w-full text-[11px] text-primary font-bold bg-transparent border border-border rounded-lg py-2 cursor-pointer"
          >
            {showNichmat ? "Masquer le texte" : "Afficher le texte"}
          </button>
          <AnimatePresence>
            {showNichmat && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-3 overflow-hidden"
              >
                <div className="rounded-xl bg-card border border-border p-3">
                  <p className="text-[9px] uppercase tracking-wider font-bold text-muted-foreground mb-2">Hébreu</p>
                  <p dir="rtl" className="font-hebrew text-sm leading-loose text-foreground">{NICHMAT_PRAYER.hebrew}</p>
                </div>
                <div className="rounded-xl bg-card border border-border p-3">
                  <p className="text-[9px] uppercase tracking-wider font-bold text-muted-foreground mb-2">Phonétique</p>
                  <p className="text-xs leading-relaxed text-foreground italic">{NICHMAT_PRAYER.phonetic}</p>
                </div>
                <div className="rounded-xl bg-card border border-border p-3">
                  <p className="text-[9px] uppercase tracking-wider font-bold text-muted-foreground mb-2">Traduction</p>
                  <p className="text-xs leading-relaxed text-muted-foreground">{NICHMAT_PRAYER.french}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-[11px] text-muted-foreground">
            <strong className="text-foreground">{prayedCount}</strong> {prayedCount > 1 ? "personnes ont prié" : "personne a prié"} aujourd'hui pour {hebrewName}.
          </p>
          <button
            onClick={markPrayed}
            disabled={!user || userPrayedToday}
            className="w-full py-3 rounded-xl font-bold text-sm text-primary-foreground border-none cursor-pointer disabled:opacity-50"
            style={{ background: "var(--gradient-gold)" }}
          >
            {userPrayedToday ? "✅ Déjà compté aujourd'hui" : "🙏 J'ai prié aujourd'hui"}
          </button>
          {actions.filter((a) => a.action_type === "prayed").length > 0 && (
            <div className="flex flex-wrap gap-1">
              {actions
                .filter((a) => a.action_type === "prayed")
                .map((a) => (
                  <span key={a.id} className="text-[10px] px-2 py-1 rounded-full bg-primary/10 text-primary font-semibold">
                    {a.display_name || "Anonyme"}
                  </span>
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RefouaPatientDetail;