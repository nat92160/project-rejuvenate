const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const SIDDOUR_REFS: Record<string, { ref: string; title: string; heTitle: string }[]> = {
  shacharit: [
    { ref: "Siddur_Ashkenaz,_Weekday,_Shacharit,_Preparatory_Prayers,_Modeh_Ani", title: "Modé Ani", heTitle: "מודה אני" },
    { ref: "Siddur_Ashkenaz,_Weekday,_Shacharit,_Preparatory_Prayers,_Washing_the_Hands", title: "Nétilat Yadaïm", heTitle: "נטילת ידים" },
    { ref: "Siddur_Ashkenaz,_Weekday,_Shacharit,_Preparatory_Prayers,_Morning_Blessings", title: "Birkhot HaChahar", heTitle: "ברכות השחר" },
    { ref: "Siddur_Ashkenaz,_Weekday,_Shacharit,_Preparatory_Prayers,_Akedah", title: "Akéda", heTitle: "עקידה" },
    { ref: "Siddur_Ashkenaz,_Weekday,_Shacharit,_Pesukei_Dezimrah,_Introductory_Psalm", title: "Pessouké Dézimra", heTitle: "פסוקי דזמרא" },
    { ref: "Siddur_Ashkenaz,_Weekday,_Shacharit,_Pesukei_Dezimrah,_Baruch_She'amar", title: "Baroukh Chéamar", heTitle: "ברוך שאמר" },
    { ref: "Siddur_Ashkenaz,_Weekday,_Shacharit,_Pesukei_Dezimrah,_Ashrei", title: "Achré", heTitle: "אשרי" },
    { ref: "Siddur_Ashkenaz,_Weekday,_Shacharit,_Pesukei_Dezimrah,_Yishtabach", title: "Yichtabah", heTitle: "ישתבח" },
    { ref: "Siddur_Ashkenaz,_Weekday,_Shacharit,_Shema", title: "Chéma Israël", heTitle: "שמע ישראל" },
    { ref: "Siddur_Ashkenaz,_Weekday,_Shacharit,_Amidah", title: "Amida (Chaharit)", heTitle: "עמידה" },
    { ref: "Siddur_Ashkenaz,_Weekday,_Shacharit,_Post_Amidah,_Tachanun", title: "Tahanoun", heTitle: "תחנון" },
    { ref: "Siddur_Ashkenaz,_Weekday,_Shacharit,_Post_Amidah,_Ashrei", title: "Achré (fin)", heTitle: "אשרי" },
    { ref: "Siddur_Ashkenaz,_Weekday,_Shacharit,_Post_Amidah,_Aleinu", title: "Alénou", heTitle: "עלינו" },
  ],
  minha: [
    { ref: "Siddur_Ashkenaz,_Weekday,_Mincha,_Ashrei", title: "Achré", heTitle: "אשרי" },
    { ref: "Siddur_Ashkenaz,_Weekday,_Mincha,_Amidah", title: "Amida (Min'ha)", heTitle: "עמידת מנחה" },
    { ref: "Siddur_Ashkenaz,_Weekday,_Mincha,_Post_Amidah,_Tachanun", title: "Tahanoun", heTitle: "תחנון" },
    { ref: "Siddur_Ashkenaz,_Weekday,_Mincha,_Post_Amidah,_Aleinu", title: "Alénou", heTitle: "עלינו" },
  ],
  arvit: [
    { ref: "Siddur_Ashkenaz,_Weekday,_Maariv,_Shema", title: "Chéma du soir", heTitle: "שמע של ערבית" },
    { ref: "Siddur_Ashkenaz,_Weekday,_Maariv,_Amidah", title: "Amida du soir", heTitle: "עמידת ערבית" },
    { ref: "Siddur_Ashkenaz,_Weekday,_Maariv,_Post_Amidah,_Aleinu", title: "Alénou", heTitle: "עלינו" },
  ],
  shabbat: [
    { ref: "Siddur_Ashkenaz,_Shabbat,_Kabbalat_Shabbat,_Lechu_Neranena", title: "Lékha Dodi", heTitle: "לכה דודי" },
    { ref: "Siddur_Ashkenaz,_Shabbat,_Kabbalat_Shabbat,_Psalms_for_Friday", title: "Psaumes du vendredi", heTitle: "מזמורי שבת" },
    { ref: "Siddur_Ashkenaz,_Shabbat,_Shacharit,_Amidah", title: "Amida de Chabbat", heTitle: "עמידת שבת" },
    { ref: "Siddur_Ashkenaz,_Shabbat,_Musaf,_Amidah", title: "Moussaf", heTitle: "מוסף" },
  ],
  hallel: [
    { ref: "Siddur_Ashkenaz,_Festivals,_Hallel,_Full_Hallel", title: "Hallel complet", heTitle: "הלל שלם" },
  ],
  birkat: [
    { ref: "Siddur_Ashkenaz,_Weekday,_Birkat_Hamazon,_Birkat_Hamazon", title: "Birkat HaMazone", heTitle: "ברכת המזון" },
  ],
  bedtime: [
    { ref: "Siddur_Ashkenaz,_Weekday,_Bedtime_Shema,_Shema", title: "Chéma du coucher", heTitle: "קריאת שמע על המיטה" },
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
        throw new Error(`Sefaria API error: ${response.status}`);
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
