import { CityConfig } from "./cities";

// ─── Festival grouping logic ───

/** A single day within a festival */
export interface FestivalDay {
  date: string;           // ISO date "2026-04-01"
  dateFr: string;         // "mercredi 1 avril"
  dayOfWeek: number;      // 0=Sun...6=Sat
  title: string;          // French name
  hebrew: string;
  type: "erev" | "yomtov" | "holhamoed" | "isrouHag" | "fast" | "single";
  candles?: string;       // "18:45"
  havdalah?: string;      // "19:52"
  isShabbat: boolean;
  memo?: string;
}

/** A grouped festival card */
export interface FestivalCard {
  id: string;
  name: string;           // e.g. "Pessa'h"
  emoji: string;
  hebrew: string;
  dateRange: string;      // "1 – 9 avril 2026"
  daysLeft: number;
  status: "bientot" | "encours" | "holhamoed" | "termine";
  days: FestivalDay[];
  category: "yomtov" | "jeune" | "minor";
}

// ─── Mapping tables ───

const FESTIVAL_GROUPS: Record<string, { group: string; emoji: string; type: FestivalDay["type"] }> = {
  "erev pesach": { group: "pessah", emoji: "🫓", type: "erev" },
  "pesach i": { group: "pessah", emoji: "🍷", type: "yomtov" },
  "pesach ii": { group: "pessah", emoji: "🍷", type: "yomtov" },
  "pesach iii (ch''m)": { group: "pessah", emoji: "🫓", type: "holhamoed" },
  "pesach iv (ch''m)": { group: "pessah", emoji: "🫓", type: "holhamoed" },
  "pesach v (ch''m)": { group: "pessah", emoji: "🫓", type: "holhamoed" },
  "pesach vi (ch''m)": { group: "pessah", emoji: "🫓", type: "holhamoed" },
  "pesach vii": { group: "pessah", emoji: "🌊", type: "yomtov" },
  "pesach viii": { group: "pessah", emoji: "🍷", type: "yomtov" },

  "erev shavuot": { group: "chavouot", emoji: "📜", type: "erev" },
  "shavuot i": { group: "chavouot", emoji: "📜", type: "yomtov" },
  "shavuot ii": { group: "chavouot", emoji: "🌾", type: "yomtov" },

  "erev rosh hashana": { group: "rochhachana", emoji: "🍯", type: "erev" },
  "rosh hashana i": { group: "rochhachana", emoji: "🍯", type: "yomtov" },
  "rosh hashana ii": { group: "rochhachana", emoji: "🍎", type: "yomtov" },

  "erev yom kippur": { group: "yomkippour", emoji: "🕊️", type: "erev" },
  "yom kippur": { group: "yomkippour", emoji: "🕊️", type: "yomtov" },

  "erev sukkot": { group: "soukkot", emoji: "🌿", type: "erev" },
  "sukkot i": { group: "soukkot", emoji: "🌿", type: "yomtov" },
  "sukkot ii": { group: "soukkot", emoji: "🏕️", type: "yomtov" },
  "sukkot iii (ch''m)": { group: "soukkot", emoji: "🌿", type: "holhamoed" },
  "sukkot iv (ch''m)": { group: "soukkot", emoji: "🌿", type: "holhamoed" },
  "sukkot v (ch''m)": { group: "soukkot", emoji: "🌿", type: "holhamoed" },
  "sukkot vi (ch''m)": { group: "soukkot", emoji: "🌿", type: "holhamoed" },
  "sukkot vii (hoshana raba)": { group: "soukkot", emoji: "🌿", type: "holhamoed" },
  "shmini atzeret": { group: "soukkot", emoji: "🎉", type: "yomtov" },
  "simchat torah": { group: "soukkot", emoji: "📜", type: "yomtov" },
};

const GROUP_NAMES: Record<string, { name: string; emoji: string; hebrew: string }> = {
  pessah: { name: "Pessa'h", emoji: "🫓", hebrew: "פֶּסַח" },
  chavouot: { name: "Chavouot", emoji: "📜", hebrew: "שָׁבוּעוֹת" },
  rochhachana: { name: "Roch Hachana", emoji: "🍯", hebrew: "רֹאשׁ הַשָּׁנָה" },
  yomkippour: { name: "Yom Kippour", emoji: "🕊️", hebrew: "יוֹם כִּפּוּר" },
  soukkot: { name: "Soukkot", emoji: "🌿", hebrew: "סוּכּוֹת" },
};

const SINGLE_HOLIDAYS: Record<string, { name: string; emoji: string; category: FestivalCard["category"] }> = {
  "purim": { name: "Pourim", emoji: "🎭", category: "yomtov" },
  "chanukah: 1 candle": { name: "Hanouka", emoji: "🕎", category: "minor" },
  "tu bishvat": { name: "Tou Bichvat", emoji: "🌳", category: "minor" },
  "lag baomer": { name: "Lag BaOmer", emoji: "🔥", category: "minor" },
  "tish'a b'av": { name: "Ticha Béav", emoji: "😢", category: "jeune" },
  "tzom gedaliah": { name: "Jeûne de Guédalia", emoji: "🕯️", category: "jeune" },
  "asara b'tevet": { name: "10 Tévet", emoji: "🕯️", category: "jeune" },
  "ta'anit bechorot": { name: "Jeûne des premiers-nés", emoji: "🕯️", category: "jeune" },
  "ta'anit esther": { name: "Jeûne d'Esther", emoji: "🕯️", category: "jeune" },
  "tzom tammuz": { name: "17 Tamouz", emoji: "🕯️", category: "jeune" },
};

const DAY_TYPE_LABELS: Record<FestivalDay["type"], string> = {
  erev: "Veille de fête",
  yomtov: "Yom Tov",
  holhamoed: "Hol HaMoèd",
  isrouHag: "Isrou 'Hag",
  fast: "Jeûne",
  single: "Fête",
};

export { DAY_TYPE_LABELS };

function hebcalGeoParam(city: CityConfig): string {
  return `geo=geoname&geonameid=${city.geonameid}`;
}

function fmtDate(iso: string): string {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
}

function fmtDateShort(iso: string): string {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
}

function fmtTime(isoDateTime: string): string {
  return new Date(isoDateTime).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function getStatus(days: FestivalDay[], now: Date): FestivalCard["status"] {
  const dates = days.map(d => d.date);
  const first = new Date(dates[0] + "T00:00:00");
  const last = new Date(dates[dates.length - 1] + "T23:59:59");

  if (now > last) return "termine";
  if (now < first) return "bientot";

  const todayStr = now.toISOString().split("T")[0];
  const todayDay = days.find(d => d.date === todayStr);
  if (todayDay?.type === "holhamoed") return "holhamoed";
  return "encours";
}

export async function fetchFestivalCards(city: CityConfig): Promise<FestivalCard[]> {
  try {
    const now = new Date();
    const year = now.getFullYear();
    const geoP = hebcalGeoParam(city);

    // Fetch holidays WITH candle lighting times
    const url = `https://www.hebcal.com/hebcal?v=1&cfg=json&year=${year}&month=x&maj=on&min=on&mod=on&nx=off&ss=off&mf=off&c=on&${geoP}&i=off&b=18`;
    const r = await fetch(url);
    const data = await r.json();
    const items: any[] = data.items || [];

    // Build a map of candle/havdalah times by date
    const candlesByDate: Record<string, string> = {};
    const havdalahByDate: Record<string, string> = {};

    for (const item of items) {
      if (item.category === "candles" && item.date) {
        const dateKey = item.date.substring(0, 10);
        candlesByDate[dateKey] = fmtTime(item.date);
      }
      if (item.category === "havdalah" && item.date) {
        const dateKey = item.date.substring(0, 10);
        havdalahByDate[dateKey] = fmtTime(item.date);
      }
    }

    // Group holidays
    const groups: Record<string, FestivalDay[]> = {};
    const singles: FestivalCard[] = [];

    for (const item of items) {
      if (item.category !== "holiday" && item.category !== "roshchodesh") continue;
      // Skip Rosh Chodesh for now
      if (item.category === "roshchodesh") continue;

      const key = item.title.toLowerCase().trim();
      const dateStr = item.date?.substring(0, 10);
      if (!dateStr) continue;

      const dt = new Date(dateStr + "T12:00:00");
      const dayOfWeek = dt.getDay();
      const isShabbat = dayOfWeek === 6;

      // Check if it belongs to a multi-day group
      const groupInfo = FESTIVAL_GROUPS[key];
      if (groupInfo) {
        if (!groups[groupInfo.group]) groups[groupInfo.group] = [];

        const dayTitle = key.includes("erev")
          ? `Veille — Allumage des bougies`
          : key.includes("ch''m") || key.includes("hoshana")
          ? `Hol HaMoèd — ${fmtDate(dateStr)}`
          : item.title.replace(/^(Pesach|Sukkot|Shavuot)\s*/i, "").trim();

        groups[groupInfo.group].push({
          date: dateStr,
          dateFr: fmtDate(dateStr),
          dayOfWeek,
          title: dayTitle,
          hebrew: item.hebrew || "",
          type: groupInfo.type,
          candles: candlesByDate[dateStr],
          havdalah: havdalahByDate[dateStr],
          isShabbat,
          memo: item.memo,
        });
        continue;
      }

      // Single holiday or fast
      const singleInfo = SINGLE_HOLIDAYS[key];
      if (singleInfo) {
        const daysLeft = Math.ceil((dt.getTime() - now.getTime()) / 86400000);
        if (daysLeft < -1) continue; // Skip past holidays

        singles.push({
          id: key,
          name: singleInfo.name,
          emoji: singleInfo.emoji,
          hebrew: item.hebrew || "",
          dateRange: fmtDateShort(dateStr),
          daysLeft: Math.max(0, daysLeft),
          status: daysLeft < 0 ? "termine" : daysLeft === 0 ? "encours" : "bientot",
          category: singleInfo.category,
          days: [{
            date: dateStr,
            dateFr: fmtDate(dateStr),
            dayOfWeek,
            title: singleInfo.name,
            hebrew: item.hebrew || "",
            type: singleInfo.category === "jeune" ? "fast" : "single",
            candles: candlesByDate[dateStr],
            havdalah: havdalahByDate[dateStr],
            isShabbat,
          }],
        });
      }
    }

    // Convert groups to cards
    const cards: FestivalCard[] = [];

    for (const [groupId, days] of Object.entries(groups)) {
      const info = GROUP_NAMES[groupId];
      if (!info || days.length === 0) continue;

      // Sort by date
      days.sort((a, b) => a.date.localeCompare(b.date));

      const firstDate = days[0].date;
      const lastDate = days[days.length - 1].date;
      const firstDt = new Date(firstDate + "T12:00:00");
      const daysLeft = Math.ceil((firstDt.getTime() - now.getTime()) / 86400000);

      if (daysLeft < -10) continue; // Skip long-past holidays

      const dateRange = `${fmtDateShort(firstDate)} — ${fmtDateShort(lastDate)} ${firstDt.getFullYear()}`;

      cards.push({
        id: groupId,
        name: info.name,
        emoji: info.emoji,
        hebrew: info.hebrew,
        dateRange,
        daysLeft: Math.max(0, daysLeft),
        status: getStatus(days, now),
        category: "yomtov",
        days,
      });
    }

    // Merge and sort all
    const all = [...cards, ...singles]
      .filter(c => c.status !== "termine")
      .sort((a, b) => {
        const dateA = a.days[0]?.date || "";
        const dateB = b.days[0]?.date || "";
        return dateA.localeCompare(dateB);
      });

    return all;
  } catch (e) {
    console.error("fetchFestivalCards error:", e);
    return [];
  }
}

// ─── Calendar export ───

export function generateICalEvent(day: FestivalDay, festivalName: string): string {
  const dateClean = day.date.replace(/-/g, "");
  const uid = `${festivalName}-${day.date}@chabbat-chalom`;
  const summary = `${festivalName} — ${day.title}`;
  const description = [
    day.candles ? `Allumage : ${day.candles}` : "",
    day.havdalah ? `Sortie : ${day.havdalah}` : "",
    day.isShabbat ? "Chabbat & Yom Tov" : "",
  ].filter(Boolean).join("\\n");

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Chabbat Chalom//FR",
    "BEGIN:VEVENT",
    `DTSTART;VALUE=DATE:${dateClean}`,
    `DTEND;VALUE=DATE:${dateClean}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${description}`,
    `UID:${uid}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

export function downloadICalEvent(day: FestivalDay, festivalName: string) {
  const ical = generateICalEvent(day, festivalName);
  const blob = new Blob([ical], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${festivalName}-${day.date}.ics`;
  a.click();
  URL.revokeObjectURL(url);
}

export function addToGoogleCalendar(day: FestivalDay, festivalName: string) {
  const dateClean = day.date.replace(/-/g, "");
  const title = encodeURIComponent(`${festivalName} — ${day.title}`);
  const details = encodeURIComponent(
    [day.candles ? `Allumage : ${day.candles}` : "", day.havdalah ? `Sortie : ${day.havdalah}` : ""]
      .filter(Boolean).join("\n")
  );
  const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dateClean}/${dateClean}&details=${details}`;
  window.open(url, "_blank");
}
