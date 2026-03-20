import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ZoomAccount {
  id: string;
  label: string;
  zoom_account_id: string;
  zoom_client_id: string;
  zoom_client_secret: string;
  is_default: boolean;
}

interface ZoomAccountManagerProps {
  userId: string;
  onSelect?: (accountId: string | null) => void;
  selectedAccountId?: string | null;
  compact?: boolean;
}

const inputClass =
  "w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-[#2D8CFF]/30";

const ZoomAccountManager = ({ userId, onSelect, selectedAccountId, compact = false }: ZoomAccountManagerProps) => {
  const [accounts, setAccounts] = useState<ZoomAccount[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ label: "", zoom_account_id: "", zoom_client_id: "", zoom_client_secret: "" });

  const fetchAccounts = async () => {
    const { data, error } = await supabase
      .from("zoom_accounts")
      .select("*")
      .eq("president_id", userId)
      .order("created_at", { ascending: true });

    if (!error && data) {
      setAccounts(data as ZoomAccount[]);
      // Auto-select default account
      if (onSelect && !selectedAccountId) {
        const defaultAcc = data.find((a: ZoomAccount) => a.is_default) || data[0];
        if (defaultAcc) onSelect(defaultAcc.id);
      }
    }
    setLoading(false);
  };

  useEffect(() => { fetchAccounts(); }, [userId]);

  const handleAdd = async () => {
    if (!form.label.trim() || !form.zoom_account_id.trim() || !form.zoom_client_id.trim() || !form.zoom_client_secret.trim()) {
      toast.error("Tous les champs sont requis");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("zoom_accounts").insert({
      president_id: userId,
      label: form.label.trim(),
      zoom_account_id: form.zoom_account_id.trim(),
      zoom_client_id: form.zoom_client_id.trim(),
      zoom_client_secret: form.zoom_client_secret.trim(),
      is_default: accounts.length === 0,
    });

    if (error) {
      toast.error("Erreur lors de l'ajout");
    } else {
      toast.success("Compte Zoom ajouté !");
      setForm({ label: "", zoom_account_id: "", zoom_client_id: "", zoom_client_secret: "" });
      setShowForm(false);
      await fetchAccounts();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("zoom_accounts").delete().eq("id", id);
    if (!error) {
      toast.success("Compte supprimé");
      await fetchAccounts();
      if (selectedAccountId === id) onSelect?.(null);
    }
  };

  const setDefault = async (id: string) => {
    // Reset all to false, then set selected to true
    await supabase.from("zoom_accounts").update({ is_default: false }).eq("president_id", userId);
    await supabase.from("zoom_accounts").update({ is_default: true }).eq("id", id);
    await fetchAccounts();
    toast.success("Compte par défaut mis à jour");
  };

  if (loading) return <div className="text-xs text-muted-foreground py-2">Chargement des comptes Zoom...</div>;

  // Compact mode: just a selector
  if (compact && accounts.length > 0) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <select
            value={selectedAccountId || ""}
            onChange={(e) => onSelect?.(e.target.value || null)}
            className={inputClass}
          >
            <option value="">Compte Zoom par défaut (serveur)</option>
            {accounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.label} {acc.is_default ? "⭐" : ""}
              </option>
            ))}
          </select>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* List accounts */}
      {accounts.length > 0 && (
        <div className="space-y-2">
          {accounts.map((acc) => (
            <div
              key={acc.id}
              className={`flex items-center justify-between rounded-lg border p-2.5 transition-all cursor-pointer ${
                selectedAccountId === acc.id
                  ? "border-[#2D8CFF] bg-[#2D8CFF]/5"
                  : "border-border bg-card"
              }`}
              onClick={() => onSelect?.(acc.id)}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-foreground truncate">{acc.label}</span>
                  {acc.is_default && <span className="text-[10px] bg-[#2D8CFF]/10 text-[#2D8CFF] px-1.5 py-0.5 rounded-full font-bold">Par défaut</span>}
                </div>
                <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                  ID: {acc.zoom_account_id.slice(0, 8)}...
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {!acc.is_default && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setDefault(acc.id); }}
                    className="text-[10px] px-2 py-1 rounded-md bg-muted text-muted-foreground border-none cursor-pointer hover:bg-muted/80"
                    title="Définir par défaut"
                  >
                    ⭐
                  </button>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(acc.id); }}
                  className="text-[10px] px-2 py-1 rounded-md bg-destructive/10 text-destructive border-none cursor-pointer hover:bg-destructive/20"
                >
                  🗑
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add form */}
      {showForm ? (
        <div className="rounded-lg border border-[#2D8CFF]/20 bg-[#2D8CFF]/5 p-3 space-y-2">
          <p className="text-[11px] font-bold text-foreground">Nouveau compte Zoom</p>
          <input
            value={form.label}
            onChange={(e) => setForm({ ...form, label: e.target.value })}
            placeholder="Nom du compte (ex: Synagogue Beth El)"
            className={inputClass}
          />
          <input
            value={form.zoom_account_id}
            onChange={(e) => setForm({ ...form, zoom_account_id: e.target.value })}
            placeholder="Account ID"
            className={inputClass}
          />
          <input
            value={form.zoom_client_id}
            onChange={(e) => setForm({ ...form, zoom_client_id: e.target.value })}
            placeholder="Client ID"
            className={inputClass}
          />
          <input
            value={form.zoom_client_secret}
            onChange={(e) => setForm({ ...form, zoom_client_secret: e.target.value })}
            placeholder="Client Secret"
            type="password"
            className={inputClass}
          />
          <p className="text-[10px] text-muted-foreground">
            Ces identifiants se trouvent dans votre <strong>Zoom Marketplace</strong> → Server-to-Server OAuth App.
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              disabled={saving}
              className="flex-1 py-2 rounded-lg text-xs font-bold text-white bg-[#2D8CFF] border-none cursor-pointer disabled:opacity-50"
            >
              {saving ? "Ajout..." : "Ajouter"}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-2 rounded-lg text-xs font-bold text-muted-foreground bg-muted border-none cursor-pointer"
            >
              Annuler
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="w-full py-2 rounded-lg border border-dashed border-[#2D8CFF]/30 text-xs font-bold text-[#2D8CFF] bg-transparent cursor-pointer hover:bg-[#2D8CFF]/5 transition-all"
        >
          + Ajouter un compte Zoom
        </button>
      )}
    </div>
  );
};

export default ZoomAccountManager;
