import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { NICHMAT_PRAYER } from "@/lib/nichmat-prayer";
import RefouaCampaignPlanner from "./RefouaCampaignPlanner";

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
  gender?: "ben" | "bat";
}

const todayISO = () => new Date().toISOString().slice(0, 10);

const RefouaPatientDetail = ({ refouaId, hebrewName, motherName, gender = "ben" }: Props) => {
  const { user } = useAuth();
  const [tab, setTab] = useState<"programme" | "tehilim" | "nichmat" | "prayed">("programme");
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

  const ANON_USER_ID = "00000000-0000-0000-0000-000000000000";

  const getDisplayName = async () => {
    if (!user) return "";
    const { data } = await supabase.from("profiles").select("display_name, first_name").eq("user_id", user.id).maybeSingle();
    return (data?.first_name || data?.display_name || "Anonyme").toString();
  };

  const promptName = async (label: string): Promise<string | null> => {
    const fromProfile = user ? await getDisplayName() : "";
    const last = typeof window !== "undefined" ? localStorage.getItem("refoua_last_name") || "" : "";
    const def = fromProfile || last;
    const { promptDialog } = await import("@/components/ui/prompt-dialog");
    const input = await promptDialog({
      title: "Votre prénom",
      message: label,
      defaultValue: def,
      placeholder: "Prénom",
      okLabel: "Valider",
    });
    if (input === null) return null;
    const name = (input.trim() || def || "Anonyme").slice(0, 60);
    try { localStorage.setItem("refoua_last_name", name); } catch {}
    return name;
  };

  const claimPsalm = async (n: number) => {
    if (psalmsTaken.has(n)) {
      toast.error(`Psaume ${n} déjà pris aujourd'hui`);
      return;
    }
    const display_name = await promptName(`Votre prénom pour réserver le psaume ${n} :`);
    if (!display_name) return;
    const { error } = await supabase.from("refoua_actions").insert({
      refoua_id: refouaId,
      user_id: user?.id || ANON_USER_ID,
      display_name,
      action_type: "tehilim",
      psalm_number: n,
    } as any);
    if (error) toast.error("Psaume déjà pris");
    else toast.success(`✅ Tehilim ${n} réservé pour ${display_name}`);
  };

  const releasePsalm = async (action: Action) => {
    if (!user || action.user_id !== user.id) return;
    await supabase.from("refoua_actions").delete().eq("id", action.id);
  };

  const markPrayed = async () => {
    if (user && userPrayedToday) {
      toast.info("Vous avez déjà prié aujourd'hui 🙏");
      return;
    }
    const display_name = await promptName("Votre prénom :");
    if (!display_name) return;
    const { error } = await supabase.from("refoua_actions").insert({
      refoua_id: refouaId,
      user_id: user?.id || ANON_USER_ID,
      display_name,
      action_type: "prayed",
    } as any);
    if (error) toast.error("Erreur");
    else toast.success("🙏 Merci pour votre prière !");
  };

  const markNichmat = async () => {
    const display_name = await promptName("Votre prénom :");
    if (!display_name) return;
    const { error } = await supabase.from("refoua_actions").insert({
      refoua_id: refouaId,
      user_id: user?.id || ANON_USER_ID,
      display_name,
      action_type: "nichmat",
    } as any);
    if (error) toast.error("Erreur");
    else toast.success("✨ Nichmat enregistré");
  };

  const sharePDF = async () => {
    try {
      const { default: jsPDF } = await import("jspdf");
      const html2canvas = (await import("html2canvas")).default;

      const benBat = gender === "bat" ? "bat" : "ben";
      const nameLine = motherName ? `${hebrewName} ${benBat} ${motherName}` : hebrewName;
      const hebrewParagraphs = NICHMAT_PRAYER.hebrew.split(/\n+/).filter(Boolean);
      const phoneticParagraphs = NICHMAT_PRAYER.phonetic.split(/\n+/).filter(Boolean);

      // Hidden styled DOM rendered off-screen for html2canvas to capture
      const container = document.createElement("div");
      Object.assign(container.style, {
        position: "fixed",
        left: "-9999px",
        top: "0",
        zIndex: "-1",
        width: "794px", // A4 width @ 96dpi
        background: "#ffffff",
        padding: "0",
        fontFamily: '"Times New Roman", Georgia, serif',
      } as CSSStyleDeclaration);

      container.innerHTML = `
        <div style="padding:40px 48px 32px 48px;background:linear-gradient(135deg,#996515,#7a4f10);color:#fff;text-align:center;">
          <p style="margin:0;font-size:11px;letter-spacing:6px;font-weight:700;opacity:.85;">🙏 REFOUA CHELEMA</p>
          <h1 style="margin:8px 0 4px 0;font-size:28px;font-weight:700;letter-spacing:.5px;">Nichmat Kol Haï</h1>
          <p style="margin:6px 0 0 0;font-size:14px;font-style:italic;opacity:.95;">Prière pour la guérison de <strong>${nameLine}</strong></p>
        </div>
        <div style="padding:32px 48px 24px 48px;">
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px;">
            <span style="flex:1;height:1px;background:#c9a84c;"></span>
            <span style="font-size:10px;letter-spacing:4px;font-weight:700;color:#996515;">HÉBREU</span>
            <span style="flex:1;height:1px;background:#c9a84c;"></span>
          </div>
          <div dir="rtl" style="font-family:'Times New Roman','David',serif;font-size:19px;line-height:2.05;color:#1a1a1a;text-align:justify;">
            ${hebrewParagraphs.map((p) => `<p style="margin:0 0 12px 0;">${p}</p>`).join("")}
          </div>
        </div>
        <div style="padding:8px 48px 40px 48px;">
          <div style="display:flex;align-items:center;gap:12px;margin:18px 0 14px 0;">
            <span style="flex:1;height:1px;background:#c9a84c;"></span>
            <span style="font-size:10px;letter-spacing:4px;font-weight:700;color:#996515;">PHONÉTIQUE</span>
            <span style="flex:1;height:1px;background:#c9a84c;"></span>
          </div>
          <div style="font-size:14px;line-height:1.75;color:#2d2d2d;text-align:justify;font-style:italic;">
            ${phoneticParagraphs.map((p) => `<p style="margin:0 0 10px 0;">${p}</p>`).join("")}
          </div>
          <p style="margin:28px 0 0 0;text-align:center;font-size:11px;color:#888;font-style:italic;border-top:1px solid #e8e4dd;padding-top:14px;">
            Que le Tout-Puissant accorde une guérison complète à ${nameLine} parmi tous les malades d'Israël
          </p>
        </div>
      `;
      document.body.appendChild(container);

      // Wait one tick so fonts/layout settle
      await new Promise((r) => setTimeout(r, 50));

      const canvas = await html2canvas(container, {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true,
        logging: false,
      });
      document.body.removeChild(container);

      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const imgW = pageW;
      const imgH = (canvas.height * imgW) / canvas.width;

      if (imgH <= pageH) {
        pdf.addImage(canvas.toDataURL("image/jpeg", 0.95), "JPEG", 0, 0, imgW, imgH);
      } else {
        // Paginate: slice the canvas vertically into A4-height chunks
        const pxPerMm = canvas.width / pageW;
        const sliceHeightPx = Math.floor(pageH * pxPerMm);
        let renderedPx = 0;
        let pageIndex = 0;
        while (renderedPx < canvas.height) {
          const remainingPx = canvas.height - renderedPx;
          const thisSlicePx = Math.min(sliceHeightPx, remainingPx);
          const pageCanvas = document.createElement("canvas");
          pageCanvas.width = canvas.width;
          pageCanvas.height = thisSlicePx;
          const pctx = pageCanvas.getContext("2d")!;
          pctx.fillStyle = "#ffffff";
          pctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
          pctx.drawImage(canvas, 0, -renderedPx);
          if (pageIndex > 0) pdf.addPage();
          pdf.addImage(
            pageCanvas.toDataURL("image/jpeg", 0.95),
            "JPEG",
            0,
            0,
            imgW,
            (thisSlicePx * imgW) / canvas.width,
          );
          renderedPx += thisSlicePx;
          pageIndex++;
        }
      }

      const fileName = `Nichmat-${hebrewName.replace(/\s+/g, "-")}.pdf`;
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
        <p className="font-hebrew text-xl font-bold text-foreground" dir="ltr" style={{ unicodeBidi: "plaintext" }}>
          <bdi>{hebrewName}</bdi>
          {motherName ? (
            <>
              {" "}
          <span className="italic font-bold" style={{ color: "hsl(var(--gold))" }}>{gender === "bat" ? "bat" : "ben"}</span>{" "}
              <bdi>{motherName}</bdi>
            </>
          ) : null}
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
      <div className="grid grid-cols-4 gap-1.5">
        {([
          { id: "programme", label: "🗓️", sub: "Programme" },
          { id: "tehilim", label: "📖", sub: "Tehilim" },
          { id: "nichmat", label: "✨", sub: "Nichmat" },
          { id: "prayed", label: "🙏", sub: "J'ai prié" },
        ] as const).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-1 py-2 rounded-lg font-bold border cursor-pointer transition-all flex flex-col items-center justify-center gap-0.5 ${
              tab === t.id ? "border-primary/40 text-foreground" : "border-border text-muted-foreground bg-card"
            }`}
            style={tab === t.id ? { background: "hsl(var(--gold) / 0.12)" } : {}}
          >
            <span className="text-base leading-none">{t.label}</span>
            <span className="text-[9px] leading-tight">{t.sub}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-4 text-xs text-muted-foreground">Chargement...</div>
      ) : tab === "programme" ? (
        <RefouaCampaignPlanner
          refouaId={refouaId}
          hebrewName={hebrewName}
          motherName={motherName}
          gender={gender}
        />
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
          <button
            onClick={sharePDF}
            className="w-full py-2.5 rounded-lg text-[11px] font-bold text-primary-foreground border-none cursor-pointer"
            style={{ background: "var(--gradient-gold)" }}
          >
            📄 Partager en PDF (Hébreu / Phonétique)
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