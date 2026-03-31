import { forwardRef } from "react";
import { getSefiratDay, getWeeksAndDays } from "@/components/omer/omerData";

interface OmerShareCardProps {
  day: number;
}

const OmerShareCard = forwardRef<HTMLDivElement, OmerShareCardProps>(({ day }, ref) => {
  const { weeks, days } = getWeeksAndDays(day);
  const sefira = getSefiratDay(day);
  const progress = (day / 49) * 100;

  const weekStr = weeks > 0
    ? `${weeks} semaine${weeks > 1 ? "s" : ""}${days > 0 ? ` et ${days} jour${days > 1 ? "s" : ""}` : ""}`
    : `${days} jour${days > 1 ? "s" : ""}`;

  return (
    <div
      ref={ref}
      style={{
        width: 540,
        minHeight: 720,
        background: "linear-gradient(160deg, #0A1628 0%, #162544 40%, #1A1A3E 70%, #0D0D2B 100%)",
        fontFamily: "'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
        color: "#FFFFFF",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "48px 40px 36px",
        position: "relative",
        overflow: "hidden",
        boxSizing: "border-box",
      }}
    >
      {/* Background decorative elements */}
      <div style={{
        position: "absolute", top: -60, right: -60,
        width: 200, height: 200, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(201,164,92,0.12) 0%, transparent 70%)",
      }} />
      <div style={{
        position: "absolute", bottom: -40, left: -40,
        width: 160, height: 160, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(201,164,92,0.08) 0%, transparent 70%)",
      }} />

      {/* Top ornament */}
      <div style={{ fontSize: 14, letterSpacing: 8, color: "#C9A45C", opacity: 0.6, marginBottom: 8 }}>
        ✦ ✦ ✦
      </div>

      {/* Title */}
      <div style={{
        fontSize: 11, letterSpacing: 6, fontWeight: 700, textTransform: "uppercase",
        color: "#C9A45C", marginBottom: 24,
      }}>
        Séfirat HaOmer
      </div>

      {/* Day number - hero */}
      <div style={{
        fontSize: 96, fontWeight: 900, lineHeight: 1,
        background: "linear-gradient(135deg, #D4AF63 0%, #C9A45C 40%, #E8D5A3 60%, #C9A45C 100%)",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
        marginBottom: 4,
        textShadow: "none",
      }}>
        {day}
      </div>

      {/* Day label */}
      <div style={{
        fontSize: 16, fontWeight: 600, color: "rgba(255,255,255,0.7)", marginBottom: 20,
      }}>
        {weekStr}
      </div>

      {/* Séfira badge */}
      <div style={{
        background: "linear-gradient(135deg, rgba(201,164,92,0.2), rgba(201,164,92,0.08))",
        border: "1px solid rgba(201,164,92,0.3)",
        borderRadius: 24, padding: "10px 24px",
        fontSize: 14, fontWeight: 700, color: "#E8D5A3",
        letterSpacing: 1, marginBottom: 32,
      }}>
        {sefira.attribute} dans {sefira.within}
      </div>

      {/* Progress bar */}
      <div style={{ width: "100%", marginBottom: 8 }}>
        <div style={{
          display: "flex", justifyContent: "space-between", marginBottom: 6,
        }}>
          <span style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.4)" }}>Progression</span>
          <span style={{ fontSize: 10, fontWeight: 700, color: "#C9A45C" }}>{day}/49</span>
        </div>
        <div style={{
          height: 6, borderRadius: 3, background: "rgba(255,255,255,0.08)", overflow: "hidden",
        }}>
          <div style={{
            width: `${progress}%`, height: "100%", borderRadius: 3,
            background: "linear-gradient(90deg, #C9A45C, #E8D5A3)",
          }} />
        </div>
      </div>

      {/* Week dots */}
      <div style={{ display: "flex", gap: 6, marginBottom: 36, marginTop: 8 }}>
        {Array.from({ length: 7 }).map((_, i) => {
          const dotDay = weeks * 7 + i + 1;
          const isPast = dotDay < day;
          const isCurrent = dotDay === day;
          return (
            <div key={i} style={{
              width: isCurrent ? 12 : 8, height: isCurrent ? 12 : 8, borderRadius: "50%",
              background: isCurrent
                ? "linear-gradient(135deg, #C9A45C, #E8D5A3)"
                : isPast ? "rgba(201,164,92,0.4)" : "rgba(255,255,255,0.1)",
              boxShadow: isCurrent ? "0 0 8px rgba(201,164,92,0.5)" : "none",
              transition: "all 0.3s",
            }} />
          );
        })}
      </div>

      {/* Divider */}
      <div style={{
        width: 60, height: 1,
        background: "linear-gradient(90deg, transparent, #C9A45C, transparent)",
        marginBottom: 28,
      }} />

      {/* CTA */}
      <div style={{
        fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.6)",
        textAlign: "center", lineHeight: 1.6, marginBottom: 20,
      }}>
        Comptez le Omer chaque soir avec nous
      </div>

      <div style={{
        background: "linear-gradient(135deg, #C9A45C, #D4AF63)",
        borderRadius: 14, padding: "12px 32px",
        fontSize: 13, fontWeight: 800, color: "#0A1628",
        letterSpacing: 0.5,
      }}>
        chabbat-chalom.com/omer
      </div>

      {/* Bottom branding */}
      <div style={{ marginTop: "auto", paddingTop: 28, textAlign: "center" as const }}>
        <div style={{ fontSize: 10, letterSpacing: 3, color: "rgba(255,255,255,0.25)", fontWeight: 600 }}>
          CHABBAT CHALOM
        </div>
        <div style={{ fontSize: 9, color: "rgba(255,255,255,0.15)", marginTop: 4 }}>
          Votre Synagogue en Temps Réel
        </div>
      </div>
    </div>
  );
});

OmerShareCard.displayName = "OmerShareCard";
export default OmerShareCard;
