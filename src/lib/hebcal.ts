import { HebrewCalendar, Location, Zmanim as HebcalZmanim, HDate, flags } from '@hebcal/core';
import { ComplexZmanimCalendar, GeoLocation } from 'kosher-zmanim';
import { CityConfig } from './cities';

// ─── Helper ───

export function cityToLocation(city: CityConfig): Location {
  const isIsrael = city.country === 'IL';
  return new Location(city.lat, city.lng, isIsrael, city.tz, city.name, city.country);
}

// ─── Interfaces ───

export interface ShabbatTimes {
  candleLighting: string;
  candleLightingDate: string;
  candleLightingDateTime: Date | null;
  havdalah: string;
  havdalahDate: string;
  havdalahDateTime: Date | null;
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

// ─── French translations ───

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
  "erev rosh hashana": { fr: "Erev Roch Hachana", emoji: "🍯" },
  "erev yom kippur": { fr: "Erev Yom Kippour", emoji: "🕊️" },
  "erev sukkot": { fr: "Erev Soukkot", emoji: "🌿" },
  "erev shavuot": { fr: "Erev Chavouot", emoji: "📜" },
};

function translateHoliday(title: string): { fr: string; emoji: string } {
  const key = title.toLowerCase().trim();
  if (HOLIDAY_FR[key]) return HOLIDAY_FR[key];
  if (key.startsWith("parashat ")) return { fr: "Paracha " + title.substring(9), emoji: "📖" };
  return { fr: title, emoji: "🎉" };
}

// ─── Formatting helpers ───

function fmtZmanTime(dt: Date | null | undefined, tz?: string): string {
  if (!dt || isNaN(dt.getTime())) return '--:--';
  const opts: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' };
  if (tz) opts.timeZone = tz;
  return dt.toLocaleTimeString('fr-FR', opts);
}

function toIsoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ─── Hebrew date (offline) ───

export async function fetchHebrewDate(): Promise<HebrewDateInfo | null> {
  try {
    const hd = new HDate();
    return {
      hebrew: hd.renderGematriya(),
      heDateParts: { y: hd.getFullYear(), m: hd.getMonthName(), d: hd.getDate() },
    };
  } catch {
    return null;
  }
}

/** Get Hebrew date string for any given date */
export function getHebrewDateString(date: Date): string {
  try {
    return new HDate(date).renderGematriya();
  } catch {
    return '';
  }
}

// ─── Shabbat times (offline) ───

export async function fetchShabbatTimes(city: CityConfig): Promise<ShabbatTimes | null> {
  try {
    const location = cityToLocation(city);
    const now = new Date();
    const start = new Date(now.getTime() - 2 * 86400000);
    const end = new Date(now.getTime() + 12 * 86400000);

    const events = HebrewCalendar.calendar({
      start,
      end,
      candlelighting: true,
      location,
      sedrot: true,
      il: city.country === 'IL',
      candleLightingMins: city.candleOffset,
    });

    const candleEvents: Array<{ greg: Date; time: Date }> = [];
    const havdalahEvents: Array<{ greg: Date; time: Date }> = [];
    const parashaEvents: Array<{ greg: Date; desc: string; hebrew: string }> = [];

    for (const ev of events) {
      const desc = ev.getDesc();
      const greg = ev.getDate().greg();
      const flagsValue = ev.getFlags();

      if (desc === 'Candle lighting') {
        // Use kosher-zmanim: sunset - candleOffset for precision
        const kosherTime = getKosherCandleLightingDate(city, greg);
        candleEvents.push({ greg, time: kosherTime || (ev as any).eventTime || greg });
      }

      if (desc.startsWith('Havdalah')) {
        // Use kosher-zmanim: Tzeit HaKokhavim at 8.5° (standard Consistoire)
        const kosherTime = getKosherTzeitDate(city, greg);
        havdalahEvents.push({ greg, time: kosherTime || (ev as any).eventTime || greg });
      }

      if (flagsValue & flags.PARSHA_HASHAVUA) {
        parashaEvents.push({
          greg,
          desc,
          hebrew: ev.render('he') || '',
        });
      }
    }

    const shabbatWindows = candleEvents
      .map((candle) => {
        const havdalah = havdalahEvents.find((candidate) => {
          const delta = candidate.time.getTime() - candle.time.getTime();
          return delta > 0 && delta < 3 * 86400000;
        });

        if (!havdalah) return null;

        const parashaEvent = parashaEvents.find((candidate) => {
          const gregTime = candidate.greg.getTime();
          return gregTime >= candle.greg.getTime() && gregTime <= havdalah.greg.getTime();
        });

        return {
          candle,
          havdalah,
          parasha: parashaEvent,
        };
      })
      .filter((window): window is NonNullable<typeof window> => Boolean(window))
      .sort((a, b) => a.candle.time.getTime() - b.candle.time.getTime());

    const selectedWindow =
      shabbatWindows.find(({ candle, havdalah }) => now >= candle.time && now < havdalah.time) ||
      shabbatWindows.find(({ candle }) => now < candle.time) ||
      shabbatWindows[shabbatWindows.length - 1];

    if (!selectedWindow) return null;

    return {
      candleLighting: fmtZmanTime(selectedWindow.candle.time, city.tz),
      candleLightingDate: selectedWindow.candle.greg.toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        timeZone: city.tz,
      }),
      candleLightingDateTime: selectedWindow.candle.time,
      havdalah: fmtZmanTime(selectedWindow.havdalah.time, city.tz),
      havdalahDate: selectedWindow.havdalah.greg.toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        timeZone: city.tz,
      }),
      havdalahDateTime: selectedWindow.havdalah.time,
      parasha: selectedWindow.parasha ? translateHoliday(selectedWindow.parasha.desc).fr : '',
      parashaHebrew: selectedWindow.parasha?.hebrew || '',
    };
  } catch {
    return null;
  }
}

// ─── Kosher-zmanim helpers for Shabbat ───

/** Get Havdalah time at 8.5° (standard Consistoire for Shabbat/YomTov) as a JS Date */
function getKosherTzeitDate(city: CityConfig, dt: Date): Date | null {
  try {
    if ((city.lat === 0 && city.lng === 0) || !Number.isFinite(city.lat) || !Number.isFinite(city.lng)) return null;
    const geo = new GeoLocation(city.name, city.lat, city.lng, 0, city.tz);
    const czc = new ComplexZmanimCalendar(geo);
    czc.setDate(dt);
    const tzeit = czc.getSunsetOffsetByDegrees(98.5); // 90 + 8.5° for Havdalah
    if (!tzeit) return null;
    if (typeof tzeit === 'object' && tzeit !== null && 'toJSDate' in tzeit) {
      return (tzeit as any).toJSDate();
    }
    if (tzeit instanceof Date) return tzeit;
  } catch { /* silent */ }
  return null;
}

/** Get candle lighting = sunset - candleOffset as a JS Date */
function getKosherCandleLightingDate(city: CityConfig, dt: Date): Date | null {
  try {
    if ((city.lat === 0 && city.lng === 0) || !Number.isFinite(city.lat) || !Number.isFinite(city.lng)) return null;
    const geo = new GeoLocation(city.name, city.lat, city.lng, 0, city.tz);
    const czc = new ComplexZmanimCalendar(geo);
    czc.setDate(dt);
    const sunset = czc.getSunset();
    if (!sunset) return null;
    const sunsetDate = (typeof sunset === 'object' && sunset !== null && 'toJSDate' in sunset)
      ? (sunset as any).toJSDate()
      : sunset instanceof Date ? sunset : null;
    if (!sunsetDate || isNaN(sunsetDate.getTime())) return null;
    return new Date(sunsetDate.getTime() - city.candleOffset * 60000);
  } catch { /* silent */ }
  return null;
}

// ─── Zmanim (offline) ───

export async function fetchZmanim(city: CityConfig, date?: Date): Promise<ZmanItem[]> {
  try {
    const d = date || new Date();
    const location = cityToLocation(city);
    const zman = new HebcalZmanim(location, d, false);

    const tz = city.tz;
    return [
      { label: "Alot haChah'ar", time: fmtZmanTime(zman.alotHaShachar(), tz), icon: "🌑", description: "Aube — 72 min avant le lever" },
      { label: "Nets (Lever du soleil)", time: fmtZmanTime(zman.sunrise(), tz), icon: "🌅", description: "Lever du soleil" },
      { label: "Chéma (MG\"A)", time: fmtZmanTime(zman.sofZmanShmaMGA(), tz), icon: "📖", description: "Fin du Chéma (Magen Avraham)" },
      { label: "Chéma (GR\"A)", time: fmtZmanTime(zman.sofZmanShma(), tz), icon: "📖", description: "Fin du Chéma (Gaon de Vilna)" },
      { label: "Téfila (GR\"A)", time: fmtZmanTime(zman.sofZmanTfilla(), tz), icon: "🙏", description: "Fin de la Téfila" },
      { label: "'Hatsot (Midi solaire)", time: fmtZmanTime(zman.chatzot(), tz), icon: "🕐", description: "Midi solaire" },
      { label: "Min'ha Guédola", time: fmtZmanTime(zman.minchaGedola(), tz), icon: "🕐", description: "Début de Min'ha" },
      { label: "Min'ha Qétana", time: fmtZmanTime(zman.minchaKetana(), tz), icon: "🕐", description: "Min'ha tardive" },
      { label: "Pélag haMin'ha", time: fmtZmanTime(zman.plagHaMincha(), tz), icon: "🌤️", description: "Pélag haMin'ha" },
      { label: "Chkia (Coucher du soleil)", time: fmtZmanTime(zman.sunset(), tz), icon: "🌇", description: "Coucher du soleil" },
      { label: "Tsét haKokhavim", time: fmtZmanTime(zman.tzeit(), tz), icon: "⭐", description: "Sortie des étoiles" },
    ];
  } catch {
    return [];
  }
}

// ─── Minha time (offline) ───

export async function fetchMinhaTime(city: CityConfig, date?: Date): Promise<string | null> {
  try {
    const d = date || new Date();
    const location = cityToLocation(city);
    const zman = new HebcalZmanim(location, d, false);

    const mk = zman.minchaKetana();
    const ss = zman.sunset();
    if (!ss) return null;

    const fifteenBefore = new Date(ss.getTime() - 15 * 60 * 1000);
    let minhaTime = fifteenBefore;
    if (mk && mk < fifteenBefore) minhaTime = mk;

    return fmtZmanTime(minhaTime, city.tz);
  } catch {
    return null;
  }
}

// ─── Holidays (offline) ───

export async function fetchHolidays(city: CityConfig): Promise<HolidayItem[]> {
  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const il = city.country === 'IL';
    const year = now.getFullYear();

    // Fetch from today to end of year, plus next year's first months for continuity
    const endDate = new Date(year + 1, 5, 30);

    const events = HebrewCalendar.calendar({
      start: today,
      end: endDate,
      il,
    });

    const seen = new Set<string>();
    const results: HolidayItem[] = [];

    for (const ev of events) {
      const f = ev.getFlags();
      if (!(f & (flags.CHAG | flags.MAJOR_FAST | flags.MINOR_FAST | flags.MINOR_HOLIDAY))) continue;
      if (f & (flags.OMER_COUNT | flags.DAF_YOMI | flags.DAILY_LEARNING | flags.SHABBAT_MEVARCHIM)) continue;

      const greg = ev.getDate().greg();
      // Only future or today
      if (greg < today) continue;

      const desc = ev.getDesc();
      if (seen.has(desc)) continue;
      seen.add(desc);

      const daysLeft = Math.ceil((greg.getTime() - today.getTime()) / 86400000);
      const t = translateHoliday(desc);

      results.push({
        title: t.fr,
        date: greg.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' }),
        hebrew: ev.render('he') || '',
        category: 'major',
        emoji: t.emoji,
        daysLeft,
      });

      if (results.length >= 6) break;
    }

    return results;
  } catch {
    return [];
  }
}

// ─── Rosh Hodesh (offline) ───

export async function fetchNextRoshHodesh(city: CityConfig): Promise<RoshHodeshInfo | null> {
  try {
    const now = new Date();
    const il = city.country === 'IL';

    const events = HebrewCalendar.calendar({
      start: now,
      end: new Date(now.getFullYear(), 11, 31),
      il,
    }).filter(ev => ev.getFlags() & flags.ROSH_CHODESH)
     .filter(ev => ev.getDate().greg().getFullYear() === now.getFullYear());

    if (events.length === 0) return null;

    const first = events[0];
    const monthName = first.getDesc().replace('Rosh Chodesh ', '');
    const sameName = events.filter(ev => ev.getDesc() === first.getDesc());

    const dates = sameName.map(ev =>
      ev.getDate().greg().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
    );

    return {
      month: monthName,
      dates,
      hebrew: first.render('he') || '',
    };
  } catch {
    return null;
  }
}
