import { useMemo, useState } from "react";
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

const COMMISSION_RATE = 0.04;
const fmtEuro = (cents: number) =>
  `${(cents / 100).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });

interface Props {
  donations: Donation[];
  periodMonth: string;
  setPeriodMonth: (v: string) => void;
  onRefresh: () => void;
  setDonations: React.Dispatch<React.SetStateAction<Donation[]>>;
}

export const CommissionsView = ({ donations, periodMonth, setPeriodMonth, setDonations }: Props) => {
  const [filterSyna, setFilterSyna] = useState<string>("all");
  const [filterPayout, setFilterPayout] = useState<"all" | "pending" | "done">("all");
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState("");

  // Only PAID donations are considered for commission
  const paidDonations = useMemo(() => {
    return donations.filter((d) => {
      const isPaid = !!(d.stripe_payment_id || d.stripe_checkout_session_id);
      if (!isPaid) return false;
      if (periodMonth && d.created_at.slice(0, 7) !== periodMonth) return false;
      if (filterSyna !== "all" && d.synagogue_id !== filterSyna) return false;
      if (filterPayout === "pending" && d.payout_marked_at) return false;
      if (filterPayout === "done" && !d.payout_marked_at) return false;
      return true;
    });
  }, [donations, periodMonth, filterSyna, filterPayout]);

  const synas = useMemo(() => {
    const m = new Map<string, string>();
    donations.forEach((d) => m.set(d.synagogue_id, d.synagogue_name || "—"));
    return Array.from(m.entries()).map(([id, name]) => ({ id, name }));
  }, [donations]);

  // Totals
  const totals = useMemo(() => {
    const t = { gross: 0, commission: 0, payout: 0, paidOut: 0, remaining: 0, count: paidDonations.length };
    paidDonations.forEach((d) => {
      const com = Math.round(d.amount * COMMISSION_RATE);
      const pay = d.amount - com;
      t.gross += d.amount;
      t.commission += com;
      t.payout += pay;
      if (d.payout_marked_at) t.paidOut += pay;
      else t.remaining += pay;
    });
    return t;
  }, [paidDonations]);

  const handleTogglePayout = async (d: Donation) => {
    const next = d.payout_marked_at ? null : new Date().toISOString();
    const { data: { user } } = await supabase.auth.getUser();
    const payload: any = {
      payout_marked_at: next,
      payout_marked_by: next ? user?.id : null,
    };
    const { error } = await supabase.from("donations").update(payload).eq("id", d.id);
    if (error) {
      toast.error("Erreur : " + error.message);
      return;
    }
    toast.success(next ? "✅ Marqué reversé" : "↩️ Reversement annulé");
    setDonations((prev) =>
      prev.map((x) => (x.id === d.id ? { ...x, payout_marked_at: next, payout_marked_by: next ? user?.id ?? null : null } : x))
    );
  };

  const handleSaveNote = async (d: Donation) => {
    const { error } = await supabase.from("donations").update({ payout_note: noteDraft } as any).eq("id", d.id);
    if (error) {
      toast.error("Erreur note : " + error.message);
      return;
    }
    toast.success("✅ Note enregistrée");
    setDonations((prev) => prev.map((x) => (x.id === d.id ? { ...x, payout_note: noteDraft } : x)));
    setEditingNoteId(null);
    setNoteDraft("");
  };

  const handleBulkMarkSynagogue = async (synaId: string) => {
    const ids = paidDonations.filter((d) => d.synagogue_id === synaId && !d.payout_marked_at).map((d) => d.id);
    if (ids.length === 0) return;
    if (!confirm(`Marquer ${ids.length} don(s) comme reversés pour cette synagogue ?`)) return;
    const { data: { user } } = await supabase.auth.getUser();
    const stamp = new Date().toISOString();
    const { error } = await supabase
      .from("donations")
      .update({ payout_marked_at: stamp, payout_marked_by: user?.id } as any)
      .in("id", ids);
    if (error) {
      toast.error("Erreur : " + error.message);
      return;
    }
    toast.success(`✅ ${ids.length} don(s) marqués reversés`);
    setDonations((prev) =>
      prev.map((x) => (ids.includes(x.id) ? { ...x, payout_marked_at: stamp, payout_marked_by: user?.id ?? null } : x))
    );
  };

  // Group by synagogue for sub-totals
  const grouped = useMemo(() => {
    const m = new Map<string, { name: string; donations: Donation[]; remaining: number; paidOut: number }>();
    paidDonations.forEach((d) => {
      const key = d.synagogue_id;
      if (!m.has(key)) m.set(key, { name: d.synagogue_name || "—", donations: [], remaining: 0, paidOut: 0 });
      const g = m.get(key)!;
      g.donations.push(d);
      const pay = d.amount - Math.round(d.amount * COMMISSION_RATE);
      if (d.payout_marked_at) g.paidOut += pay;
      else g.remaining += pay;
    });
    return Array.from(m.entries()).map(([id, v]) => ({ synagogue_id: id, ...v }));
  }, [paidDonations]);

  return (
    <>
      {/* Filters */}
      <div className="rounded-2xl border border-border bg-card p-4 grid grid-cols-1 sm:grid-cols-4 gap-2">
        <input
          type="month"
          value={periodMonth}
          onChange={(e) => setPeriodMonth(e.target.value)}
          className="px-3 py-2 text-xs rounded-lg border border-border bg-background"
        />
        <select
          value={filterSyna}
          onChange={(e) => setFilterSyna(e.target.value)}
          className="px-3 py-2 text-xs rounded-lg border border-border bg-background"
        >
          <option value="all">Toutes synagogues</option>
          {synas.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <select
          value={filterPayout}
          onChange={(e) => setFilterPayout(e.target.value as any)}
          className="px-3 py-2 text-xs rounded-lg border border-border bg-background"
        >
          <option value="all">Tous</option>
          <option value="pending">À reverser</option>
          <option value="done">Déjà reversés</option>
        </select>
        <button
          onClick={() => { setPeriodMonth(""); setFilterSyna("all"); setFilterPayout("all"); }}
          className="px-3 py-2 text-xs rounded-lg bg-muted text-foreground border-none cursor-pointer"
        >
          Réinitialiser
        </button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="rounded-xl border border-border bg-card p-3">
          <p className="text-[10px] text-muted-foreground font-bold uppercase">Dons payés</p>
          <p className="text-lg font-bold text-foreground">{totals.count}</p>
          <p className="text-[10px] text-muted-foreground">{fmtEuro(totals.gross)}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3">
          <p className="text-[10px] text-muted-foreground font-bold uppercase">Commission 4%</p>
          <p className="text-lg font-bold text-amber-600">{fmtEuro(totals.commission)}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3" style={{ background: "hsl(var(--destructive) / 0.05)" }}>
          <p className="text-[10px] text-muted-foreground font-bold uppercase">⏳ Reste à reverser</p>
          <p className="text-lg font-bold text-destructive">{fmtEuro(totals.remaining)}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3" style={{ background: "hsl(142 71% 45% / 0.08)" }}>
          <p className="text-[10px] text-muted-foreground font-bold uppercase">✅ Déjà reversé</p>
          <p className="text-lg font-bold text-green-600">{fmtEuro(totals.paidOut)}</p>
        </div>
      </div>

      {/* Grouped table */}
      {grouped.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          Aucun don payé sur cette période
        </div>
      ) : (
        grouped.map((g) => (
          <div key={g.synagogue_id} className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="bg-muted/40 p-3 flex flex-wrap items-center justify-between gap-2 border-b border-border">
              <div>
                <h4 className="font-bold text-sm text-foreground">🏛️ {g.name}</h4>
                <p className="text-[10px] text-muted-foreground">
                  {g.donations.length} don(s) • Reste : <span className="font-bold text-destructive">{fmtEuro(g.remaining)}</span> • Reversé : <span className="font-bold text-green-600">{fmtEuro(g.paidOut)}</span>
                </p>
              </div>
              {g.remaining > 0 && (
                <button
                  onClick={() => handleBulkMarkSynagogue(g.synagogue_id)}
                  className="px-3 py-1.5 rounded-lg text-[10px] font-bold border-none cursor-pointer text-primary-foreground"
                  style={{ background: "var(--gradient-gold)" }}
                >
                  ✅ Tout marquer reversé
                </button>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted/20">
                  <tr>
                    <th className="text-left p-2 font-bold">N° CERFA</th>
                    <th className="text-left p-2 font-bold">Date</th>
                    <th className="text-left p-2 font-bold">Donateur</th>
                    <th className="text-right p-2 font-bold">Montant</th>
                    <th className="text-right p-2 font-bold">Commission</th>
                    <th className="text-right p-2 font-bold">À reverser</th>
                    <th className="text-left p-2 font-bold">Note</th>
                    <th className="text-center p-2 font-bold">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {g.donations.map((d) => {
                    const com = Math.round(d.amount * COMMISSION_RATE);
                    const pay = d.amount - com;
                    const isPaid = !!d.payout_marked_at;
                    return (
                      <tr key={d.id} className={`border-t border-border ${isPaid ? "opacity-60" : ""}`}>
                        <td className="p-2 font-mono text-[10px]">{d.cerfa_number || "—"}</td>
                        <td className="p-2">{fmtDate(d.created_at)}</td>
                        <td className="p-2">{d.donor_name || d.donor_email}</td>
                        <td className="p-2 text-right font-bold">{fmtEuro(d.amount)}</td>
                        <td className="p-2 text-right text-amber-600">{fmtEuro(com)}</td>
                        <td className={`p-2 text-right font-bold ${isPaid ? "text-green-600 line-through" : "text-destructive"}`}>{fmtEuro(pay)}</td>
                        <td className="p-2 max-w-[180px]">
                          {editingNoteId === d.id ? (
                            <div className="flex gap-1">
                              <input
                                value={noteDraft}
                                onChange={(e) => setNoteDraft(e.target.value)}
                                placeholder="Ex: Virement #1234"
                                className="px-1.5 py-1 text-[10px] rounded border border-border bg-background flex-1 min-w-0"
                                autoFocus
                                onKeyDown={(e) => { if (e.key === "Enter") handleSaveNote(d); }}
                              />
                              <button
                                onClick={() => handleSaveNote(d)}
                                className="px-1.5 py-1 rounded bg-primary text-primary-foreground text-[10px] border-none cursor-pointer"
                              >✓</button>
                            </div>
                          ) : (
                            <button
                              onClick={() => { setEditingNoteId(d.id); setNoteDraft(d.payout_note || ""); }}
                              className="text-[10px] text-muted-foreground italic hover:text-foreground border-none bg-transparent cursor-pointer text-left"
                            >
                              {d.payout_note || "+ ajouter"}
                            </button>
                          )}
                        </td>
                        <td className="p-2 text-center whitespace-nowrap">
                          {isPaid ? (
                            <button
                              onClick={() => handleTogglePayout(d)}
                              className="px-2 py-1 rounded text-[10px] font-bold border border-border bg-muted cursor-pointer"
                              title={`Reversé le ${fmtDate(d.payout_marked_at!)}`}
                            >
                              ✅ Reversé
                            </button>
                          ) : (
                            <button
                              onClick={() => handleTogglePayout(d)}
                              className="px-2 py-1 rounded text-[10px] font-bold border-none cursor-pointer text-primary-foreground"
                              style={{ background: "var(--gradient-gold)" }}
                            >
                              💰 Reverser
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}
    </>
  );
};
