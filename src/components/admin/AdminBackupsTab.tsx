import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface BackupRow {
  id: string;
  user_id: string;
  email: string | null;
  display_name: string | null;
  reason: string;
  created_at: string;
}

const reasonLabel = (r: string) => {
  switch (r) {
    case "auto_daily": return { text: "Automatique (jour)", color: "hsl(var(--primary))" };
    case "pre_delete": return { text: "Avant suppression", color: "hsl(var(--destructive))" };
    case "manual": return { text: "Manuelle", color: "hsl(var(--muted-foreground))" };
    default: return { text: r, color: "hsl(var(--muted-foreground))" };
  }
};

export default function AdminBackupsTab() {
  const [backups, setBackups] = useState<BackupRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [filter, setFilter] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-users", {
        body: { action: "list_backups" },
      });
      if (error) throw error;
      setBackups(data?.backups || []);
    } catch (err: any) {
      toast.error(err.message || "Erreur lors du chargement");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const runBackup = async () => {
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke("backup-accounts", {
        body: { action: "run", reason: "manual" },
      });
      if (error) throw error;
      toast.success(`✅ ${data?.backed_up || 0} compte(s) sauvegardé(s)`, { duration: 2000 });
      await load();
    } catch (err: any) {
      toast.error(err.message || "Échec de la sauvegarde");
    } finally {
      setRunning(false);
    }
  };

  const restore = async (backupId: string, label: string) => {
    if (!confirm(`Restaurer ce compte (${label}) ?`)) return;
    setRestoring(backupId);
    try {
      const { data, error } = await supabase.functions.invoke("admin-users", {
        body: { action: "restore_backup", backup_id: backupId },
      });
      if (error) throw error;
      toast.success("✅ Compte restauré", { duration: 2000 });
    } catch (err: any) {
      toast.error(err.message || "Échec de la restauration");
    } finally {
      setRestoring(null);
    }
  };

  const download = async (backupId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("admin-users", {
        body: { action: "get_backup", backup_id: backupId },
      });
      if (error) throw error;
      const blob = new Blob([JSON.stringify(data?.backup || {}, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `backup-${backupId}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      toast.error(err.message || "Erreur");
    }
  };

  const filtered = backups.filter((b) => {
    if (!filter) return true;
    const q = filter.toLowerCase();
    return (b.email || "").toLowerCase().includes(q) || (b.display_name || "").toLowerCase().includes(q);
  });

  // Group by user_id (most recent first)
  const byUser = new Map<string, BackupRow[]>();
  filtered.forEach((b) => {
    if (!byUser.has(b.user_id)) byUser.set(b.user_id, []);
    byUser.get(b.user_id)!.push(b);
  });

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <h2 className="font-display text-lg font-bold text-foreground">💾 Sauvegardes des comptes</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Sauvegarde automatique quotidienne (3h UTC) + snapshot avant chaque suppression. Aucun compte ne sera perdu.
            </p>
          </div>
          <button
            onClick={runBackup}
            disabled={running}
            className="shrink-0 px-3 py-2 rounded-xl text-xs font-bold cursor-pointer disabled:opacity-50"
            style={{ background: "var(--gradient-gold)", color: "hsl(var(--primary-foreground))" }}
          >
            {running ? "..." : "↻ Sauvegarder maintenant"}
          </button>
        </div>

        <input
          type="search"
          placeholder="Rechercher par email ou nom..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm"
          style={{ fontSize: 16 }}
        />
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground text-sm">Chargement...</div>
      ) : byUser.size === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-8 text-center">
          <p className="text-4xl mb-3">📭</p>
          <p className="text-sm text-muted-foreground">Aucune sauvegarde pour le moment</p>
        </div>
      ) : (
        <div className="space-y-3">
          {[...byUser.entries()].map(([uid, rows]) => {
            const latest = rows[0];
            return (
              <div key={uid} className="rounded-2xl border border-border bg-card p-3">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-foreground truncate">
                      {latest.display_name || latest.email || uid.slice(0, 8)}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{latest.email}</p>
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0">{rows.length} snap.</span>
                </div>
                <div className="space-y-1.5">
                  {rows.slice(0, 5).map((b) => {
                    const lab = reasonLabel(b.reason);
                    return (
                      <div key={b.id} className="flex items-center gap-2 text-xs">
                        <span
                          className="px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0"
                          style={{ background: `${lab.color}1f`, color: lab.color }}
                        >
                          {lab.text}
                        </span>
                        <span className="text-muted-foreground flex-1 truncate">
                          {new Date(b.created_at).toLocaleString("fr-FR")}
                        </span>
                        <button
                          onClick={() => download(b.id)}
                          className="text-[11px] underline cursor-pointer text-muted-foreground hover:text-foreground"
                        >
                          ⬇
                        </button>
                        <button
                          onClick={() => restore(b.id, latest.email || uid.slice(0, 8))}
                          disabled={restoring === b.id}
                          className="px-2 py-1 rounded text-[10px] font-bold cursor-pointer disabled:opacity-50"
                          style={{ background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}
                        >
                          {restoring === b.id ? "..." : "Restaurer"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}