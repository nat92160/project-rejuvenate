import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, TrendingUp, Users, Euro, Calendar, Download, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DonRow {
  id: string;
  amount: number;
  donor_name: string;
  donor_email: string;
  created_at: string;
  campaign_id: string | null;
}

interface Props {
  synagogueId: string;
}

const fmtEur = (cents: number) => `${(cents / 100).toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} €`;

const DonsStats = ({ synagogueId }: Props) => {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<DonRow[]>([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await (supabase
        .from("donations" as any)
        .select("id, amount, donor_name, donor_email, created_at, campaign_id") as any)
        .eq("synagogue_id", synagogueId)
        .order("created_at", { ascending: false })
        .limit(2000);
      setRows((data as DonRow[]) || []);
      setLoading(false);
    })();
  }, [synagogueId]);

  const stats = useMemo(() => {
    const now = new Date();
    const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startYear = new Date(now.getFullYear(), 0, 1);

    const total = rows.reduce((s, r) => s + r.amount, 0);
    const month = rows.filter(r => new Date(r.created_at) >= startMonth).reduce((s, r) => s + r.amount, 0);
    const year = rows.filter(r => new Date(r.created_at) >= startYear).reduce((s, r) => s + r.amount, 0);
    const uniqueDonors = new Set(rows.map(r => r.donor_email.toLowerCase())).size;
    const avg = rows.length ? Math.round(total / rows.length) : 0;

    // Monthly chart for current year
    const monthly: number[] = Array(12).fill(0);
    rows.forEach(r => {
      const d = new Date(r.created_at);
      if (d.getFullYear() === now.getFullYear()) monthly[d.getMonth()] += r.amount;
    });
    const maxMonthly = Math.max(...monthly, 1);

    // Top donors
    const donorMap = new Map<string, { name: string; total: number; count: number }>();
    rows.forEach(r => {
      const key = r.donor_email.toLowerCase();
      const entry = donorMap.get(key) || { name: r.donor_name || r.donor_email, total: 0, count: 0 };
      entry.total += r.amount;
      entry.count += 1;
      if (r.donor_name && !entry.name) entry.name = r.donor_name;
      donorMap.set(key, entry);
    });
    const topDonors = Array.from(donorMap.entries())
      .map(([email, v]) => ({ email, ...v }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    return { total, month, year, uniqueDonors, avg, monthly, maxMonthly, topDonors, count: rows.length };
  }, [rows]);

  const exportFullCsv = () => {
    if (!rows.length) return;
    const header = "Date,Donateur,Email,Montant (€),Campagne\n";
    const body = rows.map(r =>
      `${new Date(r.created_at).toLocaleDateString("fr-FR")},"${(r.donor_name || "").replace(/"/g, '""')}","${r.donor_email}",${(r.amount / 100).toFixed(2)},${r.campaign_id || ""}`
    ).join("\n");
    const blob = new Blob([header + body], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dons-export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return <div className="text-center py-8"><Loader2 className="w-5 h-5 animate-spin mx-auto text-primary" /></div>;
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center">
        <TrendingUp className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
        <p className="text-sm font-semibold text-foreground">Pas encore de statistiques</p>
        <p className="text-xs text-muted-foreground mt-1">Les statistiques s'afficheront dès que vous recevrez des dons.</p>
      </div>
    );
  }

  const months = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Aoû", "Sep", "Oct", "Nov", "Déc"];

  const statCards = [
    { label: "Ce mois", value: fmtEur(stats.month), icon: Calendar, color: "text-primary" },
    { label: "Cette année", value: fmtEur(stats.year), icon: TrendingUp, color: "text-green-600" },
    { label: "Total all-time", value: fmtEur(stats.total), icon: Euro, color: "text-amber-600" },
    { label: "Donateurs uniques", value: stats.uniqueDonors.toString(), icon: Users, color: "text-blue-600" },
    { label: "Don moyen", value: fmtEur(stats.avg), icon: Euro, color: "text-purple-600" },
    { label: "Nombre de dons", value: stats.count.toString(), icon: Trophy, color: "text-pink-600" },
  ];

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {statCards.map(c => (
          <div key={c.label} className="rounded-xl border border-border bg-card p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <c.icon className={`w-3.5 h-3.5 ${c.color}`} strokeWidth={2} />
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{c.label}</p>
            </div>
            <p className="text-lg font-bold font-display text-foreground">{c.value}</p>
          </div>
        ))}
      </div>

      {/* Monthly chart */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-foreground">Dons mensuels — {new Date().getFullYear()}</p>
          <Button variant="ghost" size="sm" onClick={exportFullCsv} className="text-xs h-7">
            <Download className="w-3 h-3 mr-1" /> Export complet
          </Button>
        </div>
        <div className="flex items-end gap-1 h-32">
          {stats.monthly.map((amt, i) => {
            const height = (amt / stats.maxMonthly) * 100;
            const isCurrent = i === new Date().getMonth();
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex-1 flex items-end">
                  <div
                    className={`w-full rounded-t transition-all ${isCurrent ? "bg-primary" : "bg-primary/40"}`}
                    style={{ height: `${Math.max(height, amt > 0 ? 4 : 0)}%`, minHeight: amt > 0 ? "4px" : "0" }}
                    title={fmtEur(amt)}
                  />
                </div>
                <span className="text-[9px] text-muted-foreground">{months[i]}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Top donors */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-1.5 mb-3">
          <Trophy className="w-4 h-4 text-amber-600" />
          <p className="text-xs font-semibold text-foreground">Top 5 donateurs</p>
        </div>
        {stats.topDonors.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-2">Aucun donateur.</p>
        ) : (
          <div className="space-y-2">
            {stats.topDonors.map((d, i) => (
              <div key={d.email} className="flex items-center gap-2">
                <div className={`h-6 w-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${
                  i === 0 ? "bg-amber-100 text-amber-700" :
                  i === 1 ? "bg-gray-100 text-gray-700" :
                  i === 2 ? "bg-orange-100 text-orange-700" :
                  "bg-muted text-muted-foreground"
                }`}>
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate">{d.name || d.email}</p>
                  <p className="text-[10px] text-muted-foreground">{d.count} don{d.count > 1 ? "s" : ""}</p>
                </div>
                <p className="text-xs font-bold text-primary shrink-0">{fmtEur(d.total)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DonsStats;
