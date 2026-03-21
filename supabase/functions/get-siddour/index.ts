const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const r = (...parts: string[]) =>
  "Siddur_Ashkenaz,_" + parts.map(p => p.replace(/ /g, '_')).join(',_');

type Entry = { ref?: string; refs?: string[]; title: string; heTitle: string };

/* ── Weekday Amida refs (19 blessings) ── */
const AMIDA_SHACHARIT = [
  "Patriarchs","Divine Might","Holiness of God","Knowledge","Repentance",
  "Forgiveness","Redemption","Healing","Prosperity","Gathering the Exiles",
  "Justice","Against Enemies","The Righteous","Rebuilding Jerusalem",
  "Kingdom of David","Response to Prayer","Temple Service","Thanksgiving",
  "Birkat Kohanim","Peace","Concluding Passage",
].map(s => r("Weekday","Shacharit","Amidah",s));

const AMIDA_MINHA = [
  "Patriarchs","Divine Might","Holiness of God","Knowledge","Repentance",
  "Forgiveness","Redemption","Healing","Prosperity","Gathering the Exiles",
  "Justice","Against Enemies","The Righteous","Rebuilding Jerusalem",
  "Kingdom of David","Response to Prayer","Temple Service","Thanksgiving",
  "Birkat Kohanim","Peace","Concluding Passage",
].map(s => r("Weekday","Minchah","Amida",s));

const AMIDA_ARVIT = [
  "Patriarchs","Divine Might","Holiness of God","Knowledge","Repentance",
  "Forgiveness","Redemption","Healing","Prosperity","Gathering the Exiles",
  "Justice","Against Enemies","The Righteous","Rebuilding Jerusalem",
  "Kingdom of David","Response to Prayer","Temple Service","Thanksgiving",
  "Peace","Concluding Passage",
].map(s => r("Weekday","Maariv","Amidah",s));

/* ── Shabbat Amida refs ── */
const AMIDA_SHABBAT_ARVIT = [
  "Patriarchs","Divine Might","Holines of God's Name","Sanctity of the Day",
  "Temple Service","Thanksgiving","Peace","Concluding Passage",
].map(s => r("Shabbat","Maariv","Amidah",s));

const AMIDA_SHABBAT_SHACHARIT = [
  "Patriarchs","Divine Might","Kedushah","Holiness of God","Sanctity of the Day",
  "Temple Service","Thanksgiving","Birkat Kohanim","Peace","Concluding Passage",
].map(s => r("Shabbat","Shacharit","Amidah",s));

const AMIDA_MOUSSAF = [
  "Patriarchs","Divine Might","Kedushah","Holiness of God",
  "Sanctity of the Day/For Shabbat",
  "Temple Service","Thanksgiving","Birkat Kohanim","Peace","Concluding Passage",
].map(s => r("Shabbat","Musaf LeShabbat","Amidah",s));

const AMIDA_SHABBAT_MINHA = [
  "Patriarchs","Divine Might","Kedushah","Holiness of God","Sanctity of the Day",
  "Temple Service","Thanksgiving/Modim","Peace","Concluding Passage",
].map(s => r("Shabbat","Minchah","Amidah",s));

const SIDDOUR_REFS: Record<string, Entry[]> = {
  shacharit: [
    // ── Préparation ──
    { ref: r("Weekday","Shacharit","Preparatory Prayers","Modeh Ani"), title: "Modé Ani", heTitle: "מודה אני" },
    { ref: r("Weekday","Shacharit","Preparatory Prayers","Netilat Yadayim"), title: "Nétilat Yadaïm", heTitle: "נטילת ידים" },
    { ref: r("Weekday","Shacharit","Preparatory Prayers","Asher Yatzar"), title: "Achèr Yatsar", heTitle: "אשר יצר" },
    { ref: r("Weekday","Shacharit","Preparatory Prayers","Elokai Neshama"), title: "Élokaï Néchama", heTitle: "אלוקי נשמה" },
    { ref: r("Weekday","Shacharit","Preparatory Prayers","Tzitzit"), title: "Tsitsit", heTitle: "ציצית" },
    { ref: r("Weekday","Shacharit","Preparatory Prayers","Torah Blessings"), title: "Birkhot HaTorah", heTitle: "ברכות התורה" },
    { ref: r("Weekday","Shacharit","Preparatory Prayers","Torah Study"), title: "Étude de Torah", heTitle: "לימוד תורה" },
    { ref: r("Weekday","Shacharit","Preparatory Prayers","Tallit"), title: "Tallit", heTitle: "טלית" },
    { ref: r("Weekday","Shacharit","Preparatory Prayers","Tefillin"), title: "Téfillin", heTitle: "תפילין" },
    { ref: r("Weekday","Shacharit","Preparatory Prayers","Ma Tovu"), title: "Ma Tovou", heTitle: "מה טובו" },
    { ref: r("Weekday","Shacharit","Preparatory Prayers","Adon Olam"), title: "Adon Olam", heTitle: "אדון עולם" },
    { ref: r("Weekday","Shacharit","Preparatory Prayers","Yigdal"), title: "Yigdal", heTitle: "יגדל" },
    { ref: r("Weekday","Shacharit","Preparatory Prayers","Morning Blessings"), title: "Birkhot HaChahar", heTitle: "ברכות השחר" },
    { ref: r("Weekday","Shacharit","Preparatory Prayers","Akedah"), title: "Akéda", heTitle: "עקידה" },
    { ref: r("Weekday","Shacharit","Preparatory Prayers","Sovereignty of Heaven"), title: "Kabbalat Ol Malkhout", heTitle: "קבלת עול מלכות" },
    // Korbanot
    { ref: r("Weekday","Shacharit","Preparatory Prayers","Korbanot","Korban HaTamid"), title: "Korban HaTamid", heTitle: "קרבן התמיד" },
    { ref: r("Weekday","Shacharit","Preparatory Prayers","Korbanot","Ketoret"), title: "Kétoret", heTitle: "קטורת" },
    { ref: r("Weekday","Shacharit","Preparatory Prayers","Korbanot","Baraita of Rabbi Yishmael"), title: "Baraïta de Rabbi Yichmaël", heTitle: "ברייתא דרבי ישמעאל" },
    { ref: r("Weekday","Shacharit","Preparatory Prayers","Korbanot","Kaddish DeRabbanan"), title: "Kaddich Dérabbanane", heTitle: "קדיש דרבנן" },
    // ── Pessouké Dézimra ──
    { ref: r("Weekday","Shacharit","Pesukei Dezimra","Barukh She'amar"), title: "Baroukh Chéamar", heTitle: "ברוך שאמר" },
    { ref: r("Weekday","Shacharit","Pesukei Dezimra","Hodu"), title: "Hodou", heTitle: "הודו" },
    { ref: r("Weekday","Shacharit","Pesukei Dezimra","Mizmor Letoda"), title: "Mizmor Létoda", heTitle: "מזמור לתודה" },
    { ref: r("Weekday","Shacharit","Pesukei Dezimra","Yehi Chevod"), title: "Yéhi Khévod", heTitle: "יהי כבוד" },
    { ref: r("Weekday","Shacharit","Pesukei Dezimra","Ashrei"), title: "Achré", heTitle: "אשרי" },
    { ref: r("Weekday","Shacharit","Pesukei Dezimra","Psalm 146"), title: "Psaume 146", heTitle: "תהילים קמו" },
    { ref: r("Weekday","Shacharit","Pesukei Dezimra","Psalm 147"), title: "Psaume 147", heTitle: "תהילים קמז" },
    { ref: r("Weekday","Shacharit","Pesukei Dezimra","Psalm 148"), title: "Psaume 148", heTitle: "תהילים קמח" },
    { ref: r("Weekday","Shacharit","Pesukei Dezimra","Psalm 149"), title: "Psaume 149", heTitle: "תהילים קמט" },
    { ref: r("Weekday","Shacharit","Pesukei Dezimra","Psalm 150"), title: "Psaume 150", heTitle: "תהילים קנ" },
    { ref: r("Weekday","Shacharit","Pesukei Dezimra","Vayevarech David"), title: "Vayévarekh David", heTitle: "ויברך דוד" },
    { ref: r("Weekday","Shacharit","Pesukei Dezimra","Az Yashir"), title: "Az Yachir (Chirat HaYam)", heTitle: "אז ישיר" },
    { ref: r("Weekday","Shacharit","Pesukei Dezimra","Yishtabach"), title: "Yichtaba'h", heTitle: "ישתבח" },
    // ── Chéma et bénédictions ──
    { ref: r("Weekday","Shacharit","Blessings of the Shema","Barchu"), title: "Barékhou", heTitle: "ברכו" },
    { ref: r("Weekday","Shacharit","Blessings of the Shema","First Blessing before Shema"), title: "Yotsèr Or", heTitle: "יוצר אור" },
    { ref: r("Weekday","Shacharit","Blessings of the Shema","Second Blessing before Shema"), title: "Ahava Rabba", heTitle: "אהבה רבה" },
    { ref: r("Weekday","Shacharit","Blessings of the Shema","Shema"), title: "Chéma Israël", heTitle: "שמע ישראל" },
    { ref: r("Weekday","Shacharit","Blessings of the Shema","Blessing after Shema"), title: "Émèt Véyatsiv", heTitle: "אמת ויציב" },
    // ── Amida (bloc unique) ──
    { refs: AMIDA_SHACHARIT, title: "Amida de Cha'harit", heTitle: "עמידה — שחרית" },
    // ── Post-Amida ──
    { ref: r("Weekday","Shacharit","Post Amidah","Tachanun","Nefilat Apayim"), title: "Ta'hanoun — Néfilat Apaïm", heTitle: "נפילת אפים" },
    { ref: r("Weekday","Shacharit","Post Amidah","Tachanun","Shomer Yisrael"), title: "Chomèr Israël", heTitle: "שומר ישראל" },
    { ref: r("Weekday","Shacharit","Post Amidah","Tachanun","Half Kaddish"), title: "Demi-Kaddich", heTitle: "חצי קדיש" },
    { ref: r("Weekday","Shacharit","Post Amidah","Avinu Malkenu"), title: "Avinou Malkénou", heTitle: "אבינו מלכנו" },
    // ── Torah (Lun/Jeu) ──
    { ref: r("Weekday","Shacharit","Torah Reading","Removing the Torah from Ark","Vayehi Binsoa"), title: "Vayéhi Binsoa", heTitle: "ויהי בנסוע" },
    { ref: r("Weekday","Shacharit","Torah Reading","Reading from Sefer","Birkat HaTorah"), title: "Birkhot HaTorah (lecture)", heTitle: "ברכות התורה" },
    { ref: r("Weekday","Shacharit","Torah Reading","Returning Sefer to Aron","Yehalelu"), title: "Yéhalélou", heTitle: "יהללו" },
    // ── Conclusion ──
    { ref: r("Weekday","Shacharit","Concluding Prayers","Ashrei"), title: "Achré (conclusion)", heTitle: "אשרי" },
    { ref: r("Weekday","Shacharit","Concluding Prayers","Uva Letzion"), title: "Ouva Létsion", heTitle: "ובא לציון" },
    { ref: r("Weekday","Shacharit","Concluding Prayers","Kaddish Shalem"), title: "Kaddich Chalem", heTitle: "קדיש שלם" },
    { ref: r("Weekday","Shacharit","Concluding Prayers","Alenu"), title: "Alénou", heTitle: "עלינו" },
    { ref: r("Weekday","Shacharit","Concluding Prayers","Mourner's Kaddish"), title: "Kaddich Yatom", heTitle: "קדיש יתום" },
    { ref: r("Weekday","Shacharit","Concluding Prayers","Song of the Day"), title: "Chir Chel Yom", heTitle: "שיר של יום" },
    { ref: r("Weekday","Shacharit","Concluding Prayers","LeDavid"), title: "LéDavid", heTitle: "לדוד" },
    { ref: r("Weekday","Shacharit","Post Service","Six Remembrances"), title: "Chech Zékhirot", heTitle: "שש זכירות" },
  ],

  minha: [
    { ref: r("Weekday","Minchah","Ashrei"), title: "Achré", heTitle: "אשרי" },
    // ── Amida (bloc unique) ──
    { refs: AMIDA_MINHA, title: "Amida de Min'ha", heTitle: "עמידה — מנחה" },
    // ── Post-Amida ──
    { ref: r("Weekday","Minchah","Post Amidah","Tachanun","Nefilat Appayim"), title: "Ta'hanoun", heTitle: "נפילת אפים" },
    { ref: r("Weekday","Minchah","Post Amidah","Tachanun","Shomer Yisrael"), title: "Chomèr Israël", heTitle: "שומר ישראל" },
    { ref: r("Weekday","Minchah","Post Amidah","Kaddish Shalem"), title: "Kaddich Chalem", heTitle: "קדיש שלם" },
    { ref: r("Weekday","Minchah","Concluding Prayers","Alenu"), title: "Alénou", heTitle: "עלינו" },
    { ref: r("Weekday","Minchah","Concluding Prayers","Mourner's Kaddish"), title: "Kaddich Yatom", heTitle: "קדיש יתום" },
  ],

  arvit: [
    { ref: r("Weekday","Maariv","Vehu Rachum"), title: "Véhou Ra'houm", heTitle: "והוא רחום" },
    { ref: r("Weekday","Maariv","Barchu"), title: "Barékhou", heTitle: "ברכו" },
    { ref: r("Weekday","Maariv","Blessings of the Shema","First Blessing before Shema"), title: "Maariv Aravim", heTitle: "מעריב ערבים" },
    { ref: r("Weekday","Maariv","Blessings of the Shema","Second Blessing before Shema"), title: "Ahavat Olam", heTitle: "אהבת עולם" },
    { ref: r("Weekday","Maariv","Blessings of the Shema","Shema"), title: "Chéma du soir", heTitle: "שמע של ערבית" },
    { ref: r("Weekday","Maariv","Blessings of the Shema","First Blessing after Shema"), title: "Émèt Véémouná", heTitle: "אמת ואמונה" },
    { ref: r("Weekday","Maariv","Blessings of the Shema","Second Blessing after Shema"), title: "Hachkivénou", heTitle: "השכיבנו" },
    { ref: r("Weekday","Maariv","Blessings of the Shema","Half Kaddish"), title: "Demi-Kaddich", heTitle: "חצי קדיש" },
    // ── Amida (bloc unique) ──
    { refs: AMIDA_ARVIT, title: "Amida de Arvit", heTitle: "עמידה — ערבית" },
    // ── Conclusion ──
    { ref: r("Weekday","Maariv","Kaddish Shalem"), title: "Kaddich Chalem", heTitle: "קדיש שלם" },
    { ref: r("Weekday","Maariv","Alenu"), title: "Alénou", heTitle: "עלינו" },
    { ref: r("Weekday","Maariv","Mourner's Kaddish"), title: "Kaddich Yatom", heTitle: "קדיש יתום" },
    { ref: r("Weekday","Maariv","Sefirat HaOmer"), title: "Séfirat HaOmèr", heTitle: "ספירת העומר" },
    { ref: r("Weekday","Maariv","LeDavid"), title: "LéDavid", heTitle: "לדוד" },
    { ref: r("Weekday","Maariv","Keri'at Shema al Hamita"), title: "Chéma al Hamita", heTitle: "קריאת שמע על המיטה" },
  ],

  shabbat: [
    // ── Kabbalat Chabbat ──
    { ref: r("Shabbat","Kabbalat Shabbat","Yedid Nefesh"), title: "Yédid Néfech", heTitle: "ידיד נפש" },
    { ref: r("Shabbat","Kabbalat Shabbat","Psalm 95"), title: "Psaume 95 — Lékhou Néranéna", heTitle: "לכו נרננה" },
    { ref: r("Shabbat","Kabbalat Shabbat","Psalm 96"), title: "Psaume 96 — Chirou", heTitle: "שירו לה'" },
    { ref: r("Shabbat","Kabbalat Shabbat","Psalm 97"), title: "Psaume 97 — Hachem Malakh", heTitle: "ה' מלך" },
    { ref: r("Shabbat","Kabbalat Shabbat","Psalm 98"), title: "Psaume 98 — Mizmor", heTitle: "מזמור" },
    { ref: r("Shabbat","Kabbalat Shabbat","Psalm 99"), title: "Psaume 99 — Hachem Malakh", heTitle: "ה' מלך ירגזו" },
    { ref: r("Shabbat","Kabbalat Shabbat","Psalm 29"), title: "Psaume 29 — Mizmor LéDavid", heTitle: "מזמור לדוד" },
    { ref: r("Shabbat","Kabbalat Shabbat","Ana Bekoach"), title: "Ana Békoa'h", heTitle: "אנא בכח" },
    { ref: r("Shabbat","Kabbalat Shabbat","Lekha Dodi"), title: "Lékha Dodi", heTitle: "לכה דודי" },
    { ref: r("Shabbat","Kabbalat Shabbat","Psalm 92"), title: "Mizmor Chir léYom HaChabbat", heTitle: "מזמור שיר ליום השבת" },
    { ref: r("Shabbat","Kabbalat Shabbat","Psalm 93"), title: "Psaume 93", heTitle: "ה' מלך גאות" },
    { ref: r("Shabbat","Kabbalat Shabbat","Mourner's Kaddish"), title: "Kaddich Yatom", heTitle: "קדיש יתום" },
    { ref: r("Shabbat","Kabbalat Shabbat","Bameh Madlikin"), title: "Bamé Madlikin", heTitle: "במה מדליקין" },
    // ── Arvit Chabbat ──
    { ref: r("Shabbat","Maariv","Barchu"), title: "Barékhou", heTitle: "ברכו" },
    { ref: r("Shabbat","Maariv","Blessings of the Shema","Shema"), title: "Chéma de Chabbat", heTitle: "שמע של שבת" },
    { ref: r("Shabbat","Maariv","Veshamru"), title: "Véchamrou", heTitle: "ושמרו" },
    { refs: AMIDA_SHABBAT_ARVIT, title: "Amida Arvit de Chabbat", heTitle: "עמידת שבת ערבית" },
    { ref: r("Shabbat","Maariv","Vay'chulu"), title: "Vayékhoulou", heTitle: "ויכולו" },
    { ref: r("Shabbat","Shabbat Evening","Kiddush"), title: "Kiddouch du vendredi soir", heTitle: "קידוש" },
    // ── Chaharit Chabbat ──
    { ref: r("Shabbat","Shacharit","Pesukei Dezimra","Nishmat Kol Chai"), title: "Nichmat Kol 'Haï", heTitle: "נשמת כל חי" },
    { ref: r("Shabbat","Shacharit","Pesukei Dezimra","Shochen Ad"), title: "Chokhèn Ad", heTitle: "שוכן עד" },
    { ref: r("Shabbat","Shacharit","Blessings of the Shema","Shema"), title: "Chéma Chaharit Chabbat", heTitle: "שמע שחרית שבת" },
    { refs: AMIDA_SHABBAT_SHACHARIT, title: "Amida Chaharit de Chabbat", heTitle: "עמידת שחרית שבת" },
    // ── Moussaf ──
    { refs: AMIDA_MOUSSAF, title: "Amida du Moussaf", heTitle: "עמידת מוסף" },
    { ref: r("Shabbat","Musaf LeShabbat","Ein Keloheinu"), title: "Ein Kélohénou", heTitle: "אין כאלוהינו" },
    { ref: r("Shabbat","Musaf LeShabbat","Alenu"), title: "Alénou (Moussaf)", heTitle: "עלינו" },
    // ── Min'ha Chabbat ──
    { ref: r("Shabbat","Minchah","Ashrei"), title: "Achré (Min'ha Chabbat)", heTitle: "אשרי" },
    { ref: r("Shabbat","Minchah","Uva Letzion"), title: "Ouva Létsion", heTitle: "ובא לציון" },
    { refs: AMIDA_SHABBAT_MINHA, title: "Amida Min'ha de Chabbat", heTitle: "עמידת מנחה שבת" },
    { ref: r("Shabbat","Minchah","Tzidkatkhah Tzedek"), title: "Tsidkatkha Tsédèk", heTitle: "צדקתך צדק" },
    { ref: r("Shabbat","Daytime Meal","Kiddusha Rabba"), title: "Kiddouch Rabba (jour)", heTitle: "קידושא רבא" },
    { ref: r("Shabbat","Havdalah"), title: "Havdala", heTitle: "הבדלה" },
  ],

  hallel: [
    { ref: r("Festivals","Rosh Chodesh","Hallel","Berakhah before the Hallel"), title: "Bénédiction du Hallel", heTitle: "ברכת ההלל" },
    { ref: r("Festivals","Rosh Chodesh","Hallel","Psalm 113"), title: "Psaume 113", heTitle: "תהילים קיג" },
    { ref: r("Festivals","Rosh Chodesh","Hallel","Psalm 114"), title: "Psaume 114", heTitle: "תהילים קיד" },
    { ref: r("Festivals","Rosh Chodesh","Hallel","Psalm 115"), title: "Psaume 115", heTitle: "תהילים קטו" },
    { ref: r("Festivals","Rosh Chodesh","Hallel","Psalm 116"), title: "Psaume 116", heTitle: "תהילים קטז" },
    { ref: r("Festivals","Rosh Chodesh","Hallel","Psalm 117"), title: "Psaume 117", heTitle: "תהילים קיז" },
    { ref: r("Festivals","Rosh Chodesh","Hallel","Psalm 118"), title: "Psaume 118", heTitle: "תהילים קיח" },
    { ref: r("Festivals","Rosh Chodesh","Hallel","Berakhah after the Hallel"), title: "Bénédiction finale", heTitle: "ברכה אחרונה" },
  ],

  birkat: [
    { ref: r("Berachot","Birkat HaMazon"), title: "Birkat HaMazone", heTitle: "ברכת המזון" },
    { ref: r("Berachot","Birkat Hanehenin","Eating","Barachot Rishonot"), title: "Bérakhot Richonoté", heTitle: "ברכות ראשונות" },
    { ref: r("Berachot","Birkat Hanehenin","Eating","Brachot Achronot","Al Hamichyah"), title: "Al Hami'hya", heTitle: "על המחיה" },
    { ref: r("Berachot","Birkat Hanehenin","Eating","Brachot Achronot","Borei Nefashot"), title: "Boré Néfachot", heTitle: "בורא נפשות" },
    { ref: r("Berachot","Tefillat HaDerech"), title: "Téfilat HaDérèkh", heTitle: "תפילת הדרך" },
  ],

  kaddish: [
    { ref: r("Kaddish","Half Kaddish"), title: "Demi-Kaddich", heTitle: "חצי קדיש" },
    { ref: r("Kaddish","Mourner's Kaddish"), title: "Kaddich Yatom", heTitle: "קדיש יתום" },
    { ref: r("Kaddish","Kaddish Shalem"), title: "Kaddich Chalem", heTitle: "קדיש שלם" },
    { ref: r("Kaddish","Kaddish d'Rabbanan"), title: "Kaddich Dérabbanane", heTitle: "קדיש דרבנן" },
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
        // Multi-ref entry (e.g. full Amida) — fetch all in parallel and concatenate
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
