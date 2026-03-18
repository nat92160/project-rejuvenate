import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useCity } from "@/hooks/useCity";
import { fetchShabbatTimes, ShabbatTimes } from "@/lib/hebcal";

const ShabbatWidget = () => {
  const { city } = useCity();
  const [data, setData] = useState<ShabbatTimes | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchShabbatTimes(city).then((d) => { setData(d); setLoading(false); });
  }, [city]);

  return (
    <motion.div
      className="rounded-3xl bg-white p-6 mb-4"
      style={{
        border: "1px solid rgba(0,0,0,0.06)",
        boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)",
      }}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
    >
      <h3 className="font-hebrew text-lg font-semibold flex items-center gap-2" style={{ color: "#1E293B" }}>
        🕯️ Horaires de Chabbat
      </h3>
      <p className="text-xs mt-1" style={{ color: "#94A3B8" }}>{city.name}</p>

      {loading ? (
        <div className="mt-5 space-y-4">
          <div className="h-20 rounded-3xl animate-pulse" style={{ background: "#F1F5F9" }} />
          <div className="h-20 rounded-3xl animate-pulse" style={{ background: "#F1F5F9" }} />
        </div>
      ) : data ? (
        <>
          <div className="grid grid-cols-2 gap-4 mt-5">
            <div className="rounded-3xl p-5 text-center transition-all duration-300 hover:border-gold"
              style={{ background: "#F1F5F9", border: "1px solid rgba(0,0,0,0.06)" }}>
              <div className="text-xs uppercase tracking-wider mb-2" style={{ color: "#94A3B8", letterSpacing: "1.5px" }}>
                Allumage
              </div>
              <div className="text-3xl font-bold font-hebrew" style={{ color: "#B8860B" }}>
                {data.candleLighting || "--:--"}
              </div>
              <div className="text-xs mt-1 capitalize" style={{ color: "#475569" }}>
                {data.candleLightingDate}
              </div>
            </div>

            <div className="rounded-3xl p-5 text-center transition-all duration-300 hover:border-gold"
              style={{ background: "#F1F5F9", border: "1px solid rgba(0,0,0,0.06)" }}>
              <div className="text-xs uppercase tracking-wider mb-2" style={{ color: "#94A3B8", letterSpacing: "1.5px" }}>
                Havdala
              </div>
              <div className="text-3xl font-bold font-hebrew" style={{ color: "#B8860B" }}>
                {data.havdalah || "--:--"}
              </div>
              <div className="text-xs mt-1 capitalize" style={{ color: "#475569" }}>
                {data.havdalahDate}
              </div>
            </div>
          </div>

          {data.parasha && (
            <div className="mt-4 p-4 rounded-3xl text-center"
              style={{
                background: "rgba(212,175,55,0.06)",
                border: "1px solid rgba(212,175,55,0.15)",
              }}>
              <div className="text-xs uppercase tracking-wider mb-1" style={{ color: "#94A3B8", letterSpacing: "1.5px" }}>
                Paracha de la semaine
              </div>
              <div className="font-hebrew text-xl font-bold" style={{ color: "#1E293B" }}>
                {data.parasha}
              </div>
              {data.parashaHebrew && (
                <div className="font-hebrew text-lg mt-1" style={{ color: "#D4AF37", direction: "rtl", opacity: 0.8 }}>
                  {data.parashaHebrew}
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        <p className="mt-4 text-sm" style={{ color: "#94A3B8" }}>Impossible de charger les horaires</p>
      )}
    </motion.div>
  );
};

export default ShabbatWidget;
