import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Target, Plus, Loader2, Trash2, Edit2, Calendar } from "lucide-react";

interface Campaign {
  id: string;
  title: string;
  description: string;
  goal_amount: number | null;
  current_amount: number;
  cover_image_url: string | null;
  is_active: boolean;
  start_date: string;
  end_date: string | null;
}

interface Props {
  synagogueId: string;
}

const CampaignsManager = ({ synagogueId }: Props) => {
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Campaign | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [goalAmount, setGoalAmount] = useState("");
  const [coverImage, setCoverImage] = useState("");
  const [endDate, setEndDate] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await (supabase
      .from("donation_campaigns" as any)
      .select("*") as any)
      .eq("synagogue_id", synagogueId)
      .order("created_at", { ascending: false });
    setCampaigns((data as Campaign[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    if (synagogueId) load();
  }, [synagogueId]);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setGoalAmount("");
    setCoverImage("");
    setEndDate("");
    setEditing(null);
    setShowForm(false);
  };

  const startEdit = (c: Campaign) => {
    setEditing(c);
    setTitle(c.title);
    setDescription(c.description);
    setGoalAmount(c.goal_amount ? (c.goal_amount / 100).toString() : "");
    setCoverImage(c.cover_image_url || "");
    setEndDate(c.end_date || "");
    setShowForm(true);
  };

  const save = async () => {
    if (!title.trim()) {
      toast.error("Le titre est obligatoire");
      return;
    }
    if (!user) return;
    setSaving(true);

    const payload = {
      synagogue_id: synagogueId,
      creator_id: user.id,
      title: title.trim(),
      description: description.trim(),
      goal_amount: goalAmount ? Math.round(parseFloat(goalAmount) * 100) : null,
      cover_image_url: coverImage.trim() || null,
      end_date: endDate || null,
    };

    if (editing) {
      const { error } = await (supabase
        .from("donation_campaigns" as any)
        .update(payload) as any)
        .eq("id", editing.id);
      setSaving(false);
      if (error) {
        toast.error("Erreur : " + error.message);
        return;
      }
      toast.success("Campagne mise à jour");
    } else {
      const { error } = await (supabase
        .from("donation_campaigns" as any)
        .insert(payload) as any);
      setSaving(false);
      if (error) {
        toast.error("Erreur : " + error.message);
        return;
      }
      toast.success("Campagne créée !");
    }

    resetForm();
    load();
  };

  const toggleActive = async (c: Campaign) => {
    const { error } = await (supabase
      .from("donation_campaigns" as any)
      .update({ is_active: !c.is_active }) as any)
      .eq("id", c.id);
    if (error) {
      toast.error("Erreur");
      return;
    }
    toast.success(c.is_active ? "Campagne désactivée" : "Campagne activée");
    load();
  };

  const remove = async (c: Campaign) => {
    if (!confirm(`Supprimer la campagne "${c.title}" ? Les dons restent enregistrés.`)) return;
    const { error } = await (supabase
      .from("donation_campaigns" as any)
      .delete() as any)
      .eq("id", c.id);
    if (error) {
      toast.error("Erreur");
      return;
    }
    toast.success("Campagne supprimée");
    load();
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-primary" />
          <Label className="text-xs font-semibold">Campagnes de dons</Label>
        </div>
        {!showForm && (
          <Button size="sm" onClick={() => setShowForm(true)} className="h-8 text-xs">
            <Plus className="w-3 h-3 mr-1" /> Nouvelle campagne
          </Button>
        )}
      </div>

      {showForm && (
        <div className="space-y-3 rounded-lg bg-muted/30 p-3 border border-border">
          <div>
            <Label className="text-[11px]">Titre *</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Travaux de la synagogue, Sefer Torah…"
              className="text-sm"
            />
          </div>
          <div>
            <Label className="text-[11px]">Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Expliquez le projet, son utilité, les besoins…"
              rows={3}
              className="text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-[11px]">Objectif (€)</Label>
              <Input
                type="number"
                min="0"
                value={goalAmount}
                onChange={(e) => setGoalAmount(e.target.value)}
                placeholder="10000"
                className="text-sm"
              />
            </div>
            <div>
              <Label className="text-[11px]">Date de fin</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="text-sm"
              />
            </div>
          </div>
          <div>
            <Label className="text-[11px]">Image de couverture (URL)</Label>
            <Input
              value={coverImage}
              onChange={(e) => setCoverImage(e.target.value)}
              placeholder="https://…"
              className="text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={save} disabled={saving} className="text-xs">
              {saving ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
              {editing ? "Enregistrer" : "Créer"}
            </Button>
            <Button size="sm" variant="ghost" onClick={resetForm} className="text-xs">
              Annuler
            </Button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-4">
          <Loader2 className="w-4 h-4 animate-spin mx-auto" />
        </div>
      ) : campaigns.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-4">
          Aucune campagne. Créez-en une pour collecter pour un projet précis.
        </p>
      ) : (
        <div className="space-y-2">
          {campaigns.map((c) => {
            const pct = c.goal_amount
              ? Math.min(100, Math.round((c.current_amount / c.goal_amount) * 100))
              : 0;
            return (
              <div
                key={c.id}
                className={`rounded-lg border p-3 space-y-2 ${
                  c.is_active ? "border-border bg-background" : "border-border bg-muted/30 opacity-60"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-foreground truncate">{c.title}</h4>
                      {!c.is_active && (
                        <span className="text-[9px] uppercase bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
                          Inactive
                        </span>
                      )}
                    </div>
                    {c.description && (
                      <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
                        {c.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Switch
                      checked={c.is_active}
                      onCheckedChange={() => toggleActive(c)}
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => startEdit(c)}
                      className="h-7 w-7"
                    >
                      <Edit2 className="w-3 h-3" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => remove(c)}
                      className="h-7 w-7 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>

                {c.goal_amount ? (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-semibold text-primary">
                        {(c.current_amount / 100).toFixed(0)} € collectés
                      </span>
                      <span className="text-muted-foreground">
                        Objectif : {(c.goal_amount / 100).toFixed(0)} € ({pct}%)
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="text-[10px] font-semibold text-primary">
                    {(c.current_amount / 100).toFixed(0)} € collectés
                  </div>
                )}

                {c.end_date && (
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Calendar className="w-2.5 h-2.5" />
                    Jusqu'au {new Date(c.end_date).toLocaleDateString("fr-FR")}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CampaignsManager;
