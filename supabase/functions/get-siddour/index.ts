const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

type Entry = { ref?: string; refs?: string[]; title: string; heTitle: string; isHazara?: boolean };
type OfficeMap = Record<string, Entry[]>;
type Rite = 'sefarade' | 'ashkenaz';

/* ── Reference builders ── */
const sef = (...parts: string[]) =>
  "Siddur_Edot_HaMizrach,_" + parts.map(p => p.replace(/ /g, '_')).join(',_');
const ash = (...parts: string[]) =>
  "Siddur_Ashkenaz,_" + parts.map(p => p.replace(/ /g, '_')).join(',_');

/* ═══════════════════════════════════════════════════════
   SÉFARADE — Édot HaMizrach (existant)
   ═══════════════════════════════════════════════════════ */
const SEFARADE: OfficeMap = {
  shacharit: [
    { ref: sef("Preparatory Prayers","Modeh Ani"), title: "Modé Ani", heTitle: "מודה אני" },
    { ref: sef("Preparatory Prayers","Morning Blessings"), title: "Birkhot HaChahar", heTitle: "ברכות השחר" },
    { ref: sef("Preparatory Prayers","Torah Blessings"), title: "Birkhot HaTorah", heTitle: "ברכות התורה" },
    { ref: sef("Weekday Shacharit","Petichat Eliyahu"), title: "Péti'hat Eliyahou", heTitle: "פתיחת אליהו" },
    { ref: sef("Weekday Shacharit","Order of Talit"), title: "Séder Talit", heTitle: "סדר עטיפת ציצית" },
    { ref: sef("Weekday Shacharit","Order of Tefillin"), title: "Séder Téfillin", heTitle: "סדר הנחת תפילין" },
    { ref: sef("Weekday Shacharit","Hanna's Prayer"), title: "Téfilat 'Hanna", heTitle: "ותתפלל חנה" },
    { ref: sef("Weekday Shacharit","Morning Prayer"), title: "Téfilat Cha'harit", heTitle: "תפילת שחרית" },
    { ref: sef("Weekday Shacharit","Incense Offering"), title: "Pitoum HaKétoret", heTitle: "פטום הקטורת" },
    { ref: sef("Weekday Shacharit","Hodu"), title: "Hodou", heTitle: "הודו" },
    { ref: sef("Weekday Shacharit","Pesukei D'Zimra"), title: "Pessouké Dézimra", heTitle: "פסוקי דזמרה" },
    { ref: sef("Weekday Shacharit","The Shema"), title: "Chéma Israël et bénédictions", heTitle: "ק\"ש וברכותיה" },
    { ref: sef("Weekday Shacharit","Amida"), title: "Amida de Cha'harit (Lé'hach)", heTitle: "עמידה בלחש" },
    { ref: sef("Weekday Shacharit","Amida"), title: "Répétition de la Amida (Hazarat HaChats)", heTitle: "חזרת הש\"ץ", isHazara: true },
    { ref: sef("Weekday Shacharit","Vidui"), title: "Vidouï — Ta'hanoun", heTitle: "וידוי" },
    { ref: sef("Weekday Shacharit","Torah Reading"), title: "Kériat HaTorah", heTitle: "קריאת התורה" },
    { ref: sef("Weekday Shacharit","Ashrei"), title: "Achré", heTitle: "אשרי" },
    { ref: sef("Weekday Shacharit","Uva LeSion"), title: "Ouva Létsion", heTitle: "ובא לציון" },
    { ref: sef("Weekday Shacharit","Beit Yaakov"), title: "Beit Yaakov", heTitle: "בית יעקב" },
    { ref: sef("Weekday Shacharit","Song of the Day"), title: "Chir Chel Yom", heTitle: "שיר של יום" },
    { ref: sef("Weekday Shacharit","Kaveh"), title: "Kavé", heTitle: "קוה" },
    { ref: sef("Weekday Shacharit","Alenu"), title: "Alénou", heTitle: "עלינו" },
  ],
  minha: [
    { ref: sef("Weekday Mincha","Offerings"), title: "Korbanot", heTitle: "קרבנות" },
    { ref: sef("Weekday Mincha","Amida"), title: "Amida de Min'ha (Lé'hach)", heTitle: "עמידה בלחש" },
    { ref: sef("Weekday Mincha","Amida"), title: "Répétition de la Amida", heTitle: "חזרת הש\"ץ", isHazara: true },
    { ref: sef("Weekday Mincha","Vidui"), title: "Vidouï — Ta'hanoun", heTitle: "וידוי" },
    { ref: sef("Weekday Mincha","Alenu"), title: "Alénou", heTitle: "עלינו" },
  ],
  arvit: [
    { ref: sef("Weekday Arvit","Barchu"), title: "Barékhou", heTitle: "ברכו" },
    { ref: sef("Weekday Arvit","The Shema"), title: "Chéma du soir et bénédictions", heTitle: "ק\"ש וברכותיה" },
    { ref: sef("Weekday Arvit","Amidah"), title: "Amida de Arvit", heTitle: "עמידה" },
    { ref: sef("Weekday Arvit","Alenu"), title: "Alénou", heTitle: "עלינו" },
    { ref: sef("Counting of the Omer"), title: "Séfirat HaOmèr", heTitle: "ספירת העומר" },
    { ref: sef("Bedtime Shema"), title: "Chéma al Hamita", heTitle: "קריאת שמע שעל המיטה" },
  ],
  shabbat: [
    { ref: sef("Shabbat Candle Lighting"), title: "Allumage des bougies", heTitle: "סדר הדלקת נרות שבת" },
    { ref: sef("Song of Songs"), title: "Chir HaChirim", heTitle: "שיר השירים" },
    { ref: sef("Kabbalat Shabbat"), title: "Kabbalat Chabbat", heTitle: "קבלת שבת" },
    { ref: sef("Shabbat Arvit","Barchu"), title: "Barékhou (Chabbat)", heTitle: "ברכו" },
    { ref: sef("Shabbat Arvit","The Shema"), title: "Chéma de Chabbat", heTitle: "ק\"ש וברכותיה" },
    { ref: sef("Shabbat Arvit","Magen Avot"), title: "Téfilat Chéva — Maguen Avot", heTitle: "תפילת שבע" },
    { ref: sef("Shabbat Arvit","Alenu"), title: "Alénou (Arvit Chabbat)", heTitle: "עלינו" },
    { ref: sef("Shabbat Evening","Shalom Alekhem"), title: "Chalom Alékhem", heTitle: "שלום עליכם" },
    { ref: sef("Shabbat Evening","Eshet Hayil"), title: "Échèt 'Haïl", heTitle: "אשת חיל" },
    { ref: sef("Shabbat Evening","Kiddush"), title: "Kiddouch du vendredi soir", heTitle: "קידוש ליל שבת" },
    { ref: sef("Shabbat Shacharit","Pesukei D'Zimra"), title: "Pessouké Dézimra (Chabbat)", heTitle: "פסוקי דזמרה" },
    { ref: sef("Shabbat Shacharit","The Shema"), title: "Chéma (Cha'harit Chabbat)", heTitle: "ק\"ש וברכותיה" },
    { ref: sef("Shabbat Shacharit","Amidah"), title: "Amida Cha'harit Chabbat (Lé'hach)", heTitle: "עמידה בלחש" },
    { ref: sef("Shabbat Shacharit","Amidah"), title: "Répétition Amida Cha'harit", heTitle: "חזרת הש\"ץ", isHazara: true },
    { ref: sef("Shabbat Shacharit","Torah Reading"), title: "Kériat HaTorah", heTitle: "קריאת התורה" },
    { ref: sef("Shabbat Mussaf","Amida"), title: "Amida Moussaf (Lé'hach)", heTitle: "עמידה בלחש" },
    { ref: sef("Shabbat Mussaf","Amida"), title: "Répétition Moussaf", heTitle: "חזרת הש\"ץ", isHazara: true },
    { ref: sef("Shabbat Mussaf","Alenu"), title: "Alénou (Moussaf)", heTitle: "עלינו" },
    { ref: sef("Daytime Meal","Kiddush"), title: "Kiddouch du jour", heTitle: "קידוש היום" },
    { ref: sef("Shabbat Mincha","Amida"), title: "Amida Min'ha Chabbat", heTitle: "עמידה בלחש" },
    { ref: sef("Havdalah","Havdala"), title: "Havdala", heTitle: "סדר הבדלה" },
  ],
  rosh_hodesh: [
    { ref: sef("Rosh Hodesh","Hallel"), title: "Hallel", heTitle: "הלל" },
    { ref: sef("Rosh Hodesh","Mussaf"), title: "Moussaf de Roch 'Hodech", heTitle: "מוסף" },
    { ref: sef("Rosh Hodesh","Barchi Nafshi"), title: "Barkhi Nafchi", heTitle: "ברכי נפשי" },
  ],
  fetes: [
    { ref: sef("Prayers for Three Festivals","Amidah"), title: "Amida des Fêtes", heTitle: "עמידה" },
    { ref: sef("Prayers for Three Festivals","Mussaf"), title: "Moussaf des Fêtes", heTitle: "מוסף" },
  ],
  hanukkah: [
    { ref: sef("Hanukkah","Menorah Lighting"), title: "Allumage de la Ménora", heTitle: "סדר ההדלקה" },
    { ref: sef("Rosh Hodesh","Hallel"), title: "Hallel complet", heTitle: "הלל" },
  ],
  purim: [
    { ref: sef("Purim","Megillah Reading"), title: "Kériat HaMéguila", heTitle: "קריאת המגילה" },
    { ref: sef("Purim","Purim Day"), title: "Séder Yom Pourim", heTitle: "סדר יום פורים" },
  ],
  birkat: [
    { ref: sef("Post Meal Blessing"), title: "Birkat HaMazone", heTitle: "ברכת המזון" },
    { ref: sef("Al Hamihya"), title: "Al Hami'hya (Méèn Chaloch)", heTitle: "ברכת מעין שלוש" },
    { ref: sef("Blessings on Enjoyments"), title: "Birkhot HaNéhénine", heTitle: "ברכות הנהנין" },
  ],
  berakhot: [
    { ref: sef("Assorted Blessings and Prayers","Marriage"), title: "Sédèr Iroussin véNissouïn", heTitle: "סדר ארוסין ונשואין" },
    { ref: sef("Assorted Blessings and Prayers","Sheva Berachot"), title: "Chéva Brakhot", heTitle: "סדר שבע ברכות" },
    { ref: sef("Assorted Blessings and Prayers","Brit Mila"), title: "Brit Mila", heTitle: "סדר ברית מילה" },
    { ref: sef("Assorted Blessings and Prayers","Pidyon HaBen"), title: "Pidyon HaBen", heTitle: "סדר פדיון הבן" },
    { ref: sef("Assorted Blessings and Prayers","Traveler's Prayer"), title: "Téfilat HaDérèkh", heTitle: "תפלת הדרך" },
  ],
  birkat_halevana: [
    { ref: sef("Blessing of the Moon"), title: "Birkat HaLévana", heTitle: "ברכת הלבנה" },
  ],
  tikoun_hatsot: [
    { ref: sef("The Midnight Rite","Tikkun Rachel"), title: "Tikoun Ra'hel", heTitle: "תיקון רחל" },
    { ref: sef("The Midnight Rite","Tikkun Leah"), title: "Tikoun Léa", heTitle: "תיקון לאה" },
  ],
  nissan: [
    { ref: sef("Nissan","Blessing of the Trees"), title: "Birkat HaIlanot", heTitle: "סדר ברכת האילנות" },
  ],
  mishnayot_shabbat: [
    { ref: sef("Mishna Study for Shabbat","Pirkei Avot"), title: "Pirké Avot", heTitle: "פרקי אבות" },
  ],
  taanit: [
    { ref: sef("Fast Days and Mourning","Mourning"), title: "Avélout (Deuil)", heTitle: "אבלות" },
  ],
};

/* ═══════════════════════════════════════════════════════
   ASHKÉNAZE — Nusach Ashkenaz (Sefaria)
   ═══════════════════════════════════════════════════════ */
const ASHKENAZ: OfficeMap = {
  shacharit: [
    { ref: ash("Weekday","Shacharit","Preparatory Prayers","Modeh Ani"), title: "Modeh Ani", heTitle: "מודה אני" },
    { ref: ash("Weekday","Shacharit","Preparatory Prayers","Morning Blessings"), title: "Birchot HaShachar", heTitle: "ברכות השחר" },
    { ref: ash("Weekday","Shacharit","Preparatory Prayers","Torah Blessings"), title: "Birchot HaTorah", heTitle: "ברכות התורה" },
    { ref: ash("Weekday","Shacharit","Preparatory Prayers","Akeidah"), title: "Akeidah", heTitle: "פרשת העקדה" },
    { ref: ash("Weekday","Shacharit","Korbanot","Korbanot"), title: "Korbanot", heTitle: "קרבנות" },
    { ref: ash("Weekday","Shacharit","Korbanot","Pitum HaKetoret"), title: "Pitum HaKetoret", heTitle: "פיטום הקטורת" },
    { ref: ash("Weekday","Shacharit","Pesukei Dezimra","Baruch Sheamar"), title: "Baruch Sheamar", heTitle: "ברוך שאמר" },
    { ref: ash("Weekday","Shacharit","Pesukei Dezimra","Hodu"), title: "Hodu", heTitle: "הודו" },
    { ref: ash("Weekday","Shacharit","Pesukei Dezimra","Ashrei"), title: "Ashrei", heTitle: "אשרי" },
    { ref: ash("Weekday","Shacharit","Pesukei Dezimra","Halleluyah"), title: "Halleloukah", heTitle: "הללויה" },
    { ref: ash("Weekday","Shacharit","Pesukei Dezimra","Yishtabach"), title: "Yichtabach", heTitle: "ישתבח" },
    { ref: ash("Weekday","Shacharit","The Shema","Barchu"), title: "Barchou", heTitle: "ברכו" },
    { ref: ash("Weekday","Shacharit","The Shema","Yotzer Or"), title: "Yotser Or", heTitle: "יוצר אור" },
    { ref: ash("Weekday","Shacharit","The Shema","Shema"), title: "Chéma Israël", heTitle: "קריאת שמע" },
    { ref: ash("Weekday","Shacharit","The Shema","Emet VeYatziv"), title: "Émet VéYatsiv", heTitle: "אמת ויציב" },
    { ref: ash("Weekday","Shacharit","Amidah","Amidah"), title: "Amida (Lé'hach)", heTitle: "עמידה בלחש" },
    { ref: ash("Weekday","Shacharit","Amidah","Amidah"), title: "Répétition de la Amida", heTitle: "חזרת הש\"ץ", isHazara: true },
    { ref: ash("Weekday","Shacharit","Tachanun","Tachanun"), title: "Ta'hanoun", heTitle: "תחנון" },
    { ref: ash("Weekday","Shacharit","Reading of the Torah","Reading of the Torah"), title: "Kriat HaTorah", heTitle: "קריאת התורה" },
    { ref: ash("Weekday","Shacharit","Concluding Prayers","Ashrei"), title: "Achré (final)", heTitle: "אשרי" },
    { ref: ash("Weekday","Shacharit","Concluding Prayers","Uva LeTzion"), title: "Ouva Létsion", heTitle: "ובא לציון" },
    { ref: ash("Weekday","Shacharit","Concluding Prayers","Aleinu"), title: "Aleinou", heTitle: "עלינו" },
    { ref: ash("Weekday","Shacharit","Concluding Prayers","Song of the Day"), title: "Chir Chel Yom", heTitle: "שיר של יום" },
  ],
  minha: [
    { ref: ash("Weekday","Mincha","Ashrei"), title: "Achré", heTitle: "אשרי" },
    { ref: ash("Weekday","Mincha","Amidah"), title: "Amida (Lé'hach)", heTitle: "עמידה בלחש" },
    { ref: ash("Weekday","Mincha","Amidah"), title: "Répétition de la Amida", heTitle: "חזרת הש\"ץ", isHazara: true },
    { ref: ash("Weekday","Mincha","Tachanun"), title: "Ta'hanoun", heTitle: "תחנון" },
    { ref: ash("Weekday","Mincha","Aleinu"), title: "Aleinou", heTitle: "עלינו" },
  ],
  arvit: [
    { ref: ash("Weekday","Maariv","The Shema","Barchu"), title: "Barchou", heTitle: "ברכו" },
    { ref: ash("Weekday","Maariv","The Shema","Maariv Aravim"), title: "Maariv Aravim", heTitle: "מעריב ערבים" },
    { ref: ash("Weekday","Maariv","The Shema","Shema"), title: "Chéma Israël (soir)", heTitle: "קריאת שמע" },
    { ref: ash("Weekday","Maariv","Amidah"), title: "Amida de Maariv", heTitle: "עמידה" },
    { ref: ash("Weekday","Maariv","Aleinu"), title: "Aleinou", heTitle: "עלינו" },
    { ref: ash("Weekday","Maariv","Bedtime Shema"), title: "Chéma al Hamita", heTitle: "קריאת שמע שעל המיטה" },
  ],
  shabbat: [
    { ref: ash("Shabbat","Candle Lighting"), title: "Allumage des bougies", heTitle: "הדלקת נרות" },
    { ref: ash("Shabbat","Kabbalat Shabbat"), title: "Kabbalat Chabbat", heTitle: "קבלת שבת" },
    { ref: ash("Shabbat","Maariv","The Shema"), title: "Chéma de Chabbat (Maariv)", heTitle: "ק\"ש של שבת" },
    { ref: ash("Shabbat","Maariv","Amidah"), title: "Amida de Maariv", heTitle: "עמידה" },
    { ref: ash("Shabbat","Evening","Shalom Aleichem"), title: "Chalom Aleikhem", heTitle: "שלום עליכם" },
    { ref: ash("Shabbat","Evening","Eshet Chayil"), title: "Échèt 'Haïl", heTitle: "אשת חיל" },
    { ref: ash("Shabbat","Evening","Kiddush"), title: "Kiddouch du soir", heTitle: "קידוש ליל שבת" },
    { ref: ash("Shabbat","Shacharit","Pesukei Dezimra"), title: "Pessouké Dézimra (Chabbat)", heTitle: "פסוקי דזמרה" },
    { ref: ash("Shabbat","Shacharit","The Shema"), title: "Chéma (Chabbat)", heTitle: "קריאת שמע" },
    { ref: ash("Shabbat","Shacharit","Amidah"), title: "Amida Cha'harit Chabbat", heTitle: "עמידה" },
    { ref: ash("Shabbat","Shacharit","Reading of the Torah"), title: "Kriat HaTorah", heTitle: "קריאת התורה" },
    { ref: ash("Shabbat","Mussaf","Amidah"), title: "Amida Moussaf", heTitle: "עמידה של מוסף" },
    { ref: ash("Shabbat","Mincha","Amidah"), title: "Amida Min'ha", heTitle: "עמידה" },
    { ref: ash("Shabbat","Havdalah"), title: "Havdala", heTitle: "סדר הבדלה" },
  ],
  rosh_hodesh: [
    { ref: ash("Weekday","Shacharit","Hallel"), title: "Hallel", heTitle: "הלל" },
    { ref: ash("Rosh Chodesh","Mussaf"), title: "Moussaf de Roch 'Hodech", heTitle: "מוסף לראש חודש" },
  ],
  fetes: [
    { ref: ash("Festivals","Amidah"), title: "Amida des Fêtes", heTitle: "עמידה לשלוש רגלים" },
    { ref: ash("Festivals","Mussaf"), title: "Moussaf des Fêtes", heTitle: "מוסף" },
    { ref: ash("Festivals","Hallel"), title: "Hallel des Fêtes", heTitle: "הלל" },
  ],
  hanukkah: [
    { ref: ash("Chanukah","Lighting"), title: "Allumage de la Ménora", heTitle: "סדר הדלקת נר חנוכה" },
    { ref: ash("Chanukah","Hallel"), title: "Hallel de 'Hanouka", heTitle: "הלל" },
    { ref: ash("Chanukah","Maoz Tzur"), title: "Maoz Tsour", heTitle: "מעוז צור" },
  ],
  purim: [
    { ref: ash("Purim","Megillah Reading"), title: "Kriat HaMéguila", heTitle: "קריאת המגילה" },
    { ref: ash("Purim","Al HaNissim"), title: "Al HaNissim", heTitle: "על הנסים" },
  ],
  birkat: [
    { ref: ash("Birkat HaMazon"), title: "Birkat HaMazone", heTitle: "ברכת המזון" },
    { ref: ash("Al HaMichya"), title: "Al HaMi'hya", heTitle: "ברכת מעין שלוש" },
    { ref: ash("Blessings","Various Blessings"), title: "Berakhot diverses", heTitle: "ברכות הנהנין" },
  ],
  berakhot: [
    { ref: ash("Blessings","Sheva Berachot"), title: "Cheva Berakhot", heTitle: "שבע ברכות" },
    { ref: ash("Blessings","Brit Milah"), title: "Brit Mila", heTitle: "ברית מילה" },
    { ref: ash("Blessings","Pidyon HaBen"), title: "Pidyon HaBen", heTitle: "פדיון הבן" },
    { ref: ash("Blessings","Travelers Prayer"), title: "Tefilat HaDerekh", heTitle: "תפילת הדרך" },
  ],
  birkat_halevana: [
    { ref: ash("Kiddush Levana"), title: "Birkat HaLévana", heTitle: "ברכת הלבנה" },
  ],
  tikoun_hatsot: [
    { ref: ash("Tikkun Chatzot"), title: "Tikoun 'Hatsot", heTitle: "תיקון חצות" },
  ],
  nissan: [
    { ref: ash("Birkat HaIlanot"), title: "Birkat HaIlanot", heTitle: "ברכת האילנות" },
  ],
  mishnayot_shabbat: [
    { ref: "Pirkei_Avot,_Chapter_1", title: "Pirkei Avot — Ch. 1", heTitle: "פרקי אבות א" },
  ],
  taanit: [
    { ref: ash("Fast Days","Selichot"), title: "Sélihot", heTitle: "סליחות" },
  ],
};

const RITES: Record<Rite, OfficeMap> = { sefarade: SEFARADE, ashkenaz: ASHKENAZ };

/* ── Helpers ── */
const flattenText = (t: unknown): string[] => {
  if (Array.isArray(t)) return t.flatMap(flattenText);
  if (typeof t === 'string') return [t];
  return [];
};

async function fetchSingleRef(refStr: string): Promise<{ he: string[]; en: string[] }> {
  try {
    const response = await fetch(
      `https://www.sefaria.org/api/texts/${encodeURIComponent(refStr)}?context=0`,
      { headers: { 'Accept': 'application/json' } }
    );
    if (!response.ok) {
      console.error(`Sefaria error ${response.status} for ${refStr}`);
      return { he: [], en: [] };
    }
    const data = await response.json();
    return { he: flattenText(data.he), en: flattenText(data.en) };
  } catch (e) {
    console.error(`Sefaria fetch failed for ${refStr}:`, e);
    return { he: [], en: [] };
  }
}

async function fetchEntry(entry: Entry) {
  let hebrew: string[] = [];
  let french: string[] = [];
  if (entry.refs) {
    const results = await Promise.all(entry.refs.map(fetchSingleRef));
    for (const r of results) {
      hebrew = hebrew.concat(r.he);
      french = french.concat(r.en);
    }
  } else if (entry.ref) {
    const r = await fetchSingleRef(entry.ref);
    hebrew = r.he;
    french = r.en;
  }
  return { hebrew, french };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { office, section, full } = body;
    const rite: Rite = (body.rite === 'ashkenaz' ? 'ashkenaz' : 'sefarade');
    const map = RITES[rite];

    if (!office || !map[office]) {
      return new Response(
        JSON.stringify({ success: false, error: 'Office invalide pour ce rite', availableOffices: Object.keys(map) }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const sections = map[office];

    /* ─── FULL MODE: charge l'office complet en un payload ─── */
    if (full === true) {
      const results = await Promise.all(sections.map(fetchEntry));
      return new Response(
        JSON.stringify({
          success: true,
          rite,
          office,
          sections: sections.map((s, i) => ({
            index: i,
            title: s.title,
            heTitle: s.heTitle,
            isHazara: s.isHazara || false,
            hebrew: results[i].hebrew,
            french: results[i].french,
          })),
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    /* ─── Section unique ─── */
    const targetSection = section !== undefined && section >= 0 && section < sections.length
      ? sections[section]
      : null;

    if (targetSection) {
      const { hebrew, french } = await fetchEntry(targetSection);
      return new Response(
        JSON.stringify({
          success: true,
          rite,
          office,
          sectionIndex: section,
          title: targetSection.title,
          heTitle: targetSection.heTitle,
          hebrew,
          french,
          isHazara: targetSection.isHazara || false,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    /* ─── TOC seul ─── */
    return new Response(
      JSON.stringify({
        success: true,
        rite,
        office,
        sections: sections.map((s, i) => ({
          index: i,
          title: s.title,
          heTitle: s.heTitle,
          isHazara: s.isHazara || false,
        })),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching siddour:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Failed to fetch siddour' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
