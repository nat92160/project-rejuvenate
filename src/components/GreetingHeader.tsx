import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { fetchHebrewDate } from "@/lib/hebcal";
import { getHilloulaForDate, HilloulaEntry } from "@/lib/hilloula";

/** Contextual greeting based on time of day */
function getGreeting(): { text: string; emoji: string } {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return { text: "Boker Tov", emoji: "🌅" };
  if (h >= 12 && h < 18) return { text: "Tsohorayim Tovim", emoji: "☀️" };
  if (h >= 18 && h < 21) return { text: "Erev Tov", emoji: "🌆" };
  return { text: "Layla Tov", emoji: "🌙" };
}

const GreetingHeader = () => {
  const { user } = useAuth();
  const [hebrewDateFr, setHebrewDateFr] = useState("");
  const [hilloulot, setHilloulot] = useState<HilloulaEntry[]>([]);
  const greeting = getGreeting();

  const firstName =
    user?.user_metadata?.first_name ||
    user?.user_metadata?.full_name?.split(" ")[0] ||
    user?.email?.split("@")[0] ||
    null;

  useEffect(() => {
    fetchHebrewDate().then((d) => {
      if (d) {
        setHebrewDateFr(`${d.heDateParts.d} ${d.heDateParts.m} ${d.heDateParts.y}`);
        setHilloulot(getHilloulaForDate(d.heDateParts.m, d.heDateParts.d));
      }
    });
  }, []);

  const today = new Date();
  const formatted = today.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <motion.div
      className="mb-6"
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Greeting */}
      <div className="flex items-baseline gap-2 mb-1">
        <span className="text-lg">{greeting.emoji}</span>
        <h2 className="text-xl font-extrabold text-foreground font-display tracking-tight">
          {firstName ? `${greeting.text}, ${firstName}` : greeting.text}
        </h2>
      </div>

      {/* Date line */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground capitalize">
        <span>{formatted}</span>
        {hebrewDateFr && (
          <>
            <span className="text-border">•</span>
            <span className="font-semibold text-primary text-xs">{hebrewDateFr}</span>
          </>
        )}
      </div>

      {/* Hilloula */}
      {hilloulot.length > 0 && (
        <div
          className="mt-3 flex items-center gap-2 px-3 py-2 rounded-xl text-xs"
          style={{ background: "hsl(var(--gold) / 0.05)" }}
        >
          <span>🕯️</span>
          <span className="font-semibold text-foreground">
            Hilloula : {hilloulot.map((h) => h.name).join(", ")}
          </span>
        </div>
      )}
    </motion.div>
  );
};

export default GreetingHeader;
