const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

/* ──────────────────────────────────────────────
   Helper: build a Sefaria ref from path segments
   e.g. ref("Weekday","Shacharit","Amidah","Patriarchs")
   → "Siddur_Ashkenaz,_Weekday,_Shacharit,_Amidah,_Patriarchs"
   ────────────────────────────────────────────── */
const ref = (...parts: string[]) =>
  "Siddur_Ashkenaz,_" + parts.map(p => p.replace(/ /g, '_')).join(',_');

/* ──────────────────────────────────────────────
   FULL SIDDOUR — all offices with every section
   ────────────────────────────────────────────── */
type Entry = { ref: string; title: string; heTitle: string };

const SIDDOUR_REFS: Record<string, Entry[]> = {
  shacharit: [
    // ── Préparation ──
    { ref: ref("Weekday","Shacharit","Preparatory Prayers","Modeh Ani"), title: "Modé Ani", heTitle: "מודה אני" },
    { ref: ref("Weekday","Shacharit","Preparatory Prayers","Netilat Yadayim"), title: "Nétilat Yadaïm", heTitle: "נטילת ידים" },
    { ref: ref("Weekday","Shacharit","Preparatory Prayers","Asher Yatzar"), title: "Achèr Yatsar", heTitle: "אשר יצר" },
    { ref: ref("Weekday","Shacharit","Preparatory Prayers","Elokai Neshama"), title: "Élokaï Néchama", heTitle: "אלוקי נשמה" },
    { ref: ref("Weekday","Shacharit","Preparatory Prayers","Tzitzit"), title: "Tsitsit", heTitle: "ציצית" },
    { ref: ref("Weekday","Shacharit","Preparatory Prayers","Torah Blessings"), title: "Birkhot HaTorah", heTitle: "ברכות התורה" },
    { ref: ref("Weekday","Shacharit","Preparatory Prayers","Torah Study"), title: "Étude de Torah", heTitle: "לימוד תורה" },
    { ref: ref("Weekday","Shacharit","Preparatory Prayers","Tallit"), title: "Tallit", heTitle: "טלית" },
    { ref: ref("Weekday","Shacharit","Preparatory Prayers","Tefillin"), title: "Téfillin", heTitle: "תפילין" },
    { ref: ref("Weekday","Shacharit","Preparatory Prayers","Ma Tovu"), title: "Ma Tovou", heTitle: "מה טובו" },
    { ref: ref("Weekday","Shacharit","Preparatory Prayers","Adon Olam"), title: "Adon Olam", heTitle: "אדון עולם" },
    { ref: ref("Weekday","Shacharit","Preparatory Prayers","Yigdal"), title: "Yigdal", heTitle: "יגדל" },
    { ref: ref("Weekday","Shacharit","Preparatory Prayers","Morning Blessings"), title: "Birkhot HaChahar", heTitle: "ברכות השחר" },
    { ref: ref("Weekday","Shacharit","Preparatory Prayers","Akedah"), title: "Akéda", heTitle: "עקידה" },
    { ref: ref("Weekday","Shacharit","Preparatory Prayers","Sovereignty of Heaven"), title: "Kabbalat Ol Malkhout", heTitle: "קבלת עול מלכות" },
    // Korbanot
    { ref: ref("Weekday","Shacharit","Preparatory Prayers","Korbanot","Korban HaTamid"), title: "Korban HaTamid", heTitle: "קרבן התמיד" },
    { ref: ref("Weekday","Shacharit","Preparatory Prayers","Korbanot","Ketoret"), title: "Kétoret", heTitle: "קטורת" },
    { ref: ref("Weekday","Shacharit","Preparatory Prayers","Korbanot","Baraita of Rabbi Yishmael"), title: "Baraïta de Rabbi Yichmaël", heTitle: "ברייתא דרבי ישמעאל" },
    { ref: ref("Weekday","Shacharit","Preparatory Prayers","Korbanot","Kaddish DeRabbanan"), title: "Kaddich Dérabbanane", heTitle: "קדיש דרבנן" },
    // ── Pessouké Dézimra ──
    { ref: ref("Weekday","Shacharit","Pesukei Dezimra","Barukh She'amar"), title: "Baroukh Chéamar", heTitle: "ברוך שאמר" },
    { ref: ref("Weekday","Shacharit","Pesukei Dezimra","Hodu"), title: "Hodou", heTitle: "הודו" },
    { ref: ref("Weekday","Shacharit","Pesukei Dezimra","Mizmor Letoda"), title: "Mizmor Létoda", heTitle: "מזמור לתודה" },
    { ref: ref("Weekday","Shacharit","Pesukei Dezimra","Yehi Chevod"), title: "Yéhi Khévod", heTitle: "יהי כבוד" },
    { ref: ref("Weekday","Shacharit","Pesukei Dezimra","Ashrei"), title: "Achré", heTitle: "אשרי" },
    { ref: ref("Weekday","Shacharit","Pesukei Dezimra","Psalm 146"), title: "Psaume 146", heTitle: "תהילים קמו" },
    { ref: ref("Weekday","Shacharit","Pesukei Dezimra","Psalm 147"), title: "Psaume 147", heTitle: "תהילים קמז" },
    { ref: ref("Weekday","Shacharit","Pesukei Dezimra","Psalm 148"), title: "Psaume 148", heTitle: "תהילים קמח" },
    { ref: ref("Weekday","Shacharit","Pesukei Dezimra","Psalm 149"), title: "Psaume 149", heTitle: "תהילים קמט" },
    { ref: ref("Weekday","Shacharit","Pesukei Dezimra","Psalm 150"), title: "Psaume 150", heTitle: "תהילים קנ" },
    { ref: ref("Weekday","Shacharit","Pesukei Dezimra","Vayevarech David"), title: "Vayévarekh David", heTitle: "ויברך דוד" },
    { ref: ref("Weekday","Shacharit","Pesukei Dezimra","Az Yashir"), title: "Az Yachir (Chirat HaYam)", heTitle: "אז ישיר" },
    { ref: ref("Weekday","Shacharit","Pesukei Dezimra","Yishtabach"), title: "Yichtaba'h", heTitle: "ישתבח" },
    // ── Chéma et ses bénédictions ──
    { ref: ref("Weekday","Shacharit","Blessings of the Shema","Barchu"), title: "Barékhou", heTitle: "ברכו" },
    { ref: ref("Weekday","Shacharit","Blessings of the Shema","First Blessing before Shema"), title: "Yotsèr Or", heTitle: "יוצר אור" },
    { ref: ref("Weekday","Shacharit","Blessings of the Shema","Second Blessing before Shema"), title: "Ahava Rabba", heTitle: "אהבה רבה" },
    { ref: ref("Weekday","Shacharit","Blessings of the Shema","Shema"), title: "Chéma Israël", heTitle: "שמע ישראל" },
    { ref: ref("Weekday","Shacharit","Blessings of the Shema","Blessing after Shema"), title: "Émèt Véyatsiv", heTitle: "אמת ויציב" },
    // ── Amida complète ──
    { ref: ref("Weekday","Shacharit","Amidah","Patriarchs"), title: "Amida — Avot", heTitle: "אבות" },
    { ref: ref("Weekday","Shacharit","Amidah","Divine Might"), title: "Amida — Guévourot", heTitle: "גבורות" },
    { ref: ref("Weekday","Shacharit","Amidah","Holiness of God"), title: "Amida — Kédouchat Hachem", heTitle: "קדושת השם" },
    { ref: ref("Weekday","Shacharit","Amidah","Knowledge"), title: "Amida — Daat", heTitle: "אתה חונן" },
    { ref: ref("Weekday","Shacharit","Amidah","Repentance"), title: "Amida — Téchouva", heTitle: "השיבנו" },
    { ref: ref("Weekday","Shacharit","Amidah","Forgiveness"), title: "Amida — Séli'ha", heTitle: "סלח לנו" },
    { ref: ref("Weekday","Shacharit","Amidah","Redemption"), title: "Amida — Guéoula", heTitle: "גאולה" },
    { ref: ref("Weekday","Shacharit","Amidah","Healing"), title: "Amida — Réfaénou", heTitle: "רפאנו" },
    { ref: ref("Weekday","Shacharit","Amidah","Prosperity"), title: "Amida — Birkate Hachanim", heTitle: "ברכת השנים" },
    { ref: ref("Weekday","Shacharit","Amidah","Gathering the Exiles"), title: "Amida — Kibboutz Galiouyot", heTitle: "קיבוץ גלויות" },
    { ref: ref("Weekday","Shacharit","Amidah","Justice"), title: "Amida — Michpat", heTitle: "השיבה שופטינו" },
    { ref: ref("Weekday","Shacharit","Amidah","Against Enemies"), title: "Amida — Birkat HaMinim", heTitle: "ברכת המינים" },
    { ref: ref("Weekday","Shacharit","Amidah","The Righteous"), title: "Amida — Tsadikim", heTitle: "על הצדיקים" },
    { ref: ref("Weekday","Shacharit","Amidah","Rebuilding Jerusalem"), title: "Amida — Yérouchalayim", heTitle: "בונה ירושלים" },
    { ref: ref("Weekday","Shacharit","Amidah","Kingdom of David"), title: "Amida — Malkhout David", heTitle: "את צמח דוד" },
    { ref: ref("Weekday","Shacharit","Amidah","Response to Prayer"), title: "Amida — Choméa Téfila", heTitle: "שומע תפילה" },
    { ref: ref("Weekday","Shacharit","Amidah","Temple Service"), title: "Amida — Avoda", heTitle: "רצה" },
    { ref: ref("Weekday","Shacharit","Amidah","Thanksgiving"), title: "Amida — Hodaa", heTitle: "מודים" },
    { ref: ref("Weekday","Shacharit","Amidah","Birkat Kohanim"), title: "Amida — Birkat Kohanim", heTitle: "ברכת כהנים" },
    { ref: ref("Weekday","Shacharit","Amidah","Peace"), title: "Amida — Chalom", heTitle: "שים שלום" },
    { ref: ref("Weekday","Shacharit","Amidah","Concluding Passage"), title: "Amida — Élokaï Nétsor", heTitle: "אלוקי נצור" },
    // ── Post-Amida ──
    { ref: ref("Weekday","Shacharit","Post Amidah","Tachanun","Nefilat Apayim"), title: "Ta'hanoun — Néfilat Apaïm", heTitle: "נפילת אפים" },
    { ref: ref("Weekday","Shacharit","Post Amidah","Tachanun","Shomer Yisrael"), title: "Chomèr Israël", heTitle: "שומר ישראל" },
    { ref: ref("Weekday","Shacharit","Post Amidah","Tachanun","Half Kaddish"), title: "Demi-Kaddich (après Ta'hanoun)", heTitle: "חצי קדיש" },
    { ref: ref("Weekday","Shacharit","Post Amidah","Avinu Malkenu"), title: "Avinou Malkénou", heTitle: "אבינו מלכנו" },
    // ── Lecture de la Torah (Lun/Jeu) ──
    { ref: ref("Weekday","Shacharit","Torah Reading","Removing the Torah from Ark","Vayehi Binsoa"), title: "Vayéhi Binsoa", heTitle: "ויהי בנסוע" },
    { ref: ref("Weekday","Shacharit","Torah Reading","Reading from Sefer","Birkat HaTorah"), title: "Birkhot HaTorah (lecture)", heTitle: "ברכות התורה" },
    { ref: ref("Weekday","Shacharit","Torah Reading","Returning Sefer to Aron","Yehalelu"), title: "Yéhalélou", heTitle: "יהללו" },
    // ── Conclusion ──
    { ref: ref("Weekday","Shacharit","Concluding Prayers","Ashrei"), title: "Achré (conclusion)", heTitle: "אשרי" },
    { ref: ref("Weekday","Shacharit","Concluding Prayers","Uva Letzion"), title: "Ouva Létsion", heTitle: "ובא לציון" },
    { ref: ref("Weekday","Shacharit","Concluding Prayers","Kaddish Shalem"), title: "Kaddich Chalem", heTitle: "קדיש שלם" },
    { ref: ref("Weekday","Shacharit","Concluding Prayers","Alenu"), title: "Alénou", heTitle: "עלינו" },
    { ref: ref("Weekday","Shacharit","Concluding Prayers","Mourner's Kaddish"), title: "Kaddich Yatom", heTitle: "קדיש יתום" },
    { ref: ref("Weekday","Shacharit","Concluding Prayers","Song of the Day"), title: "Chir Chel Yom", heTitle: "שיר של יום" },
    { ref: ref("Weekday","Shacharit","Concluding Prayers","LeDavid"), title: "LéDavid", heTitle: "לדוד" },
    // Post-service
    { ref: ref("Weekday","Shacharit","Post Service","Six Remembrances"), title: "Chech Zékhirot", heTitle: "שש זכירות" },
  ],

  minha: [
    { ref: ref("Weekday","Minchah","Ashrei"), title: "Achré", heTitle: "אשרי" },
    // ── Amida complète ──
    { ref: ref("Weekday","Minchah","Amida","Patriarchs"), title: "Amida — Avot", heTitle: "אבות" },
    { ref: ref("Weekday","Minchah","Amida","Divine Might"), title: "Amida — Guévourot", heTitle: "גבורות" },
    { ref: ref("Weekday","Minchah","Amida","Holiness of God"), title: "Amida — Kédouchat Hachem", heTitle: "קדושת השם" },
    { ref: ref("Weekday","Minchah","Amida","Knowledge"), title: "Amida — Daat", heTitle: "אתה חונן" },
    { ref: ref("Weekday","Minchah","Amida","Repentance"), title: "Amida — Téchouva", heTitle: "השיבנו" },
    { ref: ref("Weekday","Minchah","Amida","Forgiveness"), title: "Amida — Séli'ha", heTitle: "סלח לנו" },
    { ref: ref("Weekday","Minchah","Amida","Redemption"), title: "Amida — Guéoula", heTitle: "גאולה" },
    { ref: ref("Weekday","Minchah","Amida","Healing"), title: "Amida — Réfaénou", heTitle: "רפאנו" },
    { ref: ref("Weekday","Minchah","Amida","Prosperity"), title: "Amida — Birkate Hachanim", heTitle: "ברכת השנים" },
    { ref: ref("Weekday","Minchah","Amida","Gathering the Exiles"), title: "Amida — Kibboutz Galiouyot", heTitle: "קיבוץ גלויות" },
    { ref: ref("Weekday","Minchah","Amida","Justice"), title: "Amida — Michpat", heTitle: "השיבה שופטינו" },
    { ref: ref("Weekday","Minchah","Amida","Against Enemies"), title: "Amida — Birkat HaMinim", heTitle: "ברכת המינים" },
    { ref: ref("Weekday","Minchah","Amida","The Righteous"), title: "Amida — Tsadikim", heTitle: "על הצדיקים" },
    { ref: ref("Weekday","Minchah","Amida","Rebuilding Jerusalem"), title: "Amida — Yérouchalayim", heTitle: "בונה ירושלים" },
    { ref: ref("Weekday","Minchah","Amida","Kingdom of David"), title: "Amida — Malkhout David", heTitle: "את צמח דוד" },
    { ref: ref("Weekday","Minchah","Amida","Response to Prayer"), title: "Amida — Choméa Téfila", heTitle: "שומע תפילה" },
    { ref: ref("Weekday","Minchah","Amida","Temple Service"), title: "Amida — Avoda", heTitle: "רצה" },
    { ref: ref("Weekday","Minchah","Amida","Thanksgiving"), title: "Amida — Hodaa", heTitle: "מודים" },
    { ref: ref("Weekday","Minchah","Amida","Birkat Kohanim"), title: "Amida — Birkat Kohanim", heTitle: "ברכת כהנים" },
    { ref: ref("Weekday","Minchah","Amida","Peace"), title: "Amida — Chalom", heTitle: "שים שלום" },
    { ref: ref("Weekday","Minchah","Amida","Concluding Passage"), title: "Amida — Élokaï Nétsor", heTitle: "אלוקי נצור" },
    // ── Post-Amida ──
    { ref: ref("Weekday","Minchah","Post Amidah","Tachanun","Nefilat Appayim"), title: "Ta'hanoun — Néfilat Apaïm", heTitle: "נפילת אפים" },
    { ref: ref("Weekday","Minchah","Post Amidah","Tachanun","Shomer Yisrael"), title: "Chomèr Israël", heTitle: "שומר ישראל" },
    { ref: ref("Weekday","Minchah","Post Amidah","Kaddish Shalem"), title: "Kaddich Chalem", heTitle: "קדיש שלם" },
    // ── Conclusion ──
    { ref: ref("Weekday","Minchah","Concluding Prayers","Alenu"), title: "Alénou", heTitle: "עלינו" },
    { ref: ref("Weekday","Minchah","Concluding Prayers","Mourner's Kaddish"), title: "Kaddich Yatom", heTitle: "קדיש יתום" },
  ],

  arvit: [
    { ref: ref("Weekday","Maariv","Vehu Rachum"), title: "Véhou Ra'houm", heTitle: "והוא רחום" },
    { ref: ref("Weekday","Maariv","Barchu"), title: "Barékhou", heTitle: "ברכו" },
    { ref: ref("Weekday","Maariv","Blessings of the Shema","First Blessing before Shema"), title: "Maariv Aravim", heTitle: "מעריב ערבים" },
    { ref: ref("Weekday","Maariv","Blessings of the Shema","Second Blessing before Shema"), title: "Ahavat Olam", heTitle: "אהבת עולם" },
    { ref: ref("Weekday","Maariv","Blessings of the Shema","Shema"), title: "Chéma du soir", heTitle: "שמע של ערבית" },
    { ref: ref("Weekday","Maariv","Blessings of the Shema","First Blessing after Shema"), title: "Émèt Véémouná", heTitle: "אמת ואמונה" },
    { ref: ref("Weekday","Maariv","Blessings of the Shema","Second Blessing after Shema"), title: "Hachkivénou", heTitle: "השכיבנו" },
    { ref: ref("Weekday","Maariv","Blessings of the Shema","Half Kaddish"), title: "Demi-Kaddich", heTitle: "חצי קדיש" },
    // ── Amida complète ──
    { ref: ref("Weekday","Maariv","Amidah","Patriarchs"), title: "Amida — Avot", heTitle: "אבות" },
    { ref: ref("Weekday","Maariv","Amidah","Divine Might"), title: "Amida — Guévourot", heTitle: "גבורות" },
    { ref: ref("Weekday","Maariv","Amidah","Holiness of God"), title: "Amida — Kédouchat Hachem", heTitle: "קדושת השם" },
    { ref: ref("Weekday","Maariv","Amidah","Knowledge"), title: "Amida — Daat", heTitle: "אתה חונן" },
    { ref: ref("Weekday","Maariv","Amidah","Repentance"), title: "Amida — Téchouva", heTitle: "השיבנו" },
    { ref: ref("Weekday","Maariv","Amidah","Forgiveness"), title: "Amida — Séli'ha", heTitle: "סלח לנו" },
    { ref: ref("Weekday","Maariv","Amidah","Redemption"), title: "Amida — Guéoula", heTitle: "גאולה" },
    { ref: ref("Weekday","Maariv","Amidah","Healing"), title: "Amida — Réfaénou", heTitle: "רפאנו" },
    { ref: ref("Weekday","Maariv","Amidah","Prosperity"), title: "Amida — Birkate Hachanim", heTitle: "ברכת השנים" },
    { ref: ref("Weekday","Maariv","Amidah","Gathering the Exiles"), title: "Amida — Kibboutz Galiouyot", heTitle: "קיבוץ גלויות" },
    { ref: ref("Weekday","Maariv","Amidah","Justice"), title: "Amida — Michpat", heTitle: "השיבה שופטינו" },
    { ref: ref("Weekday","Maariv","Amidah","Against Enemies"), title: "Amida — Birkat HaMinim", heTitle: "ברכת המינים" },
    { ref: ref("Weekday","Maariv","Amidah","The Righteous"), title: "Amida — Tsadikim", heTitle: "על הצדיקים" },
    { ref: ref("Weekday","Maariv","Amidah","Rebuilding Jerusalem"), title: "Amida — Yérouchalayim", heTitle: "בונה ירושלים" },
    { ref: ref("Weekday","Maariv","Amidah","Kingdom of David"), title: "Amida — Malkhout David", heTitle: "את צמח דוד" },
    { ref: ref("Weekday","Maariv","Amidah","Response to Prayer"), title: "Amida — Choméa Téfila", heTitle: "שומע תפילה" },
    { ref: ref("Weekday","Maariv","Amidah","Temple Service"), title: "Amida — Avoda", heTitle: "רצה" },
    { ref: ref("Weekday","Maariv","Amidah","Thanksgiving"), title: "Amida — Hodaa", heTitle: "מודים" },
    { ref: ref("Weekday","Maariv","Amidah","Peace"), title: "Amida — Chalom", heTitle: "שים שלום" },
    { ref: ref("Weekday","Maariv","Amidah","Concluding Passage"), title: "Amida — Élokaï Nétsor", heTitle: "אלוקי נצור" },
    // ── Conclusion ──
    { ref: ref("Weekday","Maariv","Kaddish Shalem"), title: "Kaddich Chalem", heTitle: "קדיש שלם" },
    { ref: ref("Weekday","Maariv","Alenu"), title: "Alénou", heTitle: "עלינו" },
    { ref: ref("Weekday","Maariv","Mourner's Kaddish"), title: "Kaddich Yatom", heTitle: "קדיש יתום" },
    { ref: ref("Weekday","Maariv","Sefirat HaOmer"), title: "Séfirat HaOmèr", heTitle: "ספירת העומר" },
    { ref: ref("Weekday","Maariv","LeDavid"), title: "LéDavid", heTitle: "לדוד" },
    { ref: ref("Weekday","Maariv","Keri'at Shema al Hamita"), title: "Chéma al Hamita", heTitle: "קריאת שמע על המיטה" },
  ],

  shabbat: [
    // ── Kabbalat Chabbat ──
    { ref: ref("Shabbat","Kabbalat Shabbat","Yedid Nefesh"), title: "Yédid Néfech", heTitle: "ידיד נפש" },
    { ref: ref("Shabbat","Kabbalat Shabbat","Psalm 95"), title: "Psaume 95 — Lékhou Néranéna", heTitle: "לכו נרננה" },
    { ref: ref("Shabbat","Kabbalat Shabbat","Psalm 96"), title: "Psaume 96 — Chirou", heTitle: "שירו לה'" },
    { ref: ref("Shabbat","Kabbalat Shabbat","Psalm 97"), title: "Psaume 97 — Hachem Malakh", heTitle: "ה' מלך" },
    { ref: ref("Shabbat","Kabbalat Shabbat","Psalm 98"), title: "Psaume 98 — Mizmor", heTitle: "מזמור" },
    { ref: ref("Shabbat","Kabbalat Shabbat","Psalm 99"), title: "Psaume 99 — Hachem Malakh", heTitle: "ה' מלך ירגזו" },
    { ref: ref("Shabbat","Kabbalat Shabbat","Psalm 29"), title: "Psaume 29 — Mizmor LéDavid", heTitle: "מזמור לדוד" },
    { ref: ref("Shabbat","Kabbalat Shabbat","Ana Bekoach"), title: "Ana Békoa'h", heTitle: "אנא בכח" },
    { ref: ref("Shabbat","Kabbalat Shabbat","Lekha Dodi"), title: "Lékha Dodi", heTitle: "לכה דודי" },
    { ref: ref("Shabbat","Kabbalat Shabbat","Psalm 92"), title: "Mizmor Chir léYom HaChabbat", heTitle: "מזמור שיר ליום השבת" },
    { ref: ref("Shabbat","Kabbalat Shabbat","Psalm 93"), title: "Psaume 93 — Hachem Malakh", heTitle: "ה' מלך גאות" },
    { ref: ref("Shabbat","Kabbalat Shabbat","Mourner's Kaddish"), title: "Kaddich Yatom", heTitle: "קדיש יתום" },
    { ref: ref("Shabbat","Kabbalat Shabbat","Bameh Madlikin"), title: "Bamé Madlikin", heTitle: "במה מדליקין" },
    // ── Arvit de Chabbat ──
    { ref: ref("Shabbat","Maariv","Barchu"), title: "Barékhou", heTitle: "ברכו" },
    { ref: ref("Shabbat","Maariv","Blessings of the Shema","Shema"), title: "Chéma de Chabbat", heTitle: "שמע של שבת" },
    { ref: ref("Shabbat","Maariv","Veshamru"), title: "Véchamrou", heTitle: "ושמרו" },
    { ref: ref("Shabbat","Maariv","Amidah","Patriarchs"), title: "Amida de Chabbat — Avot", heTitle: "עמידת שבת — אבות" },
    { ref: ref("Shabbat","Maariv","Amidah","Sanctity of the Day"), title: "Amida — Kédouchat HaYom", heTitle: "קדושת היום" },
    { ref: ref("Shabbat","Maariv","Amidah","Concluding Passage"), title: "Amida — Conclusion", heTitle: "אלוקי נצור" },
    { ref: ref("Shabbat","Maariv","Vay'chulu"), title: "Vayékhoulou", heTitle: "ויכולו" },
    // ── Repas / Kiddouch ──
    { ref: ref("Shabbat","Shabbat Evening","Kiddush"), title: "Kiddouch du vendredi soir", heTitle: "קידוש" },
    // ── Chaharit de Chabbat — Amida ──
    { ref: ref("Shabbat","Shacharit","Pesukei Dezimra","Nishmat Kol Chai"), title: "Nichmat Kol 'Haï", heTitle: "נשמת כל חי" },
    { ref: ref("Shabbat","Shacharit","Pesukei Dezimra","Shochen Ad"), title: "Chokhèn Ad", heTitle: "שוכן עד" },
    { ref: ref("Shabbat","Shacharit","Blessings of the Shema","Shema"), title: "Chéma de Chaharit Chabbat", heTitle: "שמע שחרית שבת" },
    { ref: ref("Shabbat","Shacharit","Amidah","Patriarchs"), title: "Amida Chaharit — Avot", heTitle: "עמידת שחרית — אבות" },
    { ref: ref("Shabbat","Shacharit","Amidah","Kedushah"), title: "Kédoucha", heTitle: "קדושה" },
    { ref: ref("Shabbat","Shacharit","Amidah","Sanctity of the Day"), title: "Kédouchat HaYom Chaharit", heTitle: "קדושת היום" },
    { ref: ref("Shabbat","Shacharit","Amidah","Concluding Passage"), title: "Amida Chaharit — Conclusion", heTitle: "אלוקי נצור" },
    // ── Moussaf ──
    { ref: ref("Shabbat","Musaf LeShabbat","Amidah","Patriarchs"), title: "Moussaf — Avot", heTitle: "מוסף — אבות" },
    { ref: ref("Shabbat","Musaf LeShabbat","Amidah","Kedushah"), title: "Moussaf — Kédoucha", heTitle: "מוסף — קדושה" },
    { ref: ref("Shabbat","Musaf LeShabbat","Amidah","Concluding Passage"), title: "Moussaf — Conclusion", heTitle: "מוסף — אלוקי נצור" },
    { ref: ref("Shabbat","Musaf LeShabbat","Ein Keloheinu"), title: "Ein Kélohénou", heTitle: "אין כאלוהינו" },
    { ref: ref("Shabbat","Musaf LeShabbat","Alenu"), title: "Alénou (Moussaf)", heTitle: "עלינו" },
    // ── Min'ha de Chabbat ──
    { ref: ref("Shabbat","Minchah","Ashrei"), title: "Achré (Min'ha Chabbat)", heTitle: "אשרי" },
    { ref: ref("Shabbat","Minchah","Uva Letzion"), title: "Ouva Létsion", heTitle: "ובא לציון" },
    { ref: ref("Shabbat","Minchah","Amidah","Patriarchs"), title: "Amida Min'ha — Avot", heTitle: "עמידת מנחה — אבות" },
    { ref: ref("Shabbat","Minchah","Amidah","Sanctity of the Day"), title: "Kédouchat HaYom Min'ha", heTitle: "קדושת היום" },
    { ref: ref("Shabbat","Minchah","Amidah","Concluding Passage"), title: "Amida Min'ha — Conclusion", heTitle: "אלוקי נצור" },
    { ref: ref("Shabbat","Minchah","Tzidkatkhah Tzedek"), title: "Tsidkatkha Tsédèk", heTitle: "צדקתך צדק" },
    // ── Kiddouch Rabba / Séouda ──
    { ref: ref("Shabbat","Daytime Meal","Kiddusha Rabba"), title: "Kiddouch Rabba (jour)", heTitle: "קידושא רבא" },
    // ── Havdala ──
    { ref: ref("Shabbat","Havdalah"), title: "Havdala", heTitle: "הבדלה" },
  ],

  hallel: [
    { ref: ref("Festivals","Rosh Chodesh","Hallel","Berakhah before the Hallel"), title: "Bénédiction du Hallel", heTitle: "ברכת ההלל" },
    { ref: ref("Festivals","Rosh Chodesh","Hallel","Psalm 113"), title: "Psaume 113", heTitle: "תהילים קיג" },
    { ref: ref("Festivals","Rosh Chodesh","Hallel","Psalm 114"), title: "Psaume 114", heTitle: "תהילים קיד" },
    { ref: ref("Festivals","Rosh Chodesh","Hallel","Psalm 115"), title: "Psaume 115", heTitle: "תהילים קטו" },
    { ref: ref("Festivals","Rosh Chodesh","Hallel","Psalm 116"), title: "Psaume 116", heTitle: "תהילים קטז" },
    { ref: ref("Festivals","Rosh Chodesh","Hallel","Psalm 117"), title: "Psaume 117", heTitle: "תהילים קיז" },
    { ref: ref("Festivals","Rosh Chodesh","Hallel","Psalm 118"), title: "Psaume 118", heTitle: "תהילים קיח" },
    { ref: ref("Festivals","Rosh Chodesh","Hallel","Berakhah after the Hallel"), title: "Bénédiction finale", heTitle: "ברכה אחרונה" },
  ],

  birkat: [
    { ref: ref("Berachot","Birkat HaMazon"), title: "Birkat HaMazone", heTitle: "ברכת המזון" },
    { ref: ref("Berachot","Birkat Hanehenin","Eating","Barachot Rishonot"), title: "Bérakhot Richonoté", heTitle: "ברכות ראשונות" },
    { ref: ref("Berachot","Birkat Hanehenin","Eating","Brachot Achronot","Al Hamichyah"), title: "Al Hami'hya", heTitle: "על המחיה" },
    { ref: ref("Berachot","Birkat Hanehenin","Eating","Brachot Achronot","Borei Nefashot"), title: "Boré Néfachot", heTitle: "בורא נפשות" },
    { ref: ref("Berachot","Tefillat HaDerech"), title: "Téfilat HaDérèkh", heTitle: "תפילת הדרך" },
  ],

  // ── Kaddish (référence rapide) ──
  kaddish: [
    { ref: ref("Kaddish","Half Kaddish"), title: "Demi-Kaddich", heTitle: "חצי קדיש" },
    { ref: ref("Kaddish","Mourner's Kaddish"), title: "Kaddich Yatom", heTitle: "קדיש יתום" },
    { ref: ref("Kaddish","Kaddish Shalem"), title: "Kaddich Chalem", heTitle: "קדיש שלם" },
    { ref: ref("Kaddish","Kaddish d'Rabbanan"), title: "Kaddich Dérabbanane", heTitle: "קדיש דרבנן" },
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
