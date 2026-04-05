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

export function processAmidaVerses(
  verses: string[],
  ctx: LiturgicalPeriod
): { html: string; isActive: boolean; isSeasonalMarker: boolean; isInstruction: boolean }[] {
  const result: { html: string; isActive: boolean; isSeasonalMarker: boolean; isInstruction: boolean }[] = [];
  let currentPeriodActive: boolean | null = null;

  for (const verse of verses) {
    const smallMatch = verse.match(/^<small>(.*?)<\/small>$/);
    if (smallMatch) {
      const content = smallMatch[1].replace(/:/g, '').trim();
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

    const inlineSmallMatch = verse.match(/^<small>(.*?)<\/small>\s*(.*)/s);
    if (inlineSmallMatch) {
      const markerContent = inlineSmallMatch[1].replace(/:/g, '').trim();
      let isMarker = false;
      for (const [marker, checker] of Object.entries(SEFARIA_PERIOD_MARKERS)) {
        if (markerContent.includes(marker)) {
          currentPeriodActive = checker(ctx);
          isMarker = true;
          break;
        }
      }
      if (isMarker) {
        result.push({ html: verse, isActive: currentPeriodActive!, isSeasonalMarker: true, isInstruction: false });
        continue;
      }
    }

    if (currentPeriodActive !== null) {
      result.push({ html: verse, isActive: currentPeriodActive, isSeasonalMarker: false, isInstruction: false });
      currentPeriodActive = null;
    } else {
      result.push({ html: verse, isActive: true, isSeasonalMarker: false, isInstruction: false });
    }
  }
  return result;
}
