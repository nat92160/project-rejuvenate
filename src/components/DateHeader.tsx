import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { fetchHebrewDate } from "@/lib/hebcal";
import { useCity } from "@/hooks/useCity";
import { fetchShabbatTimes } from "@/lib/hebcal";

const DateHeader = () => {
  const [hebrewDate, setHebrewDate] = useState("");
  const [hebrewDateFr, setHebrewDateFr] = useState("");
  const [parasha, setParasha] = useState("");
  const { city } = useCity();

  useEffect(() => {
    fetchHebrewDate().then((d) => {
      if (d) {
        setHebrewDate(d.hebrew);
        setHebrewDateFr(`${d.heDateParts.d} ${d.heDateParts.m} ${d.heDateParts.y}`);
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
        <div className="w-px h-4 bg-border" />
        {hebrewDate && (
          <span className="font-hebrew font-semibold text-primary" style={{ direction: "rtl" }}>
            {hebrewDate}
          </span>
        )}
      </div>

      {/* Paracha band */}
      {parasha && (
        <div
          className="flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-semibold tracking-wide uppercase bg-card"
        >
          <span className="text-muted-foreground">📖</span>
          <span className="text-gold-matte">
            Semaine de la {parasha}
          </span>
        </div>
      )}
    </motion.div>
  );
};

export default DateHeader;
