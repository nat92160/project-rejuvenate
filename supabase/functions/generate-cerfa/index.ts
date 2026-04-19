import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// SECURITY: HTML escaping to prevent XSS in user-controlled fields
function esc(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function safeUrl(value: unknown): string {
  const s = String(value || "");
  if (/^https?:\/\//i.test(s)) return esc(s);
  return "";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const token = url.searchParams.get("token");

  if (!token) {
    return new Response("Token manquant", { status: 400, headers: corsHeaders });
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
    return new Response("Reçu introuvable", { status: 404, headers: corsHeaders });
  }

  const { data: syna } = await supabaseAdmin
    .from("synagogue_profiles")
    .select("name, address, president_first_name, president_last_name, logo_url, signature, signature_image_url, organism_quality, association_legal_name, association_object, rna_number, siret_number, article_cgi")
    .eq("id", donation.synagogue_id)
    .single();

  // Si pas encore de numéro CERFA, on en assigne un séquentiel par synagogue+année
  let cerfaNumber = donation.cerfa_number as string | null;
  if (!cerfaNumber) {
    const { data: assigned } = await supabaseAdmin.rpc("assign_cerfa_number", { _donation_id: donation.id });
    if (typeof assigned === "string") cerfaNumber = assigned;
  }

  const donDate = new Date(donation.created_at);
  const today = new Date();
  const presidentName = syna
    ? `${syna.president_first_name || ""} ${syna.president_last_name || ""}`.trim()
    : "";

  const legalName = syna?.association_legal_name || syna?.name || "—";
  const articleCgi = syna?.article_cgi || "200";
  const associationObject = syna?.association_object || "Exercice du culte";
  const fiscalYear = donation.fiscal_year || donDate.getFullYear();
  const organismQuality = syna?.organism_quality || "Œuvre ou organisme d'intérêt général";
  const finalCerfaNumber = cerfaNumber || `A${fiscalYear}/${donation.id.slice(0, 5).toUpperCase()}`;
  const amountEuros = donation.amount / 100;
  const amountInWords = numberToFrenchWords(amountEuros);

  const article200Checked = articleCgi.includes("200") ? "&#10004;" : "";
  const article238Checked = articleCgi.includes("238") ? "&#10004;" : "";
  const article978Checked = articleCgi.includes("978") ? "&#10004;" : "";

  const isCompany = donation.donor_type === "societe";
  const donorDisplayName = isCompany
    ? (donation.donor_company_name || donation.donor_name || "—")
    : `M ou Mme ${(donation.donor_name || "—").toUpperCase()}`;

  const rnaSiret = syna?.rna_number || syna?.siret_number || "";
  const missingLegalInfo = !rnaSiret || !syna?.association_legal_name;

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Reçu Fiscal CERFA n° ${esc(finalCerfaNumber)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Lora:wght@400;600;700&family=Playfair+Display:wght@700;900&display=swap" rel="stylesheet">
  <style>
    @page { size: A4; margin: 8mm; }
    @media print { body { margin: 0; background: #fff; } .no-print { display: none; } .frame { page-break-inside: avoid; } }
    * { box-sizing: border-box; }
    html, body { font-family: 'Lora', Georgia, 'Times New Roman', serif; color: #2a2a2a; font-size: 10.5px; line-height: 1.3; background: #fff; }
    body { max-width: 800px; margin: 12px auto; padding: 8px; }
    .print-btn { display: block; margin: 0 auto 10px; padding: 8px 18px; background: #996515; color: #fff; border: none; border-radius: 6px; font-size: 12px; cursor: pointer; font-family: inherit; letter-spacing: 0.5px; }
    .warn { background: #fffaf2; border: 1px solid #d9a85f; color: #6b4810; padding: 6px 10px; border-radius: 6px; font-size: 10.5px; margin-bottom: 8px; text-align: center; font-weight: 600; }
    .frame { border: 1.5px solid #996515; background: #fff; }
    .top { display: grid; grid-template-columns: 170px 1fr 150px; align-items: center; padding: 10px 14px; border-bottom: 1.5px solid #996515; gap: 10px; background: #fffdf7; }
    .top .left { display: flex; flex-direction: column; align-items: center; gap: 2px; font-size: 9.5px; color: #996515; }
    .top .left .small { font-size: 9px; }
    .cerfa-bubble { display: inline-block; border: 1.3px solid #996515; color: #996515; border-radius: 999px; padding: 2px 18px; font-style: italic; font-weight: 700; letter-spacing: 1px; font-size: 11px; }
    .top .center { text-align: center; font-weight: 700; font-size: 11px; line-height: 1.3; color: #2a2a2a; }
    .top .right { text-align: right; font-size: 10px; color: #996515; }
    .top .right .num { font-weight: 700; font-size: 12.5px; margin-top: 2px; color: #996515; letter-spacing: 0.5px; }
    .donor-bar { display: grid; grid-template-columns: 170px 1fr; padding: 10px 14px; border-bottom: 1px solid #e0c693; gap: 12px; align-items: center; background: #fff; }
    .donor-bar .logo { display: flex; flex-direction: column; align-items: center; gap: 4px; font-weight: 700; font-size: 10px; text-align: center; color: #996515; }
    .donor-bar .logo img { max-width: 70px; max-height: 70px; object-fit: contain; }
    .donor-bar .donor-block { font-size: 11px; line-height: 1.45; }
    .donor-bar .donor-block .donor-name { font-weight: 700; color: #2a2a2a; }
    .section-title { background: #996515; color: #fff; text-align: center; padding: 5px 0; font-weight: 700; letter-spacing: 1.2px; font-size: 10.5px; border-bottom: 1px solid #996515; text-transform: uppercase; }
    .grid-2col { display: grid; grid-template-columns: 200px 1fr; }
    .grid-2col > div { padding: 5px 12px; border-bottom: 1px solid #f0e2c3; font-size: 10.5px; }
    .grid-2col .lbl { font-weight: 700; background: #fffdf7; color: #6b4810; }
    .grid-2col > div:nth-last-child(-n+2) { border-bottom: none; }
    .missing { color: #b8410f; font-weight: 700; }
    .amount-section { padding: 10px 14px; border-bottom: 1px solid #e0c693; background: #fffdf7; }
    .amount-line { text-align: center; font-size: 10.5px; margin-bottom: 6px; color: #2a2a2a; }
    .amount-box { display: flex; justify-content: center; }
    .amount-box .pill { border: 1.5px solid #996515; color: #996515; padding: 6px 22px; font-weight: 700; font-size: 12px; letter-spacing: 0.3px; text-align: center; background: #fff; border-radius: 4px; }
    .checks { padding: 8px 14px; border-bottom: 1px solid #e0c693; }
    .checks .center-h { text-align: center; font-weight: 700; font-size: 10.5px; margin-bottom: 6px; line-height: 1.4; color: #2a2a2a; }
    .checks .row { display: flex; gap: 18px; flex-wrap: wrap; align-items: center; margin: 3px 0 8px; }
    .checks .group-title { font-weight: 700; text-decoration: underline; font-size: 10.5px; margin-top: 3px; color: #996515; }
    .check { display: inline-flex; align-items: center; gap: 6px; font-size: 10.5px; }
    .check .box { width: 13px; height: 13px; border: 1.2px solid #996515; display: inline-flex; align-items: center; justify-content: center; font-size: 10px; line-height: 1; color: #996515; }
    .footer-row { display: grid; grid-template-columns: 1fr 1fr; padding: 10px 14px; gap: 10px; background: #fffdf7; border-bottom: 1px solid #e0c693; }
    .footer-row .right { text-align: right; }
    .footer-row .right .date { font-weight: 700; color: #2a2a2a; }
    .footer-row .right .pres { margin-top: 3px; font-style: italic; font-size: 10.5px; color: #6b4810; }
    .footer-row .right .sig img { max-height: 55px; margin-top: 3px; }
    .footer-mention { text-align: center; font-weight: 700; padding: 8px 12px 2px; font-size: 11px; color: #996515; letter-spacing: 1px; text-transform: uppercase; font-family: 'Playfair Display', Georgia, serif; }
    .footer-note { text-align: center; font-size: 9px; color: #888; padding: 2px 12px 6px; font-style: italic; }
  </style>
</head>
<body>
  <button class="print-btn no-print" onclick="window.print()">🖨️ Imprimer / Télécharger PDF</button>
  ${missingLegalInfo ? `<div class="warn no-print">⚠️ Informations légales incomplètes (RNA/SIRET ou dénomination manquant). Ce reçu n'est pas valide fiscalement tant que la configuration CERFA n'est pas terminée.</div>` : ""}
  <div class="frame">
    <!-- TOP HEADER -->
    <div class="top">
      <div class="left">
        <div class="small">2041-RD</div>
        <div class="cerfa-bubble">cerfa</div>
        <div class="small">N° 11580*05</div>
      </div>
      <div class="center">
        Reçu des dons et versements<br>
        effectués par les particuliers au titre<br>
        des articles 200 et 978 du code<br>
        général des impôts
      </div>
      <div class="right">
        <div>N° d'ordre du reçu</div>
        <div class="num">${esc(finalCerfaNumber)}</div>
      </div>
    </div>

    <!-- DONOR HEADER (logo + adresse donateur) -->
    <div class="donor-bar">
      <div class="logo">
        ${syna?.logo_url && safeUrl(syna.logo_url) ? `<img src="${safeUrl(syna.logo_url)}" alt="Logo">` : ""}
        <div>${esc(syna?.name || legalName)}</div>
      </div>
      <div class="donor-block">
        <div class="donor-name">${esc(donorDisplayName)}</div>
        <div>${esc(donation.donor_address || "—")}</div>
        <div>Courriel : ${esc(donation.donor_email)}</div>
      </div>
    </div>

    <!-- BENEFICIAIRE -->
    <div class="section-title">BENEFICIAIRE DU DON</div>
    <div class="grid-2col">
      <div class="lbl">NOM OU DENOMINATION :</div>
      <div><strong>${esc(legalName)}</strong></div>
      <div class="lbl">Numéro SIREN ou RNA :</div>
      <div>${rnaSiret ? esc(rnaSiret) : `<span class="missing">À COMPLÉTER (config CERFA)</span>`}</div>
      <div class="lbl">ADRESSE ASSOCIATION :</div>
      <div>${esc(syna?.address || "—")}</div>
      <div class="lbl">OBJET :</div>
      <div>${esc(associationObject)}</div>
      <div class="lbl">QUALITE DE L'ORGANISME :</div>
      <div>${esc(organismQuality)}</div>
    </div>

    <!-- MONTANT -->
    <div class="amount-section">
      <div class="amount-line">Le bénéficiaire reconnaît avoir reçu au titre des dons et versements ouvrant droit à réduction d'impôt, la somme de</div>
      <div class="amount-box">
        <div class="pill">***${amountEuros.toFixed(2).replace(/\.00$/, "")} Euros*** (${esc(amountInWords)} euros)</div>
      </div>
    </div>

    <!-- DONATEUR -->
    <div class="section-title">DONATEUR</div>
    <div class="grid-2col">
      <div class="lbl">NOM OU DENOMINATION :</div>
      <div>${esc(donorDisplayName)}</div>
      <div class="lbl">ADRESSE DONATEUR :</div>
      <div>${esc(donation.donor_address || "—")}</div>
    </div>

    <!-- CHECKBOXES -->
    <div class="checks">
      <div class="center-h">Le bénéficiaire certifie sur l'honneur que les dons et versements qu'il reçoit<br>ouvrent droit à la réduction d'impôt prévue à l'article</div>
      <div class="row">
        <span class="check"><span class="box">${article200Checked}</span> 200 du CGI</span>
        <span class="check"><span class="box">${article238Checked}</span> 238 bis du CGI</span>
        <span class="check"><span class="box">${article978Checked}</span> 978 du CGI</span>
      </div>

      <div class="group-title">Forme du don</div>
      <div class="row">
        <span class="check"><span class="box"></span> Acte authentique</span>
        <span class="check"><span class="box"></span> Acte sous seing privé</span>
        <span class="check"><span class="box">&#10004;</span> Déclaration de don manuel</span>
        <span class="check"><span class="box"></span> Autres</span>
      </div>

      <div class="group-title">Nature du don</div>
      <div class="row">
        <span class="check"><span class="box">&#10004;</span> Numéraire</span>
        <span class="check"><span class="box"></span> Titres de sociétés cotées</span>
        <span class="check"><span class="box"></span> Autres</span>
      </div>
    </div>

    <!-- FOOTER (mode + date + signature) -->
    <div class="footer-row">
      <div class="left">
        Mode de versement : <strong>CB</strong>
      </div>
      <div class="right">
        <div>Date et signature</div>
        <div class="date">${donDate.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</div>
        ${presidentName ? `<div class="pres">M. ${esc(presidentName)}, Président :</div>` : ""}
        <div class="sig">
          ${syna?.signature_image_url && safeUrl(syna.signature_image_url) ? `<img src="${safeUrl(syna.signature_image_url)}" alt="Signature">` : ""}
        </div>
      </div>
    </div>

    <div class="footer-mention">Reçu cerfa généré par Chabbat Chalom</div>
    <div class="footer-note">Article ${esc(articleCgi)} du Code Général des Impôts — Réf. interne : ${esc(donation.id)}</div>
  </div>
</body>
</html>`;

  // Return HTML as string (not Uint8Array) so Cloudflare keeps the Content-Type as text/html
  return new Response(html, {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": "inline",
      "Cache-Control": "no-store",
    },
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
