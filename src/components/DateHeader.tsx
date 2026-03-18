import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { fetchHebrewDate } from "@/lib/hebcal";

const DateHeader = () => {
  const [hebrewDate, setHebrewDate] = useState("");

  useEffect(() => {
    fetchHebrewDate().then((d) => { if (d) setHebrewDate(d.hebrew); });
  }, []);

  const today = new Date();
  const formatted = today.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <motion.div
      className="flex justify-center items-center gap-3 flex-wrap px-5 py-3 rounded-3xl mb-4 mx-4 text-sm capitalize"
      style={{
        background: "#FFFFFF",
        border: "1px solid rgba(0,0,0,0.06)",
        boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)",
        color: "#475569",
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.2 }}
    >
      <span>{formatted}</span>
      <div className="w-px h-5" style={{ background: "rgba(0,0,0,0.06)" }} />
      {hebrewDate && (
        <span className="font-hebrew font-medium" style={{ color: "#D4AF37", direction: "rtl" }}>
          {hebrewDate}
        </span>
      )}
    </motion.div>
  );
};

export default DateHeader;
