import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

serve(async (req) => {
  const url = new URL(req.url);
  const token = url.searchParams.get("token");

  if (!token) {
    return new Response("Token manquant", { status: 400 });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } }
  );

  const { data: donation, error } = await supabaseAdmin
    .from("donations")
    .select("id, amount, donor_name, donor_email, donor_address, donor_type, donor_company_name, donor_siret, created_at, synagogue_id, cerfa_number, fiscal_year")
    .eq("cerfa_token", token)
    .single();

  if (error || !donation) {
    return new Response("Reçu introuvable", { status: 404 });
  }

  const { data: syna } = await supabaseAdmin
    .from("synagogue_profiles")
    .select("name, address, president_first_name, president_last_name, logo_url, signature, association_legal_name, association_object, rna_number, siret_number, article_cgi")
    .eq("id", donation.synagogue_id)
    .single();

  const donDate = new Date(donation.created_at);
  const today = new Date();
  const presidentName = syna
    ? `${syna.president_first_name || ""} ${syna.president_last_name || ""}`.trim()
    : "";

  const legalName = syna?.association_legal_name || syna?.name || "—";
  const articleCgi = syna?.article_cgi || "200";
  const associationObject = syna?.association_object || "Exercice du culte";
  const cerfaNumber = donation.cerfa_number || donation.id.slice(0, 8).toUpperCase();
  const fiscalYear = donation.fiscal_year || donDate.getFullYear();

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Reçu Fiscal CERFA n° ${cerfaNumber}</title>
  <style>
    @media print { body { margin: 0; } .no-print { display: none; } }
    body { font-family: 'Georgia', serif; max-width: 720px; margin: 40px auto; padding: 20px; color: #1a1a1a; }
    .header { text-align: center; border-bottom: 3px double #1e3a5f; padding-bottom: 20px; margin-bottom: 30px; }
    .header h1 { font-size: 22px; color: #1e3a5f; margin: 0; }
    .header p { font-size: 11px; color: #666; margin: 5px 0 0; }
    .logo { max-height: 80px; margin-bottom: 10px; }
    .receipt-meta { display: flex; justify-content: space-between; font-size: 11px; color: #444; margin-bottom: 20px; padding: 8px 12px; background: #f7f7f9; border-radius: 6px; }
    .section { margin-bottom: 22px; }
    .section h2 { font-size: 13px; text-transform: uppercase; color: #1e3a5f; border-bottom: 1px solid #ddd; padding-bottom: 5px; margin-bottom: 10px; letter-spacing: 0.5px; }
    .section p { font-size: 12px; margin: 4px 0; line-height: 1.6; }
    .legal-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 16px; font-size: 11px; }
    .legal-grid span.label { color: #666; }
    .amount { font-size: 18px; font-weight: bold; color: #1e3a5f; }
    .footer { margin-top: 40px; font-size: 10px; color: #888; border-top: 1px solid #ddd; padding-top: 15px; }
    .signature { margin-top: 30px; }
    .print-btn { display: block; margin: 20px auto; padding: 12px 30px; background: #1e3a5f; color: white; border: none; border-radius: 8px; font-size: 14px; cursor: pointer; }
    .legal-mention { font-size: 11px; font-style: italic; padding: 10px; background: #fafafa; border-left: 3px solid #c9a84c; }
  </style>
</head>
<body>
  <button class="print-btn no-print" onclick="window.print()">🖨️ Imprimer / Télécharger PDF</button>

  <div class="header">
    ${syna?.logo_url ? `<img src="${syna.logo_url}" class="logo" alt="Logo">` : ""}
    <h1>REÇU AU TITRE DES DONS</h1>
    <p>à certains organismes d'intérêt général — Cerfa n° 11580*04</p>
    <p>Article ${articleCgi} du Code Général des Impôts</p>
  </div>

  <div class="receipt-meta">
    <span><strong>Reçu N°</strong> ${cerfaNumber}</span>
    <span><strong>Année fiscale</strong> ${fiscalYear}</span>
    <span><strong>Émis le</strong> ${today.toLocaleDateString("fr-FR")}</span>
  </div>

  <div class="section">
    <h2>Bénéficiaire des versements</h2>
    <p><strong>${legalName}</strong></p>
    <div class="legal-grid">
      <span class="label">Adresse :</span><span>${syna?.address || "—"}</span>
      <span class="label">Objet :</span><span>${associationObject}</span>
      ${syna?.rna_number ? `<span class="label">N° RNA :</span><span>${syna.rna_number}</span>` : ""}
      ${syna?.siret_number ? `<span class="label">N° SIRET :</span><span>${syna.siret_number}</span>` : ""}
    </div>
  </div>

  <div class="section">
    <h2>${donation.donor_type === "societe" ? "Donateur (Personne morale)" : "Donateur"}</h2>
    ${donation.donor_type === "societe" ? `
      <p><strong>${donation.donor_company_name || "—"}</strong></p>
      ${donation.donor_siret ? `<p>SIRET : ${donation.donor_siret}</p>` : ""}
      <p>Représentée par : ${donation.donor_name || "—"}</p>
    ` : `
      <p><strong>${donation.donor_name || "—"}</strong></p>
    `}
    <p>${donation.donor_address || "—"}</p>
    <p>Courriel : ${donation.donor_email}</p>
  </div>

  <div class="section">
    <h2>Don effectué</h2>
    <p>Date du versement : <strong>${donDate.toLocaleDateString("fr-FR")}</strong></p>
    <p>Montant : <span class="amount">${(donation.amount / 100).toFixed(2)} €</span></p>
    <p>(${numberToFrenchWords(donation.amount / 100)} euros)</p>
    <p>Forme du don : Acte authentique &nbsp;☐&nbsp; Acte sous seing privé &nbsp;☐&nbsp; Déclaration de don manuel &nbsp;☑&nbsp; Autre &nbsp;☐</p>
    <p>Nature du don : Numéraire ☑ &nbsp;&nbsp; Titres ☐ &nbsp;&nbsp; Autres ☐</p>
    <p>Mode de versement : Carte bancaire (paiement en ligne sécurisé)</p>
  </div>

  <div class="section">
    <p class="legal-mention">
      Le bénéficiaire reconnaît, conformément à l'article ${articleCgi} du Code Général des Impôts,
      que les dons et versements qu'il reçoit ouvrent droit à une réduction d'impôt
      ${articleCgi.includes("200") ? "égale à 66% de leur montant pour les particuliers (dans la limite de 20% du revenu imposable)" : "dans les conditions prévues par la loi"}.
    </p>
  </div>

  <div class="signature">
    <p style="font-size: 12px;">Fait à ${syna?.address ? syna.address.split(",").pop()?.trim() : "—"}, le ${today.toLocaleDateString("fr-FR")}</p>
    <p style="font-size: 12px; margin-top: 10px;">
      ${presidentName ? `Le Président : <strong>${presidentName}</strong>` : ""}
    </p>
    ${syna?.signature ? `<p style="font-size: 11px; font-style: italic; color: #666; margin-top: 5px;">${syna.signature}</p>` : ""}
  </div>

  <div class="footer">
    <p>Reçu établi conformément aux dispositions des articles 200 et 238 bis du CGI et à l'arrêté du 1er décembre 2003.</p>
    <p>Réf. interne : ${donation.id}</p>
  </div>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
});

// Simple number-to-French-words for amounts (basic, suitable for <1M)
function numberToFrenchWords(n: number): string {
  if (n === 0) return "zéro";
  const units = ["", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf", "dix", "onze", "douze", "treize", "quatorze", "quinze", "seize", "dix-sept", "dix-huit", "dix-neuf"];
  const tens = ["", "", "vingt", "trente", "quarante", "cinquante", "soixante", "soixante", "quatre-vingt", "quatre-vingt"];
  const intPart = Math.floor(n);
  const decPart = Math.round((n - intPart) * 100);
  function below1000(num: number): string {
    if (num === 0) return "";
    if (num < 20) return units[num];
    if (num < 100) {
      const t = Math.floor(num / 10), u = num % 10;
      if (t === 7 || t === 9) return tens[t] + "-" + units[10 + u];
      return tens[t] + (u ? (t === 8 && u === 0 ? "s" : "-" + units[u]) : (t === 8 ? "s" : ""));
    }
    const h = Math.floor(num / 100), r = num % 100;
    return (h === 1 ? "cent" : units[h] + " cent" + (r === 0 ? "s" : "")) + (r ? " " + below1000(r) : "");
  }
  let result = "";
  if (intPart >= 1000) {
    const th = Math.floor(intPart / 1000);
    result += (th === 1 ? "mille" : below1000(th) + " mille") + " ";
  }
  result += below1000(intPart % 1000);
  if (decPart > 0) result += " et " + decPart + "/100";
  return result.trim() || "zéro";
}
