import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { fetchHebrewDate } from "@/lib/hebcal";
import { useCity } from "@/hooks/useCity";
import { fetchShabbatTimes } from "@/lib/hebcal";
import { getHilloulaForDate, HilloulaEntry } from "@/lib/hilloula";

const DateHeader = () => {
  const [hebrewDate, setHebrewDate] = useState("");
  const [hebrewDateFr, setHebrewDateFr] = useState("");
  const [parasha, setParasha] = useState("");
  const [hilloulot, setHilloulot] = useState<HilloulaEntry[]>([]);
  const { city } = useCity();

  useEffect(() => {
    fetchHebrewDate().then((d) => {
      if (d) {
        setHebrewDate(d.hebrew);
        setHebrewDateFr(`${d.heDateParts.d} ${d.heDateParts.m} ${d.heDateParts.y}`);

        // Check for hilloulot
        const h = getHilloulaForDate(d.heDateParts.m, d.heDateParts.d);
        setHilloulot(h);
      }
    });
  }, []);

  useEffect(() => {
    fetchShabbatTimes(city).then((d) => { if (d?.parasha) setParasha(d.parasha); });
  }, [city]);

  const today = new Date();
  const formatted = today.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <motion.div
      className="mx-4 mb-4 rounded-2xl overflow-hidden"
      style={{ boxShadow: "var(--shadow-card)" }}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15, duration: 0.4 }}
    >
      {/* Date band */}
      <div
        className="flex justify-center items-center gap-3 flex-wrap px-5 py-3 text-sm capitalize bg-card"
        style={{ borderBottom: "1px solid hsl(var(--border))" }}
      >
        <span className="text-foreground font-medium">{formatted}</span>
        {hebrewDateFr && (
          <>
            <span className="text-muted-foreground">•</span>
            <span className="font-semibold text-primary">
              {hebrewDateFr}
            </span>
          </>
        )}
      </div>

      {/* Paracha band */}
      {parasha && (
        <div
          className="flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-semibold tracking-wide uppercase bg-card"
          style={{ borderBottom: hilloulot.length > 0 ? "1px solid hsl(var(--border))" : "none" }}
        >
          <span className="text-muted-foreground">📖</span>
          <span style={{ color: "hsl(var(--gold-matte))" }}>
            Semaine de la {parasha}
          </span>
        </div>
      )}

      {/* Hilloula band */}
      {hilloulot.length > 0 && (
        <div className="flex items-center justify-center gap-2 px-5 py-2.5 text-xs bg-card"
          style={{ background: "hsl(var(--gold) / 0.04)" }}>
          <span>🕯️</span>
          <span className="font-semibold text-foreground">
            Hilloula : {hilloulot.map((h) => h.name).join(", ")}
          </span>
        </div>
      )}
    </motion.div>
  );
};

export default DateHeader;
