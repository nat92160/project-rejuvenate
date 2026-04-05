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
    // ── Préparation ──
    { ref: r("Preparatory Prayers","Modeh Ani"), title: "Modé Ani", heTitle: "מודה אני" },
    { ref: r("Preparatory Prayers","Morning Blessings"), title: "Birkhot HaChahar", heTitle: "ברכות השחר" },
    { ref: r("Preparatory Prayers","Torah Blessings"), title: "Birkhot HaTorah", heTitle: "ברכות התורה" },
    // ── Cha'harit ──
    { ref: r("Weekday Shacharit","Order of Talit"), title: "Tallit", heTitle: "סדר עטיפת ציצית" },
    { ref: r("Weekday Shacharit","Order of Tefillin"), title: "Téfillin", heTitle: "סדר הנחת תפילין" },
    { ref: r("Weekday Shacharit","Morning Prayer"), title: "Téfilat Cha'harit", heTitle: "תפילת שחרית" },
    { ref: r("Weekday Shacharit","Incense Offering"), title: "Pitoum Hakétoret", heTitle: "פטום הקטורת" },
    { ref: r("Weekday Shacharit","Hodu"), title: "Hodou", heTitle: "הודו" },
    // ── Pessouké Dézimra ──
    { ref: r("Weekday Shacharit","Pesukei D'Zimra"), title: "Pessouké Dézimra", heTitle: "פסוקי דזמרה" },
    // ── Chéma et bénédictions ──
    { ref: r("Weekday Shacharit","The Shema"), title: "Chéma et Bérakhot", heTitle: "ק\"ש וברכותיה" },
    // ── Amida ──
    { ref: r("Weekday Shacharit","Amida"), title: "Amida de Cha'harit", heTitle: "עמידה — שחרית" },
    // ── Vidouï / Ta'hanoun ──
    { ref: r("Weekday Shacharit","Vidui"), title: "Vidouï / Ta'hanoun", heTitle: "וידוי" },
    // ── Lecture de la Torah ──
    { ref: r("Weekday Shacharit","Torah Reading"), title: "Lecture de la Torah", heTitle: "קריאת התורה" },
    // ── Conclusion ──
    { ref: r("Weekday Shacharit","Ashrei"), title: "Achré", heTitle: "אשרי" },
    { ref: r("Weekday Shacharit","Uva LeSion"), title: "Ouva Létsion", heTitle: "ובא לציון" },
    { ref: r("Weekday Shacharit","Song of the Day"), title: "Chir Chel Yom", heTitle: "שיר של יום" },
    { ref: r("Weekday Shacharit","Kaveh"), title: "Kavé", heTitle: "קוה" },
    { ref: r("Weekday Shacharit","Alenu"), title: "Alénou", heTitle: "עלינו" },
  ],

  minha: [
    { ref: r("Weekday Mincha","Offerings"), title: "Korbanot", heTitle: "קרבנות" },
    { ref: r("Weekday Mincha","Amida"), title: "Amida de Min'ha", heTitle: "עמידה — מנחה" },
    { ref: r("Weekday Mincha","Vidui"), title: "Vidouï", heTitle: "וידוי" },
    { ref: r("Weekday Mincha","Alenu"), title: "Alénou", heTitle: "עלינו" },
  ],

  arvit: [
    { ref: r("Weekday Arvit","Barchu"), title: "Barékhou", heTitle: "ברכו" },
    { ref: r("Weekday Arvit","The Shema"), title: "Chéma et Bérakhot", heTitle: "ק\"ש וברכותיה" },
    { ref: r("Weekday Arvit","Amidah"), title: "Amida de Arvit", heTitle: "עמידה — ערבית" },
    { ref: r("Weekday Arvit","Alenu"), title: "Alénou", heTitle: "עלינו" },
    { ref: r("Counting of the Omer"), title: "Séfirat HaOmèr", heTitle: "ספירת העומר" },
    { ref: r("Bedtime Shema"), title: "Chéma al Hamita", heTitle: "קריאת שמע על המיטה" },
  ],

  shabbat: [
    // ── Kabbalat Chabbat ──
    { ref: r("Kabbalat Shabbat"), title: "Kabbalat Chabbat", heTitle: "קבלת שבת" },
    // ── Arvit Chabbat ──
    { ref: r("Shabbat Arvit","Barchu"), title: "Barékhou", heTitle: "ברכו" },
    { ref: r("Shabbat Arvit","The Shema"), title: "Chéma de Chabbat", heTitle: "ק\"ש וברכותיה" },
    { ref: r("Shabbat Arvit","Magen Avot"), title: "Amida Arvit de Chabbat", heTitle: "תפילת שבע" },
    { ref: r("Shabbat Arvit","Alenu"), title: "Alénou (Arvit)", heTitle: "עלינו" },
    // ── Soirée ──
    { ref: r("Shabbat Evening","Shalom Alekhem"), title: "Chalom Alékhem", heTitle: "שלום עליכם" },
    { ref: r("Shabbat Evening","Eshet Hayil"), title: "Échèt 'Hayil", heTitle: "אשת חיל" },
    { ref: r("Shabbat Evening","Kiddush"), title: "Kiddouch du vendredi soir", heTitle: "קידוש ליל שבת" },
    // ── Cha'harit Chabbat ──
    { ref: r("Shabbat Shacharit","Pesukei D'Zimra"), title: "Pessouké Dézimra (Chabbat)", heTitle: "פסוקי דזמרה" },
    { ref: r("Shabbat Shacharit","The Shema"), title: "Chéma (Chabbat matin)", heTitle: "ק\"ש וברכותיה" },
    { ref: r("Shabbat Shacharit","Amidah"), title: "Amida Cha'harit de Chabbat", heTitle: "עמידת שחרית שבת" },
    { ref: r("Shabbat Shacharit","Ashrei"), title: "Achré (Chabbat)", heTitle: "אשרי" },
    // ── Moussaf ──
    { ref: r("Shabbat Mussaf","Amida"), title: "Amida du Moussaf", heTitle: "עמידת מוסף" },
    { ref: r("Shabbat Mussaf","Alenu"), title: "Alénou (Moussaf)", heTitle: "עלינו" },
    // ── Min'ha Chabbat ──
    { ref: r("Shabbat Mincha","Offerings"), title: "Korbanot (Min'ha Chabbat)", heTitle: "קרבנות" },
    { ref: r("Shabbat Mincha","Uva LeSion"), title: "Ouva Létsion", heTitle: "ובא לציון גואל" },
    { ref: r("Shabbat Mincha","Amida"), title: "Amida Min'ha de Chabbat", heTitle: "עמידת מנחה שבת" },
    { ref: r("Shabbat Mincha","Alenu"), title: "Alénou (Min'ha)", heTitle: "עלינו" },
    // ── Havdala ──
    { ref: r("Daytime Meal","Kiddush"), title: "Kiddouch du jour", heTitle: "קידוש היום" },
    { ref: r("Havdalah","Havdala"), title: "Havdala", heTitle: "סדר הבדלה" },
  ],

  hallel: [
    { ref: r("Rosh Hodesh","Hallel"), title: "Hallel", heTitle: "הלל לראש חודש ולמועדים" },
  ],

  birkat: [
    { ref: r("Post Meal Blessing"), title: "Birkat HaMazone", heTitle: "ברכת המזון" },
    { ref: r("Al Hamihya"), title: "Al Hami'hya", heTitle: "ברכת מעין שלוש" },
    { ref: r("Blessings on Enjoyments"), title: "Bérakhot Richonoté", heTitle: "ברכות הנהנין" },
    { ref: r("Assorted Blessings and Prayers","Traveler's Prayer"), title: "Téfilat HaDérèkh", heTitle: "תפילת הדרך" },
  ],

  kaddish: [
    // No standalone kaddish in Edot HaMizrach index — use Ashkenaz refs as fallback
    { ref: "Siddur_Ashkenaz,_Kaddish,_Half_Kaddish", title: "Demi-Kaddich", heTitle: "חצי קדיש" },
    { ref: "Siddur_Ashkenaz,_Kaddish,_Mourner's_Kaddish", title: "Kaddich Yatom", heTitle: "קדיש יתום" },
    { ref: "Siddur_Ashkenaz,_Kaddish,_Kaddish_Shalem", title: "Kaddich Chalem", heTitle: "קדיש שלם" },
    { ref: "Siddur_Ashkenaz,_Kaddish,_Kaddish_d'Rabbanan", title: "Kaddich Dérabbanane", heTitle: "קדיש דרבנן" },
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
