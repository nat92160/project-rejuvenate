import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Brakha {
  name: string;
  hebrew: string;
  transliteration: string;
  translation: string;
  keywords: string[]; // food/item names that map to this brakha
}

interface Category {
  id: string;
  label: string;
  icon: string;
  items: Brakha[];
}

const BRAKHOT_DATA: Category[] = [
  {
    id: "nourriture",
    label: "Nourriture",
    icon: "🍎",
    items: [
      {
        name: "Pain",
        hebrew: "בָּרוּךְ אַתָּה ה' אֱלֹהֵינוּ מֶלֶךְ הָעוֹלָם, הַמּוֹצִיא לֶחֶם מִן הָאָרֶץ",
        transliteration: "Hamotsi lé'hem min haarets",
        translation: "Qui fait sortir le pain de la terre",
        keywords: ["pain", "bread", "pita", "hallah", "'hala", "baguette", "matsa", "matzah", "le'hem"],
      },
      {
        name: "Pâtisseries / Gâteaux",
        hebrew: "בָּרוּךְ אַתָּה ה' אֱלֹהֵינוּ מֶלֶךְ הָעוֹלָם, בּוֹרֵא מִינֵי מְזוֹנוֹת",
        transliteration: "Boré miné mézonot",
        translation: "Qui crée diverses sortes de nourritures",
        keywords: ["gateau", "gâteau", "cake", "biscuit", "cookie", "pâtisserie", "patisserie", "croissant", "brioche", "crêpe", "crepe", "pizza", "pâtes", "pates", "riz", "couscous", "semoule", "céréale", "cereale", "mezonot", "mézonot"],
      },
      {
        name: "Vin / Jus de raisin",
        hebrew: "בָּרוּךְ אַתָּה ה' אֱלֹהֵינוּ מֶלֶךְ הָעוֹלָם, בּוֹרֵא פְּרִי הַגָּפֶן",
        transliteration: "Boré péri haguefen",
        translation: "Qui crée le fruit de la vigne",
        keywords: ["vin", "wine", "raisin", "grape", "jus de raisin", "kiddouch", "kidouch", "haguefen", "mousseux"],
      },
      {
        name: "Fruits de l'arbre",
        hebrew: "בָּרוּךְ אַתָּה ה' אֱלֹהֵינוּ מֶלֶךְ הָעוֹלָם, בּוֹרֵא פְּרִי הָעֵץ",
        transliteration: "Boré péri haèts",
        translation: "Qui crée le fruit de l'arbre",
        keywords: ["pomme", "apple", "poire", "pear", "banane", "banana", "orange", "mangue", "mango", "cerise", "cherry", "abricot", "prune", "pêche", "peche", "figue", "fig", "datte", "date", "olive", "grenade", "noix", "amande", "noisette", "pistache", "avocat", "citron", "pamplemousse", "clémentine", "clementine", "kiwi", "ananas", "litchi", "fruit", "haèts"],
      },
      {
        name: "Fruits de la terre / Légumes",
        hebrew: "בָּרוּךְ אַתָּה ה' אֱלֹהֵינוּ מֶלֶךְ הָעוֹלָם, בּוֹרֵא פְּרִי הָאֲדָמָה",
        transliteration: "Boré péri haadama",
        translation: "Qui crée le fruit de la terre",
        keywords: ["tomate", "carotte", "pomme de terre", "patate", "concombre", "poivron", "courgette", "aubergine", "salade", "laitue", "oignon", "ail", "haricot", "petit pois", "maïs", "melon", "pastèque", "pasteque", "fraise", "strawberry", "framboise", "myrtille", "légume", "legume", "haadama", "adama"],
      },
      {
        name: "Eau / Boissons / Divers",
        hebrew: "בָּרוּךְ אַתָּה ה' אֱלֹהֵינוּ מֶלֶךְ הָעוֹלָם, שֶׁהַכֹּל נִהְיָה בִּדְבָרוֹ",
        transliteration: "Chéhakol nihya bidvaro",
        translation: "Par la parole de Qui tout existe",
        keywords: ["eau", "water", "café", "coffee", "thé", "tea", "jus", "juice", "lait", "milk", "soda", "coca", "bière", "biere", "soupe", "bouillon", "viande", "poulet", "poisson", "oeuf", "fromage", "yaourt", "chocolat", "bonbon", "glace", "sucre", "chéhakol", "chehakol"],
      },
    ],
  },
  {
    id: "evenements",
    label: "Événements",
    icon: "🌟",
    items: [
      { name: "Nouveau fruit / Vêtement / Événement rare", hebrew: "בָּרוּךְ אַתָּה ה' אֱלֹהֵינוּ מֶלֶךְ הָעוֹלָם, שֶׁהֶחֱיָנוּ וְקִיְּמָנוּ וְהִגִּיעָנוּ לַזְּמַן הַזֶּה", transliteration: "Chéhé'héyanou vékiyémanou véhiguiyanou lazman hazé", translation: "Qui nous a fait vivre, nous a maintenus et nous a fait atteindre ce moment", keywords: ["nouveau", "new", "première fois", "cheheheyanou", "vêtement", "vetement"] },
      { name: "Éclair / Tonnerre", hebrew: "בָּרוּךְ אַתָּה ה' אֱלֹהֵינוּ מֶלֶךְ הָעוֹלָם, שֶׁכֹּחוֹ וּגְבוּרָתוֹ מָלֵא עוֹלָם", transliteration: "Chéko'ho ouguévourato malé olam", translation: "Dont la force et la puissance remplissent le monde", keywords: ["éclair", "eclair", "tonnerre", "orage", "foudre", "thunder", "lightning"] },
      { name: "Arc-en-ciel", hebrew: "בָּרוּךְ אַתָּה ה' אֱלֹהֵינוּ מֶלֶךְ הָעוֹלָם, זוֹכֵר הַבְּרִית וְנֶאֱמָן בִּבְרִיתוֹ וְקַיָּם בְּמַאֲמָרוֹ", transliteration: "Zokhér habrit vénééman bivrito vékayam bémaemaro", translation: "Qui se souvient de l'alliance, fidèle à Son alliance et accomplit Sa parole", keywords: ["arc-en-ciel", "arc en ciel", "rainbow"] },
      { name: "Bonne nouvelle", hebrew: "בָּרוּךְ אַתָּה ה' אֱלֹהֵינוּ מֶלֶךְ הָעוֹלָם, הַטּוֹב וְהַמֵּטִיב", transliteration: "Hatov véhamétiv", translation: "Qui est bon et fait le bien", keywords: ["bonne nouvelle", "good news", "hatov"] },
      { name: "Mauvaise nouvelle", hebrew: "בָּרוּךְ אַתָּה ה' אֱלֹהֵינוּ מֶלֶךְ הָעוֹלָם, דַּיַּן הָאֱמֶת", transliteration: "Dayan haémet", translation: "Le juge de vérité", keywords: ["mauvaise nouvelle", "décès", "deces", "mort", "dayan"] },
    ],
  },
  {
    id: "mitsva",
    label: "Mitsvot",
    icon: "✡️",
    items: [
      { name: "Lavage des mains (Nétilat Yadaïm)", hebrew: "בָּרוּךְ אַתָּה ה' אֱלֹהֵינוּ מֶלֶךְ הָעוֹלָם, אֲשֶׁר קִדְּשָׁנוּ בְּמִצְוֹתָיו וְצִוָּנוּ עַל נְטִילַת יָדַיִם", transliteration: "Al nétilat yadaïm", translation: "Qui nous a sanctifiés par Ses commandements et nous a ordonné le lavage des mains", keywords: ["mains", "lavage", "netilat", "yadaim"] },
      { name: "Allumage des bougies de Chabbat", hebrew: "בָּרוּךְ אַתָּה ה' אֱלֹהֵינוּ מֶלֶךְ הָעוֹלָם, אֲשֶׁר קִדְּשָׁנוּ בְּמִצְוֹתָיו וְצִוָּנוּ לְהַדְלִיק נֵר שֶׁל שַׁבָּת", transliteration: "Léhadlik nèr chel Chabbat", translation: "Qui nous a ordonné d'allumer la lumière du Chabbat", keywords: ["bougie", "allumage", "chabbat", "nèr", "hadlik"] },
      { name: "Tsitsit", hebrew: "בָּרוּךְ אַתָּה ה' אֱלֹהֵינוּ מֶלֶךְ הָעוֹלָם, אֲשֶׁר קִדְּשָׁנוּ בְּמִצְוֹתָיו וְצִוָּנוּ עַל מִצְוַת צִיצִית", transliteration: "Al mitsvat tsitsit", translation: "Qui nous a ordonné la mitsva des tsitsit", keywords: ["tsitsit", "tzitzit", "frange"] },
      { name: "Mezouza", hebrew: "בָּרוּךְ אַתָּה ה' אֱלֹהֵינוּ מֶלֶךְ הָעוֹלָם, אֲשֶׁר קִדְּשָׁנוּ בְּמִצְוֹתָיו וְצִוָּנוּ לִקְבֹּעַ מְזוּזָה", transliteration: "Likboa mézouza", translation: "Qui nous a ordonné de fixer la mézouza", keywords: ["mezouza", "mézouza", "mezuzah"] },
      { name: "Havdala (bougie)", hebrew: "בָּרוּךְ אַתָּה ה' אֱלֹהֵינוּ מֶלֶךְ הָעוֹלָם, בּוֹרֵא מְאוֹרֵי הָאֵשׁ", transliteration: "Boré méoré haèch", translation: "Qui crée les lumières du feu", keywords: ["havdala", "havdalah", "feu", "bougie havdala"] },
    ],
  },
  {
    id: "quotidien",
    label: "Quotidien",
    icon: "🌅",
    items: [
      { name: "Au réveil (Modé Ani)", hebrew: "מוֹדֶה אֲנִי לְפָנֶיךָ מֶלֶךְ חַי וְקַיָּם, שֶׁהֶחֱזַרְתָּ בִּי נִשְׁמָתִי בְּחֶמְלָה, רַבָּה אֱמוּנָתֶךָ", transliteration: "Modé ani léfanékha mélekh 'haï vékayam, chéhé'hézarta bi nichmati bé'hemla, raba émounatékha", translation: "Je Te remercie, Roi vivant et éternel, d'avoir rendu mon âme en moi avec miséricorde", keywords: ["réveil", "reveil", "matin", "modé ani", "mode ani", "morning"] },
      { name: "Sortie des toilettes (Achèr Yatsar)", hebrew: "בָּרוּךְ אַתָּה ה' אֱלֹהֵינוּ מֶלֶךְ הָעוֹלָם, אֲשֶׁר יָצַר אֶת הָאָדָם בְּחָכְמָה", transliteration: "Achèr yatsar èt haadam bé'hokhma", translation: "Qui a formé l'homme avec sagesse", keywords: ["toilette", "wc", "acher yatsar", "asher yatzar"] },
      { name: "Birkat Hamazon (résumé)", hebrew: "בָּרוּךְ אַתָּה ה' אֱלֹהֵינוּ מֶלֶךְ הָעוֹלָם, הַזָּן אֶת הָעוֹלָם כֻּלּוֹ בְּטוּבוֹ", transliteration: "Hazan èt haolam koulo bétouvo", translation: "Qui nourrit le monde entier par Sa bonté", keywords: ["birkat", "hamazon", "benedicite", "après repas", "apres repas"] },
      { name: "Avant de dormir (Chéma)", hebrew: "שְׁמַע יִשְׂרָאֵל ה' אֱלֹהֵינוּ ה' אֶחָד", transliteration: "Chéma Israël Ado-naï Élohénou Ado-naï É'had", translation: "Écoute Israël, l'Éternel est notre Dieu, l'Éternel est Un", keywords: ["dormir", "coucher", "nuit", "chema", "shema", "sleep"] },
    ],
  },
];

const BrakhotWidget = () => {
  const [searchText, setSearchText] = useState("");
  const [openCategory, setOpenCategory] = useState<string | null>(null);
  const [expandedBrakha, setExpandedBrakha] = useState<string | null>(null);

  const q = searchText.toLowerCase().trim();

  const filteredCategories = q
    ? BRAKHOT_DATA.map((cat) => ({
        ...cat,
        items: cat.items.filter(
          (b) =>
            b.name.toLowerCase().includes(q) ||
            b.transliteration.toLowerCase().includes(q) ||
            b.translation.toLowerCase().includes(q) ||
            b.keywords.some((kw) => kw.includes(q))
        ),
      })).filter((cat) => cat.items.length > 0)
    : BRAKHOT_DATA;

  // When searching, auto-expand the first matching brakha
  const firstMatch = q && filteredCategories.length > 0 && filteredCategories[0].items.length > 0
    ? `${filteredCategories[0].id}-${filteredCategories[0].items[0].name}`
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Header */}
      <div className="rounded-2xl p-4 border border-primary/15" style={{ background: "linear-gradient(135deg, hsl(var(--gold) / 0.06), hsl(var(--gold) / 0.02))" }}>
        <h3 className="font-display text-base font-bold text-foreground flex items-center gap-2">
          🙌 Brakhot — Bénédictions
        </h3>
        <p className="text-xs text-muted-foreground mt-1">Tapez un aliment (pomme, café, riz…) pour trouver sa brakha</p>
      </div>

      {/* Search */}
      <input
        type="text"
        placeholder="🔍 Quel aliment ? (pomme, café, pain...)"
        value={searchText}
        onChange={(e) => setSearchText(e.target.value)}
        className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
      />

      {/* Search result hint */}
      {q && filteredCategories.length > 0 && (
        <div className="rounded-xl p-3 border border-primary/20" style={{ background: "hsl(var(--gold) / 0.06)" }}>
          <p className="text-xs font-bold" style={{ color: "hsl(var(--gold-matte))" }}>
            ✨ La brakha pour « {searchText} » :
          </p>
        </div>
      )}

      {/* Categories */}
      {filteredCategories.length === 0 && (
        <div className="rounded-2xl bg-card p-8 text-center border border-border" style={{ boxShadow: "var(--shadow-card)" }}>
          <span className="text-3xl">🔍</span>
          <p className="text-sm text-muted-foreground mt-3">Aucune bénédiction trouvée pour « {searchText} ».</p>
        </div>
      )}

      {filteredCategories.map((cat) => {
        const isOpen = openCategory === cat.id || !!q;
        return (
          <div key={cat.id} className="rounded-2xl bg-card border border-border overflow-hidden" style={{ boxShadow: "var(--shadow-card)" }}>
            <button
              onClick={() => setOpenCategory(isOpen && !q ? null : cat.id)}
              className="w-full flex items-center justify-between p-4 border-none bg-transparent cursor-pointer text-left"
            >
              <span className="flex items-center gap-2.5">
                <span className="text-xl">{cat.icon}</span>
                <span className="font-display text-sm font-bold text-foreground">{cat.label}</span>
                <span className="text-[10px] text-muted-foreground font-medium">({cat.items.length})</span>
              </span>
              <span className="text-muted-foreground text-sm transition-transform" style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0)" }}>
                ▼
              </span>
            </button>

            <AnimatePresence>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-4 space-y-2">
                    {cat.items.map((b) => {
                      const bKey = `${cat.id}-${b.name}`;
                      const isExpanded = expandedBrakha === bKey || firstMatch === bKey;
                      return (
                        <div
                          key={b.name}
                          className="rounded-xl border border-border p-3 cursor-pointer transition-all hover:border-primary/20"
                          style={{ background: isExpanded ? "hsl(var(--gold) / 0.05)" : "transparent" }}
                          onClick={() => setExpandedBrakha(isExpanded ? null : bKey)}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-foreground">{b.name}</span>
                            <span className="text-[10px] text-muted-foreground">{isExpanded ? "▲" : "▼"}</span>
                          </div>

                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                              >
                                <div className="mt-3 space-y-2">
                                  <p className="text-base text-right leading-relaxed font-semibold" style={{ direction: "rtl", fontFamily: "'David Libre', serif", color: "hsl(var(--gold-matte))" }}>
                                    {b.hebrew}
                                  </p>
                                  <p className="text-xs text-foreground italic">{b.transliteration}</p>
                                  <p className="text-[11px] text-muted-foreground">{b.translation}</p>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </motion.div>
  );
};

export default BrakhotWidget;
