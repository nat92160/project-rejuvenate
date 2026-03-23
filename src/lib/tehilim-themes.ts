export type TehilimTheme = {
  id: string;
  label: string;
  icon: string;
  psalms: number[];
  description: string;
};

export const TEHILIM_THEMES: TehilimTheme[] = [
  {
    id: "sante",
    label: "Santé / Refouah",
    icon: "🙏",
    description: "Pour la guérison complète",
    psalms: [6, 13, 20, 30, 41, 88, 91, 103, 107, 116, 142, 143],
  },
  {
    id: "reussite",
    label: "Réussite / Hatslaha",
    icon: "✨",
    description: "Succès dans les entreprises",
    psalms: [1, 8, 23, 34, 65, 67, 112, 121, 128],
  },
  {
    id: "protection",
    label: "Protection",
    icon: "🛡️",
    description: "Se placer sous la protection divine",
    psalms: [3, 7, 20, 27, 46, 91, 121, 125],
  },
  {
    id: "techouva",
    label: "Téchouva / Repentir",
    icon: "💫",
    description: "Retour vers Hachem",
    psalms: [25, 32, 38, 51, 80, 90, 130],
  },
  {
    id: "parnassa",
    label: "Parnassa",
    icon: "💰",
    description: "Subsistance et prospérité",
    psalms: [23, 34, 67, 104, 111, 112, 128, 145],
  },
  {
    id: "chalom-bayit",
    label: "Chalom Bayit",
    icon: "🏡",
    description: "Paix dans le foyer",
    psalms: [23, 34, 112, 127, 128, 133, 144],
  },
  {
    id: "zivouge",
    label: "Zivougué",
    icon: "💍",
    description: "Trouver son âme sœur",
    psalms: [32, 38, 68, 70, 71, 121, 124],
  },
  {
    id: "fertilite",
    label: "Fertilité",
    icon: "👶",
    description: "Bénédiction des enfants",
    psalms: [20, 102, 113, 127, 128],
  },
  {
    id: "deuil",
    label: "Deuil / Néchama",
    icon: "🕯️",
    description: "Réconfort et élévation de l'âme",
    psalms: [16, 23, 49, 91, 119, 130],
  },
  {
    id: "voyage",
    label: "Voyage / Tefilat HaDérekh",
    icon: "✈️",
    description: "Protection en chemin",
    psalms: [91, 121, 126, 127],
  },
  {
    id: "gratitude",
    label: "Gratitude / Hodaya",
    icon: "🙌",
    description: "Louange et remerciement",
    psalms: [8, 19, 33, 65, 100, 103, 104, 107, 111, 136, 145, 148, 150],
  },
];

export const TEHILIM_DAILY = [
  { day: 0, label: "Dimanche", yom: "Yom Rishon", psalms: Array.from({ length: 29 }, (_, i) => i + 1) },
  { day: 1, label: "Lundi", yom: "Yom Chéni", psalms: Array.from({ length: 21 }, (_, i) => i + 30) },
  { day: 2, label: "Mardi", yom: "Yom Chelichi", psalms: Array.from({ length: 22 }, (_, i) => i + 51) },
  { day: 3, label: "Mercredi", yom: "Yom Révi'i", psalms: Array.from({ length: 17 }, (_, i) => i + 73) },
  { day: 4, label: "Jeudi", yom: "Yom 'Hamichi", psalms: Array.from({ length: 17 }, (_, i) => i + 90) },
  { day: 5, label: "Vendredi", yom: "Yom Chichi", psalms: Array.from({ length: 13 }, (_, i) => i + 107) },
  { day: 6, label: "Chabbat", yom: "Yom Chabbat", psalms: Array.from({ length: 31 }, (_, i) => i + 120) },
];

export function getDailyPsalms(): { label: string; yom: string; psalms: number[] } {
  const day = new Date().getDay();
  return TEHILIM_DAILY[day];
}
