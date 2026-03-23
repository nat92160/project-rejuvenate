import { HebrewCalendar, Location, Zmanim as HebcalZmanim, HDate, flags } from '@hebcal/core';
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

function fmtZmanTime(dt: Date | null | undefined): string {
  if (!dt || isNaN(dt.getTime())) return '--:--';
  return dt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
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
    const nextWeek = new Date(now.getTime() + 8 * 86400000);

    const events = HebrewCalendar.calendar({
      start: now,
      end: nextWeek,
      candlelighting: true,
      location,
      sedrot: true,
      il: city.country === 'IL',
      candleLightingMins: city.candleOffset,
    });

    let candles = '', candlesDate = '', havdala = '', havdalaDate = '', parasha = '', parashaHe = '';

    for (const ev of events) {
      const desc = ev.getDesc();
      const greg = ev.getDate().greg();
      const f = ev.getFlags();

      if (desc === 'Candle lighting') {
        const eventTime: Date = (ev as any).eventTime || greg;
        candles = fmtZmanTime(eventTime);
        candlesDate = greg.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
      }
      if (desc.startsWith('Havdalah')) {
        const eventTime: Date = (ev as any).eventTime || greg;
        havdala = fmtZmanTime(eventTime);
        havdalaDate = greg.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
      }
      if (f & flags.PARSHA_HASHAVUA) {
        const t = translateHoliday(desc);
        parasha = t.fr;
        parashaHe = ev.render('he') || '';
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

// ─── Zmanim (offline) ───

export async function fetchZmanim(city: CityConfig, date?: Date): Promise<ZmanItem[]> {
  try {
    const d = date || new Date();
    const location = cityToLocation(city);
    const zman = new HebcalZmanim(location, d, false);

    return [
      { label: "Alot haChah'ar", time: fmtZmanTime(zman.alotHaShachar()), icon: "🌑", description: "Aube — 72 min avant le lever" },
      { label: "Nets (Lever du soleil)", time: fmtZmanTime(zman.sunrise()), icon: "🌅", description: "Lever du soleil" },
      { label: "Chéma (MG\"A)", time: fmtZmanTime(zman.sofZmanShmaMGA()), icon: "📖", description: "Fin du Chéma (Magen Avraham)" },
      { label: "Chéma (GR\"A)", time: fmtZmanTime(zman.sofZmanShma()), icon: "📖", description: "Fin du Chéma (Gaon de Vilna)" },
      { label: "Téfila (GR\"A)", time: fmtZmanTime(zman.sofZmanTfilla()), icon: "🙏", description: "Fin de la Téfila" },
      { label: "'Hatsot (Midi solaire)", time: fmtZmanTime(zman.chatzot()), icon: "🕐", description: "Midi solaire" },
      { label: "Min'ha Guédola", time: fmtZmanTime(zman.minchaGedola()), icon: "🕐", description: "Début de Min'ha" },
      { label: "Min'ha Qétana", time: fmtZmanTime(zman.minchaKetana()), icon: "🕐", description: "Min'ha tardive" },
      { label: "Pélag haMin'ha", time: fmtZmanTime(zman.plagHaMincha()), icon: "🌤️", description: "Pélag haMin'ha" },
      { label: "Chkia (Coucher du soleil)", time: fmtZmanTime(zman.sunset()), icon: "🌇", description: "Coucher du soleil" },
      { label: "Tsét haKokhavim", time: fmtZmanTime(zman.tzeit()), icon: "⭐", description: "Sortie des étoiles" },
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

    return fmtZmanTime(minhaTime);
  } catch {
    return null;
  }
}

// ─── Holidays (offline) ───

export async function fetchHolidays(city: CityConfig): Promise<HolidayItem[]> {
  try {
    const now = new Date();
    const il = city.country === 'IL';
    const year = now.getFullYear();

    const events = HebrewCalendar.calendar({
      start: new Date(year, 0, 1),
      end: new Date(year, 11, 31),
      il,
    }).filter(ev => ev.getDate().greg().getFullYear() === year);

    const seen = new Set<string>();
    const results: HolidayItem[] = [];

    for (const ev of events) {
      const f = ev.getFlags();
      if (!(f & (flags.CHAG | flags.MAJOR_FAST | flags.MINOR_FAST | flags.MINOR_HOLIDAY))) continue;
      if (f & (flags.OMER_COUNT | flags.DAF_YOMI | flags.DAILY_LEARNING | flags.SHABBAT_MEVARCHIM)) continue;

      const desc = ev.getDesc();
      if (seen.has(desc)) continue;
      seen.add(desc);

      const greg = ev.getDate().greg();
      const daysLeft = Math.ceil((greg.getTime() - now.getTime()) / 86400000);
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
