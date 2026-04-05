const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

/* ── Siddur Edot HaMizrach (Séfarade – rite du Consistoire) ── */
const r = (...parts: string[]) =>
  "Siddur_Edot_HaMizrach,_" + parts.map(p => p.replace(/ /g, '_')).join(',_');

type Entry = { ref?: string; refs?: string[]; title: string; heTitle: string };

const SIDDOUR_REFS: Record<string, Entry[]> = {
  shacharit: [
    { title: "Modé Ani", heTitle: "מודה אני", ref: r("Preparatory Prayers", "Modeh Ani") },
    { title: "Nétilat Yadayim", heTitle: "נטילת ידים", ref: r("Preparatory Prayers", "Netilat Yadayim") },
    { title: "Birkot HaCha'har", heTitle: "ברכות השחר", ref: r("Preparatory Prayers", "Morning Blessings") },
    { title: "Birkot HaTorah", heTitle: "ברכות התורה", ref: r("Preparatory Prayers", "Blessings on the Torah") },
    { title: "Aqéda", heTitle: "עקדה", ref: r("Preparatory Prayers", "Akeda") },
    { title: "Korbanot", heTitle: "קרבנות", ref: r("Preparatory Prayers", "Korbanot") },
    { title: "Baroukh Chéamar", heTitle: "ברוך שאמר", ref: r("Pesukei DeZimrah", "Barukh She'amar") },
    { title: "Achré", heTitle: "אשרי", ref: r("Pesukei DeZimrah", "Ashrei") },
    { title: "Yichtaba'h", heTitle: "ישתבח", ref: r("Pesukei DeZimrah", "Yishtabah") },
    { title: "Birkot Chéma", heTitle: "ברכות שמע", ref: r("Shema", "Blessings of the Shema") },
    { title: "Chéma Israël", heTitle: "שמע ישראל", ref: r("Shema", "Shema") },
    { title: "Amida de Cha'harit", heTitle: "עמידה", ref: r("Amidah") },
    { title: "Ta'hanoun", heTitle: "תחנון", ref: r("Tachanun") },
    { title: "Achré (fin)", heTitle: "אשרי", ref: r("Post Amidah", "Ashrei") },
    { title: "Lamenatséa'h", heTitle: "למנצח", ref: r("Post Amidah", "Lamnatzeach") },
    { title: "Ouva Letsiyon", heTitle: "ובא לציון", ref: r("Post Amidah", "Uva Letzion") },
    { title: "Alénou", heTitle: "עלינו", ref: r("Post Amidah", "Aleinu") },
    { title: "Chir Chel Yom", heTitle: "שיר של יום", ref: r("Post Amidah", "Song of the Day") },
  ],

  minha: [
    { title: "Achré", heTitle: "אשרי", ref: r("Mincha", "Ashrei") },
    { title: "Amida de Min'ha", heTitle: "עמידה דמנחה", ref: r("Mincha", "Mincha Amidah") },
    { title: "Ta'hanoun", heTitle: "תחנון", ref: r("Mincha", "Tachanun") },
    { title: "Alénou", heTitle: "עלינו", ref: r("Mincha", "Aleinu") },
  ],

  arvit: [
    { title: "Chéma du soir", heTitle: "שמע דערבית", ref: r("Arvit", "Shema") },
    { title: "Birkot Chéma du soir", heTitle: "ברכות שמע דערבית", ref: r("Arvit", "Blessings of the Shema") },
    { title: "Amida de Arvit", heTitle: "עמידה דערבית", ref: r("Arvit", "Arvit Amidah") },
    { title: "Alénou", heTitle: "עלינו", ref: r("Arvit", "Aleinu") },
  ],

  shabbat: [
    { title: "Chir HaChirim", heTitle: "שיר השירים", ref: r("Shabbat", "Shir HaShirim") },
    { title: "Kabbalat Chabbat", heTitle: "קבלת שבת", ref: r("Shabbat", "Kabbalat Shabbat") },
    { title: "Arvit de Chabbat", heTitle: "ערבית דשבת", ref: r("Shabbat", "Shabbat Arvit Amidah") },
    { title: "Kiddouch du soir", heTitle: "קידוש ליל שבת", ref: r("Shabbat", "Kiddush for Shabbat Evening") },
    { title: "Cha'harit de Chabbat", heTitle: "שחרית דשבת", ref: r("Shabbat", "Shabbat Shacharit Amidah") },
    { title: "Moussaf de Chabbat", heTitle: "מוסף דשבת", ref: r("Shabbat", "Shabbat Musaf Amidah") },
    { title: "Min'ha de Chabbat", heTitle: "מנחה דשבת", ref: r("Shabbat", "Shabbat Mincha Amidah") },
    { title: "Séouda Chlichit", heTitle: "סעודה שלישית", ref: r("Shabbat", "Seudah Shlishit") },
    { title: "Havdala", heTitle: "הבדלה", ref: r("Shabbat", "Havdalah") },
  ],

  rosh_hodesh: [
    { title: "Hallel", heTitle: "הלל", ref: r("Rosh Chodesh", "Hallel") },
    { title: "Moussaf de Roch 'Hodech", heTitle: "מוסף דראש חודש", ref: r("Rosh Chodesh", "Rosh Chodesh Musaf Amidah") },
  ],

  fetes: [
    { title: "Amida des Fêtes", heTitle: "עמידה דיום טוב", ref: r("Festivals", "Festival Amidah") },
    { title: "Hallel complet", heTitle: "הלל שלם", ref: r("Festivals", "Hallel") },
    { title: "Moussaf des Fêtes", heTitle: "מוסף דיום טוב", ref: r("Festivals", "Festival Musaf Amidah") },
  ],

  hanukkah: [
    { title: "Allumage des bougies", heTitle: "הדלקת נרות חנוכה", ref: r("Hanukkah", "Hanukkah Candle Lighting") },
    { title: "Hanérot Halalou", heTitle: "הנרות הללו", ref: r("Hanukkah", "HaNerot Halalu") },
    { title: "Maoz Tsour", heTitle: "מעוז צור", ref: r("Hanukkah", "Maoz Tzur") },
  ],

  purim: [
    { title: "Méguilat Esther", heTitle: "מגילת אסתר", ref: r("Purim", "Megillat Esther") },
    { title: "Al HaNissim", heTitle: "על הנסים", ref: r("Purim", "Al HaNissim") },
  ],

  taanit: [
    { title: "Séli'hot", heTitle: "סליחות", ref: r("Fast Days", "Selichot") },
    { title: "Avinou Malkénou", heTitle: "אבינו מלכנו", ref: r("Fast Days", "Avinu Malkeinu") },
    { title: "Lecture de la Torah (Jeûne)", heTitle: "קריאת התורה לתענית", ref: r("Fast Days", "Torah Reading for Fast Days") },
  ],

  birkat: [
    { title: "Birkat HaMazone", heTitle: "ברכת המזון", ref: r("Birkat Hamazon") },
    { title: "Chéva Brakhot", heTitle: "שבע ברכות", ref: r("Birkat Hamazon", "Seven Blessings") },
    { title: "Bérakha Méèn Chaloch", heTitle: "ברכה מעין שלוש", ref: r("Birkat Hamazon", "Berakha Me'ein Shalosh") },
  ],

  berakhot: [
    { title: "Bénédictions diverses", heTitle: "ברכות שונות", ref: r("Berakhot") },
  ],

  tikoun_hatsot: [
    { title: "Tikoun 'Hatsot", heTitle: "תיקון חצות", ref: r("Tikkun Chatzot") },
  ],

  nissan: [
    { title: "Birkat HaIlanot", heTitle: "ברכת האילנות", ref: r("Nissan", "Birkat HaIlanot") },
    { title: "Séfirat HaOmer", heTitle: "ספירת העומר", ref: r("Nissan", "Sefirat HaOmer") },
  ],

  mishnayot_shabbat: [
    { title: "Pirké Avot", heTitle: "פרקי אבות", ref: r("Shabbat", "Pirkei Avot") },
  ],

  birkat_halevana: [
    { title: "Birkat HaLévana", heTitle: "ברכת הלבנה", ref: r("Birkat HaLevana") },
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
