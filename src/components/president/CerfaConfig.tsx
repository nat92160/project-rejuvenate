import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { FileCheck, Loader2, Save, Info } from "lucide-react";

interface Props {
  synagogueId: string;
}

interface CerfaData {
  association_legal_name: string;
  association_object: string;
  rna_number: string;
  siret_number: string;
  article_cgi: string;
  signature: string;
  address: string;
  president_first_name: string;
  president_last_name: string;
}

const CerfaConfig = ({ synagogueId }: Props) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<CerfaData>({
    association_legal_name: "",
    association_object: "Exercice du culte",
    rna_number: "",
    siret_number: "",
    article_cgi: "200",
    signature: "",
    address: "",
    president_first_name: "",
    president_last_name: "",
  });

  useEffect(() => {
    (async () => {
      const { data: profile } = await (supabase
        .from("synagogue_profiles")
        .select("association_legal_name, association_object, rna_number, siret_number, article_cgi, signature, address, president_first_name, president_last_name") as any)
        .eq("id", synagogueId)
        .maybeSingle();
      if (profile) {
        setData({
          association_legal_name: profile.association_legal_name || "",
          association_object: profile.association_object || "Exercice du culte",
          rna_number: profile.rna_number || "",
          siret_number: profile.siret_number || "",
          article_cgi: profile.article_cgi || "200",
          signature: profile.signature || "",
          address: profile.address || "",
          president_first_name: profile.president_first_name || "",
          president_last_name: profile.president_last_name || "",
        });
      }
      setLoading(false);
    })();
  }, [synagogueId]);

  const save = async () => {
    setSaving(true);
    const { error } = await (supabase
      .from("synagogue_profiles")
      .update({
        association_legal_name: data.association_legal_name || null,
        association_object: data.association_object || "Exercice du culte",
        rna_number: data.rna_number || null,
        siret_number: data.siret_number || null,
        article_cgi: data.article_cgi || "200",
        signature: data.signature || null,
        president_first_name: data.president_first_name || null,
        president_last_name: data.president_last_name || null,
      }) as any)
      .eq("id", synagogueId);
    setSaving(false);
    if (error) {
      toast.error("Erreur lors de la sauvegarde");
    } else {
      toast.success("Configuration CERFA sauvegardée");
    }
  };

  if (loading) return <div className="text-center py-4"><Loader2 className="w-4 h-4 animate-spin mx-auto" /></div>;

  const isComplete = data.association_legal_name && data.address && (data.rna_number || data.siret_number) && (data.president_first_name || data.president_last_name);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-center gap-2">
          <FileCheck className="w-4 h-4 text-primary" />
          <Label className="text-xs font-semibold">Configuration CERFA</Label>
        </div>

        <div className={`rounded-lg p-3 text-[11px] flex gap-2 ${isComplete ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"}`}>
          <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          <span>
            {isComplete
              ? "Vos reçus CERFA sont conformes et peuvent être émis aux donateurs."
              : "Complétez ces informations légales pour émettre des reçus CERFA conformes."}
          </span>
        </div>

        {/* Identité légale */}
        <div className="space-y-3">
          <div>
            <Label className="text-[11px] font-semibold">Dénomination légale de l'association *</Label>
            <Input
              value={data.association_legal_name}
              onChange={(e) => setData({ ...data, association_legal_name: e.target.value })}
              placeholder="Ex: Association Cultuelle Beth Yaakov"
              className="text-xs mt-1"
            />
            <p className="text-[10px] text-muted-foreground mt-1">Nom officiel déposé en préfecture (peut différer du nom d'usage).</p>
          </div>

          <div>
            <Label className="text-[11px] font-semibold">Objet de l'association</Label>
            <Input
              value={data.association_object}
              onChange={(e) => setData({ ...data, association_object: e.target.value })}
              placeholder="Exercice du culte"
              className="text-xs mt-1"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-[11px] font-semibold">N° RNA</Label>
              <Input
                value={data.rna_number}
                onChange={(e) => setData({ ...data, rna_number: e.target.value })}
                placeholder="W751234567"
                className="text-xs mt-1"
              />
            </div>
            <div>
              <Label className="text-[11px] font-semibold">N° SIRET</Label>
              <Input
                value={data.siret_number}
                onChange={(e) => setData({ ...data, siret_number: e.target.value })}
                placeholder="123 456 789 00012"
                className="text-xs mt-1"
              />
            </div>
          </div>

          <div>
            <Label className="text-[11px] font-semibold">Article CGI applicable</Label>
            <select
              value={data.article_cgi}
              onChange={(e) => setData({ ...data, article_cgi: e.target.value })}
              className="w-full text-xs mt-1 rounded-md border border-input bg-background px-3 py-2 h-9"
            >
              <option value="200">Article 200 — Particuliers (66% de réduction)</option>
              <option value="238 bis">Article 238 bis — Entreprises (60%)</option>
              <option value="200 et 238 bis">Articles 200 et 238 bis — Particuliers et entreprises</option>
            </select>
          </div>
        </div>
      </div>

      {/* Signature */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <Label className="text-xs font-semibold">Signataire du reçu</Label>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-[11px] font-semibold">Prénom du Président</Label>
            <Input
              value={data.president_first_name}
              onChange={(e) => setData({ ...data, president_first_name: e.target.value })}
              className="text-xs mt-1"
            />
          </div>
          <div>
            <Label className="text-[11px] font-semibold">Nom du Président</Label>
            <Input
              value={data.president_last_name}
              onChange={(e) => setData({ ...data, president_last_name: e.target.value })}
              className="text-xs mt-1"
            />
          </div>
        </div>

        <div>
          <Label className="text-[11px] font-semibold">Mention complémentaire (optionnel)</Label>
          <Textarea
            value={data.signature}
            onChange={(e) => setData({ ...data, signature: e.target.value })}
            placeholder="Ex: Président de l'Association Cultuelle"
            className="text-xs mt-1 min-h-[60px]"
          />
        </div>
      </div>

      <Button onClick={save} disabled={saving} className="w-full">
        {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
        Sauvegarder la configuration CERFA
      </Button>
    </div>
  );
};

export default CerfaConfig;
