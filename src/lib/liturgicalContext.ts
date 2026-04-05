// ============================================================
// LITURGICAL CONTEXT — Détection automatique de la période
// Sources : Choul'han Aroukh, Michna Broura
// ============================================================

import { HDate, HebrewCalendar } from '@hebcal/core';

export interface LiturgicalPeriod {
  // Guévourot (2e brakha Amida)
  mashivHaRouach: boolean;  // hiver : Chemini Atsèret → veille Pessach
  moridHaTal: boolean;      // été : Pessach → Chemini Atsèret

  // Birkat HaChanim (9e brakha Amida)
  vetenTalOuMatar: boolean; // hiver : ~4 déc → veille Pessach (diaspora)
  vetenBerakha: boolean;    // été

  // Asèrèt Yémé Téchouva
  aseretYemeiTeshuva: boolean;

  // Jours spéciaux
  roshHodesh: boolean;
  holHaMoed: boolean;
  holHaMoedPessach: boolean;
  holHaMoedSukkot: boolean;
  hanoucca: boolean;
  pourim: boolean;
  yomTov: boolean;
  shabbat: boolean;

  // Label lisible
  periodLabel: string;
  activeInserts: string[];
}

/**
 * Détermine la période liturgique pour une date donnée.
 * Par défaut : diaspora (coutume de France).
 */
export function getLiturgicalContext(date: Date = new Date()): LiturgicalPeriod {
  const hd = new HDate(date);
  const month = hd.getMonth(); // Nisan=1, Tishrei=7, etc.
  const day = hd.getDate();
  const dow = date.getDay(); // 0=dim, 6=sam

  // ── Guévourot ──
  // Mashiv HaRouach : de 22 Tishrei (Chemini Atsèret) à 14 Nisan inclus
  // Morid HaTal : de 15 Nisan à 21 Tishrei inclus
  const isWinterGuevourot = isHebrewDateInRange(month, day, 7, 22, 1, 14);
  const mashivHaRouach = isWinterGuevourot;
  const moridHaTal = !mashivHaRouach;

  // ── Birkat HaChanim ──
  const civilMonth = date.getMonth(); // 0-based, décembre = 11
  const civilDay = date.getDate();
  
  const vetenTalOuMatarSimple = (() => {
    // Période : ~4-5 décembre → 14 Nisan
    if (month === 1 && day <= 14) return true; // Nisan avant Pessach
    if (month >= 8 || month === 7) { // Cheshvan/Tishrei
       // Vérification simple pour le début de l'hiver civil
       if (civilMonth === 11 && civilDay >= 5) return true;
       if (civilMonth === 0 || civilMonth === 1 || civilMonth === 2) return true;
    }
    return false;
  })();

  const vetenBerakha = !vetenTalOuMatarSimple;

  // ── Asèrèt Yémé Téchouva : 1-10 Tishrei ──
  const aseretYemeiTeshuva = month === 7 && day >= 1 && day <= 10;

  // ── Détection via HebrewCalendar ──
  const events = HebrewCalendar.getHolidaysOnDate(hd) || [];
  const descs = events.map(e => e.getDesc().toLowerCase());

  const roshHodesh = descs.some(d => d.includes('rosh chodesh'));
  const holHaMoedPessach = descs.some(d => d.includes("pesach") && d.includes("ch''m"));
  const holHaMoedSukkot = descs.some(d => d.includes("sukkot") && d.includes("ch''m"));
  const holHaMoed = holHaMoedPessach || holHaMoedSukkot;
  const hanoucca = descs.some(d => d.includes('chanukah') || d.includes('hanukkah'));
  const pourim = descs.some(d => d === 'purim');
  const yomTov = descs.some(d => 
    (d.includes('pesach') || d.includes('shavuot') || d.includes('sukkot') || 
     d.includes('rosh hashana') || d.includes('yom kippur') || d.includes('shmini atzeret') ||
     d.includes('simchat torah')) && 
    !d.includes("ch''m") && !d.includes('erev')
  );
  const shabbat = dow === 6;

  // ── Labels ──
  const activeInserts: string[] = [];
  if (mashivHaRouach) activeInserts.push("משיב הרוח ומוריד הגשם");
  if (moridHaTal) activeInserts.push("מוריד הטל");
  if (vetenTalOuMatarSimple) activeInserts.push("ותן טל ומטר");
  if (vetenBerakha) activeInserts.push("ותן ברכה");
  if (aseretYemeiTeshuva) activeInserts.push("עשי״ת");
  if (roshHodesh) activeInserts.push("ראש חודש — יעלה ויבוא");
  if (holHaMoed) activeInserts.push("חול המועד — יעלה ויבוא");
  if (hanoucca) activeInserts.push("חנוכה — על הנסים");
  if (pourim) activeInserts.push("פורים — על הנסים");

  const periodLabel = mashivHaRouach ? "Période d'hiver (משיב הרוח)" : "Période d'été (מוריד הטל)";

  return {
    mashivHaRouach,
    moridHaTal,
    vetenTalOuMatar: vetenTalOuMatarSimple,
    vetenBerakha,
    aseretYemeiTeshuva,
    roshHodesh,
    holHaMoed,
    holHaMoedPessach,
    holHaMoedSukkot,
    hanoucca,
    pourim,
    yomTov,
    shabbat,
    periodLabel,
    activeInserts,
  };
}

function isHebrewDateInRange(
  month: number, day: number,
  startMonth: number, startDay: number,
  endMonth: number, endDay: number
): boolean {
  const normalize = (m: number, d: number) => m * 100 + d;
  const current = normalize(month, day);
  const start = normalize(startMonth, startDay);
  const end = normalize(endMonth, endDay);

  if (start <= end) {
    return current >= start && current <= end;
  } else {
    return current >= start || current <= end;
  }
}

export const SEFARIA_PERIOD_MARKERS: Record<string, (ctx: LiturgicalPeriod) => boolean> = {
  "בקיץ": (ctx) => ctx.moridHaTal,
  "בחורף": (ctx) => ctx.mashivHaRouach,
  "בימות החמה": (ctx) => ctx.vetenBerakha,
  "בימות הגשמים": (ctx) => ctx.vetenTalOuMatar,
  "בעשי\"ת": (ctx) => ctx.aseretYemeiTeshuva,
  "בעשרת ימי תשובה": (ctx) => ctx.aseretYemeiTeshuva,
};

/**
 * Process Amida verses with liturgical context.
 * Handles several Sefaria patterns:
 * 1. Pure marker: `<small>בקיץ:</small>` (standalone line)
 * 2. Marker + text: `<small>בקיץ:</small> מוריד הטל`
 * 3. Combined line: `<small>בקיץ:</small> מוריד הטל. <small>בחורף:</small> משיב הרוח`
 * 4. Nested inline: `<small><small>בעשי"ת:</small> זכרנו...</small>` (conditional insert within a verse)
 * 5. Hazara block: `<small>בחזרת הש"ץ אומרים</small>` followed by `<small>...</small>` (repetition-only)
 */
export function processAmidaVerses(
  verses: string[],
  ctx: LiturgicalPeriod
): { html: string; isActive: boolean; isSeasonalMarker: boolean; isInstruction: boolean }[] {
  const result: { html: string; isActive: boolean; isSeasonalMarker: boolean; isInstruction: boolean }[] = [];
  let currentPeriodActive: boolean | null = null;

  for (const verse of verses) {
    // ── Pattern 3: Combined line with multiple markers ──
    // e.g. `<small>בקיץ:</small> מוריד הטל. <small>בחורף:</small> משיב הרוח`
    const multiMarkerPattern = /<small>[^<]*<\/small>\s*[^<]+<small>[^<]*<\/small>/;
    if (multiMarkerPattern.test(verse)) {
      // Split into segments by <small>...</small> markers
      const segments: { marker: string; text: string }[] = [];
      const regex = /<small>(.*?)<\/small>\s*([^<]*)/g;
      let m: RegExpExecArray | null;
      while ((m = regex.exec(verse)) !== null) {
        segments.push({ marker: m[1].replace(/:/g, '').trim(), text: m[2].trim() });
      }

      if (segments.length >= 2) {
        let foundActive = false;
        for (const seg of segments) {
          for (const [marker, checker] of Object.entries(SEFARIA_PERIOD_MARKERS)) {
            if (seg.marker.includes(marker) && checker(ctx) && seg.text) {
              result.push({ html: seg.text, isActive: true, isSeasonalMarker: false, isInstruction: false });
              foundActive = true;
              break;
            }
          }
        }
        if (foundActive) continue;
        // Fallback: show first segment
        if (segments[0]?.text) {
          result.push({ html: segments[0].text, isActive: true, isSeasonalMarker: false, isInstruction: false });
        }
        continue;
      }
    }

    // ── Pattern 4: Inline conditional within a verse ──
    // e.g. `...מגן אברהם: <small><small>בעשרת ימי תשובה אומרים:</small> זכרנו לחיים...</small> מלך עוזר...`
    const inlineConditionalPattern = /<small><small>(.*?)<\/small>\s*(.*?)<\/small>/gs;
    if (inlineConditionalPattern.test(verse)) {
      inlineConditionalPattern.lastIndex = 0;
      let processed = verse;
      let hasConditional = false;
      let m: RegExpExecArray | null;
      while ((m = inlineConditionalPattern.exec(verse)) !== null) {
        const markerText = m[1].replace(/:/g, '').trim();
        const conditionalText = m[2].trim();
        hasConditional = true;
        let isActive = false;
        for (const [marker, checker] of Object.entries(SEFARIA_PERIOD_MARKERS)) {
          if (markerText.includes(marker)) {
            isActive = checker(ctx);
            break;
          }
        }
        if (!isActive) {
          // Remove the entire conditional block
          processed = processed.replace(m[0], '');
        } else {
          // Keep only the text, remove the markers
          processed = processed.replace(m[0], ` <b>${conditionalText}</b> `);
        }
      }
      if (hasConditional) {
        processed = processed.replace(/\s+/g, ' ').trim();
        result.push({ html: processed, isActive: true, isSeasonalMarker: false, isInstruction: false });
        continue;
      }
    }

    // ── Pattern 1: Pure small marker line ──
    const pureSmallMatch = verse.match(/^<small>(.*?)<\/small>\s*$/s);
    if (pureSmallMatch) {
      const content = pureSmallMatch[1].replace(/:/g, '').trim();
      let isMarker = false;

      for (const [marker, checker] of Object.entries(SEFARIA_PERIOD_MARKERS)) {
        if (content.includes(marker)) {
          currentPeriodActive = checker(ctx);
          isMarker = true;
          break;
        }
      }

      if (isMarker) {
        result.push({ html: verse, isActive: currentPeriodActive!, isSeasonalMarker: true, isInstruction: false });
      } else {
        result.push({ html: verse, isActive: true, isSeasonalMarker: false, isInstruction: true });
      }
      continue;
    }

    // ── Pattern 2: Marker + text on same line ──
    const leadingMatch = verse.match(/^<small>(.*?)<\/small>\s*(.+)$/s);
    if (leadingMatch) {
      const markerContent = leadingMatch[1].replace(/:/g, '').trim();
      const textContent = leadingMatch[2].trim();
      let matched = false;

      for (const [marker, checker] of Object.entries(SEFARIA_PERIOD_MARKERS)) {
        if (markerContent.includes(marker)) {
          result.push({
            html: textContent,
            isActive: checker(ctx),
            isSeasonalMarker: false,
            isInstruction: false,
          });
          currentPeriodActive = null;
          matched = true;
          break;
        }
      }
      if (matched) continue;
    }

    // ── Regular verse with pending period state ──
    if (currentPeriodActive !== null) {
      result.push({ html: verse, isActive: currentPeriodActive, isSeasonalMarker: false, isInstruction: false });
      currentPeriodActive = null;
    } else {
      result.push({ html: verse, isActive: true, isSeasonalMarker: false, isInstruction: false });
    }
  }

  return result;
}
