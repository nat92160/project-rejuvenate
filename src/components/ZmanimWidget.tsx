import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useCity } from "@/hooks/useCity";
import { fetchZmanim, ZmanItem } from "@/lib/hebcal";

const ZmanimWidget = () => {
  const { city } = useCity();
  const [zmanim, setZmanim] = useState<ZmanItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchZmanim(city).then((d) => { setZmanim(d); setLoading(false); });
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
      transition={{ delay: 0.1 }}
    >
      <h3 className="font-hebrew text-lg font-semibold flex items-center gap-2" style={{ color: "#1E293B" }}>
        ⏰ Zmanim du jour
      </h3>
      <p className="text-sm mt-1 capitalize" style={{ color: "#475569" }}>{city.name}</p>

      {loading ? (
        <div className="mt-5 space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 rounded-lg animate-pulse" style={{ background: "#F1F5F9" }} />
          ))}
        </div>
      ) : (
        <div className="mt-5 rounded-xl overflow-hidden" style={{ border: "1px solid rgba(0,0,0,0.06)" }}>
          {zmanim.map((z, i) => (
            <div
              key={z.label}
              className="flex items-center gap-3.5 py-3 px-4 transition-colors duration-200"
              style={{
                borderBottom: i !== zmanim.length - 1 ? "1px solid rgba(0,0,0,0.06)" : "none",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(212, 168, 67, 0.04)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <span className="text-lg font-bold font-hebrew" style={{ color: "#B8860B", minWidth: "54px" }}>
                {z.time}
              </span>
              <div className="flex-1">
                <span className="text-sm font-medium" style={{ color: "#1E293B" }}>
                  {z.icon} {z.label}
                </span>
                <p className="text-xs mt-0.5" style={{ color: "#94A3B8" }}>{z.description}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
};

export default ZmanimWidget;
