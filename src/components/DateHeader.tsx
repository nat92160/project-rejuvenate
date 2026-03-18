import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useCity } from "@/hooks/useCity";
import { fetchHebrewDate, fetchShabbatTimes } from "@/lib/hebcal";

const DateHeader = () => {
  const { city } = useCity();
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
      className="text-center py-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.3 }}
    >
      <p className="text-sm text-muted-foreground capitalize">{formatted}</p>
      {hebrewDate && <p className="font-hebrew text-gold-dark text-sm mt-1">{hebrewDate}</p>}
    </motion.div>
  );
};

export default DateHeader;
