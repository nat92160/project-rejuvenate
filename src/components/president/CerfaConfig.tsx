import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { FileCheck, Loader2, Save, Info, Upload, X } from "lucide-react";

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
  signature_image_url: string;
  organism_quality: string;
  address: string;
  president_first_name: string;
  president_last_name: string;
}

const CerfaConfig = ({ synagogueId }: Props) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [data, setData] = useState<CerfaData>({
    association_legal_name: "",
    association_object: "Exercice du culte",
    rna_number: "",
    siret_number: "",
    article_cgi: "200",
    signature: "",
    signature_image_url: "",
    organism_quality: "Œuvre ou organisme d'intérêt général",
    address: "",
    president_first_name: "",
    president_last_name: "",
  });

  useEffect(() => {
    (async () => {
      const { data: profile } = await (supabase
        .from("synagogue_profiles")
        .select("association_legal_name, association_object, rna_number, siret_number, article_cgi, signature, signature_image_url, organism_quality, address, president_first_name, president_last_name") as any)
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
          signature_image_url: profile.signature_image_url || "",
          organism_quality: profile.organism_quality || "Œuvre ou organisme d'intérêt général",
          address: profile.address || "",
          president_first_name: profile.president_first_name || "",
          president_last_name: profile.president_last_name || "",
        });
      }
      setLoading(false);
    })();
  }, [synagogueId]);

  const uploadSignature = async (file: File) => {
    setUploading(true);
    const ext = file.name.split(".").pop() || "png";
    const path = `${synagogueId}/signature-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("synagogue-logos").upload(path, file, { upsert: true });
    if (error) {
      toast.error("Échec de l'envoi de la signature");
      setUploading(false);
      return;
    }
    const { data: pub } = supabase.storage.from("synagogue-logos").getPublicUrl(path);
    setData((d) => ({ ...d, signature_image_url: pub.publicUrl }));
    setUploading(false);
    toast.success("Signature ajoutée");
  };

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
        signature_image_url: data.signature_image_url || null,
        organism_quality: data.organism_quality || "Œuvre ou organisme d'intérêt général",
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

  const isComplete = !!(data.association_legal_name && data.address && (data.rna_number || data.siret_number) && (data.president_first_name || data.president_last_name));

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

          <div>
            <Label className="text-[11px] font-semibold">Qualité de l'organisme</Label>
            <select
              value={data.organism_quality}
              onChange={(e) => setData({ ...data, organism_quality: e.target.value })}
              className="w-full text-xs mt-1 rounded-md border border-input bg-background px-3 py-2 h-9"
            >
              <option value="Œuvre ou organisme d'intérêt général">Œuvre ou organisme d'intérêt général</option>
              <option value="Association reconnue d'utilité publique">Association reconnue d'utilité publique</option>
              <option value="Association cultuelle">Association cultuelle</option>
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

        <div>
          <Label className="text-[11px] font-semibold">Signature manuscrite (PNG transparent)</Label>
          <div className="mt-1 flex items-center gap-3">
            {data.signature_image_url ? (
              <div className="relative">
                <img src={data.signature_image_url} alt="Signature" className="h-16 max-w-[200px] object-contain bg-muted/30 rounded p-1" />
                <button
                  type="button"
                  onClick={() => setData({ ...data, signature_image_url: "" })}
                  className="absolute -top-2 -right-2 bg-background border border-border rounded-full p-0.5"
                  aria-label="Retirer"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <label className="flex items-center gap-2 cursor-pointer text-[11px] border border-dashed border-border rounded-md px-3 py-2 hover:bg-muted/40">
                {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                <span>{uploading ? "Envoi…" : "Téléverser une signature"}</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadSignature(f); }}
                />
              </label>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">PNG transparent recommandé, ~300 px de large.</p>
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
