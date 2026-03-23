// ============================================================
// BRAKHOT DATA — Textes liturgiques officiels (Nossakh)
// Sources : Choul'han Aroukh, Sidour Tefila, Kitsour Ch.A.
// ============================================================

export interface BrakhaItem {
  name: string;
  icon: string;
  rishona: {
    hebrew: string;
    transliteration: string;
    translation: string;
  };
  aharona: {
    name: string;
    hebrew: string;
    transliteration: string;
    translation: string;
  };
  shiur: string; // Quantité minimale pour la brakha a'harona
  keywords: string[];
}

export interface BrakhaCategory {
  id: string;
  label: string;
  icon: string;
  items: BrakhaItem[];
}

// ---- TEXTES DES BRAKHOT A'HARONOT (FINALES) ----

export const BORE_NEFASHOT = {
  name: "Boré Néfachot",
  hebrew:
    "בָּרוּךְ אַתָּה ה' אֱלֹהֵינוּ מֶלֶךְ הָעוֹלָם, בּוֹרֵא נְפָשׁוֹת רַבּוֹת וְחֶסְרוֹנָן, עַל כָּל מַה שֶּׁבָּרָאתָ לְהַחֲיוֹת בָּהֶם נֶפֶשׁ כָּל חָי. בָּרוּךְ חֵי הָעוֹלָמִים.",
  transliteration:
    "Boré néfachot rabot vé'hésronan, al kol ma chébarata léha'hayot bahèm néfèch kol 'haï. Baroukh 'Héi haolamim.",
  translation:
    "Qui crée de nombreuses créatures et leurs besoins, pour tout ce que Tu as créé afin de maintenir la vie de tout être vivant. Béni soit le Vivant des mondes.",
};

export const AL_HAMIHYA = {
  name: "Al HaMi'hya (Méèn Chaloch)",
  hebrew:
    "בָּרוּךְ אַתָּה ה' אֱלֹהֵינוּ מֶלֶךְ הָעוֹלָם, עַל הַמִּחְיָה וְעַל הַכַּלְכָּלָה וְעַל תְּנוּבַת הַשָּׂדֶה, וְעַל אֶרֶץ חֶמְדָּה טוֹבָה וּרְחָבָה שֶׁרָצִיתָ וְהִנְחַלְתָּ לַאֲבוֹתֵינוּ לֶאֱכוֹל מִפִּרְיָהּ וְלִשְׂבֹּעַ מִטּוּבָהּ. רַחֶם נָא ה' אֱלֹהֵינוּ עַל יִשְׂרָאֵל עַמֶּךָ וְעַל יְרוּשָׁלַיִם עִירֶךָ וְעַל צִיּוֹן מִשְׁכַּן כְּבוֹדֶךָ וְעַל מִזְבְּחֶךָ וְעַל הֵיכָלֶךָ. וּבְנֵה יְרוּשָׁלַיִם עִיר הַקֹּדֶשׁ בִּמְהֵרָה בְּיָמֵינוּ, וְהַעֲלֵנוּ לְתוֹכָהּ וְשַׂמְּחֵנוּ בְּבִנְיָנָהּ, וְנֹאכַל מִפִּרְיָהּ וְנִשְׂבַּע מִטּוּבָהּ, וּנְבָרֶכְךָ עָלֶיהָ בִּקְדֻשָּׁה וּבְטָהֳרָה. כִּי אַתָּה ה' טוֹב וּמֵטִיב לַכֹּל, וְנוֹדֶה לְּךָ עַל הָאָרֶץ וְעַל הַמִּחְיָה. בָּרוּךְ אַתָּה ה', עַל הָאָרֶץ וְעַל הַמִּחְיָה.",
  transliteration:
    "Al hami'hya véal hakalkalah véal ténouват hassadé, véal érets 'hemda tova ouré'hava chératsita véhin'halta laavotéinou léèkhol mipirya vélisboa mitouva...",
  translation:
    "Pour la subsistance et pour la nourriture et pour les produits du champ, et pour la terre désirable, bonne et spacieuse…",
};

export const AL_HAGUÉFEN = {
  name: "Al HaGuéfen (Méèn Chaloch)",
  hebrew:
    "בָּרוּךְ אַתָּה ה' אֱלֹהֵינוּ מֶלֶךְ הָעוֹלָם, עַל הַגֶּפֶן וְעַל פְּרִי הַגֶּפֶן, וְעַל תְּנוּבַת הַשָּׂדֶה, וְעַל אֶרֶץ חֶמְדָּה טוֹבָה וּרְחָבָה שֶׁרָצִיתָ וְהִנְחַלְתָּ לַאֲבוֹתֵינוּ לֶאֱכוֹל מִפִּרְיָהּ וְלִשְׂבֹּעַ מִטּוּבָהּ. רַחֶם נָא ה' אֱלֹהֵינוּ עַל יִשְׂרָאֵל עַמֶּךָ וְעַל יְרוּשָׁלַיִם עִירֶךָ וְעַל צִיּוֹן מִשְׁכַּן כְּבוֹדֶךָ וְעַל מִזְבְּחֶךָ וְעַל הֵיכָלֶךָ. וּבְנֵה יְרוּשָׁלַיִם עִיר הַקֹּדֶשׁ בִּמְהֵרָה בְּיָמֵינוּ, וְהַעֲלֵנוּ לְתוֹכָהּ וְשַׂמְּחֵנוּ בְּבִנְיָנָהּ, וְנֹאכַל מִפִּרְיָהּ וְנִשְׂבַּע מִטּוּבָהּ, וּנְבָרֶכְךָ עָלֶיהָ בִּקְדֻשָּׁה וּבְטָהֳרָה. כִּי אַתָּה ה' טוֹב וּמֵטִיב לַכֹּל, וְנוֹדֶה לְּךָ עַל הָאָרֶץ וְעַל פְּרִי הַגָּפֶן. בָּרוּךְ אַתָּה ה', עַל הָאָרֶץ וְעַל פְּרִי הַגָּפֶן.",
  transliteration:
    "Al haguéfen véal péri haguéfen, véal ténouvat hassadé...",
  translation:
    "Pour la vigne et pour le fruit de la vigne, et pour les produits du champ…",
};

export const AL_HAÈTS = {
  name: "Al HaÈts (Méèn Chaloch)",
  hebrew:
    "בָּרוּךְ אַתָּה ה' אֱלֹהֵינוּ מֶלֶךְ הָעוֹלָם, עַל הָעֵץ וְעַל פְּרִי הָעֵץ, וְעַל תְּנוּבַת הַשָּׂדֶה, וְעַל אֶרֶץ חֶמְדָּה טוֹבָה וּרְחָבָה שֶׁרָצִיתָ וְהִנְחַלְתָּ לַאֲבוֹתֵינוּ לֶאֱכוֹל מִפִּרְיָהּ וְלִשְׂבֹּעַ מִטּוּבָהּ. רַחֶם נָא ה' אֱלֹהֵינוּ עַל יִשְׂרָאֵל עַמֶּךָ וְעַל יְרוּשָׁלַיִם עִירֶךָ וְעַל צִיּוֹן מִשְׁכַּן כְּבוֹדֶךָ וְעַל מִזְבְּחֶךָ וְעַל הֵיכָלֶךָ. וּבְנֵה יְרוּשָׁלַיִם עִיר הַקֹּדֶשׁ בִּמְהֵרָה בְּיָמֵינוּ, וְהַעֲלֵנוּ לְתוֹכָהּ וְשַׂמְּחֵנוּ בְּבִנְיָנָהּ, וְנֹאכַל מִפִּרְיָהּ וְנִשְׂבַּע מִטּוּבָהּ, וּנְבָרֶכְךָ עָלֶיהָ בִּקְדֻשָּׁה וּבְטָהֳרָה. כִּי אַתָּה ה' טוֹב וּמֵטִיב לַכֹּל, וְנוֹדֶה לְּךָ עַל הָאָרֶץ וְעַל הַפֵּרוֹת. בָּרוּךְ אַתָּה ה', עַל הָאָרֶץ וְעַל הַפֵּרוֹת.",
  transliteration:
    "Al haèts véal péri haèts, véal ténouvat hassadé...",
  translation:
    "Pour l'arbre et pour le fruit de l'arbre, et pour les produits du champ…",
};

// ---- CATÉGORIES ----

export const BRAKHOT_DATA: BrakhaCategory[] = [
  {
    id: "pain",
    label: "Pain (Hamotsi)",
    icon: "🍞",
    items: [
      {
        name: "Pain",
        icon: "🥖",
        rishona: {
          hebrew: "בָּרוּךְ אַתָּה ה' אֱלֹהֵינוּ מֶלֶךְ הָעוֹלָם, הַמּוֹצִיא לֶחֶם מִן הָאָרֶץ",
          transliteration: "Baroukh Ata Ado-naï Élo-hénou Mélekh haolam, hamotsi lé'hèm min haarets",
          translation: "Béni sois-Tu Éternel notre D.ieu Roi du monde, Qui fait sortir le pain de la terre",
        },
        aharona: {
          name: "Birkat HaMazone",
          hebrew: "Voir section Birkat HaMazone complète",
          transliteration: "",
          translation: "Bénédiction après le repas avec pain — voir section dédiée ci-dessous",
        },
        shiur: "Kazaït (≈27g) de pain pour déclencher le Birkat HaMazone",
        keywords: ["pain", "bread", "pita", "hallah", "'hala", "baguette", "matsa", "matzah", "le'hem", "hamotsi"],
      },
    ],
  },
  {
    id: "mezonot",
    label: "Pâtisseries (Mézonot)",
    icon: "🥐",
    items: [
      {
        name: "Pâtisseries / Gâteaux",
        icon: "🍰",
        rishona: {
          hebrew: "בָּרוּךְ אַתָּה ה' אֱלֹהֵינוּ מֶלֶךְ הָעוֹלָם, בּוֹרֵא מִינֵי מְזוֹנוֹת",
          transliteration: "Baroukh Ata Ado-naï Élo-hénou Mélekh haolam, boré miné mézonot",
          translation: "Béni sois-Tu… Qui crée diverses sortes de nourritures",
        },
        aharona: AL_HAMIHYA,
        shiur: "Kazaït (≈27g) pour la brakha a'harona « Al Hami'hya »",
        keywords: ["gateau", "gâteau", "cake", "biscuit", "cookie", "pâtisserie", "patisserie", "croissant", "brioche", "crêpe", "crepe", "mézonot", "mezonot", "muffin", "donut"],
      },
      {
        name: "Riz",
        icon: "🍚",
        rishona: {
          hebrew: "בָּרוּךְ אַתָּה ה' אֱלֹהֵינוּ מֶלֶךְ הָעוֹלָם, בּוֹרֵא מִינֵי מְזוֹנוֹת",
          transliteration: "Baroukh Ata Ado-naï Élo-hénou Mélekh haolam, boré miné mézonot",
          translation: "Béni sois-Tu… Qui crée diverses sortes de nourritures",
        },
        aharona: BORE_NEFASHOT,
        shiur: "Kazaït (≈27g). Note : selon le Rambam, Boré Néfachot après le riz (coutume séfarade majoritaire). Certains Achkénazes disent Al Hami'hya.",
        keywords: ["riz", "rice", "couscous", "semoule"],
      },
      {
        name: "Pâtes / Pizza",
        icon: "🍕",
        rishona: {
          hebrew: "בָּרוּךְ אַתָּה ה' אֱלֹהֵינוּ מֶלֶךְ הָעוֹלָם, בּוֹרֵא מִינֵי מְזוֹנוֹת",
          transliteration: "Baroukh Ata Ado-naï Élo-hénou Mélekh haolam, boré miné mézonot",
          translation: "Béni sois-Tu… Qui crée diverses sortes de nourritures",
        },
        aharona: AL_HAMIHYA,
        shiur: "Kazaït (≈27g). Attention : si on en mange une grande quantité (≈216g = « séouda »), on dit Hamotsi + Birkat HaMazone.",
        keywords: ["pâtes", "pates", "pizza", "pasta", "lasagne", "quiche", "tourte"],
      },
    ],
  },
  {
    id: "haguefen",
    label: "Vin (HaGuéfen)",
    icon: "🍷",
    items: [
      {
        name: "Vin / Jus de raisin",
        icon: "🍇",
        rishona: {
          hebrew: "בָּרוּךְ אַתָּה ה' אֱלֹהֵינוּ מֶלֶךְ הָעוֹלָם, בּוֹרֵא פְּרִי הַגָּפֶן",
          transliteration: "Baroukh Ata Ado-naï Élo-hénou Mélekh haolam, boré péri haguéfèn",
          translation: "Béni sois-Tu… Qui crée le fruit de la vigne",
        },
        aharona: AL_HAGUÉFEN,
        shiur: "Réviit (≈86ml) pour la brakha a'harona « Al HaGuéfen »",
        keywords: ["vin", "wine", "raisin", "grape", "jus de raisin", "kiddouch", "kidouch", "haguefen", "mousseux"],
      },
    ],
  },
  {
    id: "haets",
    label: "Fruits de l'arbre",
    icon: "🍎",
    items: [
      {
        name: "Fruits de l'arbre",
        icon: "🍏",
        rishona: {
          hebrew: "בָּרוּךְ אַתָּה ה' אֱלֹהֵינוּ מֶלֶךְ הָעוֹלָם, בּוֹרֵא פְּרִי הָעֵץ",
          transliteration: "Baroukh Ata Ado-naï Élo-hénou Mélekh haolam, boré péri haèts",
          translation: "Béni sois-Tu… Qui crée le fruit de l'arbre",
        },
        aharona: BORE_NEFASHOT,
        shiur: "Kazaït (≈27g). Pour les 7 espèces d'Israël (olive, datte, raisin, figue, grenade) : « Al HaÈts » au lieu de Boré Néfachot.",
        keywords: ["pomme", "apple", "poire", "pear", "banane", "banana", "orange", "mangue", "cerise", "abricot", "prune", "pêche", "peche", "kiwi", "ananas", "litchi", "fruit", "haèts", "clémentine", "clementine", "noix", "noisette", "amande", "pistache", "avocat", "citron", "pamplemousse"],
      },
      {
        name: "7 espèces d'Israël (fruits)",
        icon: "🫒",
        rishona: {
          hebrew: "בָּרוּךְ אַתָּה ה' אֱלֹהֵינוּ מֶלֶךְ הָעוֹלָם, בּוֹרֵא פְּרִי הָעֵץ",
          transliteration: "Baroukh Ata Ado-naï Élo-hénou Mélekh haolam, boré péri haèts",
          translation: "Béni sois-Tu… Qui crée le fruit de l'arbre",
        },
        aharona: AL_HAÈTS,
        shiur: "Kazaït (≈27g). Brakha a'harona spéciale « Al HaÈts » pour olive, datte, raisin (frais/sec), figue, grenade.",
        keywords: ["olive", "datte", "date", "figue", "fig", "grenade", "raisin sec", "7 espèces", "chivat haminim"],
      },
    ],
  },
  {
    id: "haadama",
    label: "Légumes / Terre",
    icon: "🥕",
    items: [
      {
        name: "Fruits de la terre / Légumes",
        icon: "🥬",
        rishona: {
          hebrew: "בָּרוּךְ אַתָּה ה' אֱלֹהֵינוּ מֶלֶךְ הָעוֹלָם, בּוֹרֵא פְּרִי הָאֲדָמָה",
          transliteration: "Baroukh Ata Ado-naï Élo-hénou Mélekh haolam, boré péri haadama",
          translation: "Béni sois-Tu… Qui crée le fruit de la terre",
        },
        aharona: BORE_NEFASHOT,
        shiur: "Kazaït (≈27g) pour Boré Néfachot",
        keywords: ["tomate", "carotte", "pomme de terre", "patate", "concombre", "poivron", "courgette", "aubergine", "salade", "laitue", "oignon", "ail", "haricot", "petit pois", "maïs", "légume", "legume", "haadama", "adama", "artichaut", "brocoli", "chou"],
      },
      {
        name: "Melon / Pastèque / Fraises",
        icon: "🍓",
        rishona: {
          hebrew: "בָּרוּךְ אַתָּה ה' אֱלֹהֵינוּ מֶלֶךְ הָעוֹלָם, בּוֹרֵא פְּרִי הָאֲדָמָה",
          transliteration: "Baroukh Ata Ado-naï Élo-hénou Mélekh haolam, boré péri haadama",
          translation: "Béni sois-Tu… Qui crée le fruit de la terre",
        },
        aharona: BORE_NEFASHOT,
        shiur: "Kazaït (≈27g). Note : le melon, la pastèque et les fraises poussent au sol → HaAdama",
        keywords: ["melon", "pastèque", "pasteque", "fraise", "strawberry", "framboise", "myrtille", "mûre", "mure"],
      },
    ],
  },
  {
    id: "chehakol",
    label: "Divers (Chéhakol)",
    icon: "🥤",
    items: [
      {
        name: "Eau / Boissons",
        icon: "💧",
        rishona: {
          hebrew: "בָּרוּךְ אַתָּה ה' אֱלֹהֵינוּ מֶלֶךְ הָעוֹלָם, שֶׁהַכֹּל נִהְיָה בִּדְבָרוֹ",
          transliteration: "Baroukh Ata Ado-naï Élo-hénou Mélekh haolam, chéhakol nihya bidvaro",
          translation: "Béni sois-Tu… Par la parole de Qui tout existe",
        },
        aharona: BORE_NEFASHOT,
        shiur: "Réviit (≈86ml) de boisson pour Boré Néfachot",
        keywords: ["eau", "water", "café", "coffee", "thé", "tea", "jus", "juice", "lait", "milk", "soda", "coca", "bière", "biere", "boisson"],
      },
      {
        name: "Viande / Poulet / Poisson",
        icon: "🍗",
        rishona: {
          hebrew: "בָּרוּךְ אַתָּה ה' אֱלֹהֵינוּ מֶלֶךְ הָעוֹלָם, שֶׁהַכֹּל נִהְיָה בִּדְבָרוֹ",
          transliteration: "Baroukh Ata Ado-naï Élo-hénou Mélekh haolam, chéhakol nihya bidvaro",
          translation: "Béni sois-Tu… Par la parole de Qui tout existe",
        },
        aharona: BORE_NEFASHOT,
        shiur: "Kazaït (≈27g) pour Boré Néfachot",
        keywords: ["viande", "poulet", "poisson", "steak", "hamburger", "saucisse", "oeuf", "egg", "thon"],
      },
      {
        name: "Produits laitiers / Chocolat / Bonbons",
        icon: "🍫",
        rishona: {
          hebrew: "בָּרוּךְ אַתָּה ה' אֱלֹהֵינוּ מֶלֶךְ הָעוֹלָם, שֶׁהַכֹּל נִהְיָה בִּדְבָרוֹ",
          transliteration: "Baroukh Ata Ado-naï Élo-hénou Mélekh haolam, chéhakol nihya bidvaro",
          translation: "Béni sois-Tu… Par la parole de Qui tout existe",
        },
        aharona: BORE_NEFASHOT,
        shiur: "Kazaït (≈27g) pour Boré Néfachot",
        keywords: ["fromage", "yaourt", "chocolat", "bonbon", "glace", "sucre", "chéhakol", "chehakol", "soupe", "bouillon"],
      },
    ],
  },
  {
    id: "evenements",
    label: "Événements",
    icon: "🌟",
    items: [
      {
        name: "Nouveau fruit / Événement rare",
        icon: "✨",
        rishona: {
          hebrew: "בָּרוּךְ אַתָּה ה' אֱלֹהֵינוּ מֶלֶךְ הָעוֹלָם, שֶׁהֶחֱיָנוּ וְקִיְּמָנוּ וְהִגִּיעָנוּ לַזְּמַן הַזֶּה",
          transliteration: "Baroukh Ata Ado-naï Élo-hénou Mélekh haolam, chéhé'héyanou vékiyémanou véhiguiyanou lazman hazé",
          translation: "Béni sois-Tu… Qui nous a fait vivre, nous a maintenus et nous a fait atteindre ce moment",
        },
        aharona: { name: "—", hebrew: "", transliteration: "", translation: "Pas de brakha a'harona spécifique" },
        shiur: "Pas de shiur — se dit pour tout événement joyeux nouveau",
        keywords: ["nouveau", "new", "première fois", "cheheheyanou", "vêtement", "vetement", "saison"],
      },
      {
        name: "Éclair / Tonnerre",
        icon: "⚡",
        rishona: {
          hebrew: "בָּרוּךְ אַתָּה ה' אֱלֹהֵינוּ מֶלֶךְ הָעוֹלָם, שֶׁכֹּחוֹ וּגְבוּרָתוֹ מָלֵא עוֹלָם",
          transliteration: "Baroukh Ata Ado-naï Élo-hénou Mélekh haolam, chéko'ho ouguévourato malé olam",
          translation: "Béni sois-Tu… Dont la force et la puissance remplissent le monde",
        },
        aharona: { name: "—", hebrew: "", transliteration: "", translation: "" },
        shiur: "Se dit une fois par orage",
        keywords: ["éclair", "eclair", "tonnerre", "orage", "foudre"],
      },
      {
        name: "Arc-en-ciel",
        icon: "🌈",
        rishona: {
          hebrew: "בָּרוּךְ אַתָּה ה' אֱלֹהֵינוּ מֶלֶךְ הָעוֹלָם, זוֹכֵר הַבְּרִית וְנֶאֱמָן בִּבְרִיתוֹ וְקַיָּם בְּמַאֲמָרוֹ",
          transliteration: "Baroukh Ata Ado-naï Élo-hénou Mélekh haolam, zokhér habrit vénééman bivrito vékayam bémaemaro",
          translation: "Béni sois-Tu… Qui se souvient de l'alliance, fidèle à Son alliance et accomplit Sa parole",
        },
        aharona: { name: "—", hebrew: "", transliteration: "", translation: "" },
        shiur: "Se dit en voyant un arc-en-ciel. Il est interdit d'observer l'arc-en-ciel de manière prolongée.",
        keywords: ["arc-en-ciel", "arc en ciel", "rainbow"],
      },
      {
        name: "Bonne nouvelle",
        icon: "😊",
        rishona: {
          hebrew: "בָּרוּךְ אַתָּה ה' אֱלֹהֵינוּ מֶלֶךְ הָעוֹלָם, הַטּוֹב וְהַמֵּטִיב",
          transliteration: "Baroukh Ata Ado-naï Élo-hénou Mélekh haolam, hatov véhamétiv",
          translation: "Béni sois-Tu… Qui est bon et fait le bien",
        },
        aharona: { name: "—", hebrew: "", transliteration: "", translation: "" },
        shiur: "Pour une bonne nouvelle qui profite aussi à d'autres. Si uniquement personnelle : Chéhé'héyanou.",
        keywords: ["bonne nouvelle", "good news", "hatov"],
      },
      {
        name: "Mauvaise nouvelle",
        icon: "😢",
        rishona: {
          hebrew: "בָּרוּךְ אַתָּה ה' אֱלֹהֵינוּ מֶלֶךְ הָעוֹלָם, דַּיַּן הָאֱמֶת",
          transliteration: "Baroukh Ata Ado-naï Élo-hénou Mélekh haolam, dayan haémet",
          translation: "Béni sois-Tu… Le juge de vérité",
        },
        aharona: { name: "—", hebrew: "", transliteration: "", translation: "" },
        shiur: "Se dit lors d'un décès ou d'une mauvaise nouvelle majeure",
        keywords: ["mauvaise nouvelle", "décès", "deces", "mort", "dayan", "deuil"],
      },
    ],
  },
  {
    id: "mitsva",
    label: "Mitsvot",
    icon: "✡️",
    items: [
      {
        name: "Nétilat Yadaïm (lavage des mains)",
        icon: "🫧",
        rishona: {
          hebrew: "בָּרוּךְ אַתָּה ה' אֱלֹהֵינוּ מֶלֶךְ הָעוֹלָם, אֲשֶׁר קִדְּשָׁנוּ בְּמִצְוֹתָיו וְצִוָּנוּ עַל נְטִילַת יָדַיִם",
          transliteration: "Baroukh Ata Ado-naï Élo-hénou Mélekh haolam, achèr kidéchanou bémitsvotav vétsivanou al nétilat yadaïm",
          translation: "Béni sois-Tu… Qui nous a sanctifiés par Ses commandements et nous a ordonné le lavage des mains",
        },
        aharona: { name: "—", hebrew: "", transliteration: "", translation: "" },
        shiur: "Obligatoire avant de manger du pain (Hamotsi)",
        keywords: ["mains", "lavage", "netilat", "yadaim", "ablution"],
      },
      {
        name: "Bougies de Chabbat",
        icon: "🕯️",
        rishona: {
          hebrew: "בָּרוּךְ אַתָּה ה' אֱלֹהֵינוּ מֶלֶךְ הָעוֹלָם, אֲשֶׁר קִדְּשָׁנוּ בְּמִצְוֹתָיו וְצִוָּנוּ לְהַדְלִיק נֵר שֶׁל שַׁבָּת",
          transliteration: "Baroukh Ata Ado-naï Élo-hénou Mélekh haolam, achèr kidéchanou bémitsvotav vétsivanou léhadlik nèr chel Chabbat",
          translation: "Béni sois-Tu… Qui nous a ordonné d'allumer la lumière du Chabbat",
        },
        aharona: { name: "—", hebrew: "", transliteration: "", translation: "" },
        shiur: "Minimum 2 bougies. 18 minutes avant le coucher du soleil.",
        keywords: ["bougie", "allumage", "chabbat", "nèr", "hadlik", "shabbat"],
      },
      {
        name: "Tsitsit",
        icon: "🧵",
        rishona: {
          hebrew: "בָּרוּךְ אַתָּה ה' אֱלֹהֵינוּ מֶלֶךְ הָעוֹלָם, אֲשֶׁר קִדְּשָׁנוּ בְּמִצְוֹתָיו וְצִוָּנוּ עַל מִצְוַת צִיצִית",
          transliteration: "Baroukh Ata Ado-naï Élo-hénou Mélekh haolam, achèr kidéchanou bémitsvotav vétsivanou al mitsvat tsitsit",
          translation: "Béni sois-Tu… Qui nous a ordonné la mitsva des tsitsit",
        },
        aharona: { name: "—", hebrew: "", transliteration: "", translation: "" },
        shiur: "Se dit le matin en revêtant le Talit Katane ou le grand Talit",
        keywords: ["tsitsit", "tzitzit", "frange", "talit"],
      },
      {
        name: "Mézouza",
        icon: "📜",
        rishona: {
          hebrew: "בָּרוּךְ אַתָּה ה' אֱלֹהֵינוּ מֶלֶךְ הָעוֹלָם, אֲשֶׁר קִדְּשָׁנוּ בְּמִצְוֹתָיו וְצִוָּנוּ לִקְבֹּעַ מְזוּזָה",
          transliteration: "Baroukh Ata Ado-naï Élo-hénou Mélekh haolam, achèr kidéchanou bémitsvotav vétsivanou likboa mézouza",
          translation: "Béni sois-Tu… Qui nous a ordonné de fixer la mézouza",
        },
        aharona: { name: "—", hebrew: "", transliteration: "", translation: "" },
        shiur: "Se dit lors de la fixation d'une mézouza sur un montant de porte",
        keywords: ["mezouza", "mézouza", "mezuzah", "porte"],
      },
    ],
  },
  {
    id: "quotidien",
    label: "Bénédictions quotidiennes",
    icon: "🌅",
    items: [
      {
        name: "Au réveil (Modé Ani)",
        icon: "🌤️",
        rishona: {
          hebrew: "מוֹדֶה (מוֹדָה) אֲנִי לְפָנֶיךָ מֶלֶךְ חַי וְקַיָּם, שֶׁהֶחֱזַרְתָּ בִּי נִשְׁמָתִי בְּחֶמְלָה, רַבָּה אֱמוּנָתֶךָ",
          transliteration: "Modé (moda) ani léfanékha Mélekh 'haï vékayam, chéhé'hézarta bi nichmati bé'hemla, raba émounatékha",
          translation: "Je Te remercie, Roi vivant et éternel, d'avoir rendu mon âme en moi avec miséricorde. Grande est Ta fidélité.",
        },
        aharona: { name: "—", hebrew: "", transliteration: "", translation: "" },
        shiur: "Se dit immédiatement au réveil, avant même de se lever",
        keywords: ["réveil", "reveil", "matin", "modé ani", "mode ani", "morning"],
      },
      {
        name: "Achèr Yatsar (sortie des toilettes)",
        icon: "🚿",
        rishona: {
          hebrew: "בָּרוּךְ אַתָּה ה' אֱלֹהֵינוּ מֶלֶךְ הָעוֹלָם, אֲשֶׁר יָצַר אֶת הָאָדָם בְּחָכְמָה, וּבָרָא בוֹ נְקָבִים נְקָבִים, חֲלוּלִים חֲלוּלִים. גָּלוּי וְיָדוּעַ לִפְנֵי כִסֵּא כְבוֹדֶךָ, שֶׁאִם יִפָּתֵחַ אֶחָד מֵהֶם, אוֹ יִסָּתֵם אֶחָד מֵהֶם, אִי אֶפְשַׁר לְהִתְקַיֵּם וְלַעֲמוֹד לְפָנֶיךָ. בָּרוּךְ אַתָּה ה', רוֹפֵא כָל בָּשָׂר וּמַפְלִיא לַעֲשׂוֹת.",
          transliteration: "Baroukh Ata Ado-naï Élo-hénou Mélekh haolam, achèr yatsar èt haadam bé'hokhma...",
          translation: "Béni sois-Tu… Qui a formé l'homme avec sagesse, et a créé en lui orifices et cavités…",
        },
        aharona: { name: "—", hebrew: "", transliteration: "", translation: "" },
        shiur: "Se dit après chaque passage aux toilettes",
        keywords: ["toilette", "wc", "acher yatsar", "asher yatzar", "achèr"],
      },
      {
        name: "Chéma du coucher",
        icon: "🌙",
        rishona: {
          hebrew: "שְׁמַע יִשְׂרָאֵל ה' אֱלֹהֵינוּ ה' אֶחָד",
          transliteration: "Chéma Israël Ado-naï Élo-hénou Ado-naï É'had",
          translation: "Écoute Israël, l'Éternel est notre D.ieu, l'Éternel est Un",
        },
        aharona: { name: "—", hebrew: "", transliteration: "", translation: "" },
        shiur: "Se dit le soir avant de s'endormir, suivi du premier paragraphe du Chéma complet",
        keywords: ["dormir", "coucher", "nuit", "chema", "shema", "sleep"],
      },
    ],
  },
];

// ---- CAS COMPLEXES ----

export interface ComplexCase {
  title: string;
  icon: string;
  explanation: string;
}

export const COMPLEX_CASES: ComplexCase[] = [
  {
    title: "Ikar vé-Tafel (principal et secondaire)",
    icon: "⚖️",
    explanation:
      "Quand on mange deux aliments ensemble, la brakha se fait sur l'aliment principal (Ikar). L'aliment secondaire (Tafel) est couvert par cette brakha. Exemple : une salade de fruits avec de la crème → la brakha est sur les fruits (HaÈts), la crème est Tafel. Mais si on mange les deux pour eux-mêmes → deux brakhot séparées.",
  },
  {
    title: "Aliment cuit vs cru (changement de brakha)",
    icon: "🍳",
    explanation:
      "Certains aliments changent de brakha selon leur mode de préparation. Exemple : une banane crue = HaÈts. Une banane frite = Chéhakol (selon certains avis) ou HaÈts (si elle garde sa forme). En cas de doute, consulter son Rav.",
  },
  {
    title: "Ordre des brakhot (Kdima)",
    icon: "📋",
    explanation:
      "Quand on a plusieurs aliments devant soi avec des brakhot différentes, on suit cet ordre de priorité : 1) Hamotsi, 2) Mézonot, 3) HaGuéfen, 4) HaÈts, 5) HaAdama, 6) Chéhakol. À brakha égale, les 7 espèces d'Israël ont priorité.",
  },
  {
    title: "Soupe avec morceaux",
    icon: "🍲",
    explanation:
      "Soupe de légumes : si on mange le bouillon ET les morceaux, on dit HaAdama sur les morceaux et c'est suffisant. Si on ne boit que le bouillon → Chéhakol. Soupe de céréales (ex: soupe de vermicelles) : Mézonot sur les vermicelles couvre le tout.",
  },
  {
    title: "Fruits en compote ou en jus",
    icon: "🧃",
    explanation:
      "Un fruit transformé en compote ou en purée garde sa brakha d'origine (HaÈts ou HaAdama). Mais un jus de fruit (sauf raisin) → Chéhakol. Le jus de raisin garde sa brakha spéciale : HaGuéfen.",
  },
];

// ---- BIRKAT HAMAZONE ----

export interface BirkatVersion {
  id: string;
  name: string;
  paragraphs: { hebrew: string; transliteration?: string }[];
}

export const BIRKAT_HAMAZONE: BirkatVersion[] = [
  {
    id: "sefarade",
    name: "Coutume Séfarade",
    paragraphs: [
      {
        hebrew: "בָּרוּךְ אַתָּה ה' אֱלֹהֵינוּ מֶלֶךְ הָעוֹלָם, הַזָּן אֶת הָעוֹלָם כֻּלּוֹ בְּטוּבוֹ, בְּחֵן בְּחֶסֶד וּבְרַחֲמִים. הוּא נוֹתֵן לֶחֶם לְכָל בָּשָׂר, כִּי לְעוֹלָם חַסְדּוֹ. וּבְטוּבוֹ הַגָּדוֹל תָּמִיד לֹא חָסַר לָנוּ, וְאַל יֶחְסַר לָנוּ מָזוֹן לְעוֹלָם וָעֶד. בַּעֲבוּר שְׁמוֹ הַגָּדוֹל, כִּי הוּא אֵל זָן וּמְפַרְנֵס לַכֹּל, וּמֵטִיב לַכֹּל, וּמֵכִין מָזוֹן לְכָל בְּרִיּוֹתָיו אֲשֶׁר בָּרָא. בָּרוּךְ אַתָּה ה', הַזָּן אֶת הַכֹּל.",
        transliteration: "Baroukh Ata Ado-naï Élo-hénou Mélekh haolam, hazan èt haolam koulo bétouvo, bé'hèn bé'hessed ouvéra'hamim..."
      },
      {
        hebrew: "נוֹדֶה לְּךָ ה' אֱלֹהֵינוּ, עַל שֶׁהִנְחַלְתָּ לַאֲבוֹתֵינוּ אֶרֶץ חֶמְדָּה טוֹבָה וּרְחָבָה, וְעַל שֶׁהוֹצֵאתָנוּ ה' אֱלֹהֵינוּ מֵאֶרֶץ מִצְרַיִם, וּפְדִיתָנוּ מִבֵּית עֲבָדִים, וְעַל בְּרִיתְךָ שֶׁחָתַמְתָּ בִּבְשָׂרֵנוּ, וְעַל תּוֹרָתְךָ שֶׁלִּמַּדְתָּנוּ, וְעַל חֻקֵּי רְצוֹנְךָ שֶׁהוֹדַעְתָּנוּ, וְעַל חַיִּים חֵן וָחֶסֶד שֶׁחוֹנַנְתָּנוּ, וְעַל אֲכִילַת מָזוֹן שָׁאַתָּה זָן וּמְפַרְנֵס אוֹתָנוּ תָּמִיד, בְּכָל יוֹם וּבְכָל עֵת וּבְכָל שָׁעָה.",
      },
      {
        hebrew: "רַחֶם נָא ה' אֱלֹהֵינוּ עַל יִשְׂרָאֵל עַמֶּךָ, וְעַל יְרוּשָׁלַיִם עִירֶךָ, וְעַל צִיּוֹן מִשְׁכַּן כְּבוֹדֶךָ, וְעַל מַלְכוּת בֵּית דָּוִד מְשִׁיחֶךָ, וְעַל הַבַּיִת הַגָּדוֹל וְהַקָּדוֹשׁ שֶׁנִּקְרָא שִׁמְךָ עָלָיו. אֱלֹהֵינוּ אָבִינוּ, רְעֵנוּ זוּנֵנוּ פַּרְנְסֵנוּ וְכַלְכְּלֵנוּ וְהַרְוִיחֵנוּ, וְהַרְוַח לָנוּ ה' אֱלֹהֵינוּ מְהֵרָה מִכָּל צָרוֹתֵינוּ.",
      },
      {
        hebrew: "בָּרוּךְ אַתָּה ה' אֱלֹהֵינוּ מֶלֶךְ הָעוֹלָם, הָאֵל אָבִינוּ מַלְכֵּנוּ אַדִּירֵנוּ בּוֹרְאֵנוּ גּוֹאֲלֵנוּ יוֹצְרֵנוּ קְדוֹשֵׁנוּ קְדוֹשׁ יַעֲקֹב, רוֹעֵנוּ רוֹעֵה יִשְׂרָאֵל הַמֶּלֶךְ הַטּוֹב וְהַמֵּטִיב לַכֹּל, שֶׁבְּכָל יוֹם וָיוֹם הוּא הֵטִיב, הוּא מֵטִיב, הוּא יֵיטִיב לָנוּ.",
      },
    ],
  },
  {
    id: "ashkenaze",
    name: "Coutume Achkénaze",
    paragraphs: [
      {
        hebrew: "בָּרוּךְ אַתָּה ה' אֱלֹהֵינוּ מֶלֶךְ הָעוֹלָם, הַזָּן אֶת הָעוֹלָם כֻּלּוֹ בְּטוּבוֹ, בְּחֵן בְּחֶסֶד וּבְרַחֲמִים. הוּא נוֹתֵן לֶחֶם לְכָל בָּשָׂר, כִּי לְעוֹלָם חַסְדּוֹ. וּבְטוּבוֹ הַגָּדוֹל תָּמִיד לֹא חָסַר לָנוּ, וְאַל יֶחְסַר לָנוּ מָזוֹן לְעוֹלָם וָעֶד. בַּעֲבוּר שְׁמוֹ הַגָּדוֹל, כִּי הוּא אֵל זָן וּמְפַרְנֵס לַכֹּל, וּמֵטִיב לַכֹּל, וּמֵכִין מָזוֹן לְכָל בְּרִיּוֹתָיו אֲשֶׁר בָּרָא. בָּרוּךְ אַתָּה ה', הַזָּן אֶת הַכֹּל.",
        transliteration: "Baroukh Ata Ado-naï Élo-hénou Mélekh haolam, hazan èt haolam koulo bétouvo..."
      },
      {
        hebrew: "נוֹדֶה לְּךָ ה' אֱלֹהֵינוּ, עַל שֶׁהִנְחַלְתָּ לַאֲבוֹתֵינוּ אֶרֶץ חֶמְדָּה טוֹבָה וּרְחָבָה, בְּרִית וְתוֹרָה, חַיִּים וּמָזוֹן. יִתְבָּרַךְ שִׁמְךָ בְּפִי כָּל חַי תָּמִיד לְעוֹלָם וָעֶד. כַּכָּתוּב: וְאָכַלְתָּ וְשָׂבָעְתָּ, וּבֵרַכְתָּ אֶת ה' אֱלֹהֶיךָ עַל הָאָרֶץ הַטֹּבָה אֲשֶׁר נָתַן לָךְ. בָּרוּךְ אַתָּה ה', עַל הָאָרֶץ וְעַל הַמָּזוֹן.",
      },
      {
        hebrew: "רַחֶם ה' אֱלֹהֵינוּ עַל יִשְׂרָאֵל עַמֶּךָ, וְעַל יְרוּשָׁלַיִם עִירֶךָ, וְעַל צִיּוֹן מִשְׁכַּן כְּבוֹדֶךָ, וְעַל מַלְכוּת בֵּית דָּוִד מְשִׁיחֶךָ, וְעַל הַבַּיִת הַגָּדוֹל וְהַקָּדוֹשׁ שֶׁנִּקְרָא שִׁמְךָ עָלָיו. אֱלֹהֵינוּ אָבִינוּ, רְעֵנוּ זוּנֵנוּ פַּרְנְסֵנוּ וְכַלְכְּלֵנוּ וְהַרְוִיחֵנוּ, וְהַרְוַח לָנוּ ה' אֱלֹהֵינוּ מְהֵרָה מִכָּל צָרוֹתֵינוּ.",
      },
      {
        hebrew: "הָרַחֲמָן, הוּא יִמְלוֹךְ עָלֵינוּ לְעוֹלָם וָעֶד. הָרַחֲמָן, הוּא יִתְבָּרַךְ בַּשָּׁמַיִם וּבָאָרֶץ. הָרַחֲמָן, הוּא יִשְׁלַח לָנוּ בְּרָכָה מְרֻבָּה בַּבַּיִת הַזֶּה, וְעַל שֻׁלְחָן זֶה שֶׁאָכַלְנוּ עָלָיו. הָרַחֲמָן, הוּא יִשְׁלַח לָנוּ אֶת אֵלִיָּהוּ הַנָּבִיא זָכוּר לַטּוֹב, וִיבַשֶּׂר לָנוּ בְּשׂוֹרוֹת טוֹבוֹת יְשׁוּעוֹת וְנֶחָמוֹת.",
      },
    ],
  },
  {
    id: "abregee",
    name: "Version abrégée (voyage)",
    paragraphs: [
      {
        hebrew: "בְּרִיךְ רַחֲמָנָא מַלְכָּא דְעָלְמָא מָרֵיהּ דְהַאי פִּתָּא.",
        transliteration: "Brikh Ra'hamana Malka déalma, Maréih déhaï pitta.",
      },
      {
        hebrew: "Cette formule abrégée est utilisée uniquement en cas d'urgence ou de voyage. Elle ne remplace pas le Birkat HaMazone complet dans des conditions normales.",
      },
    ],
  },
];
