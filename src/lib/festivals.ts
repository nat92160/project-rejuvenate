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
  "erev tish'a b'av": { name: "Erev Ticha Béav", emoji: "😢", category: "jeune" },
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
  if ((city as any)._gps) {
    return `geo=pos&latitude=${city.lat}&longitude=${city.lng}&tzid=${city.tz}`;
  }
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

    // Fetch both years with nx=on (Rosh Chodesh) and mf=on (minor fasts) — v2
    const makeUrl = (y: number) =>
      `https://www.hebcal.com/hebcal?v=1&cfg=json&year=${y}&month=x&maj=on&min=on&mod=on&nx=on&ss=off&mf=on&c=on&${geoP}&i=off&b=18`;
    
    const [r1, r2] = await Promise.all([fetch(makeUrl(year)), fetch(makeUrl(year + 1))]);
    const [d1, d2] = await Promise.all([r1.json(), r2.json()]);
    const items: any[] = [...(d1.items || []), ...(d2.items || [])];

    // Build maps of times by date
    const candlesByDate: Record<string, string> = {};
    const havdalahByDate: Record<string, string> = {};
    const fastBeginByDate: Record<string, string> = {};
    const fastEndByDate: Record<string, string> = {};

    for (const item of items) {
      const dateKey = item.date?.substring(0, 10);
      if (!dateKey) continue;
      if (item.category === "candles") candlesByDate[dateKey] = fmtTime(item.date);
      if (item.category === "havdalah") havdalahByDate[dateKey] = fmtTime(item.date);
      if (item.subcat === "fast" && item.category === "zmanim") {
        if (item.title?.toLowerCase().includes("begins")) fastBeginByDate[dateKey] = fmtTime(item.date);
        if (item.title?.toLowerCase().includes("ends")) fastEndByDate[dateKey] = fmtTime(item.date);
      }
    }

    // Group holidays
    const groups: Record<string, FestivalDay[]> = {};
    const singles: FestivalCard[] = [];
    // Collect Rosh Chodesh by month name
    const roshChodeshMap: Record<string, { dates: string[]; hebrew: string }> = {};

    for (const item of items) {
      // Process Rosh Chodesh
      if (item.category === "roshchodesh") {
        const dateStr = item.date?.substring(0, 10);
        if (!dateStr) continue;
        const dt = new Date(dateStr + "T12:00:00");
        if (dt < now && (now.getTime() - dt.getTime()) > 2 * 86400000) continue;
        const monthName = item.title.replace("Rosh Chodesh ", "");
        if (!roshChodeshMap[monthName]) roshChodeshMap[monthName] = { dates: [], hebrew: item.hebrew || "" };
        if (!roshChodeshMap[monthName].dates.includes(dateStr)) {
          roshChodeshMap[monthName].dates.push(dateStr);
        }
        continue;
      }

      if (item.category !== "holiday") continue;

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
        if (daysLeft < -1) continue;

        // Deduplicate: keep only the nearest occurrence per holiday name
        const existingIdx = singles.findIndex(s => s.name === singleInfo.name);
        if (existingIdx !== -1) {
          // Keep the one closest to now (but still upcoming)
          const existing = singles[existingIdx];
          if (daysLeft >= 0 && (existing.daysLeft > daysLeft || existing.status === "termine")) {
            singles.splice(existingIdx, 1); // Remove old, will add new below
          } else {
            continue; // Skip this duplicate
          }
        }

        // For fasts, include begin/end times in memo
        const isFast = singleInfo.category === "jeune";
        const fastBegin = fastBeginByDate[dateStr];
        const fastEnd = fastEndByDate[dateStr];
        const memo = isFast
          ? [fastBegin ? `Début: ${fastBegin}` : "", fastEnd ? `Fin: ${fastEnd}` : ""].filter(Boolean).join(" — ")
          : undefined;

        singles.push({
          id: `${key}-${dateStr}`,
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
            type: isFast ? "fast" : "single",
            candles: fastBegin || candlesByDate[dateStr],
            havdalah: fastEnd || havdalahByDate[dateStr],
            isShabbat,
            memo,
          }],
        });
      }
    }

    // Convert groups to cards — deduplicate: keep only ONE occurrence per group
    // (the nearest upcoming, or current if in progress)
    const cards: FestivalCard[] = [];

    for (const [groupId, allDays] of Object.entries(groups)) {
      const info = GROUP_NAMES[groupId];
      if (!info || allDays.length === 0) continue;

      allDays.sort((a, b) => a.date.localeCompare(b.date));

      // Split days by year to avoid mixing Pessah 2026 + 2027
      const byYear: Record<number, FestivalDay[]> = {};
      for (const day of allDays) {
        const y = new Date(day.date + "T12:00:00").getFullYear();
        if (!byYear[y]) byYear[y] = [];
        byYear[y].push(day);
      }

      // Pick the best year: prefer current/upcoming over past
      const nowStr = now.toISOString().split("T")[0];
      let bestDays: FestivalDay[] | null = null;

      for (const y of Object.keys(byYear).map(Number).sort()) {
        const yearDays = byYear[y];
        const lastDate = yearDays[yearDays.length - 1].date;
        // Skip if entirely in the past (more than 2 days ago)
        if (lastDate < nowStr && Math.ceil((now.getTime() - new Date(lastDate + "T23:59:59").getTime()) / 86400000) > 2) {
          continue;
        }
        bestDays = yearDays;
        break; // Take the first (nearest) valid year
      }

      if (!bestDays || bestDays.length === 0) continue;

      const firstDate = bestDays[0].date;
      const lastDate = bestDays[bestDays.length - 1].date;
      const firstDt = new Date(firstDate + "T12:00:00");
      const daysLeft = Math.ceil((firstDt.getTime() - now.getTime()) / 86400000);

      if (daysLeft < -10) continue;

      const dateRange = `${fmtDateShort(firstDate)} — ${fmtDateShort(lastDate)} ${firstDt.getFullYear()}`;

      cards.push({
        id: groupId,
        name: info.name,
        emoji: info.emoji,
        hebrew: info.hebrew,
        dateRange,
        daysLeft: Math.max(0, daysLeft),
        status: getStatus(bestDays, now),
        category: "yomtov",
        days: bestDays,
      });
    }

    // Build Rosh Chodesh cards — deduplicate by month name, keep nearest upcoming
    const roshChodeshCards: FestivalCard[] = [];
    const seenRCMonths = new Set<string>();
    // Sort entries by earliest date to process nearest first
    const rcEntries = Object.entries(roshChodeshMap).sort((a, b) => {
      const dateA = a[1].dates.sort()[0] || "";
      const dateB = b[1].dates.sort()[0] || "";
      return dateA.localeCompare(dateB);
    });

    for (const [monthName, rc] of rcEntries) {
      // Deduplicate: same Hebrew month name from different years
      if (seenRCMonths.has(monthName)) continue;

      rc.dates.sort();
      const firstDate = rc.dates[0];
      const firstDt = new Date(firstDate + "T12:00:00");
      const daysLeft = Math.ceil((firstDt.getTime() - now.getTime()) / 86400000);
      if (daysLeft < -2) continue;

      seenRCMonths.add(monthName);

      const days: FestivalDay[] = rc.dates.map(dateStr => {
        const dt = new Date(dateStr + "T12:00:00");
        return {
          date: dateStr,
          dateFr: fmtDate(dateStr),
          dayOfWeek: dt.getDay(),
          title: `Roch 'Hodech ${monthName}`,
          hebrew: rc.hebrew,
          type: "single" as const,
          isShabbat: dt.getDay() === 6,
        };
      });

      roshChodeshCards.push({
        id: `roshchodesh-${monthName}-${firstDate}`,
        name: `Roch 'Hodech ${monthName}`,
        emoji: "🌙",
        hebrew: rc.hebrew,
        dateRange: rc.dates.length > 1
          ? `${fmtDateShort(rc.dates[0])} — ${fmtDateShort(rc.dates[1])}`
          : fmtDateShort(rc.dates[0]),
        daysLeft: Math.max(0, daysLeft),
        status: daysLeft < 0 ? "termine" : daysLeft === 0 ? "encours" : "bientot",
        category: "minor",
        days,
      });
    }

    // Merge and sort all — take only upcoming
    const all = [...cards, ...singles, ...roshChodeshCards.slice(0, 3)]
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
