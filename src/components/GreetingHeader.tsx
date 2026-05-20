import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { fetchHebrewDate } from "@/lib/hebcal";
import { getHilloulaForDate, HilloulaEntry } from "@/lib/hilloula";
import BottomNavCustomizer from "@/components/BottomNavCustomizer";

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
  const [customizerOpen, setCustomizerOpen] = useState(false);
  const greeting = getGreeting();

  const rawFirstName =
    user?.user_metadata?.first_name ||
    user?.user_metadata?.full_name?.split(" ")[0] ||
    user?.email?.split("@")[0] ||
    null;
  const firstName = rawFirstName
    ? rawFirstName.charAt(0).toUpperCase() + rawFirstName.slice(1).toLowerCase()
    : null;

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
      <div className="flex items-start justify-between gap-3 mb-1">
        <div className="flex items-baseline gap-2 min-w-0">
          <span className="text-lg">{greeting.emoji}</span>
          <h2 className="text-xl font-extrabold text-foreground font-display tracking-tight truncate">
            {firstName ? `${greeting.text}, ${firstName}` : greeting.text}
          </h2>
        </div>
        <button
          onClick={() => setCustomizerOpen(true)}
          className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider cursor-pointer transition-all active:scale-95 border"
          style={{
            background: "hsl(var(--gold) / 0.08)",
            borderColor: "hsl(var(--gold) / 0.25)",
            color: "hsl(var(--gold-matte))",
          }}
          title="Personnaliser la barre du bas"
        >
          ✏️ Widgets
        </button>
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
      <BottomNavCustomizer open={customizerOpen} onClose={() => setCustomizerOpen(false)} />
    </motion.div>
  );
};

export default GreetingHeader;
