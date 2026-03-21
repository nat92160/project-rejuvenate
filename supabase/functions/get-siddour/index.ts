const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const SIDDOUR_REFS: Record<string, { ref: string; title: string; heTitle: string }[]> = {
  shacharit: [
    { ref: "Siddur_Ashkenaz,_Weekday,_Shacharit,_Preparatory_Prayers,_Modeh_Ani", title: "Modé Ani", heTitle: "מודה אני" },
    { ref: "Siddur_Ashkenaz,_Weekday,_Shacharit,_Preparatory_Prayers,_Netilat_Yadayim", title: "Nétilat Yadaïm", heTitle: "נטילת ידים" },
    { ref: "Siddur_Ashkenaz,_Weekday,_Shacharit,_Preparatory_Prayers,_Asher_Yatzar", title: "Achèr Yatsar", heTitle: "אשר יצר" },
    { ref: "Siddur_Ashkenaz,_Weekday,_Shacharit,_Preparatory_Prayers,_Elokai_Neshama", title: "Élokaï Néchama", heTitle: "אלוקי נשמה" },
    { ref: "Siddur_Ashkenaz,_Weekday,_Shacharit,_Preparatory_Prayers,_Morning_Blessings", title: "Birkhot HaChahar", heTitle: "ברכות השחר" },
    { ref: "Siddur_Ashkenaz,_Weekday,_Shacharit,_Preparatory_Prayers,_Torah_Blessings", title: "Birkhot HaTorah", heTitle: "ברכות התורה" },
    { ref: "Siddur_Ashkenaz,_Weekday,_Shacharit,_Preparatory_Prayers,_Akedah", title: "Akéda", heTitle: "עקידה" },
    { ref: "Siddur_Ashkenaz,_Weekday,_Shacharit,_Preparatory_Prayers,_Ma_Tovu", title: "Ma Tovou", heTitle: "מה טובו" },
    { ref: "Siddur_Ashkenaz,_Weekday,_Shacharit,_Preparatory_Prayers,_Adon_Olam", title: "Adon Olam", heTitle: "אדון עולם" },
    { ref: "Siddur_Ashkenaz,_Weekday,_Shacharit,_Pesukei_Dezimra,_Barukh_She'amar", title: "Baroukh Chéamar", heTitle: "ברוך שאמר" },
    { ref: "Siddur_Ashkenaz,_Weekday,_Shacharit,_Pesukei_Dezimra,_Hodu", title: "Hodou", heTitle: "הודו" },
    { ref: "Siddur_Ashkenaz,_Weekday,_Shacharit,_Pesukei_Dezimra,_Az_Yashir", title: "Az Yachir (Chirat HaYam)", heTitle: "אז ישיר" },
    { ref: "Siddur_Ashkenaz,_Weekday,_Shacharit,_Blessings_of_the_Shema,_Shema", title: "Chéma Israël", heTitle: "שמע ישראל" },
    { ref: "Siddur_Ashkenaz,_Weekday,_Shacharit,_Amidah,_Patriarchs", title: "Amida — Avot", heTitle: "עמידה — אבות" },
    { ref: "Siddur_Ashkenaz,_Weekday,_Shacharit,_Amidah,_Healing", title: "Amida — Guérison", heTitle: "רפאנו" },
    { ref: "Siddur_Ashkenaz,_Weekday,_Shacharit,_Amidah,_Peace", title: "Amida — Paix", heTitle: "שים שלום" },
    { ref: "Siddur_Ashkenaz,_Weekday,_Shacharit,_Amidah,_Concluding_Passage", title: "Amida — Conclusion", heTitle: "אלוקי נצור" },
    { ref: "Siddur_Ashkenaz,_Weekday,_Shacharit,_Post_Amidah,_Tachanun,_Nefilat_Apayim", title: "Tahanoun", heTitle: "תחנון" },
    { ref: "Siddur_Ashkenaz,_Weekday,_Shacharit,_Post_Amidah,_Avinu_Malkenu", title: "Avinou Malkénou", heTitle: "אבינו מלכנו" },
  ],
  minha: [
    { ref: "Siddur_Ashkenaz,_Weekday,_Minchah,_Ashrei", title: "Achré", heTitle: "אשרי" },
    { ref: "Siddur_Ashkenaz,_Weekday,_Minchah,_Amida,_Patriarchs", title: "Amida — Avot", heTitle: "עמידה — אבות" },
    { ref: "Siddur_Ashkenaz,_Weekday,_Minchah,_Amida,_Concluding_Passage", title: "Amida — Conclusion", heTitle: "אלוקי נצור" },
    { ref: "Siddur_Ashkenaz,_Weekday,_Minchah,_Concluding_Prayers,_Alenu", title: "Alénou", heTitle: "עלינו" },
  ],
  arvit: [
    { ref: "Siddur_Ashkenaz,_Weekday,_Maariv,_Vehu_Rachum", title: "Véhou Rahoum", heTitle: "והוא רחום" },
    { ref: "Siddur_Ashkenaz,_Weekday,_Maariv,_Blessings_of_the_Shema,_Shema", title: "Chéma du soir", heTitle: "שמע של ערבית" },
    { ref: "Siddur_Ashkenaz,_Weekday,_Maariv,_Amidah,_Patriarchs", title: "Amida — Avot", heTitle: "עמידה — אבות" },
    { ref: "Siddur_Ashkenaz,_Weekday,_Maariv,_Amidah,_Concluding_Passage", title: "Amida — Conclusion", heTitle: "אלוקי נצור" },
  ],
  shabbat: [
    { ref: "Siddur_Ashkenaz,_Shabbat,_Kabbalat_Shabbat,_Lekha_Dodi", title: "Lékha Dodi", heTitle: "לכה דודי" },
    { ref: "Siddur_Ashkenaz,_Shabbat,_Kabbalat_Shabbat,_Psalm_92", title: "Mizmor Chir léYom HaChabbat", heTitle: "מזמור שיר ליום השבת" },
    { ref: "Siddur_Ashkenaz,_Shabbat,_Maariv,_Veshamru", title: "Véchamrou", heTitle: "ושמרו" },
    { ref: "Siddur_Ashkenaz,_Shabbat,_Maariv,_Blessings_of_the_Shema,_Shema", title: "Chéma de Chabbat", heTitle: "שמע של שבת" },
    { ref: "Siddur_Ashkenaz,_Shabbat,_Maariv,_Amidah,_Patriarchs", title: "Amida de Chabbat soir", heTitle: "עמידת שבת ערבית" },
    { ref: "Siddur_Ashkenaz,_Shabbat,_Maariv,_Vay'chulu", title: "Vayékhoulou", heTitle: "ויכולו" },
    { ref: "Siddur_Ashkenaz,_Shabbat,_Shabbat_Evening,_Kiddush", title: "Kiddouch", heTitle: "קידוש" },
    { ref: "Siddur_Ashkenaz,_Shabbat,_Musaf_LeShabbat,_Amidah,_Patriarchs", title: "Moussaf — Avot", heTitle: "מוסף — אבות" },
    { ref: "Siddur_Ashkenaz,_Shabbat,_Havdalah", title: "Havdala", heTitle: "הבדלה" },
  ],
  hallel: [
    { ref: "Siddur_Ashkenaz,_Festivals,_Rosh_Chodesh,_Hallel,_Berakhah_before_the_Hallel", title: "Bénédiction du Hallel", heTitle: "ברכת ההלל" },
    { ref: "Siddur_Ashkenaz,_Festivals,_Rosh_Chodesh,_Hallel,_Psalm_113", title: "Psaume 113", heTitle: "תהילים קיג" },
    { ref: "Siddur_Ashkenaz,_Festivals,_Rosh_Chodesh,_Hallel,_Psalm_114", title: "Psaume 114", heTitle: "תהילים קיד" },
    { ref: "Siddur_Ashkenaz,_Festivals,_Rosh_Chodesh,_Hallel,_Psalm_115", title: "Psaume 115", heTitle: "תהילים קטו" },
    { ref: "Siddur_Ashkenaz,_Festivals,_Rosh_Chodesh,_Hallel,_Psalm_116", title: "Psaume 116", heTitle: "תהילים קטז" },
    { ref: "Siddur_Ashkenaz,_Festivals,_Rosh_Chodesh,_Hallel,_Psalm_117", title: "Psaume 117", heTitle: "תהילים קיז" },
    { ref: "Siddur_Ashkenaz,_Festivals,_Rosh_Chodesh,_Hallel,_Psalm_118", title: "Psaume 118", heTitle: "תהילים קיח" },
    { ref: "Siddur_Ashkenaz,_Festivals,_Rosh_Chodesh,_Hallel,_Berakhah_after_the_Hallel", title: "Bénédiction finale", heTitle: "ברכה אחרונה" },
  ],
  birkat: [
    { ref: "Siddur_Ashkenaz,_Berachot,_Birkat_HaMazon", title: "Birkat HaMazone", heTitle: "ברכת המזון" },
  ],
};

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
      const response = await fetch(
        `https://www.sefaria.org/api/texts/${encodeURIComponent(targetSection.ref)}?context=0`,
        { headers: { 'Accept': 'application/json' } }
      );

      if (!response.ok) {
        throw new Error(`Sefaria API error: ${response.status} for ref ${targetSection.ref}`);
      }

      const data = await response.json();
      const flattenText = (t: unknown): string[] => {
        if (Array.isArray(t)) return t.flatMap(flattenText);
        if (typeof t === 'string') return [t];
        return [];
      };

      return new Response(
        JSON.stringify({
          success: true,
          office,
          sectionIndex: section,
          title: targetSection.title,
          heTitle: targetSection.heTitle,
          hebrew: flattenText(data.he),
          french: flattenText(data.en),
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
