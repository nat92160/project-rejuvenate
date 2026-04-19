import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Donation {
  id: string;
  cerfa_number: string | null;
  amount: number;
  donor_name: string;
  donor_email: string;
  donor_type: string;
  cerfa_generated: boolean;
  stripe_payment_id: string | null;
  stripe_checkout_session_id: string | null;
  synagogue_id: string;
  fiscal_year: number;
  created_at: string;
  payout_marked_at: string | null;
  payout_note: string | null;
  synagogue_name?: string;
}

interface CounterRow {
  synagogue_id: string;
  fiscal_year: number;
  last_number: number;
  synagogue_name?: string;
  used_count?: number;
  has_gaps?: boolean;
}

interface PayoutRow {
  id: string;
  synagogue_id: string;
  period_start: string;
  period_end: string;
  total_donations_amount: number;
  commission_amount: number;
  payout_amount: number;
  paid_at: string | null;
  notes: string;
  synagogue_name?: string;
}

const fmtEuro = (cents: number) => `${(cents / 100).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });

function downloadCsv(filename: string, rows: (string | number)[][]) {
  const csv = rows.map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(";")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const AdminDonationsTab = () => {
  const [subtab, setSubtab] = useState<"donations" | "commissions" | "counters">("donations");
  const [donations, setDonations] = useState<Donation[]>([]);
  const [counters, setCounters] = useState<CounterRow[]>([]);
  const [payouts, setPayouts] = useState<PayoutRow[]>([]);
  const [synas, setSynas] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterSyna, setFilterSyna] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "paid" | "pending">("all");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [periodMonth, setPeriodMonth] = useState(""); // YYYY-MM

  const fetchAll = async () => {
    setLoading(true);
    const [dRes, sRes, cRes, pRes] = await Promise.all([
      supabase.from("donations").select("*").order("created_at", { ascending: false }).limit(2000),
      supabase.from("synagogue_profiles").select("id, name"),
      supabase.from("cerfa_counters").select("*").order("fiscal_year", { ascending: false }),
      supabase.from("cerfa_commission_payouts").select("*").order("period_end", { ascending: false }),
    ]);

    const synaMap = new Map((sRes.data || []).map((s: any) => [s.id, s.name]));
    setSynas((sRes.data || []) as any);
    setDonations(((dRes.data || []) as Donation[]).map((d) => ({ ...d, synagogue_name: synaMap.get(d.synagogue_id) || "—" })));

    // Compute used_count + gaps per (syna, year)
    const usedBySynaYear = new Map<string, number[]>();
    (dRes.data || []).forEach((d: any) => {
      if (!d.cerfa_number || !d.synagogue_id) return;
      const m = d.cerfa_number.match(/^A(\d{4})\/(\d+)$/);
      if (!m) return;
      const k = `${d.synagogue_id}|${parseInt(m[1], 10)}`;
      const arr = usedBySynaYear.get(k) || [];
      arr.push(parseInt(m[2], 10));
      usedBySynaYear.set(k, arr);
    });

    setCounters(((cRes.data || []) as any[]).map((c) => {
      const k = `${c.synagogue_id}|${c.fiscal_year}`;
      const used = usedBySynaYear.get(k) || [];
      const sorted = [...used].sort((a, b) => a - b);
      let hasGaps = false;
      for (let i = 0; i < sorted.length; i++) {
        if (sorted[i] !== i + 1) { hasGaps = true; break; }
      }
      return {
        ...c,
        synagogue_name: synaMap.get(c.synagogue_id) || "—",
        used_count: used.length,
        has_gaps: hasGaps,
      };
    }));

    setPayouts(((pRes.data || []) as any[]).map((p) => ({
      ...p,
      synagogue_name: synaMap.get(p.synagogue_id) || "—",
    })));

    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const filteredDonations = useMemo(() => {
    return donations.filter((d) => {
      if (filterSyna !== "all" && d.synagogue_id !== filterSyna) return false;
      const isPaid = !!(d.stripe_payment_id || d.stripe_checkout_session_id);
      if (filterStatus === "paid" && !isPaid) return false;
      if (filterStatus === "pending" && isPaid) return false;
      if (filterFrom && d.created_at < filterFrom) return false;
      if (filterTo && d.created_at > filterTo + "T23:59:59") return false;
      return true;
    });
  }, [donations, filterSyna, filterStatus, filterFrom, filterTo]);

  const totalDonations = useMemo(
    () => filteredDonations.reduce((s, d) => s + d.amount, 0),
    [filteredDonations]
  );

  // Commission stats per syna for period
  const commissionStats = useMemo(() => {
    const m = new Map<string, { total: number; count: number; name: string }>();
    donations.forEach((d) => {
      if (periodMonth) {
        const ymd = d.created_at.slice(0, 7);
        if (ymd !== periodMonth) return;
      }
      const isPaid = !!(d.stripe_payment_id || d.stripe_checkout_session_id);
      if (!isPaid) return;
      const cur = m.get(d.synagogue_id) || { total: 0, count: 0, name: d.synagogue_name || "—" };
      cur.total += d.amount;
      cur.count += 1;
      m.set(d.synagogue_id, cur);
    });
    return Array.from(m.entries()).map(([syna_id, v]) => ({
      synagogue_id: syna_id,
      synagogue_name: v.name,
      total: v.total,
      count: v.count,
      commission: Math.round(v.total * 0.04),
      payout: Math.round(v.total * 0.96),
    })).sort((a, b) => b.total - a.total);
  }, [donations, periodMonth]);

  const handleMarkPayout = async (synagogue_id: string, total: number, commission: number, payout: number) => {
    if (!confirm("Marquer comme reversé ?")) return;
    const now = new Date().toISOString().slice(0, 10);
    const periodStart = periodMonth ? periodMonth + "-01" : now.slice(0, 7) + "-01";
    const periodEnd = now;
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("cerfa_commission_payouts").insert({
      synagogue_id,
      period_start: periodStart,
      period_end: periodEnd,
      total_donations_amount: total,
      commission_amount: commission,
      payout_amount: payout,
      paid_at: new Date().toISOString(),
      paid_by: user?.id,
    } as any);
    if (error) toast.error("Erreur enregistrement reversement");
    else { toast.success("✅ Reversement enregistré"); fetchAll(); }
  };

  const handleDeleteDonation = async (d: Donation) => {
    const label = d.cerfa_number || d.donor_name || d.donor_email || d.id.slice(0, 8);
    if (!confirm(`Supprimer définitivement le don "${label}" (${fmtEuro(d.amount)}) ?\n\nIl disparaîtra de la vue Président ET de l'espace personnel du fidèle.`)) return;
    const { error } = await supabase.from("donations").delete().eq("id", d.id);
    if (error) {
      toast.error("Suppression impossible : " + error.message);
      return;
    }
    toast.success("✅ Don supprimé");
    setDonations((prev) => prev.filter((x) => x.id !== d.id));
  };

  const handleToggleCerfa = async (d: Donation) => {
    const next = !d.cerfa_generated;
    const action = next ? "réactiver" : "désactiver";
    if (!confirm(`Voulez-vous ${action} le CERFA pour ce don ?`)) return;
    const payload: any = { cerfa_generated: next };
    if (!next) payload.cerfa_number = null;
    const { error } = await supabase.from("donations").update(payload).eq("id", d.id);
    if (error) {
      toast.error("Mise à jour impossible : " + error.message);
      return;
    }
    toast.success(next ? "✅ CERFA réactivé" : "🚫 CERFA désactivé");
    setDonations((prev) => prev.map((x) => x.id === d.id ? { ...x, cerfa_generated: next, cerfa_number: next ? x.cerfa_number : null } : x));
  };

  const exportDonationsCsv = () => {
    const rows = [
      ["N° CERFA", "Date", "Synagogue", "Donateur", "Email", "Type", "Montant (€)", "Statut", "CERFA généré"],
      ...filteredDonations.map((d) => [
        d.cerfa_number || "—",
        fmtDate(d.created_at),
        d.synagogue_name || "",
        d.donor_name || "",
        d.donor_email || "",
        d.donor_type || "",
        (d.amount / 100).toFixed(2),
        (d.stripe_payment_id || d.stripe_checkout_session_id) ? "Payé" : "En attente",
        d.cerfa_generated ? "Oui" : "Non",
      ]),
    ];
    downloadCsv(`dons-${new Date().toISOString().slice(0, 10)}.csv`, rows);
  };

  const exportCommissionsCsv = () => {
    const rows = [
      ["Synagogue", "Période", "Nombre de dons", "Total reçu (€)", "Commission 4% (€)", "À reverser (€)"],
      ...commissionStats.map((s) => [
        s.synagogue_name,
        periodMonth || "Toutes périodes",
        s.count,
        (s.total / 100).toFixed(2),
        (s.commission / 100).toFixed(2),
        (s.payout / 100).toFixed(2),
      ]),
    ];
    downloadCsv(`commissions-${periodMonth || "all"}.csv`, rows);
  };

  if (loading) return <div className="text-center py-10 text-sm text-muted-foreground">Chargement…</div>;

  return (
    <div className="space-y-4">
      {/* Sub-tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {[
          { id: "donations" as const, label: "💰 Tous les dons" },
          { id: "commissions" as const, label: "📊 Suivi commissions" },
          { id: "counters" as const, label: "🔢 Numérotation CERFA" },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setSubtab(t.id)}
            className="px-3 py-2 rounded-lg text-xs font-bold border whitespace-nowrap cursor-pointer transition-all"
            style={subtab === t.id
              ? { background: "var(--gradient-gold)", color: "hsl(var(--primary-foreground))", border: "none" }
              : { background: "hsl(var(--card))", color: "hsl(var(--muted-foreground))", borderColor: "hsl(var(--border))" }
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* === DONATIONS === */}
      {subtab === "donations" && (
        <>
          <div className="rounded-2xl border border-border bg-card p-4 grid grid-cols-1 sm:grid-cols-4 gap-2">
            <select value={filterSyna} onChange={(e) => setFilterSyna(e.target.value)} className="px-3 py-2 text-xs rounded-lg border border-border bg-background">
              <option value="all">Toutes synagogues</option>
              {synas.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as any)} className="px-3 py-2 text-xs rounded-lg border border-border bg-background">
              <option value="all">Tous statuts</option>
              <option value="paid">Payés</option>
              <option value="pending">En attente</option>
            </select>
            <input type="date" value={filterFrom} onChange={(e) => setFilterFrom(e.target.value)} className="px-3 py-2 text-xs rounded-lg border border-border bg-background" />
            <input type="date" value={filterTo} onChange={(e) => setFilterTo(e.target.value)} className="px-3 py-2 text-xs rounded-lg border border-border bg-background" />
          </div>

          <div className="flex items-center justify-between gap-2">
            <div className="text-sm">
              <span className="text-muted-foreground">Total : </span>
              <span className="font-bold text-foreground">{filteredDonations.length} dons</span>
              <span className="text-muted-foreground"> • </span>
              <span className="font-bold text-primary">{fmtEuro(totalDonations)}</span>
            </div>
            <button onClick={exportDonationsCsv} className="px-3 py-2 rounded-lg text-xs font-bold border-none cursor-pointer text-primary-foreground" style={{ background: "var(--gradient-gold)" }}>
              📥 Export CSV
            </button>
          </div>

          <div className="rounded-2xl border border-border bg-card overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-2 font-bold">N° CERFA</th>
                  <th className="text-left p-2 font-bold">Date</th>
                  <th className="text-left p-2 font-bold">Synagogue</th>
                  <th className="text-left p-2 font-bold">Donateur</th>
                  <th className="text-left p-2 font-bold">Email</th>
                  <th className="text-right p-2 font-bold">Montant</th>
                  <th className="text-center p-2 font-bold">Statut</th>
                  <th className="text-center p-2 font-bold">CERFA</th>
                  <th className="text-center p-2 font-bold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDonations.map((d) => {
                  const isPaid = !!(d.stripe_payment_id || d.stripe_checkout_session_id);
                  return (
                    <tr key={d.id} className="border-t border-border hover:bg-muted/30">
                      <td className="p-2 font-mono text-[10px]">{d.cerfa_number || "—"}</td>
                      <td className="p-2">{fmtDate(d.created_at)}</td>
                      <td className="p-2">{d.synagogue_name}</td>
                      <td className="p-2">{d.donor_name || "—"}</td>
                      <td className="p-2 break-all">{d.donor_email || "—"}</td>
                      <td className="p-2 text-right font-bold">{fmtEuro(d.amount)}</td>
                      <td className="p-2 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${isPaid ? "bg-green-500/10 text-green-600" : "bg-amber-500/10 text-amber-600"}`}>
                          {isPaid ? "Payé" : "En attente"}
                        </span>
                      </td>
                      <td className="p-2 text-center">{d.cerfa_generated ? "✅" : "—"}</td>
                      <td className="p-2 text-center whitespace-nowrap">
                        <div className="flex gap-1 justify-center">
                          <button
                            onClick={() => handleToggleCerfa(d)}
                            className="px-2 py-1 rounded-md text-[10px] font-bold border border-border bg-muted hover:bg-muted/70 cursor-pointer"
                            title={d.cerfa_generated ? "Désactiver le CERFA" : "Réactiver le CERFA"}
                          >
                            {d.cerfa_generated ? "🚫" : "♻️"}
                          </button>
                          <button
                            onClick={() => handleDeleteDonation(d)}
                            className="px-2 py-1 rounded-md text-[10px] font-bold border-none cursor-pointer text-white bg-destructive hover:opacity-90"
                            title="Supprimer définitivement"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredDonations.length === 0 && (
                  <tr><td colSpan={9} className="p-6 text-center text-muted-foreground">Aucun don trouvé</td></tr>
                )}
              </tbody>
              <tfoot className="bg-muted/30">
                <tr>
                  <td colSpan={5} className="p-2 font-bold text-right">TOTAL</td>
                  <td className="p-2 text-right font-bold text-primary">{fmtEuro(totalDonations)}</td>
                  <td colSpan={3} />
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}

      {/* === COMMISSIONS === */}
      {subtab === "commissions" && (
        <>
          <div className="rounded-2xl border border-border bg-card p-4 flex flex-wrap gap-2 items-center">
            <label className="text-xs font-bold text-foreground">Période :</label>
            <input type="month" value={periodMonth} onChange={(e) => setPeriodMonth(e.target.value)} className="px-3 py-2 text-xs rounded-lg border border-border bg-background" />
            <button onClick={() => setPeriodMonth("")} className="px-3 py-2 text-xs rounded-lg bg-muted text-foreground border-none cursor-pointer">Toutes</button>
            <button onClick={exportCommissionsCsv} className="ml-auto px-3 py-2 rounded-lg text-xs font-bold border-none cursor-pointer text-primary-foreground" style={{ background: "var(--gradient-gold)" }}>
              📥 Export CSV
            </button>
          </div>

          <div className="rounded-2xl border border-border bg-card overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-2 font-bold">Synagogue</th>
                  <th className="text-right p-2 font-bold">Dons</th>
                  <th className="text-right p-2 font-bold">Total reçu</th>
                  <th className="text-right p-2 font-bold">Commission 4%</th>
                  <th className="text-right p-2 font-bold">À reverser</th>
                  <th className="text-center p-2 font-bold">Action</th>
                </tr>
              </thead>
              <tbody>
                {commissionStats.map((s) => (
                  <tr key={s.synagogue_id} className="border-t border-border">
                    <td className="p-2 font-bold">{s.synagogue_name}</td>
                    <td className="p-2 text-right">{s.count}</td>
                    <td className="p-2 text-right">{fmtEuro(s.total)}</td>
                    <td className="p-2 text-right text-amber-600 font-bold">{fmtEuro(s.commission)}</td>
                    <td className="p-2 text-right text-green-600 font-bold">{fmtEuro(s.payout)}</td>
                    <td className="p-2 text-center">
                      <button
                        onClick={() => handleMarkPayout(s.synagogue_id, s.total, s.commission, s.payout)}
                        className="px-2 py-1 rounded-lg text-[10px] font-bold border-none cursor-pointer text-primary-foreground"
                        style={{ background: "var(--gradient-gold)" }}
                      >
                        ✅ Marquer reversé
                      </button>
                    </td>
                  </tr>
                ))}
                {commissionStats.length === 0 && (
                  <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Aucun don payé sur cette période</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {payouts.length > 0 && (
            <div>
              <h4 className="text-sm font-bold text-foreground mb-2 mt-4">📜 Historique des reversements</h4>
              <div className="rounded-2xl border border-border bg-card overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-2 font-bold">Date</th>
                      <th className="text-left p-2 font-bold">Synagogue</th>
                      <th className="text-left p-2 font-bold">Période</th>
                      <th className="text-right p-2 font-bold">Total dons</th>
                      <th className="text-right p-2 font-bold">Commission</th>
                      <th className="text-right p-2 font-bold">Reversé</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payouts.map((p) => (
                      <tr key={p.id} className="border-t border-border">
                        <td className="p-2">{p.paid_at ? fmtDate(p.paid_at) : "—"}</td>
                        <td className="p-2 font-bold">{p.synagogue_name}</td>
                        <td className="p-2">{fmtDate(p.period_start)} → {fmtDate(p.period_end)}</td>
                        <td className="p-2 text-right">{fmtEuro(p.total_donations_amount)}</td>
                        <td className="p-2 text-right text-amber-600">{fmtEuro(p.commission_amount)}</td>
                        <td className="p-2 text-right text-green-600 font-bold">{fmtEuro(p.payout_amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* === COUNTERS === */}
      {subtab === "counters" && (
        <>
          <div className="rounded-2xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
            ⚠️ Vérification importante pour le fisc : la numérotation doit être strictement séquentielle, sans trou ni doublon par synagogue et par année fiscale.
          </div>
          <div className="rounded-2xl border border-border bg-card overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-2 font-bold">Synagogue</th>
                  <th className="text-center p-2 font-bold">Année</th>
                  <th className="text-right p-2 font-bold">Dernier n°</th>
                  <th className="text-right p-2 font-bold">N° utilisés</th>
                  <th className="text-center p-2 font-bold">Intégrité</th>
                </tr>
              </thead>
              <tbody>
                {counters.map((c) => (
                  <tr key={`${c.synagogue_id}-${c.fiscal_year}`} className="border-t border-border">
                    <td className="p-2 font-bold">{c.synagogue_name}</td>
                    <td className="p-2 text-center">{c.fiscal_year}</td>
                    <td className="p-2 text-right font-mono">A{c.fiscal_year}/{String(c.last_number).padStart(5, "0")}</td>
                    <td className="p-2 text-right">{c.used_count} / {c.last_number}</td>
                    <td className="p-2 text-center">
                      {c.has_gaps
                        ? <span className="text-red-600 font-bold">❌ Trous détectés</span>
                        : <span className="text-green-600 font-bold">✅ Séquentiel</span>}
                    </td>
                  </tr>
                ))}
                {counters.length === 0 && (
                  <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">Aucun compteur initialisé</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

export default AdminDonationsTab;
