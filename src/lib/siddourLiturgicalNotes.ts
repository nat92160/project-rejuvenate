import { HDate, HebrewCalendar, flags } from "@hebcal/core";

/**
 * Notes liturgiques contextuelles affichées dans le Siddour.
 * Détecte les passages "à choix" (selon période / occasion) et propose
 * une consigne en français pour le lecteur, calée sur la date hébraïque du jour.
 *
 * NB: les règles diffèrent légèrement entre rite Séfarade et Ashkénaze.
 *  - Pluie/rosée : du Moussaf de Shemini Atseret au Moussaf du 1er jour de Pessa'h
 *      → on dit "Mashiv HaRouah'" (et "Morid HaGuéchèm" en saison des pluies).
 *      Le reste de l'année :
 *        Sefarade   → "Morid HaTal"
 *        Ashkenaz   → on omet (rien à dire)
 *  - Tal U'Matar (Birkat haChanim) :
 *      En Israël : du 7 'Hechvan au 15 Nissan
 *      En diaspora : du 4/5 décembre au 15 Nissan
 *      Hors période → "VeTen Berakha"
 */

export type Rite = "sefarade" | "ashkenaz";

function stripNikud(s: string): string {
  return s.replace(/[\u0591-\u05C7]/g, "");
}

function joinSection(hebrew: string[]): string {
  return stripNikud(
    hebrew.map(h => h.replace(/<[^>]+>/g, " ")).join(" ")
  ).replace(/\s+/g, " ");
}

function containsAny(haystack: string, needles: string[]): boolean {
  return needles.some(n => haystack.includes(stripNikud(n)));
}

// ─── Détection période ───

export interface LiturgicalPeriod {
  hdate: HDate;
  isInIsrael: boolean;
  // Pluie / rosée
  rainSeason: boolean; // entre Shemini Atseret et 1er jour Pessa'h
  // Tal Umatar dans la 9ᵉ brakha
  talUmatar: boolean;
  // Roch 'Hodech aujourd'hui
  isRoshChodesh: boolean;
  // 'Hol haMo'ed
  isCholHamoed: boolean;
  // Yom Tov
  isYomTov: boolean;
  // 'Hanouka
  isHanukkah: boolean;
  // Pourim (14 Adar / Adar II)
  isPurim: boolean;
  // Jeûne public
  isFastDay: boolean;
  // Jour sans Ta'hanoun
  skipTahanun: boolean;
  // Hallel
  hallel: "none" | "half" | "full";
  // Aseret Yemei Techouva (Roch HaChana → Yom Kippour)
  isAseretYemeiTeshuva: boolean;
  // Erev Pessah, 'Hol haMo'ed Pessa'h, Erev Yom Kippour → on omet Mizmor LeToda
  skipMizmorLetoda: boolean;
  // Lundi ou jeudi (Ta'hanoun étendu : Vehou Rahoum + 13 Middot)
  isMondayOrThursday: boolean;
  // Jour de Mussaf
  hasMussaf: boolean;
  // Période de l'Omer (entre Pessa'h et Chavou'ot)
  isOmer: boolean;
}

function isBetweenHebrewDates(hd: HDate, fromMonth: number, fromDay: number, toMonth: number, toDay: number): boolean {
  // Compare via abs days (gère le passage d'année hébraïque)
  const year = hd.getFullYear();
  // si la période passe l'année (ex: Tichri → Nissan), on ajuste
  let from = new HDate(fromDay, fromMonth, year);
  let to = new HDate(toDay, toMonth, year);
  if (to.abs() < from.abs()) {
    // période chevauche : si on est avant "to" → from = year-1
    if (hd.abs() <= to.abs()) {
      from = new HDate(fromDay, fromMonth, year - 1);
    } else {
      to = new HDate(toDay, toMonth, year + 1);
    }
  }
  return hd.abs() >= from.abs() && hd.abs() <= to.abs();
}

function getEvents(hd: HDate, il: boolean) {
  return HebrewCalendar.getHolidaysOnDate(hd, il) || [];
}

export function detectPeriod(now: Date = new Date(), inIsrael = false): LiturgicalPeriod {
  const hd = new HDate(now);
  const events = getEvents(hd, inIsrael);
  const desc = events.map(e => e.getDesc().toLowerCase());
  const has = (k: string) => desc.some(d => d.includes(k));

  // Saison pluie : 22 Tichri (Shemini Atseret) → 15 Nissan inclus
  const rainSeason = isBetweenHebrewDates(hd, 7 /*Tishrei*/, 22, 1 /*Nisan*/, 15);

  // Tal Umatar : 7 'Hechvan → 15 Nissan (Israël). Diaspora ~ 5 décembre → 15 Nissan.
  let talUmatar: boolean;
  if (inIsrael) {
    talUmatar = isBetweenHebrewDates(hd, 8 /*Cheshvan*/, 7, 1 /*Nisan*/, 15);
  } else {
    // Approx diaspora : du 5 décembre (greg) au 15 Nissan
    const dec5 = new Date(now.getFullYear(), 11, 5);
    const passover = new HDate(15, 1, hd.getFullYear()).greg();
    talUmatar = (now >= dec5 || now <= passover);
  }

  const isRoshChodesh = has("rosh chodesh") || hd.getDate() === 30 || hd.getDate() === 1;
  const isCholHamoed = events.some(e => e.getFlags() & flags.CHOL_HAMOED);
  const isYomTov = events.some(e => e.getFlags() & flags.CHAG);
  const isHanukkah = has("chanukah") || has("hanukkah");
  const isPurim = has("purim") && !has("shushan");
  const isFastDay = events.some(e => e.getFlags() & flags.MINOR_FAST) ||
                    events.some(e => e.getFlags() & flags.MAJOR_FAST);

  // Tahanoun sauté : Chabbat, Roch 'Hodech, Hanouka, Pourim, Yom Tov, 'Hol haMo'ed,
  // mois de Nissan, 15 Av/Chevat, Lag Ba'omer, Tou Bichvat, Yom Yeroushalayim/Atsmaout, etc.
  const dow = hd.getDay();
  const skipTahanun =
    dow === 6 || // Chabbat
    isRoshChodesh ||
    isYomTov ||
    isCholHamoed ||
    isHanukkah ||
    isPurim ||
    hd.getMonth() === 1 || // Nissan entier
    has("lag baomer") ||
    has("tu bishvat") ||
    has("tu b'av") ||
    has("yom ha'atzmaut") ||
    has("yom yerushalayim");

  const hallel: LiturgicalPeriod["hallel"] =
    has("pesach i") || has("pesach ii") || has("shavuot") || has("sukkot i") || has("sukkot ii") ||
    has("shmini") || isHanukkah
      ? "full"
      : isRoshChodesh || isCholHamoed
      ? "half"
      : "none";

  // Aseret Yemei Techouva : 1 Tichri (R.H.) → 10 Tichri (Yom Kippour) inclus
  const isAseretYemeiTeshuva = hd.getMonth() === 7 && hd.getDate() <= 10;

  // Mizmor LeToda omis : Chabbat, Yom Tov, 'Hol haMo'ed Pessa'h, Erev Pessa'h, Erev Yom Kippour
  const isErevPesach = hd.getMonth() === 1 && hd.getDate() === 14;
  const isErevYomKippur = hd.getMonth() === 7 && hd.getDate() === 9;
  const isCholHamoedPesach = isCholHamoed && hd.getMonth() === 1;
  const skipMizmorLetoda =
    dow === 6 || isYomTov || isCholHamoedPesach || isErevPesach || isErevYomKippur;

  const isMondayOrThursday = dow === 1 || dow === 4;

  const hasMussaf =
    dow === 6 || // Chabbat
    isRoshChodesh ||
    isYomTov ||
    isCholHamoed;

  // Omer : 16 Nissan → 5 Sivan
  const isOmer = (hd.getMonth() === 1 && hd.getDate() >= 16) ||
                 (hd.getMonth() === 2) ||
                 (hd.getMonth() === 3 && hd.getDate() <= 5);

  return {
    hdate: hd,
    isInIsrael: inIsrael,
    rainSeason,
    talUmatar,
    isRoshChodesh,
    isCholHamoed,
    isYomTov,
    isHanukkah,
    isPurim,
    isFastDay,
    skipTahanun,
    hallel,
    isAseretYemeiTeshuva,
    skipMizmorLetoda,
    isMondayOrThursday,
    hasMussaf,
    isOmer,
  };
}

// ─── Règles de notes ───

export interface LiturgicalNote {
  id: string;
  /** "info" classique ou "warn" si à ne pas oublier (Tal Umatar p.ex.) */
  tone: "info" | "warn" | "fete";
  title: string;
  body: string;
  /** Variante hébraïque à dire aujourd'hui */
  todaySay?: string;
}

interface Rule {
  id: string;
  patterns: string[]; // motifs hébraïques à détecter dans la section (sans nikud)
  build: (p: LiturgicalPeriod, rite: Rite) => LiturgicalNote | null;
}

const RULES: Rule[] = [
  // 1. Mashiv HaRouah' / Morid HaTal (2ᵉ brakha de la Amida)
  {
    id: "geshem-tal",
    patterns: ["משיב הרוח", "מוריד הגשם", "מוריד הטל"],
    build: (p, rite) => {
      if (p.rainSeason) {
        return {
          id: "geshem-tal",
          tone: "info",
          title: "Saison des pluies",
          body:
            "De Chemini 'Atseret au 1er jour de Pessa'h, on dit la formule de la pluie dans la 2ᵉ bénédiction de la Amida.",
          todaySay: "מַשִּׁיב הָרוּחַ וּמוֹרִיד הַגֶּשֶׁם",
        };
      }
      if (rite === "sefarade") {
        return {
          id: "geshem-tal",
          tone: "info",
          title: "Saison de la rosée",
          body:
            "De Pessa'h à Chemini 'Atseret, le rite séfarade dit la formule de la rosée dans la 2ᵉ bénédiction de la Amida.",
          todaySay: "מוֹרִיד הַטָּל",
        };
      }
      return {
        id: "geshem-tal",
        tone: "info",
        title: "Saison de la rosée",
        body:
          "De Pessa'h à Chemini 'Atseret, le rite ashkénaze omet cette formule (on ne dit ni « Morid haGuéchèm » ni « Morid haTal »).",
      };
    },
  },

  // 2. Ten Tal Umatar Livrakha / Ten Berakha (9ᵉ brakha — Birkat haChanim)
  {
    id: "tal-umatar",
    patterns: ["ותן טל ומטר", "ותן ברכה", "ברך עלינו"],
    build: (p) => {
      if (p.talUmatar) {
        return {
          id: "tal-umatar",
          tone: "warn",
          title: "Demande de pluie",
          body:
            "Période de demande de pluie (en diaspora : à partir du 4-5 décembre, en Israël : à partir du 7 'Hechvan, jusqu'à Pessa'h).",
          todaySay: "וְתֵן טַל וּמָטָר לִבְרָכָה",
        };
      }
      return {
        id: "tal-umatar",
        tone: "info",
        title: "Hors période de pluie",
        body:
          "En dehors de la saison de la pluie, on dit la formule courte dans la bénédiction des années.",
        todaySay: "וְתֵן בְּרָכָה",
      };
    },
  },

  // 3. Yaalé VéYavo
  {
    id: "yaale",
    patterns: ["יעלה ויבא", "יעלה ויבוא"],
    build: (p) => {
      const occ: string[] = [];
      if (p.isRoshChodesh) occ.push("Roch 'Hodech");
      if (p.isYomTov) occ.push("Yom Tov");
      if (p.isCholHamoed) occ.push("'Hol haMo'ed");
      if (occ.length > 0) {
        return {
          id: "yaale",
          tone: "fete",
          title: `Ya'alé véYavo — ${occ.join(" / ")}`,
          body: "Aujourd'hui, on insère « Ya'alé véYavo » dans la Amida (et dans le Birkat haMazone).",
        };
      }
      return {
        id: "yaale",
        tone: "info",
        title: "Ya'alé véYavo",
        body: "À insérer uniquement à Roch 'Hodech, Yom Tov et 'Hol haMo'ed. Aujourd'hui : on omet.",
      };
    },
  },

  // 4. Al HaNissim ('Hanouka / Pourim)
  {
    id: "al-hanissim",
    patterns: ["על הנסים", "על הניסים"],
    build: (p) => {
      if (p.isHanukkah) {
        return {
          id: "al-hanissim",
          tone: "fete",
          title: "'Al haNissim — 'Hanouka",
          body:
            "Pendant les 8 jours de 'Hanouka, on insère « 'Al haNissim » (passage de 'Hanouka) dans la Amida et le Birkat haMazone.",
        };
      }
      if (p.isPurim) {
        return {
          id: "al-hanissim",
          tone: "fete",
          title: "'Al haNissim — Pourim",
          body:
            "À Pourim, on insère « 'Al haNissim » (passage de Pourim) dans la Amida et le Birkat haMazone.",
        };
      }
      return {
        id: "al-hanissim",
        tone: "info",
        title: "'Al haNissim",
        body: "À insérer uniquement à 'Hanouka et à Pourim. Aujourd'hui : on omet.",
      };
    },
  },

  // 5. Anenou (jour de jeûne — Min'ha; pour le 'Hazan à Cha'harit aussi)
  {
    id: "anenu",
    patterns: ["עננו"],
    build: (p) => {
      if (p.isFastDay) {
        return {
          id: "anenu",
          tone: "warn",
          title: "Jour de jeûne — 'Anénou",
          body:
            "Aujourd'hui, jour de jeûne : on ajoute « 'Anénou » dans la Amida (à Min'ha pour tous, et le 'Hazan à Cha'harit lors de la 'Hazara).",
        };
      }
      return null; // pas de note hors jeûne
    },
  },

  // 6. Ta'hanoun
  {
    id: "tahanun",
    patterns: ["תחנון", "ויאמר דוד", "נפילת אפים"],
    build: (p) => {
      if (p.skipTahanun) {
        return {
          id: "tahanun",
          tone: "info",
          title: "Pas de Ta'hanoun aujourd'hui",
          body:
            "On omet Ta'hanoun (jour sans supplications : Chabbat, Roch 'Hodech, Yom Tov, mois de Nissan, 'Hanouka, Pourim, etc.).",
        };
      }
      return null;
    },
  },

  // 7. Hallel
  {
    id: "hallel",
    patterns: ["הללויה", "הלל", "הודו לה'"],
    build: (p) => {
      if (p.hallel === "full") {
        return {
          id: "hallel",
          tone: "fete",
          title: "Hallel complet",
          body: "Aujourd'hui : Hallel complet (avec les 2 paragraphes habituellement omis).",
        };
      }
      if (p.hallel === "half") {
        return {
          id: "hallel",
          tone: "fete",
          title: "Demi-Hallel",
          body:
            "Aujourd'hui : demi-Hallel (Roch 'Hodech / 'Hol haMo'ed Pessa'h). On omet les 2 premiers paragraphes de « Lo lanou » et « Ahavti ».",
        };
      }
      return null;
    },
  },

  // 8. HaMelech HaKadosh / HaMelech HaMishpat (Asseret Yemei Techouva)
  {
    id: "hamelech-hakadosh",
    patterns: ["האל הקדוש", "מלך אוהב צדקה ומשפט"],
    build: (p) => {
      if (!p.isAseretYemeiTeshuva) return null;
      return {
        id: "hamelech-hakadosh",
        tone: "warn",
        title: "10 Jours de Techouva",
        body:
          "Pendant les 10 Jours de Techouva (de Roch HaChana à Yom Kippour), on remplace « haEl haKadoch » par « haMélèkh haKadoch », et « Mélèkh ohev Tsedaka uMichpat » par « haMélèkh haMichpat ». Si oublié sur la 3ᵉ brakha → recommencer la Amida.",
        todaySay: "הַמֶּלֶךְ הַקָּדוֹשׁ / הַמֶּלֶךְ הַמִּשְׁפָּט",
      };
    },
  },

  // 9. Zokhrénou / Mi Khamokha / Oukhetov / BeSefer Hayim (4 ajouts Aseret Yemei Tshuva)
  {
    id: "zochreinu",
    patterns: ["זכרנו לחיים", "מי כמוך אב הרחמים", "וכתוב לחיים", "בספר חיים"],
    build: (p) => {
      if (!p.isAseretYemeiTeshuva) {
        return {
          id: "zochreinu",
          tone: "info",
          title: "Ajouts des 10 Jours de Techouva",
          body:
            "Ces 4 ajouts (Zokhrénou, Mi Khamokha, Oukhetov, BeSéfer 'Hayim) sont insérés uniquement entre Roch HaChana et Yom Kippour. Aujourd'hui : on omet.",
        };
      }
      return {
        id: "zochreinu",
        tone: "fete",
        title: "10 Jours de Techouva — 4 ajouts",
        body:
          "On insère « Zokhrénou leHayim » (1ʳᵉ brakha), « Mi Khamokha Av haRahamim » (2ᵉ), « Oukhetov leHayim » (Modim) et « BeSéfer Hayim » (dernière brakha).",
      };
    },
  },

  // 10. Mizmor LeToda — omis certains jours
  {
    id: "mizmor-letoda",
    patterns: ["מזמור לתודה", "הריעו לה' כל הארץ"],
    build: (p) => {
      if (p.skipMizmorLetoda) {
        return {
          id: "mizmor-letoda",
          tone: "info",
          title: "Pas de Mizmor LeToda aujourd'hui",
          body:
            "On omet « Mizmor LeToda » : Chabbat, Yom Tov, 'Hol haMo'ed Pessa'h, veille de Pessa'h et veille de Yom Kippour (le sacrifice de Toda n'était pas offert).",
        };
      }
      return null;
    },
  },

  // 11. Borkhi Nafshi (Tehilim 104) à Roch 'Hodech
  {
    id: "borchi-nafshi",
    patterns: ["ברכי נפשי את ה'", "תהלים קד"],
    build: (p) => {
      if (p.isRoshChodesh) {
        return {
          id: "borchi-nafshi",
          tone: "fete",
          title: "Roch 'Hodech — Borkhi Nafchi",
          body: "À Roch 'Hodech, on lit Tehilim 104 (« Borkhi Nafchi ») après la Amida.",
        };
      }
      return null;
    },
  },

  // 12. Ta'hanoun étendu (lundi / jeudi)
  {
    id: "tahanun-long",
    patterns: ["והוא רחום", "ויעבור", "יג מדות", "יג' מדות"],
    build: (p) => {
      if (p.skipTahanun) return null;
      if (p.isMondayOrThursday) {
        return {
          id: "tahanun-long",
          tone: "fete",
          title: "Lundi / Jeudi — Ta'hanoun long",
          body:
            "Le lundi et le jeudi, on dit la version longue de Ta'hanoun (« Vehou Rahoum » et les 13 Attributs de miséricorde).",
        };
      }
      return null;
    },
  },

  // 13. Mussaf — sera-t-il dit aujourd'hui ?
  {
    id: "mussaf",
    patterns: ["מוסף", "תפילת מוסף"],
    build: (p) => {
      if (p.hasMussaf) {
        const occ: string[] = [];
        if (p.hdate.getDay() === 6) occ.push("Chabbat");
        if (p.isRoshChodesh) occ.push("Roch 'Hodech");
        if (p.isYomTov) occ.push("Yom Tov");
        if (p.isCholHamoed) occ.push("'Hol haMo'ed");
        return {
          id: "mussaf",
          tone: "fete",
          title: `Mussaf — ${occ.join(" / ") || "Aujourd'hui"}`,
          body: "On dit Mussaf après la lecture de la Torah.",
        };
      }
      return {
        id: "mussaf",
        tone: "info",
        title: "Pas de Mussaf aujourd'hui",
        body: "Mussaf se dit uniquement Chabbat, Roch 'Hodech, Yom Tov et 'Hol haMo'ed.",
      };
    },
  },

  // 14. Sefirat haOmer
  {
    id: "omer",
    patterns: ["ספירת העומר", "היום יום אחד לעומר", "לעומר"],
    build: (p) => {
      if (p.isOmer) {
        return {
          id: "omer",
          tone: "fete",
          title: "Compte du Omer",
          body:
            "Aujourd'hui, on compte le Omer après 'Arvit (entre Pessa'h et Chavou'ot). Voir l'office « Omer » pour le compte du jour avec sa brakha.",
        };
      }
      return {
        id: "omer",
        tone: "info",
        title: "Hors période du Omer",
        body: "Le compte du Omer ne se dit qu'entre le 16 Nissan (lendemain de Pessa'h) et la veille de Chavou'ot.",
      };
    },
  },
];

/**
 * Renvoie la liste des notes liturgiques applicables à une section donnée.
 */
export function getNotesForSection(
  hebrew: string[],
  rite: Rite,
  period: LiturgicalPeriod
): LiturgicalNote[] {
  if (!hebrew || hebrew.length === 0) return [];
  const corpus = joinSection(hebrew);
  const notes: LiturgicalNote[] = [];
  for (const rule of RULES) {
    if (!containsAny(corpus, rule.patterns)) continue;
    const note = rule.build(period, rite);
    if (note) notes.push(note);
  }
  return notes;
}