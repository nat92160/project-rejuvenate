export interface OfficeMeta {
  key: string;
  label: string;
  icon: string;
  desc: string;
}
export interface OfficeCategory {
  id: string;
  label: string;
  icon: string;
  offices: OfficeMeta[];
}

export const SIDDOUR_CATEGORIES: OfficeCategory[] = [
  {
    id: "daily", label: "Quotidien", icon: "📅",
    offices: [
      { key: "shacharit", label: "Cha'harit", icon: "🌅", desc: "Prière du matin" },
      { key: "minha", label: "Min'ha", icon: "☀️", desc: "Prière de l'après-midi" },
      { key: "arvit", label: "Arvit", icon: "🌙", desc: "Prière du soir" },
    ],
  },
  {
    id: "shabbat", label: "Chabbat", icon: "🕯️",
    offices: [
      { key: "shabbat", label: "Chabbat complet", icon: "🕯️", desc: "Kabbalat → Havdala" },
      { key: "mishnayot_shabbat", label: "Michnayot", icon: "📖", desc: "Étude Chabbat" },
    ],
  },
  {
    id: "holidays", label: "Fêtes", icon: "🎺",
    offices: [
      { key: "rosh_hodesh", label: "Roch 'Hodech", icon: "🌙", desc: "Nouveau mois" },
      { key: "fetes", label: "Chaloch Régalim", icon: "🎺", desc: "Pessa'h, Chavouot, Soukot" },
      { key: "hanukkah", label: "'Hanouka", icon: "🕎", desc: "Allumage & Hallel" },
      { key: "purim", label: "Pourim", icon: "🎭", desc: "Méguila & Séder" },
      { key: "taanit", label: "Jeûnes", icon: "🕊️", desc: "Sélihot & deuil" },
      { key: "nissan", label: "Nissan", icon: "🌸", desc: "Birkat HaIlanot" },
    ],
  },
  {
    id: "brakhot", label: "Brakhot", icon: "🙏",
    offices: [
      { key: "birkat", label: "Birkat HaMazone", icon: "🍞", desc: "Bénédiction du repas" },
      { key: "berakhot", label: "Brakhot", icon: "🙏", desc: "Mariage, Brit…" },
      { key: "birkat_halevana", label: "Birkat HaLévana", icon: "🌕", desc: "Bénéd. lune" },
      { key: "tikoun_hatsot", label: "Tikoun 'Hatsot", icon: "🌑", desc: "Prière de minuit" },
    ],
  },
];

export const ALL_OFFICES: OfficeMeta[] = SIDDOUR_CATEGORIES.flatMap(c => c.offices);

export function getOfficeMeta(key: string): OfficeMeta | undefined {
  return ALL_OFFICES.find(o => o.key === key);
}

export function detectOfficeNow(): string {
  const h = new Date().getHours();
  const day = new Date().getDay();
  if (day === 6 || (day === 5 && h >= 16)) return "shabbat";
  if (h < 12) return "shacharit";
  if (h < 17) return "minha";
  return "arvit";
}
