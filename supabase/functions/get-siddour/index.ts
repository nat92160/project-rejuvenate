const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Sefaria references for Siddour sections
const SIDDOUR_REFS: Record<string, { ref: string; title: string; heTitle: string }[]> = {
  shacharit: [
    { ref: "Siddur_Ashkenaz,_Weekday,_Shacharit,_Preparatory_Prayers,_Modeh_Ani", title: "Modeh Ani", heTitle: "מודה אני" },
    { ref: "Siddur_Ashkenaz,_Weekday,_Shacharit,_Preparatory_Prayers,_Washing_the_Hands", title: "Netilat Yadayim", heTitle: "נטילת ידים" },
    { ref: "Siddur_Ashkenaz,_Weekday,_Shacharit,_Preparatory_Prayers,_Morning_Blessings", title: "Birkhot HaShachar", heTitle: "ברכות השחר" },
    { ref: "Siddur_Ashkenaz,_Weekday,_Shacharit,_Pesukei_Dezimrah,_Introductory_Psalm", title: "Pessouké Dezimra", heTitle: "פסוקי דזמרא" },
    { ref: "Siddur_Ashkenaz,_Weekday,_Shacharit,_Shema", title: "Chema Israël", heTitle: "שמע ישראל" },
    { ref: "Siddur_Ashkenaz,_Weekday,_Shacharit,_Amidah", title: "Amida", heTitle: "עמידה" },
  ],
  minha: [
    { ref: "Siddur_Ashkenaz,_Weekday,_Mincha,_Ashrei", title: "Ashrei", heTitle: "אשרי" },
    { ref: "Siddur_Ashkenaz,_Weekday,_Mincha,_Amidah", title: "Amida de Minha", heTitle: "עמידת מנחה" },
  ],
  arvit: [
    { ref: "Siddur_Ashkenaz,_Weekday,_Maariv,_Shema", title: "Chema du soir", heTitle: "שמע של ערבית" },
    { ref: "Siddur_Ashkenaz,_Weekday,_Maariv,_Amidah", title: "Amida du soir", heTitle: "עמידת ערבית" },
  ],
  shabbat: [
    { ref: "Siddur_Ashkenaz,_Shabbat,_Kabbalat_Shabbat,_Lechu_Neranena", title: "Kabbalat Chabbat", heTitle: "קבלת שבת" },
    { ref: "Siddur_Ashkenaz,_Shabbat,_Shacharit,_Amidah", title: "Amida de Chabbat", heTitle: "עמידת שבת" },
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
        JSON.stringify({ success: false, error: 'Office must be one of: shacharit, minha, arvit, shabbat' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const sections = SIDDOUR_REFS[office];
    
    // If a specific section index is requested, fetch only that
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
          french: flattenText(data.en), // Sefaria returns English; closest available
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Return the table of contents for this office
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
