import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

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

  // Look up donation by cerfa_token
  const { data: donation, error } = await supabaseAdmin
    .from("donations")
    .select("id, amount, donor_name, donor_email, donor_address, created_at, synagogue_id")
    .eq("cerfa_token", token)
    .single();

  if (error || !donation) {
    return new Response("Reçu introuvable", { status: 404 });
  }

  // Get synagogue info
  const { data: syna } = await supabaseAdmin
    .from("synagogue_profiles")
    .select("name, address, president_first_name, president_last_name, logo_url, signature")
    .eq("id", donation.synagogue_id)
    .single();

  const donDate = new Date(donation.created_at);
  const today = new Date();
  const presidentName = syna
    ? `${syna.president_first_name || ""} ${syna.president_last_name || ""}`.trim()
    : "";

  // Generate HTML CERFA receipt
  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Reçu Fiscal - CERFA</title>
  <style>
    @media print { body { margin: 0; } .no-print { display: none; } }
    body { font-family: 'Georgia', serif; max-width: 700px; margin: 40px auto; padding: 20px; color: #1a1a1a; }
    .header { text-align: center; border-bottom: 3px double #1e3a5f; padding-bottom: 20px; margin-bottom: 30px; }
    .header h1 { font-size: 22px; color: #1e3a5f; margin: 0; }
    .header p { font-size: 11px; color: #666; margin: 5px 0 0; }
    .logo { max-height: 80px; margin-bottom: 10px; }
    .section { margin-bottom: 25px; }
    .section h2 { font-size: 13px; text-transform: uppercase; color: #1e3a5f; border-bottom: 1px solid #ddd; padding-bottom: 5px; margin-bottom: 10px; }
    .section p { font-size: 12px; margin: 4px 0; line-height: 1.6; }
    .amount { font-size: 18px; font-weight: bold; color: #1e3a5f; }
    .footer { margin-top: 40px; font-size: 10px; color: #888; border-top: 1px solid #ddd; padding-top: 15px; }
    .signature { margin-top: 30px; }
    .print-btn { display: block; margin: 20px auto; padding: 12px 30px; background: #1e3a5f; color: white; border: none; border-radius: 8px; font-size: 14px; cursor: pointer; }
  </style>
</head>
<body>
  <button class="print-btn no-print" onclick="window.print()">🖨️ Imprimer / Télécharger PDF</button>
  
  <div class="header">
    ${syna?.logo_url ? `<img src="${syna.logo_url}" class="logo" alt="Logo">` : ""}
    <h1>REÇU FISCAL AU TITRE DES DONS</h1>
    <p>Cerfa n° 11580*04 — Article 200 du Code Général des Impôts</p>
  </div>

  <div class="section">
    <h2>Organisme bénéficiaire</h2>
    <p><strong>${syna?.name || "—"}</strong></p>
    <p>${syna?.address || "—"}</p>
    <p>Objet : Exercice du culte</p>
  </div>

  <div class="section">
    <h2>Donateur</h2>
    <p><strong>${donation.donor_name || "—"}</strong></p>
    <p>${donation.donor_address || "—"}</p>
    <p>Email : ${donation.donor_email}</p>
  </div>

  <div class="section">
    <h2>Informations relatives au don</h2>
    <p>Date du don : <strong>${donDate.toLocaleDateString("fr-FR")}</strong></p>
    <p>Montant : <span class="amount">${(donation.amount / 100).toFixed(2)} €</span></p>
    <p>Mode de versement : Paiement en ligne (Carte bancaire)</p>
    <p>Nature du don : Numéraire</p>
  </div>

  <div class="section">
    <p style="font-size: 11px; font-style: italic;">
      Le bénéficiaire certifie sur l'honneur que les dons et versements qu'il reçoit
      ouvrent droit à la réduction d'impôt prévue à l'article 200 du Code Général des Impôts.
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
    <p>Ce reçu est établi conformément aux dispositions des articles 200 et 238 bis du CGI.</p>
    <p>Réf. don : ${donation.id.slice(0, 8).toUpperCase()}</p>
  </div>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
});
