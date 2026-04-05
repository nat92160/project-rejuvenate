const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

/* ── Reference builder for Siddur Edot HaMizrach ── */
const r = (...parts: string[]) =>
  "Siddur_Edot_HaMizrach,_" + parts.map(p => p.replace(/ /g, '_')).join(',_');

type Entry = { ref?: string; refs?: string[]; title: string; heTitle: string; isHazara?: boolean };

/* ═══════════════════════════════════════════════════════
   SIDDOUR EDOT HAMIZRACH — Rite Séfarade
   Source: Sefaria API (סידור נוסח עדות המזרח)
   Hazara (Repetition) is INTEGRATED within the Amida
   ═══════════════════════════════════════════════════════ */

const SIDDOUR_REFS: Record<string, Entry[]> = {
  /* ══════════════════════════════════════════════
     SHAHARIT — Prière du matin (jours de semaine)
     ══════════════════════════════════════════════ */
  shacharit: [
    // ── Préparation ──
    { ref: r("Preparatory Prayers","Modeh Ani"), title: "Modé Ani", heTitle: "מודה אני" },
    { ref: r("Preparatory Prayers","Morning Blessings"), title: "Birkhot HaChahar", heTitle: "ברכות השחר" },
    { ref: r("Preparatory Prayers","Torah Blessings"), title: "Birkhot HaTorah", heTitle: "ברכות התורה" },
    // ── Talit & Téfillin ──
    { ref: r("Weekday Shacharit","Petichat Eliyahu"), title: "Péti'hat Eliyahou", heTitle: "פתיחת אליהו" },
    { ref: r("Weekday Shacharit","Order of Talit"), title: "Séder Talit", heTitle: "סדר עטיפת ציצית" },
    { ref: r("Weekday Shacharit","Order of Tefillin"), title: "Séder Téfillin", heTitle: "סדר הנחת תפילין" },
    // ── Prières préparatoires ──
    { ref: r("Weekday Shacharit","Hanna's Prayer"), title: "Téfilat 'Hanna", heTitle: "ותתפלל חנה" },
    { ref: r("Weekday Shacharit","Morning Prayer"), title: "Téfilat Cha'harit", heTitle: "תפילת שחרית" },
    { ref: r("Weekday Shacharit","Incense Offering"), title: "Pitoum HaKétoret", heTitle: "פטום הקטורת" },
    // ── Pessouké Dézimra ──
    { ref: r("Weekday Shacharit","Hodu"), title: "Hodou", heTitle: "הודו" },
    { ref: r("Weekday Shacharit","Pesukei D'Zimra"), title: "Pessouké Dézimra", heTitle: "פסוקי דזמרה" },
    // ── Chéma et bénédictions ──
    { ref: r("Weekday Shacharit","The Shema"), title: "Chéma Israël et bénédictions", heTitle: "ק\"ש וברכותיה" },
    // ── Amida (silencieuse) ──
    { ref: r("Weekday Shacharit","Amida"), title: "Amida de Cha'harit (Lé'hach)", heTitle: "עמידה בלחש" },
    // ── Hazara — Répétition de la Amida ──
    { ref: r("Weekday Shacharit","Amida"), title: "Répétition de la Amida (Hazarat HaChats)", heTitle: "חזרת הש\"ץ", isHazara: true },
    // ── Vidouï (confession) ──
    { ref: r("Weekday Shacharit","Vidui"), title: "Vidouï — Ta'hanoun", heTitle: "וידוי" },
    // ── Lecture de la Torah (Lun/Jeu) ──
    { ref: r("Weekday Shacharit","Torah Reading"), title: "Kériat HaTorah", heTitle: "קריאת התורה" },
    // ── Conclusion ──
    { ref: r("Weekday Shacharit","Ashrei"), title: "Achré", heTitle: "אשרי" },
    { ref: r("Weekday Shacharit","Uva LeSion"), title: "Ouva Létsion", heTitle: "ובא לציון" },
    { ref: r("Weekday Shacharit","Beit Yaakov"), title: "Beit Yaakov", heTitle: "בית יעקב" },
    { ref: r("Weekday Shacharit","Song of the Day"), title: "Chir Chel Yom", heTitle: "שיר של יום" },
    { ref: r("Weekday Shacharit","Kaveh"), title: "Kavé", heTitle: "קוה" },
    { ref: r("Weekday Shacharit","Alenu"), title: "Alénou", heTitle: "עלינו" },
    // ── Ajouts optionnels ──
    { ref: r("Additions for Shacharit","Thirteen Principles of Faith"), title: "13 Principes de Foi", heTitle: "שלשה עשר עיקרים" },
    { ref: r("Additions for Shacharit","Ten Remembrances"), title: "10 Zékhirot", heTitle: "עשר זכירות" },
  ],

  /* ══════════════════════════════════════════════
     MINHA — Prière de l'après-midi (jours de semaine)
     ══════════════════════════════════════════════ */
  minha: [
    { ref: r("Weekday Mincha","Offerings"), title: "Korbanot", heTitle: "קרבנות" },
    // ── Amida (silencieuse) ──
    { ref: r("Weekday Mincha","Amida"), title: "Amida de Min'ha (Lé'hach)", heTitle: "עמידה בלחש" },
    // ── Hazara — Répétition de la Amida ──
    { ref: r("Weekday Mincha","Amida"), title: "Répétition de la Amida (Hazarat HaChats)", heTitle: "חזרת הש\"ץ", isHazara: true },
    { ref: r("Weekday Mincha","Vidui"), title: "Vidouï — Ta'hanoun", heTitle: "וידוי" },
    { ref: r("Weekday Mincha","Alenu"), title: "Alénou", heTitle: "עלינו" },
  ],

  /* ══════════════════════════════════════════════
     ARVIT — Prière du soir (jours de semaine)
     ══════════════════════════════════════════════ */
  arvit: [
    { ref: r("Weekday Arvit","Barchu"), title: "Barékhou", heTitle: "ברכו" },
    { ref: r("Weekday Arvit","The Shema"), title: "Chéma du soir et bénédictions", heTitle: "ק\"ש וברכותיה" },
    { ref: r("Weekday Arvit","Amidah"), title: "Amida de Arvit", heTitle: "עמידה" },
    { ref: r("Weekday Arvit","Alenu"), title: "Alénou", heTitle: "עלינו" },
    { ref: r("Counting of the Omer"), title: "Séfirat HaOmèr", heTitle: "ספירת העומר" },
    { ref: r("Bedtime Shema"), title: "Chéma al Hamita", heTitle: "קריאת שמע שעל המיטה" },
  ],

  /* ══════════════════════════════════════════════
     CHABBAT — Prières de Chabbat complètes
     ══════════════════════════════════════════════ */
  shabbat: [
    // ── Allumage des bougies ──
    { ref: r("Shabbat Candle Lighting"), title: "Allumage des bougies", heTitle: "סדר הדלקת נרות שבת" },
    // ── Chir HaChirim ──
    { ref: r("Song of Songs"), title: "Chir HaChirim", heTitle: "שיר השירים" },
    // ── Kabbalat Chabbat ──
    { ref: r("Kabbalat Shabbat"), title: "Kabbalat Chabbat", heTitle: "קבלת שבת" },
    // ── Arvit Chabbat ──
    { ref: r("Shabbat Arvit","Barchu"), title: "Barékhou (Chabbat)", heTitle: "ברכו" },
    { ref: r("Shabbat Arvit","The Shema"), title: "Chéma de Chabbat", heTitle: "ק\"ש וברכותיה" },
    { ref: r("Shabbat Arvit","Magen Avot"), title: "Téfilat Chéva — Maguen Avot", heTitle: "תפילת שבע" },
    { ref: r("Shabbat Arvit","Alenu"), title: "Alénou (Arvit Chabbat)", heTitle: "עלינו" },
    // ── Séder du vendredi soir ──
    { ref: r("Shabbat Evening","Shalom Alekhem"), title: "Chalom Alékhem", heTitle: "שלום עליכם" },
    { ref: r("Shabbat Evening","Eshet Hayil"), title: "Échèt 'Haïl", heTitle: "אשת חיל" },
    { ref: r("Shabbat Evening","Atkenu Seudata"), title: "Atkinou Séoudata", heTitle: "אתקינו סעודתא" },
    { ref: r("Shabbat Evening","Kiddush"), title: "Kiddouch du vendredi soir", heTitle: "קידוש ליל שבת" },
    { ref: r("Shabbat Evening","Blessing of Children"), title: "Birkat HaBanim", heTitle: "ברכת הבנים" },
    { ref: r("Shabbat Evening","First Meal"), title: "Séouda Richona", heTitle: "סעודה ראשונה" },
    { ref: r("Shabbat Evening","Zohar"), title: "Zohar", heTitle: "זוהר לסעודה ראשונה" },
    { ref: r("Shabbat Evening","Songs for Shabbat"), title: "Chants de Chabbat", heTitle: "שירי שבת" },
    // ── Cha'harit Chabbat ──
    { ref: r("Shabbat Shacharit","Psalms for Shabbat"), title: "Psaumes de Chabbat", heTitle: "ליום השבת" },
    { ref: r("Shabbat Shacharit","Pesukei D'Zimra"), title: "Pessouké Dézimra (Chabbat)", heTitle: "פסוקי דזמרה" },
    { ref: r("Shabbat Shacharit","The Shema"), title: "Chéma (Cha'harit Chabbat)", heTitle: "ק\"ש וברכותיה" },
    // ── Amida Shacharit Chabbat (silencieuse) ──
    { ref: r("Shabbat Shacharit","Amidah"), title: "Amida Cha'harit de Chabbat (Lé'hach)", heTitle: "עמידה בלחש" },
    // ── Hazara Shacharit Chabbat ──
    { ref: r("Shabbat Shacharit","Amidah"), title: "Répétition de la Amida (Cha'harit Chabbat)", heTitle: "חזרת הש\"ץ", isHazara: true },
    // ── Torah Reading ──
    { ref: r("Shabbat Shacharit","Torah Reading"), title: "Kériat HaTorah (Chabbat)", heTitle: "קריאת התורה" },
    { ref: r("Shabbat Shacharit","HaGomel"), title: "Birkat HaGomel", heTitle: "ברכת הגומל" },
    { ref: r("Shabbat Shacharit","Haftarah"), title: "Birkhot HaHaftara", heTitle: "ברכות ההפטרה" },
    { ref: r("Shabbat Shacharit","Birkat HaChodesh"), title: "Birkat Ha'Hodech", heTitle: "הכרזת ראש חדש" },
    { ref: r("Shabbat Shacharit","Mi Sheberach"), title: "Mi Chébérakh", heTitle: "מי שברך לקהל" },
    { ref: r("Shabbat Shacharit","Ashrei"), title: "Achré (Chabbat)", heTitle: "אשרי" },
    // ── Moussaf Chabbat ──
    { ref: r("Shabbat Mussaf","Amida"), title: "Amida du Moussaf (Lé'hach)", heTitle: "עמידה בלחש" },
    // ── Hazara Moussaf ──
    { ref: r("Shabbat Mussaf","Amida"), title: "Répétition de la Amida (Moussaf)", heTitle: "חזרת הש\"ץ", isHazara: true },
    { ref: r("Shabbat Mussaf","Incense Offering"), title: "Pitoum HaKétoret (Moussaf)", heTitle: "פטום הקטורת" },
    { ref: r("Shabbat Mussaf","Alenu"), title: "Alénou (Moussaf)", heTitle: "עלינו" },
    // ── Repas de Chabbat jour ──
    { ref: r("Daytime Meal","Daytime Meal"), title: "Séouda Chnia", heTitle: "סדר סעודה שניה" },
    { ref: r("Daytime Meal","Kiddush"), title: "Kiddouch du jour", heTitle: "קידוש היום" },
    // ── Min'ha Chabbat ──
    { ref: r("Shabbat Mincha","Offerings"), title: "Korbanot (Min'ha Chabbat)", heTitle: "קרבנות" },
    { ref: r("Shabbat Mincha","Uva LeSion"), title: "Ouva Létsion (Chabbat)", heTitle: "ובא לציון גואל" },
    // ── Amida Min'ha Chabbat (silencieuse) ──
    { ref: r("Shabbat Mincha","Amida"), title: "Amida Min'ha de Chabbat (Lé'hach)", heTitle: "עמידה בלחש" },
    // ── Hazara Min'ha Chabbat ──
    { ref: r("Shabbat Mincha","Amida"), title: "Répétition de la Amida (Min'ha Chabbat)", heTitle: "חזרת הש\"ץ", isHazara: true },
    { ref: r("Shabbat Mincha","Alenu"), title: "Alénou (Min'ha Chabbat)", heTitle: "עלינו" },
    // ── Séouda Chlichit ──
    { ref: r("Third Meal"), title: "Séouda Chlichit", heTitle: "סעודה שלישית" },
    // ── Havdala ──
    { ref: r("Havdalah","Before Havdalah"), title: "Avant la Havdala", heTitle: "קודם הבדלה" },
    { ref: r("Havdalah","Havdala"), title: "Havdala", heTitle: "סדר הבדלה" },
    { ref: r("Havdalah","Motzei Shabbat Songs"), title: "Chants de Motsaé Chabbat", heTitle: "שירים למוצאי שבת" },
    { ref: r("Havdalah","Veyiten Lecha"), title: "Vayitèn Lékha", heTitle: "ויתן לך" },
    { ref: r("Havdalah","Fourth Meal"), title: "Séouda Réviit (Mélavé Malka)", heTitle: "סעודה רביעית" },
  ],

  /* ══════════════════════════════════════════════
     ROSH HODESH — Nouveau mois
     ══════════════════════════════════════════════ */
  rosh_hodesh: [
    { ref: r("Rosh Hodesh","Rosh Hodesh"), title: "Séder Roch 'Hodech", heTitle: "סדר ראש חודש" },
    { ref: r("Rosh Hodesh","Hallel"), title: "Hallel (Roch 'Hodech / Fêtes)", heTitle: "הלל לראש חודש ולמועדים" },
    { ref: r("Rosh Hodesh","Uva LeSion"), title: "Ouva Létsion", heTitle: "ובא לציון גואל" },
    { ref: r("Rosh Hodesh","Song of the Day"), title: "Chir Chel Yom", heTitle: "שיר של יום" },
    { ref: r("Rosh Hodesh","Mussaf"), title: "Moussaf de Roch 'Hodech", heTitle: "מוסף" },
    { ref: r("Rosh Hodesh","Barchi Nafshi"), title: "Barkhi Nafchi", heTitle: "ברכי נפשי" },
    { ref: r("Rosh Hodesh","Kaveh"), title: "Kavé", heTitle: "קוה" },
    { ref: r("Rosh Hodesh","Incense Offering"), title: "Pitoum HaKétoret", heTitle: "פטום הקטורת" },
    { ref: r("Rosh Hodesh","Alenu"), title: "Alénou", heTitle: "עלינו" },
  ],

  /* ══════════════════════════════════════════════
     FÊTES — Chaloch Régalim (Pessa'h, Chavouot, Soukot)
     ══════════════════════════════════════════════ */
  fetes: [
    { ref: r("Prayers for Three Festivals","Prayers for Three Festivals"), title: "Téfilot Chaloch Régalim", heTitle: "תפילה לשלש רגלים" },
    { ref: r("Prayers for Three Festivals","Song for Passover"), title: "Mizmor de Pessa'h", heTitle: "מזמור לפסח" },
    { ref: r("Prayers for Three Festivals","Song for Shavuot"), title: "Mizmor de Chavouot", heTitle: "מזמור לשבועות" },
    { ref: r("Prayers for Three Festivals","Song for Sukkot"), title: "Mizmor de Soukot", heTitle: "מזמור לסוכות" },
    { ref: r("Prayers for Three Festivals","Song for Shemini Atzeret"), title: "Mizmor de Chémini Atséret", heTitle: "מזמור לשמיני עצרת" },
    { ref: r("Prayers for Three Festivals","Amidah"), title: "Amida des Fêtes", heTitle: "עמידה" },
    { ref: r("Prayers for Three Festivals","Amidah"), title: "Répétition de la Amida (Fêtes)", heTitle: "חזרת הש\"ץ", isHazara: true },
    { ref: r("Prayers for Three Festivals","Mussaf"), title: "Moussaf des Fêtes", heTitle: "מוסף" },
  ],

  /* ══════════════════════════════════════════════
     HANOUKA
     ══════════════════════════════════════════════ */
  hanukkah: [
    { ref: r("Hanukkah","Menorah Lighting"), title: "Allumage de la Ménora", heTitle: "סדר ההדלקה" },
    { ref: r("Hanukkah","Shacharit"), title: "Cha'harit de 'Hanouka", heTitle: "שחרית" },
    { ref: r("Rosh Hodesh","Hallel"), title: "Hallel complet", heTitle: "הלל לראש חודש ולמועדים" },
  ],

  /* ══════════════════════════════════════════════
     POURIM
     ══════════════════════════════════════════════ */
  purim: [
    { ref: r("Purim","Shabbat Zachor"), title: "Chabbat Zakhor", heTitle: "שבת זכור" },
    { ref: r("Purim","Megillah Reading"), title: "Kériat HaMéguila", heTitle: "קריאת המגילה" },
    { ref: r("Purim","Purim Day"), title: "Séder Yom Pourim", heTitle: "סדר יום פורים" },
  ],

  /* ══════════════════════════════════════════════
     JEÛNES ET DEUIL
     ══════════════════════════════════════════════ */
  taanit: [
    { ref: r("Fast Days and Mourning","Fast of Gedalya"), title: "Sélihot — Tsom Guédalia", heTitle: "סליחות לצום גדליה" },
    { ref: r("Fast Days and Mourning","Tenth of Tevet"), title: "Sélihot — 10 Tévèt", heTitle: "סליחות לעשרה בטבת" },
    { ref: r("Fast Days and Mourning","Fast of Esther"), title: "Sélihot — Taanit Esther", heTitle: "סליחות לתענית אסתר" },
    { ref: r("Fast Days and Mourning","Seventeenth of Tammuz"), title: "Sélihot — 17 Tamouz", heTitle: "סליחות לי\"ז בתמוז" },
    { ref: r("Fast Days and Mourning","Mourning"), title: "Avélout (Deuil)", heTitle: "אבלות" },
    { ref: r("Fast Days and Mourning","Torah Reading for Fast Days"), title: "Kériat HaTorah des jeûnes", heTitle: "קריאת התורה לתענית ציבור" },
  ],

  /* ══════════════════════════════════════════════
     TIKOUN HATSOT — Prière de minuit
     ══════════════════════════════════════════════ */
  tikoun_hatsot: [
    { ref: r("The Midnight Rite","LeShem Yichud"), title: "Léchèm Yi'houd", heTitle: "לשם יחוד" },
    { ref: r("The Midnight Rite","Tikkun Rachel"), title: "Tikoun Ra'hel", heTitle: "תיקון רחל" },
    { ref: r("The Midnight Rite","Tikkun Leah"), title: "Tikoun Léa", heTitle: "תיקון לאה" },
  ],

  /* ══════════════════════════════════════════════
     BIRKAT HAMAZONE ET BERAKHOT
     ══════════════════════════════════════════════ */
  birkat: [
    { ref: r("Post Meal Blessing"), title: "Birkat HaMazone", heTitle: "ברכת המזון" },
    { ref: r("Al Hamihya"), title: "Al Hami'hya (Méèn Chaloch)", heTitle: "ברכת מעין שלוש" },
    { ref: r("Blessings on Enjoyments"), title: "Birkhot HaNéhénine", heTitle: "ברכות הנהנין" },
  ],

  /* ══════════════════════════════════════════════
     NISSAN — Mois de Nissan
     ══════════════════════════════════════════════ */
  nissan: [
    { ref: r("Nissan","Blessing of the Trees"), title: "Birkat HaIlanot", heTitle: "סדר ברכת האילנות" },
    { ref: r("Nissan","Learning of the Day"), title: "Limoud du mois de Nissan", heTitle: "סדר למוד לחדש ניסן" },
  ],

  /* ══════════════════════════════════════════════
     BÉNÉDICTIONS ET PRIÈRES DIVERSES
     ══════════════════════════════════════════════ */
  berakhot: [
    { ref: r("Assorted Blessings and Prayers","Marriage"), title: "Sédèr Iroussin véNissouïn", heTitle: "סדר ארוסין ונשואין" },
    { ref: r("Assorted Blessings and Prayers","Sheva Berachot"), title: "Chéva Brakhot", heTitle: "סדר שבע ברכות" },
    { ref: r("Assorted Blessings and Prayers","Brit Mila"), title: "Brit Mila", heTitle: "סדר ברית מילה" },
    { ref: r("Assorted Blessings and Prayers","Redeeming the First Born"), title: "Pidyon HaBen", heTitle: "סדר פדיון הבן" },
    { ref: r("Assorted Blessings and Prayers","Mezuza"), title: "Birkat HaMézouza", heTitle: "ברכת המזוזה" },
    { ref: r("Assorted Blessings and Prayers","Separating Hallah"), title: "Hafréchat 'Hala", heTitle: "סדר הפרשת חלה" },
    { ref: r("Assorted Blessings and Prayers","Tevillat Kelim"), title: "Tévilat Kélim", heTitle: "ברכת טבילת כלים" },
    { ref: r("Assorted Blessings and Prayers","Rainbow"), title: "Birkat HaKéchèt", heTitle: "ברכת הקשת" },
    { ref: r("Assorted Blessings and Prayers","Blessings on Lighting and Thunder"), title: "Birkat Bérakim VéRéamim", heTitle: "ברכת ברקים ורעמים" },
    { ref: r("Assorted Blessings and Prayers","Prayer for Taking Medicine"), title: "Téfilat HaNotèl Tréoufa", heTitle: "תפלת הנוטל תרופה" },
    { ref: r("Assorted Blessings and Prayers","Traveler's Prayer"), title: "Téfilat HaDérèkh", heTitle: "תפלת הדרך" },
  ],

  /* ══════════════════════════════════════════════
     MICHNAYOT DE CHABBAT
     ══════════════════════════════════════════════ */
  mishnayot_shabbat: [
    { ref: r("Mishna Study for Shabbat","First Meal"), title: "Michnayot — Séouda Richona", heTitle: "לסעודה ראשונה" },
    { ref: r("Mishna Study for Shabbat","Second Meal"), title: "Michnayot — Séouda Chnia", heTitle: "משניות שבת לסעודה שניה" },
    { ref: r("Mishna Study for Shabbat","Third Meal"), title: "Michnayot — Séouda Chlichit", heTitle: "משניות שבת לסעודה שלישית" },
    { ref: r("Mishna Study for Shabbat","Pirkei Avot"), title: "Pirké Avot", heTitle: "פרקי אבות" },
  ],

  /* ══════════════════════════════════════════════
     BIRKAT HALÉVANA — Bénédiction de la Lune
     ══════════════════════════════════════════════ */
  birkat_halevana: [
    { ref: r("Blessing of the Moon"), title: "Birkat HaLévana", heTitle: "ברכת הלבנה" },
  ],

  /* ══════════════════════════════════════════════
     CHABBAT SPÉCIAUX
     ══════════════════════════════════════════════ */
  shabbat_special: [
    { ref: r("Shabbat Shacharit","Zeved HaBat"), title: "Zévèd HaBat", heTitle: "סדר זבד הבת" },
    { ref: r("Shabbat Shacharit","Shabbat Chatan"), title: "Chabbat 'Hatan", heTitle: "לשבת חתן" },
    { ref: r("Shabbat Shacharit","Announcement of Fast"), title: "Hakrazat Taanit", heTitle: "הכרזת תענית" },
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
          isHazara: targetSection.isHazara || false,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Return table of contents with isHazara flag
    return new Response(
      JSON.stringify({
        success: true,
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
