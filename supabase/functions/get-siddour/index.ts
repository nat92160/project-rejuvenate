import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const r = (...parts: string[]) =>
  "Siddur_Edot_HaMizrach,_" + parts.map((p) => p.replace(/ /g, "_")).join(",_");

const SIDDOUR_REFS: Record<string, { title: string; heTitle: string; ref: string }[]> = {

  shacharit: [
    { title: "Modé Ani", heTitle: "מודה אני", ref: r("Preparatory Prayers", "Modeh Ani") },
    { title: "Birkot HaCha'har", heTitle: "ברכות השחר", ref: r("Preparatory Prayers", "Morning Blessings") },
    { title: "Birkot HaTorah", heTitle: "ברכות התורה", ref: r("Preparatory Prayers", "Torah Blessings") },
    { title: "Péti'hat Éliyahou", heTitle: "פתיחת אליהו", ref: r("Weekday Shacharit", "Petichat Eliyahu") },
    { title: "Talit", heTitle: "סדר עטיפת ציצית", ref: r("Weekday Shacharit", "Order of Talit") },
    { title: "Téfiline", heTitle: "סדר הנחת תפילין", ref: r("Weekday Shacharit", "Order of Tefillin") },
    { title: "Téfilat 'Hanna", heTitle: "ותתפלל חנה", ref: r("Weekday Shacharit", "Hanna's Prayer") },
    { title: "Téfilat Cha'harit", heTitle: "תפילת שחרית", ref: r("Weekday Shacharit", "Morning Prayer") },
    { title: "Pittoum HaQétoret", heTitle: "פטום הקטורת", ref: r("Weekday Shacharit", "Incense Offering") },
    { title: "Hodou", heTitle: "הודו", ref: r("Weekday Shacharit", "Hodu") },
    { title: "Pessouqé DéZimra", heTitle: "פסוקי דזמרה", ref: r("Weekday Shacharit", "Pesukei D'Zimra") },
    { title: "Chéma' et ses Brakhot", heTitle: "ק\"ש וברכותיה", ref: r("Weekday Shacharit", "The Shema") },
    { title: "Amida de Cha'harit", heTitle: "עמידה", ref: r("Weekday Shacharit", "Amida") },
    { title: "Vidouï", heTitle: "וידוי", ref: r("Weekday Shacharit", "Vidui") },
    { title: "Qériat HaTorah", heTitle: "קריאת התורה", ref: r("Weekday Shacharit", "Torah Reading") },
    { title: "Achré", heTitle: "אשרי", ref: r("Weekday Shacharit", "Ashrei") },
    { title: "Ouva Létsiyon", heTitle: "ובא לציון", ref: r("Weekday Shacharit", "Uva LeSion") },
    { title: "Bèt Ya'aqov", heTitle: "בית יעקב", ref: r("Weekday Shacharit", "Beit Yaakov") },
    { title: "Chir Chel Yom", heTitle: "שיר של יום", ref: r("Weekday Shacharit", "Song of the Day") },
    { title: "Qavé", heTitle: "קוה", ref: r("Weekday Shacharit", "Kaveh") },
    { title: "Alénou", heTitle: "עלינו", ref: r("Weekday Shacharit", "Alenu") },
  ],

  hazara: [
    { title: "Répétition Amida (Hazara)", heTitle: "חזרת הש\"ץ שחרית", ref: r("Weekday Shacharit", "Amida") },
  ],

  additions_shacharit: [
    { title: "13 Principes de Foi", heTitle: "שלשה עשר עיקרים", ref: r("Additions for Shacharit", "Thirteen Principles of Faith") },
    { title: "10 Zékhirot", heTitle: "עשר זכירות", ref: r("Additions for Shacharit", "Ten Remembrances") },
  ],

  minha: [
    { title: "Qorbanot", heTitle: "קרבנות", ref: r("Weekday Mincha", "Offerings") },
    { title: "Amida de Min'ha", heTitle: "עמידה דמנחה", ref: r("Weekday Mincha", "Amida") },
    { title: "Vidouï", heTitle: "וידוי", ref: r("Weekday Mincha", "Vidui") },
    { title: "Alénou", heTitle: "עלינו", ref: r("Weekday Mincha", "Alenu") },
  ],

  arvit: [
    { title: "Barékhou", heTitle: "ברכו", ref: r("Weekday Arvit", "Barchu") },
    { title: "Chéma' du soir", heTitle: "ק\"ש וברכותיה", ref: r("Weekday Arvit", "The Shema") },
    { title: "Amida de Arvit", heTitle: "עמידה דערבית", ref: r("Weekday Arvit", "Amidah") },
    { title: "Alénou", heTitle: "עלינו", ref: r("Weekday Arvit", "Alenu") },
  ],

  shabbat: [
    { title: "Allumage des bougies", heTitle: "סדר הדלקת נרות שבת", ref: r("Shabbat Candle Lighting") },
    { title: "Chir HaChirim", heTitle: "שיר השירים", ref: r("Song of Songs") },
    { title: "Qabbalat Chabbat", heTitle: "קבלת שבת", ref: r("Kabbalat Shabbat") },
    { title: "Barékhou (Chabbat)", heTitle: "ברכו", ref: r("Shabbat Arvit", "Barchu") },
    { title: "Chéma' (Chabbat soir)", heTitle: "ק\"ש וברכותיה", ref: r("Shabbat Arvit", "The Shema") },
    { title: "Maguen Avot", heTitle: "תפילת שבע", ref: r("Shabbat Arvit", "Magen Avot") },
    { title: "Alénou (Chabbat soir)", heTitle: "עלינו", ref: r("Shabbat Arvit", "Alenu") },
    { title: "Chalom Alékhem", heTitle: "שלום עליכם", ref: r("Shabbat Evening", "Shalom Alekhem") },
    { title: "Échèt 'Hayil", heTitle: "אשת חיל", ref: r("Shabbat Evening", "Eshet Hayil") },
    { title: "Atqinou Sé'oudata", heTitle: "אתקינו סעודתא", ref: r("Shabbat Evening", "Atkenu Seudata") },
    { title: "Qiddouch du soir", heTitle: "קידוש ליל שבת", ref: r("Shabbat Evening", "Kiddush") },
    { title: "Birkat HaBanim", heTitle: "ברכת הבנים", ref: r("Shabbat Evening", "Blessing of Children") },
    { title: "Chants de Chabbat", heTitle: "שירי שבת", ref: r("Shabbat Evening", "Songs for Shabbat") },
  ],

  shabbat_shacharit: [
    { title: "Psaumes de Chabbat", heTitle: "ליום השבת", ref: r("Shabbat Shacharit", "Psalms for Shabbat") },
    { title: "Pessouqé DéZimra (Chabbat)", heTitle: "פסוקי דזמרה", ref: r("Shabbat Shacharit", "Pesukei D'Zimra") },
    { title: "Chéma' (Chabbat matin)", heTitle: "ק\"ש וברכותיה", ref: r("Shabbat Shacharit", "The Shema") },
    { title: "Amida de Chabbat", heTitle: "עמידה", ref: r("Shabbat Shacharit", "Amidah") },
    { title: "Qériat HaTorah (Chabbat)", heTitle: "קריאת התורה", ref: r("Shabbat Shacharit", "Torah Reading") },
    { title: "Haftara", heTitle: "ברכות ההפטרה", ref: r("Shabbat Shacharit", "Haftarah") },
    { title: "Achré (Chabbat)", heTitle: "אשרי", ref: r("Shabbat Shacharit", "Ashrei") },
  ],

  shabbat_mussaf: [
    { title: "Amida de Moussaf", heTitle: "עמידה", ref: r("Shabbat Mussaf", "Amida") },
    { title: "Pittoum HaQétoret", heTitle: "פטום הקטורת", ref: r("Shabbat Mussaf", "Incense Offering") },
    { title: "Alénou (Moussaf)", heTitle: "עלינו", ref: r("Shabbat Mussaf", "Alenu") },
  ],

  shabbat_minha: [
    { title: "Qorbanot (Chabbat)", heTitle: "קרבנות", ref: r("Shabbat Mincha", "Offerings") },
    { title: "Ouva Létsiyon (Chabbat)", heTitle: "ובא לציון גואל", ref: r("Shabbat Mincha", "Uva LeSion") },
    { title: "Amida Min'ha (Chabbat)", heTitle: "עמידה", ref: r("Shabbat Mincha", "Amida") },
    { title: "Alénou", heTitle: "עלינו", ref: r("Shabbat Mincha", "Alenu") },
  ],

  havdala: [
    { title: "Avant la Havdala", heTitle: "קודם הבדלה", ref: r("Havdalah", "Before Havdalah") },
    { title: "Havdala", heTitle: "סדר הבדלה", ref: r("Havdalah", "Havdala") },
    { title: "Chants Motsa'é Chabbat", heTitle: "שירים למוצאי שבת", ref: r("Havdalah", "Motzei Shabbat Songs") },
    { title: "Vayitèn Lékha", heTitle: "ויתן לך", ref: r("Havdalah", "Veyiten Lecha") },
  ],

  rosh_hodesh: [
    { title: "Roch 'Hodech", heTitle: "סדר ראש חודש", ref: r("Rosh Hodesh", "Rosh Hodesh") },
    { title: "Hallel", heTitle: "הלל", ref: r("Rosh Hodesh", "Hallel") },
    { title: "Moussaf R\"H", heTitle: "מוסף", ref: r("Rosh Hodesh", "Mussaf") },
    { title: "Barkhi Nafchi", heTitle: "ברכי נפשי", ref: r("Rosh Hodesh", "Barchi Nafshi") },
  ],

  fetes: [
    { title: "Prières des 3 Fêtes", heTitle: "תפילה לשלש רגלים", ref: r("Prayers for Three Festivals", "Prayers for Three Festivals") },
    { title: "Cantique de Pessa'h", heTitle: "מזמור לפסח", ref: r("Prayers for Three Festivals", "Song for Passover") },
    { title: "Cantique de Chavou'ot", heTitle: "מזמור לשבועות", ref: r("Prayers for Three Festivals", "Song for Shavuot") },
    { title: "Cantique de Soukkot", heTitle: "מזמור לסוכות", ref: r("Prayers for Three Festivals", "Song for Sukkot") },
    { title: "Cantique Chémini 'Atséret", heTitle: "מזמור לשמיני עצרת", ref: r("Prayers for Three Festivals", "Song for Shemini Atzeret") },
    { title: "Amida des Fêtes", heTitle: "עמידה", ref: r("Prayers for Three Festivals", "Amidah") },
    { title: "Moussaf des Fêtes", heTitle: "מוסף", ref: r("Prayers for Three Festivals", "Mussaf") },
  ],

  hanukkah: [
    { title: "Allumage Ménora", heTitle: "סדר ההדלקה", ref: r("Hanukkah", "Menorah Lighting") },
    { title: "Cha'harit 'Hanouka", heTitle: "שחרית", ref: r("Hanukkah", "Shacharit") },
  ],

  purim: [
    { title: "Chabbat Zakhor", heTitle: "שבת זכור", ref: r("Purim", "Shabbat Zachor") },
    { title: "Qériat HaMéguila", heTitle: "קריאת המגילה", ref: r("Purim", "Megillah Reading") },
    { title: "Yom Pourim", heTitle: "סדר יום פורים", ref: r("Purim", "Purim Day") },
  ],

  taanit: [
    { title: "Séli'hot Tsom Guédalya", heTitle: "סליחות לצום גדליה", ref: r("Fast Days and Mourning", "Fast of Gedalya") },
    { title: "Séli'hot 10 Tévèt", heTitle: "סליחות לעשרה בטבת", ref: r("Fast Days and Mourning", "Tenth of Tevet") },
    { title: "Séli'hot Ta'anit Esther", heTitle: "סליחות לתענית אסתר", ref: r("Fast Days and Mourning", "Fast of Esther") },
    { title: "Séli'hot 17 Tamouz", heTitle: "סליחות לי\"ז בתמוז", ref: r("Fast Days and Mourning", "Seventeenth of Tammuz") },
    { title: "Avélout (Deuil)", heTitle: "אבלות", ref: r("Fast Days and Mourning", "Mourning") },
    { title: "Qériat HaTorah (Jeûne)", heTitle: "קריאת התורה לתענית ציבור", ref: r("Fast Days and Mourning", "Torah Reading for Fast Days") },
  ],

  tikoun_hatsot: [
    { title: "Léchèm Yi'houd", heTitle: "לשם יחוד", ref: r("The Midnight Rite", "LeShem Yichud") },
    { title: "Tikoun Ra'hel", heTitle: "תיקון רחל", ref: r("The Midnight Rite", "Tikkun Rachel") },
    { title: "Tikoun Léa", heTitle: "תיקון לאה", ref: r("The Midnight Rite", "Tikkun Leah") },
  ],

  nissan: [
    { title: "Birkat HaIlanot", heTitle: "סדר ברכת האילנות", ref: r("Nissan", "Blessing of the Trees") },
    { title: "Étude du jour", heTitle: "סדר למוד לחדש ניסן", ref: r("Nissan", "Learning of the Day") },
  ],

  sefirat_haomer: [
    { title: "Séfirat HaOmer", heTitle: "ספירת העומר", ref: r("Counting of the Omer") },
  ],

  birkat: [
    { title: "Birkat HaMazone", heTitle: "ברכת המזון", ref: r("Post Meal Blessing") },
    { title: "Bérakha Mé'èn Chaloch", heTitle: "ברכת מעין שלוש", ref: r("Al Hamihya") },
  ],

  berakhot: [
    { title: "Brakhot HaNéhénine", heTitle: "ברכות הנהנין", ref: r("Blessings on Enjoyments") },
    { title: "Mariage", heTitle: "סדר ארוסין ונשואין", ref: r("Assorted Blessings and Prayers", "Marriage") },
    { title: "Chéva Brakhot", heTitle: "סדר שבע ברכות", ref: r("Assorted Blessings and Prayers", "Sheva Berachot") },
    { title: "Brit Mila", heTitle: "סדר ברית מילה", ref: r("Assorted Blessings and Prayers", "Brit Mila") },
    { title: "Pidyone HaBèn", heTitle: "סדר פדיון הבן", ref: r("Assorted Blessings and Prayers", "Redeeming the First Born") },
    { title: "Téfilat HaDérèkh", heTitle: "תפלת הדרך", ref: r("Assorted Blessings and Prayers", "Traveler's Prayer") },
  ],

  birkat_halevana: [
    { title: "Birkat HaLévana", heTitle: "ברכת הלבנה", ref: r("Blessing of the Moon") },
  ],

  bedtime_shema: [
    { title: "Chéma' 'al HaMita", heTitle: "קריאת שמע שעל המיטה", ref: r("Bedtime Shema") },
  ],

  mishnayot_shabbat: [
    { title: "Michnayot Sé'ouda 1", heTitle: "לסעודה ראשונה", ref: r("Mishna Study for Shabbat", "First Meal") },
    { title: "Michnayot Sé'ouda 2", heTitle: "משניות שבת לסעודה שניה", ref: r("Mishna Study for Shabbat", "Second Meal") },
    { title: "Michnayot Sé'ouda 3", heTitle: "משניות שבת לסעודה שלישית", ref: r("Mishna Study for Shabbat", "Third Meal") },
    { title: "Pirqé Avot", heTitle: "פרקי אבות", ref: r("Mishna Study for Shabbat", "Pirkei Avot") },
  ],
};

const TRANSLITERATION_MAP: Record<string, string> = {
  "א": "", "בּ": "b", "ב": "v", "גּ": "g", "ג": "g",
  "דּ": "d", "ד": "d", "ה": "h", "ו": "v", "וּ": "ou",
  "זּ": "z", "ז": "z", "ח": "'h", "ט": "t", "טּ": "t",
  "י": "y", "כּ": "k", "כ": "kh", "ך": "kh", "ךּ": "k",
  "ל": "l", "לּ": "l", "מ": "m", "מּ": "m", "ם": "m",
  "נ": "n", "נּ": "n", "ן": "n", "ס": "s", "סּ": "s",
  "ע": "'", "פּ": "p", "פ": "f", "ף": "f", "ףּ": "p",
  "צ": "ts", "צּ": "ts", "ץ": "ts", "ק": "q", "קּ": "q",
  "ר": "r", "רּ": "r", "שׁ": "ch", "שׂ": "s", "ש": "ch",
  "תּ": "t", "ת": "t",
  "\u05B0": "é", "\u05B1": "é", "\u05B2": "a", "\u05B3": "o",
  "\u05B4": "i", "\u05B5": "é", "\u05B6": "è", "\u05B7": "a",
  "\u05B8": "a", "\u05B9": "o", "\u05BA": "o", "\u05BB": "ou",
  "\u05BC": "", "\u05BD": "", "\u05BE": "-", "\u05BF": "",
  "\u05C1": "", "\u05C2": "", "\u05C7": "o",
};

function transliterate(hebrewText: string): string {
  if (!hebrewText) return "";
  const cleanText = hebrewText.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  let result = "";
  for (let i = 0; i < cleanText.length; i++) {
    const char = cleanText[i];
    if (TRANSLITERATION_MAP[char] !== undefined) {
      result += TRANSLITERATION_MAP[char];
    } else if (char === " " || char === "\n" || char === "." || char === "," || char === ":" || char === "׃" || char === "־") {
      result += char === "־" ? "-" : char;
    } else if (char.charCodeAt(0) < 0x0590 || char.charCodeAt(0) > 0x05FF) {
      result += char;
    }
  }
  result = result.replace(/([a-z])\1{2,}/g, "$1$1");
  result = result.replace(/\s+/g, " ");
  return result.trim();
}

async function fetchFromSefaria(ref: string): Promise<{ he: string[]; en: string[]; phonetic: string[] }> {
  const url = `https://www.sefaria.org/api/texts/${encodeURIComponent(ref)}?context=0`;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`Sefaria ${response.status} for ${ref}`);
      return { he: [], en: [], phonetic: [] };
    }
    const data = await response.json();
    let heTexts: string[] = [];
    let enTexts: string[] = [];
    if (data.he) {
      heTexts = Array.isArray(data.he) ? data.he : [data.he];
    }
    if (data.text) {
      enTexts = Array.isArray(data.text) ? data.text : [data.text];
    }
    heTexts = heTexts.filter((t: string) => t && t.trim());
    enTexts = enTexts.filter((t: string) => t && t.trim());
    const phoneticTexts = heTexts.map((t: string) => transliterate(t));
    return { he: heTexts, en: enTexts, phonetic: phoneticTexts };
  } catch (error) {
    console.error(`Error fetching ${ref}:`, error);
    return { he: [], en: [], phonetic: [] };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  try {
    const { office } = await req.json();
    if (!office || !SIDDOUR_REFS[office]) {
      return new Response(
        JSON.stringify({ error: "Office non trouvé", available: Object.keys(SIDDOUR_REFS) }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }
    const refs = SIDDOUR_REFS[office];
    const results = await Promise.all(
      refs.map(async (entry) => {
        const texts = await fetchFromSefaria(entry.ref);
        return {
          title: entry.title,
          heTitle: entry.heTitle,
          ref: entry.ref,
          he: texts.he,
          en: texts.en,
          phonetic: texts.phonetic,
        };
      })
    );
    const nonEmptyResults = results.filter((r) => r.he.length > 0 || r.en.length > 0);
    return new Response(
      JSON.stringify({
        office,
        sections: nonEmptyResults,
        totalSections: nonEmptyResults.length,
        rite: "Edot HaMizrach (Séfarade)",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
