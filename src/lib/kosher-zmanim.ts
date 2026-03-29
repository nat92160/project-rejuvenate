import { ComplexZmanimCalendar, GeoLocation, JewishCalendar } from "kosher-zmanim";
import { ZmanItem } from "./hebcal";

// ─── Helper ───

function fmtTime(dt: Date | null | undefined, tz?: string): string {
  if (!dt || isNaN(dt.getTime())) return "--:--";
  const opts: Intl.DateTimeFormatOptions = { hour: "2-digit", minute: "2-digit" };
  if (tz) opts.timeZone = tz;
  return dt.toLocaleTimeString("fr-FR", opts);
}

export type ZmanimMethod = "gra" | "mga";

interface KosherZmanimOptions {
  lat: number;
  lng: number;
  elevation?: number;
  tz: string;
  name?: string;
  date?: Date;
  method?: ZmanimMethod;
}

function createCalendar(opts: KosherZmanimOptions): ComplexZmanimCalendar {
  const geoLocation = new GeoLocation(
    opts.name || "User Location",
    opts.lat,
    opts.lng,
    opts.elevation || 0,
    opts.tz
  );
  const czc = new ComplexZmanimCalendar(geoLocation);
  if (opts.date) {
    czc.setDate(opts.date);
  }
  return czc;
}

// ─── Fetch Zmanim with kosher-zmanim ───

export function fetchKosherZmanim(opts: KosherZmanimOptions): ZmanItem[] {
  try {
    const czc = createCalendar(opts);
    const tz = opts.tz;
    const method = opts.method || "gra";

    // Sunrise & sunset use standard refraction angle of -0.833°
    // kosher-zmanim uses this by default for getSunrise()/getSunset()

    // Alot HaShachar at 16.1°
    const alot = czc.getSunriseOffsetByDegrees(106.1); // GEOMETRIC_ZENITH (90) + 16.1

    // Misheyakir at 11.0°
    const misheyakir = czc.getSunriseOffsetByDegrees(101.0); // 90 + 11.0

    const sunrise = czc.getSunrise();
    const sunset = czc.getSunset();

    // Sof Zman Shema & Tefila based on selected method
    let sofZmanShemaMGA: Date | null = null;
    let sofZmanShemaGRA: Date | null = null;
    let sofZmanTefilaMGA: Date | null = null;
    let sofZmanTefilaGRA: Date | null = null;

    // GRA calculations (based on sunrise to sunset)
    sofZmanShemaGRA = czc.getSofZmanShma(czc.getSunrise(), czc.getSunset());
    sofZmanTefilaGRA = czc.getSofZmanTfila(czc.getSunrise(), czc.getSunset());

    // MGA calculations (based on Alot 16.1° to Tzeit 16.1°)
    const alot161 = czc.getSunriseOffsetByDegrees(106.1);
    const tzeit161 = czc.getSunsetOffsetByDegrees(106.1);
    sofZmanShemaMGA = czc.getSofZmanShma(alot161, tzeit161);
    sofZmanTefilaMGA = czc.getSofZmanTfila(alot161, tzeit161);

    const chatzot = czc.getChatzos();
    const minchaGedola = method === "mga"
      ? czc.getMinchaGedola(alot161, tzeit161)
      : czc.getMinchaGedola(sunrise, sunset);
    const minchaKetana = czc.getMinchaKetana(sunrise, sunset);
    const plagHaMincha = czc.getPlagHamincha(sunrise, sunset);

    // Tzeit HaKokhavim at 7.08°
    const tzeitKokhavim = czc.getSunsetOffsetByDegrees(97.08); // 90 + 7.08

    // Tzeit Rabenou Tam at 16.1°
    const tzeitRT = czc.getSunsetOffsetByDegrees(106.1); // 90 + 16.1

    const items: ZmanItem[] = [
      { label: "Alot haChah'ar (16.1°)", time: fmtTime(alot, tz), icon: "🌑", description: "Aube halakhique — angle 16.1°" },
      { label: "Michéyakir (11°)", time: fmtTime(misheyakir, tz), icon: "🌫️", description: "On peut distinguer le bleu du blanc" },
      { label: "Nets (Lever du soleil)", time: fmtTime(sunrise, tz), icon: "🌅", description: "Lever du soleil (réfraction -0.833°)" },
    ];

    if (method === "mga") {
      items.push(
        { label: "Chéma (MG\"A 16.1°)", time: fmtTime(sofZmanShemaMGA, tz), icon: "📖", description: "Fin du Chéma — Magen Avraham" },
        { label: "Chéma (GR\"A)", time: fmtTime(sofZmanShemaGRA, tz), icon: "📖", description: "Fin du Chéma — Gaon de Vilna" },
        { label: "Téfila (MG\"A 16.1°)", time: fmtTime(sofZmanTefilaMGA, tz), icon: "🙏", description: "Fin de la Téfila — Magen Avraham" },
        { label: "Téfila (GR\"A)", time: fmtTime(sofZmanTefilaGRA, tz), icon: "🙏", description: "Fin de la Téfila — Gaon de Vilna" },
      );
    } else {
      items.push(
        { label: "Chéma (GR\"A)", time: fmtTime(sofZmanShemaGRA, tz), icon: "📖", description: "Fin du Chéma — Gaon de Vilna" },
        { label: "Chéma (MG\"A 16.1°)", time: fmtTime(sofZmanShemaMGA, tz), icon: "📖", description: "Fin du Chéma — Magen Avraham" },
        { label: "Téfila (GR\"A)", time: fmtTime(sofZmanTefilaGRA, tz), icon: "🙏", description: "Fin de la Téfila — Gaon de Vilna" },
      );
    }

    items.push(
      { label: "'Hatsot (Midi solaire)", time: fmtTime(chatzot, tz), icon: "🕐", description: "Midi solaire" },
      { label: "Min'ha Guédola", time: fmtTime(minchaGedola, tz), icon: "🕐", description: "Début de Min'ha" },
      { label: "Min'ha Qétana", time: fmtTime(minchaKetana, tz), icon: "🕐", description: "Min'ha tardive" },
      { label: "Pélag haMin'ha", time: fmtTime(plagHaMincha, tz), icon: "🌤️", description: "Pélag haMin'ha" },
      { label: "Chkia (Coucher)", time: fmtTime(sunset, tz), icon: "🌇", description: "Coucher du soleil (réfraction -0.833°)" },
      { label: "Tsét haKokhavim (7.08°)", time: fmtTime(tzeitKokhavim, tz), icon: "⭐", description: "Sortie des étoiles — 7.08°" },
      { label: "Tsét Rabénou Tam (16.1°)", time: fmtTime(tzeitRT, tz), icon: "🌙", description: "Sortie R. Tam — 16.1°" },
    );

    return items;
  } catch (e) {
    console.error("kosher-zmanim error:", e);
    return [];
  }
}

// ─── Molad ───

export interface MoladInfo {
  dayOfWeek: string;
  hours: number;
  minutes: number;
  chalakim: number;
  monthName: string;
}

const DAYS_FR = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Chabbat"];

export function getMoladInfo(date?: Date): MoladInfo | null {
  try {
    const jc = new JewishCalendar(date || new Date());
    const molad = jc.getMolad();

    // Molad day/hours/chalakim
    const moladHours = molad.getMoladHours();
    const moladMinutes = molad.getMoladMinutes();
    const moladChalakim = molad.getMoladChalakim() % 18; // remaining chalakim after minutes
    const moladDayOfWeek = molad.getDayOfWeek();

    // Hebrew month name
    const monthName = jc.toString();

    return {
      dayOfWeek: DAYS_FR[moladDayOfWeek % 7] || `Jour ${moladDayOfWeek}`,
      hours: moladHours,
      minutes: moladMinutes,
      chalakim: moladChalakim,
      monthName,
    };
  } catch (e) {
    console.error("Molad error:", e);
    return null;
  }
}
