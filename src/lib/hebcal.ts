import { CityConfig } from "./cities";

function hebcalGeoParam(city: CityConfig): string {
  // If city has custom GPS coords (from geolocation), use lat/lng for precision
  if ((city as any)._gps) {
    return `geo=pos&latitude=${city.lat}&longitude=${city.lng}&tzid=${city.tz}`;
  }
  return `geo=geoname&geonameid=${city.geonameid}`;
}

export interface ShabbatTimes {
  candleLighting: string;
  candleLightingDate: string;
  havdalah: string;
  havdalahDate: string;
  parasha: string;
  parashaHebrew: string;
}

export interface ZmanItem {
  label: string;
  time: string;
  icon: string;
  description: string;
}

export interface HebrewDateInfo {
  hebrew: string;
  heDateParts: { y: number; m: string; d: number };
}

export interface HolidayItem {
  title: string;
  date: string;
  hebrew: string;
  category: string;
  emoji: string;
  daysLeft: number;
}

// Translate Hebcal titles to French
const HOLIDAY_FR: Record<string, { fr: string; emoji: string }> = {
  "erev pesach": { fr: "Erev Pessa'h", emoji: "🫓" },
  "pesach i": { fr: "Pessa'h I", emoji: "🍷" },
  "pesach ii": { fr: "Pessa'h II", emoji: "📖" },
  "pesach vii": { fr: "Pessa'h VII", emoji: "🌊" },
  "pesach viii": { fr: "Pessa'h VIII", emoji: "🍷" },
  "shavuot i": { fr: "Chavouot I", emoji: "📜" },
  "shavuot ii": { fr: "Chavouot II", emoji: "🌾" },
  "rosh hashana i": { fr: "Roch Hachana I", emoji: "🍯" },
  "rosh hashana ii": { fr: "Roch Hachana II", emoji: "🍎" },
  "yom kippur": { fr: "Yom Kippour", emoji: "🕊️" },
  "sukkot i": { fr: "Soukkot I", emoji: "🌿" },
  "sukkot ii": { fr: "Soukkot II", emoji: "🏕️" },
  "shmini atzeret": { fr: "Chémini Atséret", emoji: "🎉" },
  "simchat torah": { fr: "Sim'hat Torah", emoji: "📜" },
  "chanukah: 1 candle": { fr: "Hanouka (1ère bougie)", emoji: "🕎" },
  "purim": { fr: "Pourim", emoji: "🎭" },
  "tu bishvat": { fr: "Tou Bichvat", emoji: "🌳" },
  "lag baomer": { fr: "Lag Baomer", emoji: "🔥" },
  "tish'a b'av": { fr: "Ticha Béav", emoji: "😢" },
  "tzom gedaliah": { fr: "Jeûne de Guédalia", emoji: "🕯️" },
  "asara b'tevet": { fr: "10 Tévet", emoji: "🕯️" },
  "ta'anit bechorot": { fr: "Jeûne des premiers-nés", emoji: "🕯️" },
  "ta'anit esther": { fr: "Jeûne d'Esther", emoji: "🕯️" },
  "tzom tammuz": { fr: "17 Tamouz", emoji: "🕯️" },
};

function translateHoliday(title: string): { fr: string; emoji: string } {
  const key = title.toLowerCase().trim();
  if (HOLIDAY_FR[key]) return HOLIDAY_FR[key];
  // Generic parashat
  if (key.startsWith("parashat ")) return { fr: "Paracha " + title.substring(9), emoji: "📖" };
  return { fr: title, emoji: "🎉" };
}

export async function fetchHebrewDate(): Promise<HebrewDateInfo | null> {
  try {
    const now = new Date();
    const r = await fetch(
      `https://www.hebcal.com/converter?cfg=json&g2h=1&gy=${now.getFullYear()}&gm=${now.getMonth() + 1}&gd=${now.getDate()}`
    );
    const d = await r.json();
    return {
      hebrew: d.hebrew || "",
      heDateParts: { y: d.hy, m: d.hm, d: d.hd },
    };
  } catch {
    return null;
  }
}

export async function fetchShabbatTimes(city: CityConfig): Promise<ShabbatTimes | null> {
  try {
    const geoP = hebcalGeoParam(city);
    const url = `https://www.hebcal.com/shabbat?cfg=json&${geoP}&M=on`;
    const r = await fetch(url);
    const d = await r.json();
    const items = d.items || [];

    let candles = "", candlesDate = "", havdala = "", havdalaDate = "", parasha = "", parashaHe = "";

    for (const item of items) {
      if (item.category === "candles") {
        candles = new Date(item.date).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
        candlesDate = new Date(item.date).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
      }
      if (item.category === "havdalah") {
        havdala = new Date(item.date).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
        havdalaDate = new Date(item.date).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
      }
      if (item.category === "parashat") {
        const t = translateHoliday(item.title);
        parasha = t.fr;
        parashaHe = item.hebrew || "";
      }
    }

    return { candleLighting: candles, candleLightingDate: candlesDate, havdalah: havdala, havdalahDate: havdalaDate, parasha, parashaHebrew: parashaHe };
  } catch {
    return null;
  }
}

export async function fetchZmanim(city: CityConfig, date?: Date): Promise<ZmanItem[]> {
  try {
    const d = date || new Date();
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const geoP = hebcalGeoParam(city);
    const url = `https://www.hebcal.com/zmanim?cfg=json&${geoP}&date=${dateStr}`;
    const r = await fetch(url);
    const data = await r.json();
    const times = data.times || {};

    const fmt = (key: string) => {
      const val = times[key];
      return val ? new Date(val).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : "--:--";
    };

    return [
      { label: "Alot haChah'ar", time: fmt("alotHaShachar"), icon: "🌑", description: "Aube — 72 min avant le lever" },
      { label: "Nets (Lever du soleil)", time: fmt("sunrise"), icon: "🌅", description: "Lever du soleil" },
      { label: "Chéma (MG\"A)", time: fmt("sofZmanShmaMGA"), icon: "📖", description: "Fin du Chéma (Magen Avraham)" },
      { label: "Chéma (GR\"A)", time: fmt("sofZmanShma"), icon: "📖", description: "Fin du Chéma (Gaon de Vilna)" },
      { label: "Téfila (GR\"A)", time: fmt("sofZmanTfilla"), icon: "🙏", description: "Fin de la Téfila" },
      { label: "'Hatsot (Midi solaire)", time: fmt("chatzot"), icon: "🕐", description: "Midi solaire" },
      { label: "Min'ha Guédola", time: fmt("minchaGedola"), icon: "🕐", description: "Début de Min'ha" },
      { label: "Min'ha Qétana", time: fmt("minchaKetana"), icon: "🕐", description: "Min'ha tardive" },
      { label: "Pélag haMin'ha", time: fmt("plagHaMincha"), icon: "🌤️", description: "Pélag haMin'ha" },
      { label: "Chkia (Coucher du soleil)", time: fmt("sunset"), icon: "🌇", description: "Coucher du soleil" },
      { label: "Tsét haKokhavim", time: fmt("tzeit"), icon: "⭐", description: "Sortie des étoiles" },
    ];
  } catch {
    return [];
  }
}

export async function fetchHolidays(city: CityConfig): Promise<HolidayItem[]> {
  try {
    const now = new Date();
    const year = now.getFullYear();
    const geoP = hebcalGeoParam(city);
    const url = `https://www.hebcal.com/hebcal?v=1&cfg=json&year=${year}&month=x&maj=on&min=off&mod=off&nx=off&ss=off&mf=off&c=off&${geoP}&i=off`;
    const r = await fetch(url);
    const d = await r.json();

    return (d.items || [])
      .filter((item: any) => item.category === "holiday" && item.subcat === "major" && new Date(item.date) >= now)
      .slice(0, 6)
      .map((item: any) => {
        const dt = new Date(item.date);
        const daysLeft = Math.ceil((dt.getTime() - now.getTime()) / 86400000);
        const t = translateHoliday(item.title);
        return {
          title: t.fr,
          date: dt.toLocaleDateString("fr-FR", { day: "numeric", month: "long" }),
          hebrew: item.hebrew || "",
          category: item.subcat || "major",
          emoji: t.emoji,
          daysLeft,
        };
      });
  } catch {
    return [];
  }
}
