import { CityConfig } from "./cities";

function hebcalGeoParam(city: CityConfig): string {
  const gpsCity = city as CityConfig & { _gps?: boolean };
  if (gpsCity._gps) {
    return `geo=pos&latitude=${city.lat}&longitude=${city.lng}&tzid=${city.tz}`;
  }
  return `geo=geoname&geonameid=${city.geonameid}`;
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`Hebcal request failed: ${response.status}`);
  return response.json();
}

async function fetchHebcalItems(city: CityConfig, years: number[], query: string): Promise<any[]> {
  const geoP = hebcalGeoParam(city);
  const payloads = await Promise.all(
    years.map((year) =>
      fetchJson<{ items?: any[] }>(
        `https://www.hebcal.com/hebcal?v=1&cfg=json&year=${year}&month=x&${query}&${geoP}`
      )
    )
  );

  return payloads.flatMap((payload) => payload.items || []);
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

export interface RoshHodeshInfo {
  month: string;
  dates: string[];
  hebrew: string;
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
  if (key.startsWith("parashat ")) return { fr: "Paracha " + title.substring(9), emoji: "📖" };
  return { fr: title, emoji: "🎉" };
}

export async function fetchHebrewDate(): Promise<HebrewDateInfo | null> {
  try {
    const now = new Date();
    const d = await fetchJson<any>(
      `https://www.hebcal.com/converter?cfg=json&g2h=1&gy=${now.getFullYear()}&gm=${now.getMonth() + 1}&gd=${now.getDate()}`
    );

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
    const d = await fetchJson<any>(`https://www.hebcal.com/shabbat?cfg=json&${geoP}&M=on`);
    const items = d.items || [];

    let candles = "";
    let candlesDate = "";
    let havdala = "";
    let havdalaDate = "";
    let parasha = "";
    let parashaHe = "";

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

    return {
      candleLighting: candles,
      candleLightingDate: candlesDate,
      havdalah: havdala,
      havdalahDate: havdalaDate,
      parasha,
      parashaHebrew: parashaHe,
    };
  } catch {
    return null;
  }
}

export async function fetchZmanim(city: CityConfig, date?: Date): Promise<ZmanItem[]> {
  try {
    const d = date || new Date();
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const geoP = hebcalGeoParam(city);
    const data = await fetchJson<any>(`https://www.hebcal.com/zmanim?cfg=json&${geoP}&date=${dateStr}`);
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

/** Calculate suggested Minha time: Minha Ketana or 15 min before sunset, whichever is earlier */
export async function fetchMinhaTime(city: CityConfig, date?: Date): Promise<string | null> {
  try {
    const d = date || new Date();
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const geoP = hebcalGeoParam(city);
    const data = await fetchJson<any>(`https://www.hebcal.com/zmanim?cfg=json&${geoP}&date=${dateStr}`);
    const times = data.times || {};

    const minchaKetana = times.minchaKetana ? new Date(times.minchaKetana) : null;
    const sunset = times.sunset ? new Date(times.sunset) : null;

    if (!sunset) return null;

    const fifteenBeforeSunset = new Date(sunset.getTime() - 15 * 60 * 1000);

    // Use the earlier of the two
    let minhaTime = fifteenBeforeSunset;
    if (minchaKetana && minchaKetana < fifteenBeforeSunset) {
      minhaTime = minchaKetana;
    }

    return minhaTime.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return null;
  }
}

export async function fetchHolidays(city: CityConfig): Promise<HolidayItem[]> {
  try {
    const now = new Date();
    const year = now.getFullYear();
    const items = await fetchHebcalItems(
      city,
      [year, year + 1],
      "maj=on&min=on&mod=on&nx=on&ss=off&mf=on&c=on&i=off&b=18"
    );

    return items
      .filter((item: any) => item.category === "holiday" && item.subcat === "major" && new Date(`${item.date}T23:59:59`) >= now)
      .slice(0, 6)
      .map((item: any) => {
        const dt = new Date(`${item.date}T12:00:00`);
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

export async function fetchNextRoshHodesh(city: CityConfig): Promise<RoshHodeshInfo | null> {
  try {
    const now = new Date();
    const year = now.getFullYear();
    const items = await fetchHebcalItems(
      city,
      [year, year + 1],
      "maj=off&min=off&mod=off&nx=on&ss=off&mf=off&c=off&D=on&i=off"
    );

    const roshChodeshItems = items.filter(
      (item: any) => item.category === "roshchodesh" && new Date(`${item.date}T23:59:59`) >= now
    );

    if (roshChodeshItems.length === 0) return null;

    const first = roshChodeshItems[0];
    const monthName = first.title.replace("Rosh Chodesh ", "");
    const dates = roshChodeshItems
      .filter((item: any) => item.title === first.title)
      .sort((a: any, b: any) => a.date.localeCompare(b.date))
      .map((item: any) =>
        new Date(`${item.date}T12:00:00`).toLocaleDateString("fr-FR", {
          weekday: "long",
          day: "numeric",
          month: "long",
        })
      );

    return {
      month: monthName,
      dates,
      hebrew: first.hebrew || "",
    };
  } catch {
    return null;
  }
}
