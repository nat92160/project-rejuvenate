import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { jsPDF } from "https://esm.sh/jspdf@2.5.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Couleurs CERFA (doré institutionnel)
const GOLD: [number, number, number] = [153, 101, 21];      // #996515
const GOLD_DARK: [number, number, number] = [107, 72, 16];  // #6b4810
const GOLD_LIGHT_BG: [number, number, number] = [255, 248, 232]; // #fff8e8
const CREAM_BG: [number, number, number] = [255, 253, 247]; // #fffdf7
const TEXT: [number, number, number] = [42, 42, 42];        // #2a2a2a
const BORDER_LIGHT: [number, number, number] = [224, 198, 147]; // #e0c693
const RED_WARN: [number, number, number] = [184, 65, 15];   // #b8410f

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

  let cerfaNumber = donation.cerfa_number as string | null;
  if (!cerfaNumber) {
    const { data: assigned } = await supabaseAdmin.rpc("assign_cerfa_number", { _donation_id: donation.id });
    if (typeof assigned === "string") cerfaNumber = assigned;
  }

  const donDate = new Date(donation.created_at);
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

  const article200Checked = articleCgi.includes("200");
  const article238Checked = articleCgi.includes("238");
  const article978Checked = articleCgi.includes("978");

  const isCompany = donation.donor_type === "societe";
  const donorDisplayName = isCompany
    ? (donation.donor_company_name || donation.donor_name || "—")
    : `M ou Mme ${(donation.donor_name || "—").toUpperCase()}`;

  const rnaSiret = syna?.rna_number || syna?.siret_number || "";
  const missingLegalInfo = !rnaSiret || !syna?.association_legal_name;

  // ====== PDF GENERATION ======
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });

  // Patch global : jsPDF (helvetica) ne supporte que WinAnsi/latin1.
  // On translittère tout texte pour éviter les � sur œ, apostrophes typo, etc.
  const origText = doc.text.bind(doc);
  (doc as any).text = function (text: any, ...rest: any[]) {
    const safe = Array.isArray(text) ? text.map(toLatin1) : toLatin1(text);
    return origText(safe, ...rest);
  };

  const pageW = 210;
  const margin = 8;
  const frameX = margin;
  const frameW = pageW - margin * 2;
  let y = margin;

  doc.setFont("helvetica", "normal");

  // ========== WARNING (si infos manquantes) ==========
  if (missingLegalInfo) {
    doc.setFillColor(255, 250, 242);
    doc.setDrawColor(217, 168, 95);
    doc.setLineWidth(0.3);
    doc.roundedRect(frameX, y, frameW, 8, 1.5, 1.5, "FD");
    doc.setTextColor(...GOLD_DARK);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text(
      "Informations legales incompletes (RNA/SIRET ou denomination manquant). Recu non valide fiscalement.",
      pageW / 2,
      y + 5.2,
      { align: "center" }
    );
    y += 10;
  }

  // ========== CADRE PRINCIPAL ==========
  const frameStartY = y;
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.5);

  // ========== TOP HEADER (logo cerfa | titre | N° d'ordre) ==========
  const topH = 24;
  doc.setFillColor(...CREAM_BG);
  doc.rect(frameX, y, frameW, topH, "F");

  // Colonne gauche : "2041-RD" + bulle cerfa + "N° 11580*05"
  const leftColX = frameX + 4;
  const leftColW = 50;
  doc.setTextColor(...GOLD_DARK);
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.text("2041-RD", leftColX + leftColW / 2, y + 4.5, { align: "center" });

  // Bulle CERFA
  const bubbleW = 28;
  const bubbleH = 7;
  const bubbleX = leftColX + (leftColW - bubbleW) / 2;
  const bubbleY = y + 7;
  doc.setFillColor(...GOLD_LIGHT_BG);
  doc.setDrawColor(...GOLD_DARK);
  doc.setLineWidth(0.6);
  doc.roundedRect(bubbleX, bubbleY, bubbleW, bubbleH, 3.5, 3.5, "FD");
  doc.setFontSize(11);
  doc.setFont("helvetica", "bolditalic");
  doc.setTextColor(...GOLD_DARK);
  doc.text("cerfa", bubbleX + bubbleW / 2, bubbleY + 5, { align: "center" });

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.text("N° 11580*05", leftColX + leftColW / 2, y + 19, { align: "center" });

  // Colonne centrale : titre
  doc.setTextColor(...TEXT);
  doc.setFontSize(9.5);
  doc.setFont("helvetica", "bold");
  const titleLines = [
    "Recu des dons et versements",
    "effectues par les particuliers au titre",
    "des articles 200 et 978 du code",
    "general des impots",
  ];
  const centerX = pageW / 2;
  let titleY = y + 6;
  titleLines.forEach((line) => {
    doc.text(line, centerX, titleY, { align: "center" });
    titleY += 4;
  });

  // Colonne droite : N° d'ordre
  const rightColX = frameX + frameW - 4;
  doc.setTextColor(...GOLD);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("N° d'ordre du recu", rightColX, y + 9, { align: "right" });
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(finalCerfaNumber, rightColX, y + 14.5, { align: "right" });

  // Ligne de séparation top header
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.5);
  doc.line(frameX, y + topH, frameX + frameW, y + topH);
  y += topH;

  // ========== DONOR HEADER (logo synagogue + adresse donateur) ==========
  const donorBarH = 22;
  doc.setFillColor(255, 255, 255);
  doc.rect(frameX, y, frameW, donorBarH, "F");

  // Logo synagogue (à gauche, sans image — juste nom)
  const logoColX = frameX;
  const logoColW = 50;
  doc.setTextColor(...GOLD);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  const synaName = syna?.name || legalName;
  const wrappedSyna = doc.splitTextToSize(synaName, logoColW - 6);
  doc.text(wrappedSyna, logoColX + logoColW / 2, y + 11, { align: "center", maxWidth: logoColW - 6 });

  // Bloc adresse donateur
  const donorX = frameX + logoColW + 2;
  const donorW = frameW - logoColW - 4;
  doc.setTextColor(...TEXT);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text(donorDisplayName, donorX, y + 6);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  const addrLines = doc.splitTextToSize(donation.donor_address || "—", donorW - 4);
  doc.text(addrLines, donorX, y + 11);
  doc.text(`Courriel : ${donation.donor_email}`, donorX, y + 11 + (addrLines.length * 4));

  // Séparateur
  doc.setDrawColor(...BORDER_LIGHT);
  doc.setLineWidth(0.2);
  doc.line(frameX, y + donorBarH, frameX + frameW, y + donorBarH);
  y += donorBarH;

  // ========== SECTION TITLE: BENEFICIAIRE ==========
  y = drawSectionTitle(doc, "BENEFICIAIRE DU DON", frameX, y, frameW);

  // ========== Grid Bénéficiaire ==========
  const rows1: Array<[string, string, boolean]> = [
    ["NOM OU DENOMINATION :", legalName, false],
    ["Numero SIREN ou RNA :", rnaSiret || "A COMPLETER (config CERFA)", !rnaSiret],
    ["ADRESSE ASSOCIATION :", syna?.address || "—", false],
    ["OBJET :", associationObject, false],
    ["QUALITE DE L'ORGANISME :", organismQuality, false],
  ];
  y = drawGrid(doc, rows1, frameX, y, frameW);

  // ========== MONTANT ==========
  const amountH = 22;
  doc.setFillColor(...CREAM_BG);
  doc.rect(frameX, y, frameW, amountH, "F");
  doc.setTextColor(...TEXT);
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  const amtIntro = doc.splitTextToSize(
    "Le beneficiaire reconnait avoir recu au titre des dons et versements ouvrant droit a reduction d'impot, la somme de",
    frameW - 16
  );
  let amtY = y + 5;
  amtIntro.forEach((line: string) => {
    doc.text(line, pageW / 2, amtY, { align: "center" });
    amtY += 4;
  });

  // Pill montant
  const amountStr = `***${amountEuros.toFixed(2).replace(/\.00$/, "")} Euros*** (${amountInWords} euros)`;
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  const pillTextW = doc.getTextWidth(amountStr);
  const pillW = Math.min(pillTextW + 16, frameW - 20);
  const pillH = 7;
  const pillX = (pageW - pillW) / 2;
  const pillY = y + amountH - pillH - 2;
  doc.setDrawColor(...GOLD);
  doc.setFillColor(255, 255, 255);
  doc.setLineWidth(0.5);
  doc.roundedRect(pillX, pillY, pillW, pillH, 1, 1, "FD");
  doc.setTextColor(...GOLD);
  // Si trop long, réduire la police
  let amtFontSize = 10;
  while (doc.getTextWidth(amountStr) > pillW - 8 && amtFontSize > 6) {
    amtFontSize -= 0.5;
    doc.setFontSize(amtFontSize);
  }
  doc.text(amountStr, pageW / 2, pillY + pillH / 2 + 1.5, { align: "center" });

  doc.setDrawColor(...BORDER_LIGHT);
  doc.setLineWidth(0.2);
  doc.line(frameX, y + amountH, frameX + frameW, y + amountH);
  y += amountH;

  // ========== SECTION TITLE: DONATEUR ==========
  y = drawSectionTitle(doc, "DONATEUR", frameX, y, frameW);

  const rows2: Array<[string, string, boolean]> = [
    ["NOM OU DENOMINATION :", donorDisplayName, false],
    ["ADRESSE DONATEUR :", donation.donor_address || "—", false],
  ];
  y = drawGrid(doc, rows2, frameX, y, frameW);

  // ========== CHECKBOXES ==========
  const checksStartY = y;
  doc.setFillColor(255, 255, 255);
  // Hauteur estimée
  const checksH = 38;
  doc.rect(frameX, y, frameW, checksH, "F");

  doc.setTextColor(...TEXT);
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "bold");
  const certifyLines = [
    "Le beneficiaire certifie sur l'honneur que les dons et versements qu'il recoit",
    "ouvrent droit a la reduction d'impot prevue a l'article",
  ];
  let cy = y + 4.5;
  certifyLines.forEach((line) => {
    doc.text(line, pageW / 2, cy, { align: "center" });
    cy += 4;
  });

  // Row articles
  cy += 2;
  const articleItems: Array<[boolean, string]> = [
    [article200Checked, "200 du CGI"],
    [article238Checked, "238 bis du CGI"],
    [article978Checked, "978 du CGI"],
  ];
  drawCheckRow(doc, articleItems, frameX + 6, cy, frameW - 12);
  cy += 7;

  // Forme du don
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...GOLD);
  doc.text("Forme du don", frameX + 6, cy);
  // Soulignement
  const ftw = doc.getTextWidth("Forme du don");
  doc.setLineWidth(0.2);
  doc.setDrawColor(...GOLD);
  doc.line(frameX + 6, cy + 0.8, frameX + 6 + ftw, cy + 0.8);
  cy += 4;
  drawCheckRow(doc, [
    [false, "Acte authentique"],
    [false, "Acte sous seing prive"],
    [true, "Declaration de don manuel"],
    [false, "Autres"],
  ], frameX + 6, cy, frameW - 12);
  cy += 7;

  // Nature du don
  doc.setTextColor(...GOLD);
  doc.setFont("helvetica", "bold");
  doc.text("Nature du don", frameX + 6, cy);
  const ntw = doc.getTextWidth("Nature du don");
  doc.line(frameX + 6, cy + 0.8, frameX + 6 + ntw, cy + 0.8);
  cy += 4;
  drawCheckRow(doc, [
    [true, "Numeraire"],
    [false, "Titres de societes cotees"],
    [false, "Autres"],
  ], frameX + 6, cy, frameW - 12);
  cy += 5;

  const checksRealH = cy - checksStartY;
  doc.setDrawColor(...BORDER_LIGHT);
  doc.setLineWidth(0.2);
  doc.line(frameX, checksStartY + checksRealH, frameX + frameW, checksStartY + checksRealH);
  y = checksStartY + checksRealH;

  // ========== FOOTER (mode + date + signature) ==========
  const footerH = 28;
  doc.setFillColor(...CREAM_BG);
  doc.rect(frameX, y, frameW, footerH, "F");

  // Gauche : mode de versement
  doc.setTextColor(...TEXT);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Mode de versement : ", frameX + 6, y + 8);
  const mvw = doc.getTextWidth("Mode de versement : ");
  doc.setFont("helvetica", "bold");
  doc.text("CB", frameX + 6 + mvw, y + 8);

  // Droite : date + signature
  const rxRight = frameX + frameW - 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text("Date et signature", rxRight, y + 5, { align: "right" });
  doc.setFont("helvetica", "bold");
  const dateStr = donDate.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  doc.text(dateStr, rxRight, y + 10, { align: "right" });
  if (presidentName) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(...GOLD_DARK);
    doc.text(`M. ${presidentName}, President :`, rxRight, y + 14.5, { align: "right" });
  }
  // Signature texte si pas d'image
  if (syna?.signature) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(11);
    doc.setTextColor(...GOLD_DARK);
    doc.text(syna.signature, rxRight, y + 22, { align: "right" });
  }

  doc.setDrawColor(...BORDER_LIGHT);
  doc.setLineWidth(0.2);
  doc.line(frameX, y + footerH, frameX + frameW, y + footerH);
  y += footerH;

  // ========== FOOTER MENTION ==========
  doc.setTextColor(...GOLD);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("RECU CERFA GENERE PAR CHABBAT CHALOM", pageW / 2, y + 6, { align: "center" });

  doc.setTextColor(136, 136, 136);
  doc.setFontSize(7);
  doc.setFont("helvetica", "italic");
  doc.text(
    `Article ${articleCgi} du Code General des Impots — Ref. interne : ${donation.id}`,
    pageW / 2,
    y + 11,
    { align: "center" }
  );
  y += 14;

  // ========== CADRE EXTERIEUR (englobe tout) ==========
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.6);
  doc.rect(frameX, frameStartY, frameW, y - frameStartY);

  // Output - jsPDF retourne du latin1 (WinAnsi), conversion en bytes
  const pdfString = doc.output();
  const pdfBytes = new Uint8Array(pdfString.length);
  for (let i = 0; i < pdfString.length; i++) {
    pdfBytes[i] = pdfString.charCodeAt(i) & 0xff;
  }

  return new Response(pdfBytes, {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="cerfa-don-${finalCerfaNumber.replace(/\//g, "-")}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
});

// ====== HELPERS ======

function drawSectionTitle(doc: any, title: string, x: number, y: number, w: number): number {
  const h = 6.5;
  doc.setFillColor(...GOLD);
  doc.rect(x, y, w, h, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text(title, x + w / 2, y + h / 2 + 1.5, { align: "center" });
  return y + h;
}

function drawGrid(
  doc: any,
  rows: Array<[string, string, boolean]>,
  x: number,
  y: number,
  w: number
): number {
  const labelW = 55;
  const valueW = w - labelW;
  const padX = 3;
  const lineH = 4.2;

  rows.forEach(([label, value, missing], idx) => {
    // Calculer la hauteur dynamique selon le wrap
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    const valueLines = doc.splitTextToSize(value, valueW - padX * 2);
    const rowH = Math.max(7, valueLines.length * lineH + 2.5);

    // BG label
    doc.setFillColor(...CREAM_BG);
    doc.rect(x, y, labelW, rowH, "F");
    // BG value
    doc.setFillColor(255, 255, 255);
    doc.rect(x + labelW, y, valueW, rowH, "F");

    // Texte label
    doc.setTextColor(...GOLD_DARK);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text(label, x + padX, y + 4.5);

    // Texte value
    if (missing) {
      doc.setTextColor(...RED_WARN);
      doc.setFont("helvetica", "bold");
    } else {
      doc.setTextColor(...TEXT);
      doc.setFont("helvetica", "normal");
    }
    doc.setFontSize(8.5);
    doc.text(valueLines, x + labelW + padX, y + 4.5);

    // Bordure basse (sauf dernière)
    if (idx < rows.length - 1) {
      doc.setDrawColor(240, 226, 195); // #f0e2c3
      doc.setLineWidth(0.15);
      doc.line(x, y + rowH, x + w, y + rowH);
    }

    y += rowH;
  });

  // Bordure basse finale plus marquée
  doc.setDrawColor(...BORDER_LIGHT);
  doc.setLineWidth(0.2);
  doc.line(x, y, x + w, y);

  return y;
}

function drawCheckRow(
  doc: any,
  items: Array<[boolean, string]>,
  x: number,
  y: number,
  maxW: number,
) {
  const boxSize = 3.2;
  const gapBoxLabel = 1.5;
  const gapItems = 5;
  let cursorX = x;

  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...TEXT);

  items.forEach(([checked, label]) => {
    // Box
    doc.setDrawColor(...GOLD);
    doc.setLineWidth(0.3);
    doc.setFillColor(255, 255, 255);
    doc.rect(cursorX, y - boxSize + 0.5, boxSize, boxSize, "FD");

    if (checked) {
      doc.setTextColor(...GOLD);
      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      doc.text("X", cursorX + boxSize / 2, y - 0.5, { align: "center" });
      doc.setFontSize(8.5);
      doc.setFont("helvetica", "normal");
    }

    // Label
    doc.setTextColor(...TEXT);
    const labelX = cursorX + boxSize + gapBoxLabel;
    doc.text(label, labelX, y);
    cursorX = labelX + doc.getTextWidth(label) + gapItems;

    // Wrap si dépasse (simple)
    if (cursorX > x + maxW) {
      cursorX = x;
      y += 5;
    }
  });
}

// Number to French words
function numberToFrenchWords(n: number): string {
  if (n === 0) return "zero";
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
  return result.trim() || "zero";
}
