import { HebrewCalendar, Location, flags } from '@hebcal/core';
import { ComplexZmanimCalendar, GeoLocation } from 'kosher-zmanim';
import { CityConfig } from "./cities";
import { cityToLocation } from "./hebcal";
import { getTodayOmerDay, getOmerPeriodDates } from "@/components/omer/omerData";

// ─── Festival grouping logic ───

export type LightingType = "erev" | "from-existing" | "havdalah" | "fast-start" | "fast-end" | "none";

export interface FestivalDay {
  date: string;
  dateFr: string;
  dayOfWeek: number;
  title: string;
  hebrew: string;
  type: "erev" | "yomtov" | "holhamoed" | "isrouHag" | "fast" | "single";
  candles?: string;
  candleLightingType?: LightingType;
  havdalah?: string;
  havdalahType?: "havdalah" | "sortie";
  isShabbat: boolean;
  memo?: string;
}

export interface FestivalCard {
  id: string;
  name: string;
  emoji: string;
  hebrew: string;
  dateRange: string;
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

// ─── Helpers ───

function fmtDate(iso: string): string {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
}

function fmtDateShort(iso: string): string {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
}

function fmtTime(d: Date): string {
  return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function toIsoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Get Tzeit HaKokhavim at 7.08° — used for FASTS only */
function getKosherTzeit(city: CityConfig, dt: Date): string | undefined {
  try {
    const geo = new GeoLocation(city.name, city.lat, city.lng, 0, city.tz);
    const czc = new ComplexZmanimCalendar(geo);
    czc.setDate(dt);
    const tzeit = czc.getSunsetOffsetByDegrees(97.08); // 90 + 7.08°
    if (tzeit) return fmtTimeKosher(tzeit, city.tz);
  } catch { /* silent */ }
  return undefined;
}

/** Get Havdalah at 8.5° — used for Shabbat & Yom Tov (standard Consistoire) */
function getKosherHavdalah(city: CityConfig, dt: Date): string | undefined {
  try {
    const geo = new GeoLocation(city.name, city.lat, city.lng, 0, city.tz);
    const czc = new ComplexZmanimCalendar(geo);
    czc.setDate(dt);
    const tzeit = czc.getSunsetOffsetByDegrees(98.5); // 90 + 8.5°
    if (tzeit) return fmtTimeKosher(tzeit, city.tz);
  } catch { /* silent */ }
  return undefined;
}

/** Get candle lighting time = sunset MINUS offset (default 18min) using kosher-zmanim */
function getKosherCandleLighting(city: CityConfig, dt: Date): string | undefined {
  try {
    const geo = new GeoLocation(city.name, city.lat, city.lng, 0, city.tz);
    const czc = new ComplexZmanimCalendar(geo);
    czc.setDate(dt);
    const sunset = czc.getSunset();
    if (sunset) {
      const candleDate = typeof sunset === 'object' && sunset !== null && 'toJSDate' in sunset
        ? new Date((sunset as any).toJSDate().getTime() - city.candleOffset * 60000)
        : sunset instanceof Date
        ? new Date(sunset.getTime() - city.candleOffset * 60000)
        : null;
      if (candleDate) return fmtTimeKosher(candleDate, city.tz);
    }
  } catch { /* silent */ }
  return undefined;
}

/** Format a kosher-zmanim result (Luxon DateTime or JS Date) */
function fmtTimeKosher(dt: unknown, tz: string): string {
  if (!dt) return "--:--";
  if (typeof dt === "object" && dt !== null) {
    const maybeLuxon = dt as any;
    if (typeof maybeLuxon.toJSDate === "function") {
      const jsDate = maybeLuxon.toJSDate();
      if (Number.isNaN(jsDate.getTime())) return "--:--";
      return jsDate.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: tz });
    }
  }
  if (dt instanceof Date) {
    if (Number.isNaN(dt.getTime())) return "--:--";
    return dt.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: tz });
  }
  return "--:--";
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

/**
 * Determine the halakhic candle lighting for a Yom Tov day (not erev).
 * 
 * Rules:
 * 1. If it's Friday (entering Shabbat during Yom Tov): light BEFORE shkiya (18min) → use standard candle lighting
 * 2. If the previous day was Shabbat (Saturday night → Yom Tov): this is Havdalah/Sortie, NOT candle lighting
 * 3. Otherwise (2nd+ day of Yom Tov): light AFTER Tzeit HaKokhavim of the PREVIOUS day, from existing flame
 */
function resolveYomTovCandles(
  dateStr: string,
  dayOfWeek: number,
  candlesByDate: Record<string, string>,
  city: CityConfig,
  previousDayStr?: string,
): { candles?: string; lightingType: LightingType; havdalah?: string; havdalahType?: "havdalah" | "sortie" } {

  const prevDt = previousDayStr ? new Date(previousDayStr + "T12:00:00") : null;
  const prevDayOfWeek = prevDt ? prevDt.getDay() : -1;

  // Case 1: It's Friday → entering Shabbat → standard candle lighting BEFORE shkiya
  if (dayOfWeek === 5) {
    const stdCandles = candlesByDate[dateStr] || getKosherCandleLighting(city, new Date(dateStr + "T12:00:00"));
    return {
      candles: stdCandles,
      lightingType: stdCandles ? "erev" : "none",
    };
  }

  // Case 2: Previous day was Shabbat (Saturday night) → Havdalah/Sortie, not candle lighting
  if (prevDayOfWeek === 6) {
    const tzeit = previousDayStr ? getKosherTzeit(city, new Date(previousDayStr + "T12:00:00")) : undefined;
    return {
      lightingType: "none",
      havdalah: tzeit,
      havdalahType: "havdalah",
    };
  }

  // Case 3: 2nd+ day Yom Tov (not Friday, not after Shabbat) → after Tzeit of PREVIOUS day
  if (previousDayStr) {
    const tzeit = getKosherTzeit(city, new Date(previousDayStr + "T12:00:00"));
    if (tzeit) {
      return {
        candles: tzeit,
        lightingType: "from-existing",
      };
    }
  }

  return { lightingType: "none" };
}

// ─── Main fetch using @hebcal/core SDK (offline) ───

export async function fetchFestivalCards(city: CityConfig): Promise<FestivalCard[]> {
  try {
    const now = new Date();
    const location = cityToLocation(city);
    const il = city.country === 'IL';
    const year = now.getFullYear();

    const allEvents = HebrewCalendar.calendar({
      start: new Date(year, 0, 1),
      end: new Date(year, 11, 31),
      candlelighting: true,
      location,
      il,
      candleLightingMins: city.candleOffset,
    });

    const events = allEvents.filter(ev => ev.getDate().greg().getFullYear() === year);

    // Build candle/havdalah time maps by date using kosher-zmanim for precision
    // Candle lighting = sunset - candleOffset (kosher-zmanim)
    // Havdalah = Tzeit HaKokhavim 7.08° (kosher-zmanim)
    const candlesByDate: Record<string, string> = {};
    const havdalahByDate: Record<string, string> = {};

    for (const ev of events) {
      const desc = ev.getDesc();
      const greg = ev.getDate().greg();
      const dateKey = toIsoDate(greg);

      if (desc === 'Candle lighting') {
        // Use kosher-zmanim: sunset - candleOffset
        const kosherCandle = getKosherCandleLighting(city, greg);
        candlesByDate[dateKey] = kosherCandle || fmtTime((ev as any).eventTime || greg);
      }
      if (desc.startsWith('Havdalah')) {
        // Use kosher-zmanim: 8.5° for Shabbat/YomTov Havdalah (standard Consistoire)
        const kosherHavdalah = getKosherHavdalah(city, greg);
        havdalahByDate[dateKey] = kosherHavdalah || fmtTime((ev as any).eventTime || greg);
      }
    }

    // Group holidays
    const groups: Record<string, FestivalDay[]> = {};
    const singles: FestivalCard[] = [];
    const roshChodeshMap: Record<string, { dates: string[]; hebrew: string }> = {};

    for (const ev of events) {
      const f = ev.getFlags();
      const desc = ev.getDesc();
      const greg = ev.getDate().greg();
      const dateStr = toIsoDate(greg);

      if (desc === 'Candle lighting' || desc.startsWith('Havdalah')) continue;

      // Process Rosh Chodesh
      if (f & flags.ROSH_CHODESH) {
        const dt = new Date(dateStr + "T12:00:00");
        if (dt < now && (now.getTime() - dt.getTime()) > 2 * 86400000) continue;
        const monthName = desc.replace('Rosh Chodesh ', '');
        if (!roshChodeshMap[monthName]) roshChodeshMap[monthName] = { dates: [], hebrew: ev.render('he') || '' };
        if (!roshChodeshMap[monthName].dates.includes(dateStr)) {
          roshChodeshMap[monthName].dates.push(dateStr);
        }
        continue;
      }

      if (!(f & (flags.CHAG | flags.CHOL_HAMOED | flags.EREV | flags.MAJOR_FAST | flags.MINOR_FAST | flags.MINOR_HOLIDAY))) continue;

      const key = desc.toLowerCase().trim();
      const dt = new Date(dateStr + "T12:00:00");
      const dayOfWeek = dt.getDay();
      const isShabbat = dayOfWeek === 6;

      const groupInfo = FESTIVAL_GROUPS[key];
      if (groupInfo) {
        if (!groups[groupInfo.group]) groups[groupInfo.group] = [];

        const dayTitle = key.includes("erev")
          ? "Veille — Allumage des bougies"
          : key.includes("ch''m") || key.includes("hoshana")
          ? `Hol HaMoèd — ${fmtDate(dateStr)}`
          : desc.replace(/^(Pesach|Sukkot|Shavuot)\s*/i, "").trim();

        let dayCandles: string | undefined;
        let candleLightingType: LightingType = "none";
        let dayHavdalah = havdalahByDate[dateStr];
        let havdalahType: "havdalah" | "sortie" | undefined;

        if (groupInfo.type === "erev") {
          // Erev Yom Tov: standard candle lighting 18min before shkiya
          dayCandles = candlesByDate[dateStr];
          candleLightingType = dayCandles ? "erev" : "none";
        } else if (groupInfo.type === "yomtov") {
          // Get previous date string for halakhic logic
          const prevDt = new Date(dt);
          prevDt.setDate(prevDt.getDate() - 1);
          const prevDateStr = toIsoDate(prevDt);

          // Check if the previous day is also part of this group or is an erev
          const resolved = resolveYomTovCandles(dateStr, dayOfWeek, candlesByDate, city, prevDateStr);
          dayCandles = resolved.candles;
          candleLightingType = resolved.lightingType;
          if (resolved.havdalah) {
            dayHavdalah = resolved.havdalah;
            havdalahType = resolved.havdalahType;
          }
        }

        // For the last day of a multi-day Yom Tov, ensure we show Havdalah
        // The standard havdalahByDate should cover this via hebcal
        if (dayHavdalah && !havdalahType) {
          havdalahType = "sortie";
        }

        groups[groupInfo.group].push({
          date: dateStr,
          dateFr: fmtDate(dateStr),
          dayOfWeek,
          title: dayTitle,
          hebrew: ev.render('he') || '',
          type: groupInfo.type,
          candles: dayCandles,
          candleLightingType,
          havdalah: dayHavdalah,
          havdalahType,
          isShabbat,
          memo: ev.memo || undefined,
        });
        continue;
      }

      // Single holiday or fast
      const singleInfo = SINGLE_HOLIDAYS[key];
      if (singleInfo) {
        const daysLeft = Math.ceil((dt.getTime() - now.getTime()) / 86400000);
        if (daysLeft < -1) continue;

        const existingIdx = singles.findIndex(s => s.name === singleInfo.name);
        if (existingIdx !== -1) {
          const existing = singles[existingIdx];
          if (daysLeft >= 0 && (existing.daysLeft > daysLeft || existing.status === "termine")) {
            singles.splice(existingIdx, 1);
          } else {
            continue;
          }
        }

        const isFast = singleInfo.category === "jeune";

        let fastStart: string | undefined;
        let fastEnd: string | undefined;
        if (isFast) {
          // Always compute fast times from kosher-zmanim, never from candlesByDate
          // (candlesByDate may contain Yom Tov candle lighting on the same date)
          try {
            const geo = new GeoLocation(city.name, city.lat, city.lng, 0, city.tz);
            const czc = new ComplexZmanimCalendar(geo);
            czc.setDate(dt);
            const alot = czc.getSunriseOffsetByDegrees(106.1); // 16.1°
            if (alot) fastStart = fmtTimeKosher(alot, city.tz);
            const tzeit = czc.getSunsetOffsetByDegrees(97.08); // 7.08°
            if (tzeit) fastEnd = fmtTimeKosher(tzeit, city.tz);
          } catch { /* silent */ }
        } else {
          fastStart = candlesByDate[dateStr];
          fastEnd = havdalahByDate[dateStr];
        }

        singles.push({
          id: `${key}-${dateStr}`,
          name: singleInfo.name,
          emoji: singleInfo.emoji,
          hebrew: ev.render('he') || '',
          dateRange: fmtDateShort(dateStr),
          daysLeft: Math.max(0, daysLeft),
          status: daysLeft < 0 ? "termine" : daysLeft === 0 ? "encours" : "bientot",
          category: singleInfo.category,
          days: [{
            date: dateStr,
            dateFr: fmtDate(dateStr),
            dayOfWeek,
            title: singleInfo.name,
            hebrew: ev.render('he') || '',
            type: isFast ? "fast" : "single",
            candles: isFast ? fastStart : candlesByDate[dateStr],
            candleLightingType: isFast ? "fast-start" : "erev",
            havdalah: isFast ? fastEnd : havdalahByDate[dateStr],
            havdalahType: isFast ? undefined : "sortie",
            isShabbat,
            memo: ev.memo || undefined,
          }],
        });
      }
    }

    // Convert groups to cards
    const cards: FestivalCard[] = [];

    for (const [groupId, days] of Object.entries(groups)) {
      const info = GROUP_NAMES[groupId];
      if (!info || days.length === 0) continue;

      days.sort((a, b) => a.date.localeCompare(b.date));

      const firstDate = days[0].date;
      const lastDate = days[days.length - 1].date;
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
        status: getStatus(days, now),
        category: "yomtov",
        days,
      });
    }

    // Build Rosh Chodesh cards
    const roshChodeshCards: FestivalCard[] = [];
    const seenRCMonths = new Set<string>();

    const rcEntries = Object.entries(roshChodeshMap).sort((a, b) => {
      const dateA = a[1].dates.sort()[0] || "";
      const dateB = b[1].dates.sort()[0] || "";
      return dateA.localeCompare(dateB);
    });

    for (const [monthName, rc] of rcEntries) {
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

    // Build Omer card
    const omerCards: FestivalCard[] = [];
    const omerPeriod = getOmerPeriodDates(year);
    if (omerPeriod) {
      const omerStart = omerPeriod.start;
      const omerEnd = omerPeriod.end;
      const omerStartDt = new Date(omerStart);
      const daysLeftOmer = Math.ceil((omerStartDt.getTime() - now.getTime()) / 86400000);
      const omerDay = getTodayOmerDay();

      // Show if upcoming or in progress (not past)
      if (daysLeftOmer > -50) {
        const omerStatus: FestivalCard["status"] = 
          now < omerStartDt ? "bientot" : 
          now > new Date(omerEnd.getTime() + 86400000) ? "termine" : "encours";

        if (omerStatus !== "termine") {
          omerCards.push({
            id: "sefirat-haomer",
            name: "Séfirat HaOmer",
            emoji: "🌾",
            hebrew: "סְפִירַת הָעוֹמֶר",
            dateRange: `${fmtDateShort(toIsoDate(omerStart))} — ${fmtDateShort(toIsoDate(omerEnd))}`,
            daysLeft: Math.max(0, daysLeftOmer),
            status: omerStatus,
            category: "minor",
            days: [{
              date: toIsoDate(omerStart),
              dateFr: fmtDate(toIsoDate(omerStart)),
              dayOfWeek: omerStart.getDay(),
              title: omerDay ? `Jour ${omerDay} sur 49` : "49 jours de compte",
              hebrew: "סְפִירַת הָעוֹמֶר",
              type: "single",
              isShabbat: false,
            }],
          });
        }
      }
    }

    // Merge and sort
    const all = [...cards, ...singles, ...omerCards, ...roshChodeshCards.slice(0, 3)]
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
