import { HebrewCalendar, HDate, flags } from "@hebcal/core";

// Hebrew number words for the Omer blessing
const HEBREW_ONES = ["", "אֶחָד", "שְׁנַיִם", "שְׁלֹשָׁה", "אַרְבָּעָה", "חֲמִשָּׁה", "שִׁשָּׁה", "שִׁבְעָה", "שְׁמוֹנָה", "תִּשְׁעָה", "עֲשָׂרָה"];
const HEBREW_TENS = ["", "עֲשָׂרָה", "עֶשְׂרִים", "שְׁלֹשִׁים", "אַרְבָּעִים"];
const HEBREW_TEENS = ["עֲשָׂרָה", "אַחַד עָשָׂר", "שְׁנֵים עָשָׂר", "שְׁלֹשָׁה עָשָׂר", "אַרְבָּעָה עָשָׂר", "חֲמִשָּׁה עָשָׂר", "שִׁשָּׁה עָשָׂר", "שִׁבְעָה עָשָׂר", "שְׁמוֹנָה עָשָׂר", "תִּשְׁעָה עָשָׂר"];

export function hebrewDayCount(day: number): string {
  if (day <= 0 || day > 49) return "";
  if (day <= 10) return HEBREW_ONES[day];
  if (day < 20) return HEBREW_TEENS[day - 10];
  const tens = Math.floor(day / 10);
  const ones = day % 10;
  if (ones === 0) return HEBREW_TENS[tens];
  return `${HEBREW_ONES[ones]} וְ${HEBREW_TENS[tens]}`;
}

export function getWeeksAndDays(day: number): { weeks: number; days: number } {
  return { weeks: Math.floor(day / 7), days: day % 7 };
}

export function getOmerBlessing(day: number): { hebrew: string; phonetic: string; french: string } {
  const { weeks, days } = getWeeksAndDays(day);
  const dayWord = day === 1 ? "יוֹם אֶחָד" : `${hebrewDayCount(day)} יָמִים`;

  let weeksPhrase = "";
  if (weeks > 0) {
    const weekWord = weeks === 1 ? "שָׁבוּעַ אֶחָד" : `${hebrewDayCount(weeks)} שָׁבוּעוֹת`;
    if (days === 0) {
      weeksPhrase = `, שֶׁהֵם ${weekWord}`;
    } else {
      const daysWord = days === 1 ? "יוֹם אֶחָד" : `${hebrewDayCount(days)} יָמִים`;
      weeksPhrase = `, שֶׁהֵם ${weekWord} וְ${daysWord}`;
    }
  }

  const HARACHAMAN = "הָרַחֲמָן הוּא יַחֲזִיר עֲבוֹדַת בֵּית הַמִּקְדָּשׁ לִמְקוֹמָהּ, בִּמְהֵרָה בְיָמֵינוּ, אָמֵן סֶלָה.";

  const hebrew = `בָּרוּךְ אַתָּה יְיָ אֱלֹהֵֽינוּ מֶֽלֶךְ הָעוֹלָם, אֲשֶׁר קִדְּשָֽׁנוּ בְּמִצְוֹתָיו, וְצִוָּֽנוּ עַל סְפִירַת הָעֹֽמֶר.\n\nהַיּוֹם ${dayWord}${weeksPhrase} לָעֹֽמֶר.\n\n${HARACHAMAN}`;

  const dayPhonetic = day === 1 ? "yom é'had" : `${day} yamim`;
  const phonetic = `Baroukh Ata Ado-naï Élo-hénou Mélekh HaOlam, Achère Kiddéchanou Bémitsvotav, Vétsivanou Al Séfirat HaOmer.\n\nHaYom ${dayPhonetic}${weeks > 0 ? `, chéhem ${weeks} chavouo${weeks > 1 ? "t" : "a"} vé${days} yamim` : ""} laOmer.\n\nHara'haman Hou Ya'hazir Avodat Beit Hamikdach Limekomah Bimhera Veyaménou, Amen Séla.`;

  const french = `Béni sois-Tu Éternel notre D.ieu Roi du monde, qui nous a sanctifiés par Ses commandements et nous a ordonné le compte du Omer.\n\nAujourd'hui ${day}${day === 1 ? "er" : ""} jour${weeks > 0 ? `, soit ${weeks} semaine${weeks > 1 ? "s" : ""} et ${days} jour${days > 1 ? "s" : ""}` : ""} du Omer.\n\nQue le Miséricordieux rétablisse le service du Temple en son lieu, rapidement de nos jours, Amen Séla.`;

  return { hebrew, phonetic, french };
}

export function getTodayOmerDay(): number | null {
  try {
    const now = new Date();
    const hour = now.getHours();

    // After 17h (safe margin before any sunset in France/Israel),
    // the user needs tonight's count → use tomorrow's Gregorian date
    if (hour >= 17) {
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const events = HebrewCalendar.calendar({ start: tomorrow, end: tomorrow, omer: true });
      for (const ev of events) {
        if (ev.getFlags() & flags.OMER_COUNT) {
          const match = ev.getDesc().match(/(\d+)/);
          if (match) return parseInt(match[1]);
        }
      }
    }

    // Daytime: show today's omer (already counted last night)
    const events = HebrewCalendar.calendar({ start: now, end: now, omer: true });
    for (const ev of events) {
      if (ev.getFlags() & flags.OMER_COUNT) {
        const match = ev.getDesc().match(/(\d+)/);
        if (match) return parseInt(match[1]);
      }
    }
  } catch { /* silent */ }
  return null;
}

export function getOmerPeriodDates(year: number): { start: Date; end: Date } | null {
  try {
    const events = HebrewCalendar.calendar({
      start: new Date(year, 0, 1),
      end: new Date(year, 11, 31),
      omer: true,
    });
    const omerEvents = events.filter((ev) => ev.getFlags() & flags.OMER_COUNT);
    if (omerEvents.length === 0) return null;
    return {
      start: omerEvents[0].getDate().greg(),
      end: omerEvents[omerEvents.length - 1].getDate().greg(),
    };
  } catch {
    return null;
  }
}

const SEFIROT = ["Hessed", "Gvoura", "Tiféret", "Nétsa'h", "Hod", "Yessod", "Malkhout"];

export function getSefiratDay(day: number): { attribute: string; within: string } {
  if (day < 1 || day > 49) return { attribute: "", within: "" };
  const weekIdx = Math.floor((day - 1) / 7);
  const dayIdx = (day - 1) % 7;
  return { attribute: SEFIROT[dayIdx], within: SEFIROT[weekIdx] };
}
