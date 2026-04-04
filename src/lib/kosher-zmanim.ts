import { ComplexZmanimCalendar, GeoLocation, JewishCalendar } from "kosher-zmanim";
import { ZmanItem } from "./hebcal";

// ─── Constants halakhiques ───
// Angles conformes au standard Consistoire de France
const ANGLE_ALOT = 106.1;       // 90 + 16.1° — Aube halakhique
const ANGLE_MISHEYAKIR = 101.0; // 90 + 11.0° — Reconnaissance bleu/blanc
const ANGLE_TZEIT = 98.5;       // 90 + 8.5°  — Sortie des étoiles / Havdalah (Consistoire)
const ANGLE_TZEIT_FAST = 97.08; // 90 + 7.08° — Fin des jeûnes mineurs (Consistoire)
const ANGLE_TZEIT_RT = 106.1;   // 90 + 16.1° — Rabénou Tam

// ─── Helper ───

export function fmtTime(dt: unknown, tz?: string): string {
  if (!dt) return "--:--";

  if (typeof dt === "object" && dt !== null) {
    const maybeLuxon = dt as {
      isValid?: boolean;
      setZone?: (zone: string) => { toFormat?: (fmt: string) => string };
      toFormat?: (fmt: string) => string;
      toJSDate?: () => Date;
    };

    if (typeof maybeLuxon.toFormat === "function") {
      if (maybeLuxon.isValid === false) return "--:--";
      if (tz && typeof maybeLuxon.setZone === "function") {
        return maybeLuxon.setZone(tz).toFormat?.("HH:mm") || "--:--";
      }
      return maybeLuxon.toFormat("HH:mm");
    }

    if (typeof maybeLuxon.toJSDate === "function") {
      const jsDate = maybeLuxon.toJSDate();
      if (Number.isNaN(jsDate.getTime())) return "--:--";
      const opts: Intl.DateTimeFormatOptions = { hour: "2-digit", minute: "2-digit" };
      if (tz) opts.timeZone = tz;
      return jsDate.toLocaleTimeString("fr-FR", opts);
    }
  }

  if (dt instanceof Date) {
    if (Number.isNaN(dt.getTime())) return "--:--";
    const opts: Intl.DateTimeFormatOptions = { hour: "2-digit", minute: "2-digit" };
    if (tz) opts.timeZone = tz;
    return dt.toLocaleTimeString("fr-FR", opts);
  }

  return "--:--";
}

export type ZmanimMethod = "gra" | "mga";

export interface KosherZmanimOptions {
  lat: number;
  lng: number;
  elevation?: number;
  tz: string;
  name?: string;
  date?: Date;
  method?: ZmanimMethod;
}

export function createCalendar(opts: KosherZmanimOptions): ComplexZmanimCalendar {
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

/** Returns true if coordinates are valid for halakhic calculation */
export function isValidCoords(lat: number, lng: number): boolean {
  return !(
    (lat === 0 && lng === 0) ||
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    lat === null ||
    lng === null
  );
}

// ─── Fetch Zmanim with kosher-zmanim ───

export function fetchKosherZmanim(opts: KosherZmanimOptions): ZmanItem[] {
  try {
    if (!isValidCoords(opts.lat, opts.lng)) {
      console.warn("[kosher-zmanim] Coordonnées GPS invalides (0,0 ou null) — horaires bloqués");
      return [];
    }

    const czc = createCalendar(opts);
    const tz = opts.tz;
    const method = opts.method || "gra";

    const alot = czc.getSunriseOffsetByDegrees(ANGLE_ALOT);
    const misheyakir = czc.getSunriseOffsetByDegrees(ANGLE_MISHEYAKIR);
    const sunrise = czc.getSunrise();
    const sunset = czc.getSunset();

    // GRA calculations (sunrise → sunset)
    const sofZmanShemaGRA = czc.getSofZmanShma(czc.getSunrise(), czc.getSunset());
    const sofZmanTefilaGRA = czc.getSofZmanTfila(czc.getSunrise(), czc.getSunset());

    // MGA calculations (Alot 16.1° → Tzeit 16.1°)
    const alot161 = czc.getSunriseOffsetByDegrees(ANGLE_ALOT);
    const tzeit161 = czc.getSunsetOffsetByDegrees(ANGLE_TZEIT_RT);
    const sofZmanShemaMGA = czc.getSofZmanShma(alot161, tzeit161);
    const sofZmanTefilaMGA = czc.getSofZmanTfila(alot161, tzeit161);

    const chatzot = czc.getChatzos();
    const minchaGedola = method === "mga"
      ? czc.getMinchaGedola(alot161, tzeit161)
      : czc.getMinchaGedola(sunrise, sunset);
    const minchaKetana = czc.getMinchaKetana(sunrise, sunset);
    const plagHaMincha = czc.getPlagHamincha(sunrise, sunset);

    const tzeitKokhavim = czc.getSunsetOffsetByDegrees(ANGLE_TZEIT);
    const tzeitRT = czc.getSunsetOffsetByDegrees(ANGLE_TZEIT_RT);

    const items: ZmanItem[] = [
      { label: "Alot haChah'ar", time: fmtTime(alot, tz), icon: "🌑", description: "Aube halakhique — 16.1°" },
      { label: "Michéyakir", time: fmtTime(misheyakir, tz), icon: "🌫️", description: "Talith & Téfilines — 11.0°" },
      { label: "HaNets (Lever)", time: fmtTime(sunrise, tz), icon: "🌅", description: "Lever du soleil" },
    ];

    // Afficher uniquement la méthode sélectionnée en principal, l'autre en référence
    if (method === "mga") {
      items.push(
        { label: "Chéma (MG\"A)", time: fmtTime(sofZmanShemaMGA, tz), icon: "📖", description: `Fin du Chéma — Magen Avraham (GR"A: ${fmtTime(sofZmanShemaGRA, tz)})` },
        { label: "Téfila (MG\"A)", time: fmtTime(sofZmanTefilaMGA, tz), icon: "🙏", description: `Fin de la Amida — Magen Avraham (GR"A: ${fmtTime(sofZmanTefilaGRA, tz)})` },
      );
    } else {
      items.push(
        { label: "Chéma (GR\"A)", time: fmtTime(sofZmanShemaGRA, tz), icon: "📖", description: `Fin du Chéma — Gaon de Vilna (MG"A: ${fmtTime(sofZmanShemaMGA, tz)})` },
        { label: "Téfila (GR\"A)", time: fmtTime(sofZmanTefilaGRA, tz), icon: "🙏", description: `Fin de la Amida — Gaon de Vilna` },
      );
    }

    items.push(
      { label: "'Hatsot (Midi solaire)", time: fmtTime(chatzot, tz), icon: "🕐", description: "Mi-journée solaire" },
      { label: "Min'ha Guédola", time: fmtTime(minchaGedola, tz), icon: "🕐", description: "Début de Min'ha" },
      { label: "Min'ha Kétana", time: fmtTime(minchaKetana, tz), icon: "🕐", description: "Min'ha tardive" },
      { label: "Pélag haMin'ha", time: fmtTime(plagHaMincha, tz), icon: "🌤️", description: "Pélag haMin'ha" },
      { label: "Chkia (Coucher)", time: fmtTime(sunset, tz), icon: "🌇", description: "Coucher du soleil" },
      { label: "Tsét haKokhavim", time: fmtTime(tzeitKokhavim, tz), icon: "⭐", description: "Sortie des étoiles — 8.5°" },
      { label: "Tsét Rabénou Tam", time: fmtTime(tzeitRT, tz), icon: "🌙", description: "Sortie R. Tam — 16.1°" },
    );

    // Validation croisée de l'ordre
    const orderWarnings = validateZmanimOrder(items);
    if (orderWarnings.length > 0) {
      console.warn("[kosher-zmanim] Anomalies d'ordre:", orderWarnings);
    }

    return items;
  } catch (e) {
    console.error("kosher-zmanim error:", e);
    return [];
  }
}

// ─── Validation croisée ───

function timeToMinutes(time: string): number | null {
  if (!time || time === "--:--") return null;
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function validateZmanimOrder(items: ZmanItem[]): string[] {
  const warnings: string[] = [];
  let prevMin: number | null = null;
  let prevLabel = "";
  for (const z of items) {
    const m = timeToMinutes(z.time);
    if (m === null) continue;
    if (prevMin !== null && m < prevMin) {
      warnings.push(`${prevLabel} (${prevMin}) > ${z.label} (${m})`);
    }
    prevMin = m;
    prevLabel = z.label;
  }
  return warnings;
}

// ─── Shabbat & fêtes via kosher-zmanim ───

/** Candle lighting = sunset - candleOffset (minutes) */
export function getKosherCandleLightingTime(opts: { lat: number; lng: number; tz: string; name?: string; date: Date; candleOffset: number }): string | null {
  try {
    if (!isValidCoords(opts.lat, opts.lng)) return null;
    const geo = new GeoLocation(opts.name || "Location", opts.lat, opts.lng, 0, opts.tz);
    const czc = new ComplexZmanimCalendar(geo);
    czc.setDate(opts.date);
    const sunset = czc.getSunset();
    if (!sunset) return null;
    const sunsetDate = toJsDate(sunset);
    if (!sunsetDate) return null;
    const candle = new Date(sunsetDate.getTime() - opts.candleOffset * 60000);
    return fmtTime(candle, opts.tz);
  } catch { return null; }
}

/** Havdalah at 8.5° (Consistoire standard) */
export function getKosherHavdalahTime(opts: { lat: number; lng: number; tz: string; name?: string; date: Date }): string | null {
  try {
    if (!isValidCoords(opts.lat, opts.lng)) return null;
    const geo = new GeoLocation(opts.name || "Location", opts.lat, opts.lng, 0, opts.tz);
    const czc = new ComplexZmanimCalendar(geo);
    czc.setDate(opts.date);
    const tzeit = czc.getSunsetOffsetByDegrees(ANGLE_TZEIT);
    if (!tzeit) return null;
    return fmtTime(tzeit, opts.tz);
  } catch { return null; }
}

/** Fast end time at 7.08° (Consistoire standard for minor fasts) */
export function getKosherFastEndTime(opts: { lat: number; lng: number; tz: string; name?: string; date: Date }): string | null {
  try {
    if (!isValidCoords(opts.lat, opts.lng)) return null;
    const geo = new GeoLocation(opts.name || "Location", opts.lat, opts.lng, 0, opts.tz);
    const czc = new ComplexZmanimCalendar(geo);
    czc.setDate(opts.date);
    const tzeit = czc.getSunsetOffsetByDegrees(ANGLE_TZEIT_FAST);
    if (!tzeit) return null;
    return fmtTime(tzeit, opts.tz);
  } catch { return null; }
}

/** Convert kosher-zmanim result (Luxon or Date) to JS Date */
function toJsDate(dt: unknown): Date | null {
  if (!dt) return null;
  if (typeof dt === "object" && dt !== null && "toJSDate" in (dt as Record<string, unknown>)) {
    const jsDate = (dt as { toJSDate: () => Date }).toJSDate();
    return Number.isNaN(jsDate.getTime()) ? null : jsDate;
  }
  if (dt instanceof Date) return Number.isNaN(dt.getTime()) ? null : dt;
  return null;
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

    const moladHours = molad.getMoladHours();
    const moladMinutes = molad.getMoladMinutes();
    // getMoladChalakim returns total chalakim including those already counted as minutes
    // 1 minute = 18 chalakim, so remaining = total % 18
    const totalChalakim = molad.getMoladChalakim();
    const moladChalakim = totalChalakim % 18;
    const moladDayOfWeek = molad.getDayOfWeek();

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
