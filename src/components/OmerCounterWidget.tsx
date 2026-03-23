import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HebrewCalendar, HDate, flags } from "@hebcal/core";

// Hebrew number words for the Omer blessing
const HEBREW_ONES = ["", "אֶחָד", "שְׁנַיִם", "שְׁלֹשָׁה", "אַרְבָּעָה", "חֲמִשָּׁה", "שִׁשָּׁה", "שִׁבְעָה", "שְׁמוֹנָה", "תִּשְׁעָה", "עֲשָׂרָה"];
const HEBREW_TENS = ["", "עֲשָׂרָה", "עֶשְׂרִים", "שְׁלֹשִׁים", "אַרְבָּעִים"];
const HEBREW_TEENS = ["עֲשָׂרָה", "אַחַד עָשָׂר", "שְׁנֵים עָשָׂר", "שְׁלֹשָׁה עָשָׂר", "אַרְבָּעָה עָשָׂר", "חֲמִשָּׁה עָשָׂר", "שִׁשָּׁה עָשָׂר", "שִׁבְעָה עָשָׂר", "שְׁמוֹנָה עָשָׂר", "תִּשְׁעָה עָשָׂר"];

function hebrewDayCount(day: number): string {
  if (day <= 0 || day > 49) return "";
  if (day <= 10) return HEBREW_ONES[day];
  if (day < 20) return HEBREW_TEENS[day - 10];
  const tens = Math.floor(day / 10);
  const ones = day % 10;
  if (ones === 0) return HEBREW_TENS[tens];
  return `${HEBREW_ONES[ones]} וְ${HEBREW_TENS[tens]}`;
}

function getWeeksAndDays(day: number): { weeks: number; days: number } {
  return { weeks: Math.floor(day / 7), days: day % 7 };
}

function getOmerBlessing(day: number): { hebrew: string; phonetic: string; french: string } {
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

  const hebrew = `בָּרוּךְ אַתָּה יְיָ אֱלֹהֵינוּ מֶלֶךְ הָעוֹלָם, אֲשֶׁר קִדְּשָׁנוּ בְּמִצְוֹתָיו, וְצִוָּנוּ עַל סְפִירַת הָעֹמֶר. הַיּוֹם ${dayWord}${weeksPhrase} לָעֹמֶר.`;

  // Phonetic
  const dayPhonetic = `${day}`;
  const phonetic = `Baroukh Ata Ado-naï Élo-hénou Mélekh HaOlam, Achère Kiddéchanou Bémitsvotav, Vétsivanou Al Séfirat HaOmer. HaYom ${dayPhonetic} yamim${weeks > 0 ? `, chéhem ${weeks} chavouo${weeks > 1 ? "t" : "a"} vé${days} yamim` : ""} laOmer.`;

  const french = `Béni sois-Tu Éternel notre D.ieu Roi du monde, qui nous a sanctifiés par Ses commandements et nous a ordonné le compte du Omer. Aujourd'hui ${day}${day === 1 ? "er" : ""} jour${weeks > 0 ? `, soit ${weeks} semaine${weeks > 1 ? "s" : ""} et ${days} jour${days > 1 ? "s" : ""}` : ""} du Omer.`;

  return { hebrew, phonetic, french };
}

function getTodayOmerDay(): number | null {
  try {
    const now = new Date();
    const events = HebrewCalendar.calendar({
      start: now,
      end: now,
      omer: true,
    });
    for (const ev of events) {
      if (ev.getFlags() & flags.OMER_COUNT) {
        const desc = ev.getDesc();
        const match = desc.match(/(\d+)/);
        if (match) return parseInt(match[1]);
      }
    }
  } catch { /* silent */ }
  return null;
}

function getOmerPeriodDates(year: number): { start: Date; end: Date } | null {
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

// Sefira quality/attribute for each day
const SEFIROT = [
  "Hessed", "Gvoura", "Tiféret", "Nétsa'h", "Hod", "Yessod", "Malkhout"
];

function getSefiratDay(day: number): { attribute: string; within: string } {
  if (day < 1 || day > 49) return { attribute: "", within: "" };
  const weekIdx = Math.floor((day - 1) / 7);
  const dayIdx = (day - 1) % 7;
  return { attribute: SEFIROT[dayIdx], within: SEFIROT[weekIdx] };
}

const OmerCounterWidget = () => {
  const [expanded, setExpanded] = useState(false);
  const omerDay = useMemo(() => getTodayOmerDay(), []);
  const currentYear = new Date().getFullYear();
  const omerPeriod = useMemo(() => getOmerPeriodDates(currentYear), [currentYear]);

  if (!omerDay || !omerPeriod) return null;

  const { weeks, days } = getWeeksAndDays(omerDay);
  const progress = (omerDay / 49) * 100;
  const blessing = getOmerBlessing(omerDay);
  const sefira = getSefiratDay(omerDay);

  // Gradient colors based on progress
  const gradientStart = "hsl(var(--gold))";
  const gradientEnd = "hsl(var(--gold-matte))";

  return (
    <motion.div
      className="rounded-2xl mb-4 overflow-hidden border"
      style={{
        borderColor: "hsl(var(--gold) / 0.3)",
        boxShadow: "0 8px 32px hsl(var(--gold) / 0.12)",
      }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header with gradient */}
      <div
        className="p-5 text-center relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, hsl(var(--gold) / 0.15), hsl(var(--gold) / 0.05))",
        }}
      >
        {/* Decorative sparkles */}
        <div className="absolute top-2 left-4 text-lg opacity-30 animate-pulse">✨</div>
        <div className="absolute top-3 right-6 text-sm opacity-20 animate-pulse" style={{ animationDelay: "0.5s" }}>✨</div>
        <div className="absolute bottom-2 left-1/4 text-xs opacity-25 animate-pulse" style={{ animationDelay: "1s" }}>⭐</div>

        <motion.div
          className="text-4xl mb-2"
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 2, repeat: Infinity, repeatType: "reverse" }}
        >
          🌾
        </motion.div>

        <div className="text-[10px] uppercase tracking-[4px] font-bold text-muted-foreground mb-1">
          Séfirat HaOmer
        </div>

        {/* Big day number */}
        <motion.div
          className="text-5xl font-extrabold font-display my-3"
          style={{
            background: `linear-gradient(135deg, ${gradientStart}, ${gradientEnd})`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", damping: 10 }}
        >
          {omerDay}
        </motion.div>

        <div className="text-xs font-bold text-foreground">
          {weeks > 0 && (
            <span>
              {weeks} semaine{weeks > 1 ? "s" : ""}
              {days > 0 && ` et ${days} jour${days > 1 ? "s" : ""}`}
            </span>
          )}
          {weeks === 0 && (
            <span>{days} jour{days > 1 ? "s" : ""}</span>
          )}
        </div>

        {/* Sefira attribute */}
        <div
          className="mt-2 inline-block px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider"
          style={{
            background: "hsl(var(--gold) / 0.12)",
            color: "hsl(var(--gold-matte))",
          }}
        >
          {sefira.attribute} dans {sefira.within}
        </div>
      </div>

      {/* Progress bar */}
      <div className="px-5 py-3 bg-card">
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-[10px] font-medium text-muted-foreground">Progression</span>
          <span className="text-[10px] font-bold" style={{ color: "hsl(var(--gold-matte))" }}>
            {omerDay}/49
          </span>
        </div>
        <div className="h-2.5 rounded-full overflow-hidden" style={{ background: "hsl(var(--muted))" }}>
          <motion.div
            className="h-full rounded-full"
            style={{
              background: `linear-gradient(90deg, ${gradientStart}, ${gradientEnd})`,
            }}
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 1.2, ease: "easeOut" }}
          />
        </div>

        {/* 7-dot week indicator */}
        <div className="flex justify-center gap-1.5 mt-3">
          {Array.from({ length: 7 }).map((_, i) => {
            const dotDay = (weeks * 7) + i + 1;
            const isPast = dotDay < omerDay;
            const isCurrent = dotDay === omerDay;
            return (
              <motion.div
                key={i}
                className="rounded-full"
                style={{
                  width: isCurrent ? "12px" : "8px",
                  height: isCurrent ? "12px" : "8px",
                  background: isCurrent
                    ? `linear-gradient(135deg, ${gradientStart}, ${gradientEnd})`
                    : isPast
                    ? "hsl(var(--gold) / 0.4)"
                    : "hsl(var(--muted))",
                  boxShadow: isCurrent ? "0 0 8px hsl(var(--gold) / 0.5)" : "none",
                }}
                animate={isCurrent ? { scale: [1, 1.2, 1] } : {}}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
            );
          })}
        </div>
      </div>

      {/* Expand for blessing */}
      <div className="bg-card border-t border-border">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full px-5 py-3 flex items-center justify-center gap-2 text-xs font-bold cursor-pointer border-none bg-transparent transition-all"
          style={{ color: "hsl(var(--gold-matte))" }}
        >
          {expanded ? "Masquer la Brakha ▲" : "📖 Voir la Brakha du Omer ▼"}
        </button>

        <AnimatePresence>
          {expanded && (
            <motion.div
              className="px-5 pb-5 space-y-4"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              {/* Hebrew */}
              <div
                className="p-4 rounded-xl text-right leading-relaxed"
                style={{
                  background: "hsl(var(--gold) / 0.05)",
                  fontFamily: "'David Libre', 'Frank Ruhl Libre', serif",
                  fontSize: "18px",
                  direction: "rtl",
                  color: "hsl(var(--foreground))",
                }}
              >
                {blessing.hebrew}
              </div>

              {/* Phonetic */}
              <div className="p-3 rounded-xl border border-border">
                <div className="text-[9px] uppercase tracking-wider font-bold text-muted-foreground mb-1">Phonétique</div>
                <p className="text-sm italic text-foreground leading-relaxed">
                  {blessing.phonetic}
                </p>
              </div>

              {/* French */}
              <div className="p-3 rounded-xl border border-border">
                <div className="text-[9px] uppercase tracking-wider font-bold text-muted-foreground mb-1">Traduction</div>
                <p className="text-sm text-foreground leading-relaxed">
                  {blessing.french}
                </p>
              </div>

              {/* Reminder */}
              <div
                className="text-center text-[11px] italic text-muted-foreground p-3 rounded-xl"
                style={{ background: "hsl(var(--gold) / 0.04)" }}
              >
                💡 On compte le Omer chaque soir après la tombée de la nuit (Tsét HaKokhavim). Si on a oublié le soir, on peut compter le jour suivant sans Brakha.
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default OmerCounterWidget;
