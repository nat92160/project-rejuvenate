const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

/* ── Siddur Edot HaMizrach (Séfarade) ── */
const BASE = "Siddur_Edot_HaMizrach";
const r = (...parts: string[]) =>
  BASE + ",_" + parts.map(p => p.replace(/ /g, '_')).join(',_');

type Entry = { ref?: string; refs?: string[]; title: string; heTitle: string };

const SIDDOUR_REFS: Record<string, Entry[]> = {
  shacharit: [
    { title: "Modé Ani", heTitle: "מודה אני", ref: r("Preparatory Prayers", "Modeh Ani") },
    { title: "Birkot HaCha'har", heTitle: "ברכות השחר", ref: r("Preparatory Prayers", "Morning Blessings") },
    { title: "Birkot HaTorah", heTitle: "ברכות התורה", ref: r("Preparatory Prayers", "Torah Blessings") },
    { title: "Péti'hat Éliyahou", heTitle: "פתיחת אליהו", ref: r("Weekday Shacharit", "Petichat Eliyahu") },
    { title: "Tsitsit & Téfiline", heTitle: "טלית ותפילין", refs: [r("Weekday Shacharit", "Order of Talit"), r("Weekday Shacharit", "Order of Tefillin")] },
    { title: "Téfilat 'Hanna", heTitle: "תפילת חנה", ref: r("Weekday Shacharit", "Hanna's Prayer") },
    { title: "Birkot Cha'har", heTitle: "תפילת השחר", ref: r("Weekday Shacharit", "Morning Prayer") },
    { title: "Pittoum HaQétoret", heTitle: "פיטום הקטורת", ref: r("Weekday Shacharit", "Incense Offering") },
    { title: "Hodou", heTitle: "הודו", ref: r("Weekday Shacharit", "Hodu") },
    { title: "Péssouqé DéZimra", heTitle: "פסוקי דזמרה", ref: r("Weekday Shacharit", "Pesukei D'Zimra") },
    { title: "Chéma Israël", heTitle: "שמע ישראל", ref: r("Weekday Shacharit", "The Shema") },
    { title: "Amida de Cha'harit", heTitle: "עמידה", ref: r("Weekday Shacharit", "Amida") },
    { title: "Vidouï / Ta'hanoun", heTitle: "וידוי / תחנון", ref: r("Weekday Shacharit", "Vidui") },
    { title: "Qriat HaTorah", heTitle: "קריאת התורה", ref: r("Weekday Shacharit", "Torah Reading") },
    { title: "Achré", heTitle: "אשרי", ref: r("Weekday Shacharit", "Ashrei") },
    { title: "Ouva Letsiyon", heTitle: "ובא לציון", ref: r("Weekday Shacharit", "Uva LeSion") },
    { title: "Bét Yaaqov", heTitle: "בית יעקב", ref: r("Weekday Shacharit", "Beit Yaakov") },
    { title: "Chir Chel Yom", heTitle: "שיר של יום", ref: r("Weekday Shacharit", "Song of the Day") },
    { title: "Kavé", heTitle: "קוה", ref: r("Weekday Shacharit", "Kaveh") },
    { title: "Alénou", heTitle: "עלינו", ref: r("Weekday Shacharit", "Alenu") },
  ],

  additions_shacharit: [
    { title: "13 Principes de Foi", heTitle: "י\"ג עיקרים", ref: r("Additions for Shacharit", "Thirteen Principles of Faith") },
    { title: "10 Mémoriaux", heTitle: "עשר זכירות", ref: r("Additions for Shacharit", "Ten Remembrances") },
  ],

  minha: [
    { title: "Qorbanot", heTitle: "קרבנות", ref: r("Weekday Mincha", "Offerings") },
    { title: "Amida de Min'ha", heTitle: "עמידה דמנחה", ref: r("Weekday Mincha", "Amida") },
    { title: "Vidouï", heTitle: "וידוי", ref: r("Weekday Mincha", "Vidui") },
    { title: "Alénou", heTitle: "עלינו", ref: r("Weekday Mincha", "Alenu") },
  ],

  arvit: [
    { title: "Barékhou", heTitle: "ברכו", ref: r("Weekday Arvit", "Barchu") },
    { title: "Chéma du soir", heTitle: "שמע דערבית", ref: r("Weekday Arvit", "The Shema") },
    { title: "Amida de Arvit", heTitle: "עמידה דערבית", ref: r("Weekday Arvit", "Amidah") },
    { title: "Alénou", heTitle: "עלינו", ref: r("Weekday Arvit", "Alenu") },
  ],

  shabbat: [
    { title: "Allumage des bougies", heTitle: "הדלקת נרות שבת", ref: r("Shabbat Candle Lighting") },
    { title: "Chir HaChirim", heTitle: "שיר השירים", ref: r("Song of Songs") },
    { title: "Kabbalat Chabbat", heTitle: "קבלת שבת", ref: r("Kabbalat Shabbat") },
    { title: "Arvit de Chabbat", heTitle: "ערבית דשבת", refs: [r("Shabbat Arvit", "Barchu"), r("Shabbat Arvit", "The Shema"), r("Shabbat Arvit", "Magen Avot"), r("Shabbat Arvit", "Alenu")] },
    { title: "Chalom Alékhem", heTitle: "שלום עליכם", ref: r("Shabbat Evening", "Shalom Alekhem") },
    { title: "Échét 'Hayil", heTitle: "אשת חיל", ref: r("Shabbat Evening", "Eshet Hayil") },
    { title: "Kiddouch du soir", heTitle: "קידוש ליל שבת", ref: r("Shabbat Evening", "Kiddush") },
    { title: "Birkhat HaBanim", heTitle: "ברכת הבנים", ref: r("Shabbat Evening", "Blessing of Children") },
    { title: "Séouda Richona", heTitle: "סעודה ראשונה", ref: r("Shabbat Evening", "First Meal") },
    { title: "Zémirot Chabbat", heTitle: "זמירות שבת", ref: r("Shabbat Evening", "Songs for Shabbat") },
  ],

  shabbat_shacharit: [
    { title: "Téhilim de Chabbat", heTitle: "מזמורי שבת", ref: r("Shabbat Shacharit", "Psalms for Shabbat") },
    { title: "Péssouqé DéZimra", heTitle: "פסוקי דזמרה דשבת", ref: r("Shabbat Shacharit", "Pesukei D'Zimra") },
    { title: "Chéma de Chabbat", heTitle: "שמע דשבת", ref: r("Shabbat Shacharit", "The Shema") },
    { title: "Amida de Chabbat", heTitle: "עמידה דשבת", ref: r("Shabbat Shacharit", "Amidah") },
    { title: "Qriat HaTorah", heTitle: "קריאת התורה", ref: r("Shabbat Shacharit", "Torah Reading") },
    { title: "HaGomél", heTitle: "הגומל", ref: r("Shabbat Shacharit", "HaGomel") },
    { title: "Haftara", heTitle: "הפטרה", ref: r("Shabbat Shacharit", "Haftarah") },
    { title: "Birkhat Ha'Hodech", heTitle: "ברכת החודש", ref: r("Shabbat Shacharit", "Birkat HaChodesh") },
    { title: "Mi Chébérakh", heTitle: "מי שברך", ref: r("Shabbat Shacharit", "Mi Sheberach") },
    { title: "Achré", heTitle: "אשרי", ref: r("Shabbat Shacharit", "Ashrei") },
  ],

  shabbat_moussaf: [
    { title: "Amida de Moussaf", heTitle: "עמידת מוסף", ref: r("Shabbat Mussaf", "Amida") },
    { title: "Pittoum HaQétoret", heTitle: "פיטום הקטורת", ref: r("Shabbat Mussaf", "Incense Offering") },
    { title: "Alénou", heTitle: "עלינו", ref: r("Shabbat Mussaf", "Alenu") },
  ],

  shabbat_minha: [
    { title: "Qorbanot", heTitle: "קרבנות", ref: r("Shabbat Mincha", "Offerings") },
    { title: "Ouva Letsiyon", heTitle: "ובא לציון", ref: r("Shabbat Mincha", "Uva LeSion") },
    { title: "Amida de Min'ha", heTitle: "עמידה דמנחה", ref: r("Shabbat Mincha", "Amida") },
    { title: "Alénou", heTitle: "עלינו", ref: r("Shabbat Mincha", "Alenu") },
  ],

  seoudot: [
    { title: "Kiddouch du jour", heTitle: "קידוש יום", ref: r("Daytime Meal", "Kiddush") },
    { title: "Séouda du jour", heTitle: "סעודת יום", ref: r("Daytime Meal", "Daytime Meal") },
    { title: "Séouda Chlichit", heTitle: "סעודה שלישית", ref: r("Third Meal") },
    { title: "Birkat HaMazone", heTitle: "ברכת המזון", ref: r("Post Meal Blessing") },
    { title: "Al HaMi'hya", heTitle: "על המחיה", ref: r("Al Hamihya") },
  ],

  havdala: [
    { title: "Avant la Havdala", heTitle: "לפני הבדלה", ref: r("Havdalah", "Before Havdalah") },
    { title: "Havdala", heTitle: "הבדלה", ref: r("Havdalah", "Havdala") },
    { title: "Zémirot Motsa'é Chabbat", heTitle: "זמירות מוצאי שבת", ref: r("Havdalah", "Motzei Shabbat Songs") },
    { title: "Vayitén Lékha", heTitle: "ויתן לך", ref: r("Havdalah", "Veyiten Lecha") },
    { title: "Séouda Réviit", heTitle: "סעודה רביעית", ref: r("Havdalah", "Fourth Meal") },
  ],

  rosh_hodesh: [
    { title: "Roch 'Hodech", heTitle: "ראש חודש", ref: r("Rosh Hodesh", "Rosh Hodesh") },
    { title: "Hallel", heTitle: "הלל", ref: r("Rosh Hodesh", "Hallel") },
    { title: "Ouva Letsiyon", heTitle: "ובא לציון", ref: r("Rosh Hodesh", "Uva LeSion") },
    { title: "Chir Chel Yom", heTitle: "שיר של יום", ref: r("Rosh Hodesh", "Song of the Day") },
    { title: "Moussaf", heTitle: "מוסף דראש חודש", ref: r("Rosh Hodesh", "Mussaf") },
    { title: "Barékhi Nafchi", heTitle: "ברכי נפשי", ref: r("Rosh Hodesh", "Barchi Nafshi") },
    { title: "Alénou", heTitle: "עלינו", ref: r("Rosh Hodesh", "Alenu") },
  ],

  fetes: [
    { title: "Prières des Fêtes", heTitle: "תפילות שלוש רגלים", ref: r("Prayers for Three Festivals", "Prayers for Three Festivals") },
    { title: "Chir de Péssa'h", heTitle: "שיר לפסח", ref: r("Prayers for Three Festivals", "Song for Passover") },
    { title: "Chir de Chavouot", heTitle: "שיר לשבועות", ref: r("Prayers for Three Festivals", "Song for Shavuot") },
    { title: "Chir de Souccot", heTitle: "שיר לסוכות", ref: r("Prayers for Three Festivals", "Song for Sukkot") },
    { title: "Chir de Chémini Atséret", heTitle: "שיר לשמיני עצרת", ref: r("Prayers for Three Festivals", "Song for Shemini Atzeret") },
    { title: "Amida des Fêtes", heTitle: "עמידה דיום טוב", ref: r("Prayers for Three Festivals", "Amidah") },
    { title: "Moussaf des Fêtes", heTitle: "מוסף דיום טוב", ref: r("Prayers for Three Festivals", "Mussaf") },
  ],

  hanukkah: [
    { title: "Allumage de la Ménora", heTitle: "הדלקת נרות חנוכה", ref: r("Hanukkah", "Menorah Lighting") },
    { title: "Cha'harit de 'Hanouka", heTitle: "שחרית דחנוכה", ref: r("Hanukkah", "Shacharit") },
  ],

  purim: [
    { title: "Chabbat Zakhor", heTitle: "שבת זכור", ref: r("Purim", "Shabbat Zachor") },
    { title: "Méguilat Esther", heTitle: "מגילת אסתר", ref: r("Purim", "Megillah Reading") },
    { title: "Jour de Pourim", heTitle: "יום פורים", ref: r("Purim", "Purim Day") },
  ],

  taanit: [
    { title: "Tsôm Guédalia", heTitle: "צום גדליה", ref: r("Fast Days and Mourning", "Fast of Gedalya") },
    { title: "10 Tévét", heTitle: "י' בטבת", ref: r("Fast Days and Mourning", "Tenth of Tevet") },
    { title: "Taanit Esther", heTitle: "תענית אסתר", ref: r("Fast Days and Mourning", "Fast of Esther") },
    { title: "17 Tamouz", heTitle: "י\"ז בתמוז", ref: r("Fast Days and Mourning", "Seventeenth of Tammuz") },
    { title: "Avélout", heTitle: "אבלות", ref: r("Fast Days and Mourning", "Mourning") },
    { title: "Qriat HaTorah (Jeûne)", heTitle: "קריאת התורה לתענית", ref: r("Fast Days and Mourning", "Torah Reading for Fast Days") },
  ],

  berakhot: [
    { title: "Bénédictions diverses", heTitle: "ברכות שונות", ref: r("Blessings on Enjoyments") },
  ],

  tikoun_hatsot: [
    { title: "Léchém Yi'houd", heTitle: "לשם יחוד", ref: r("The Midnight Rite", "LeShem Yichud") },
    { title: "Tikoun Ra'hel", heTitle: "תיקון רחל", ref: r("The Midnight Rite", "Tikkun Rachel") },
    { title: "Tikoun Léa", heTitle: "תיקון לאה", ref: r("The Midnight Rite", "Tikkun Leah") },
  ],

  nissan: [
    { title: "Birkat HaIlanot", heTitle: "ברכת האילנות", ref: r("Nissan", "Blessing of the Trees") },
    { title: "Séfirat HaOmer", heTitle: "ספירת העומר", ref: r("Counting of the Omer") },
  ],

  mishnayot_shabbat: [
    { title: "Séouda Richona", heTitle: "סעודה ראשונה", ref: r("Mishna Study for Shabbat", "First Meal") },
    { title: "Séouda Chnia", heTitle: "סעודה שנייה", ref: r("Mishna Study for Shabbat", "Second Meal") },
    { title: "Séouda Chlichit", heTitle: "סעודה שלישית", ref: r("Mishna Study for Shabbat", "Third Meal") },
    { title: "Pirqé Avot", heTitle: "פרקי אבות", ref: r("Mishna Study for Shabbat", "Pirkei Avot") },
  ],

  birkat_halevana: [
    { title: "Birkat HaLévana", heTitle: "ברכת הלבנה", ref: r("Blessing of the Moon") },
  ],

  chema_coucher: [
    { title: "Chéma du coucher", heTitle: "קריאת שמע על המיטה", ref: r("Bedtime Shema") },
  ],

  brakhot_diverses: [
    { title: "Mariage", heTitle: "נישואין", ref: r("Assorted Blessings and Prayers", "Marriage") },
    { title: "Chéva Brakhot", heTitle: "שבע ברכות", ref: r("Assorted Blessings and Prayers", "Sheva Berachot") },
    { title: "Brit Mila", heTitle: "ברית מילה", ref: r("Assorted Blessings and Prayers", "Brit Mila") },
    { title: "Pidyon HaBen", heTitle: "פדיון הבן", ref: r("Assorted Blessings and Prayers", "Redeeming the First Born") },
    { title: "Mézouza", heTitle: "מזוזה", ref: r("Assorted Blessings and Prayers", "Mezuza") },
    { title: "Tévilat Kélim", heTitle: "טבילת כלים", ref: r("Assorted Blessings and Prayers", "Tevillat Kelim") },
    { title: "Qéchét (Arc-en-ciel)", heTitle: "קשת", ref: r("Assorted Blessings and Prayers", "Rainbow") },
    { title: "Téfilat HaDérékh", heTitle: "תפילת הדרך", ref: r("Assorted Blessings and Prayers", "Traveler's Prayer") },
  ],
};

/* ── Helpers ── */
const flattenText = (t: unknown): string[] => {
  if (Array.isArray(t)) return t.flatMap(flattenText);
  if (typeof t === 'string') return [t];
  return [];
};

async function fetchSingleRef(refStr: string): Promise<{ he: string[]; en: string[] }> {
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
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { office, section } = await req.json();

    if (!office || !SIDDOUR_REFS[office]) {
      return new Response(
        JSON.stringify({ success: false, error: 'Office invalide', availableOffices: Object.keys(SIDDOUR_REFS) }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const sections = SIDDOUR_REFS[office];

    const targetSection = section !== undefined && section >= 0 && section < sections.length
      ? sections[section]
      : null;

    if (targetSection) {
      let hebrew: string[] = [];
      let french: string[] = [];

      if (targetSection.refs) {
        const results = await Promise.all(targetSection.refs.map(fetchSingleRef));
        for (const result of results) {
          hebrew = hebrew.concat(result.he);
          french = french.concat(result.en);
        }
      } else if (targetSection.ref) {
        const result = await fetchSingleRef(targetSection.ref);
        hebrew = result.he;
        french = result.en;
      }

      return new Response(
        JSON.stringify({
          success: true,
          office,
          sectionIndex: section,
          title: targetSection.title,
          heTitle: targetSection.heTitle,
          hebrew,
          french,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        office,
        sections: sections.map((s, i) => ({ index: i, title: s.title, heTitle: s.heTitle })),
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
