import { forwardRef } from "react";
import { getSefiratDay, getWeeksAndDays, getOmerBlessing } from "@/components/omer/omerData";

interface OmerShareCardProps {
  day: number;
}

const OmerShareCard = forwardRef<HTMLDivElement, OmerShareCardProps>(({ day }, ref) => {
  const { weeks, days } = getWeeksAndDays(day);
  const sefira = getSefiratDay(day);
  const blessing = getOmerBlessing(day);

  return (
    <div
      ref={ref}
      style={{
        width: 540,
        minHeight: 960,
        background: "linear-gradient(160deg, #0A1628 0%, #162544 40%, #1A1A3E 70%, #0D0D2B 100%)",
        fontFamily: "'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
        color: "#FFFFFF",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "36px 32px 28px",
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
      <div style={{ fontSize: 12, letterSpacing: 8, color: "#C9A45C", opacity: 0.6, marginBottom: 6 }}>
        ✦ ✦ ✦
      </div>

      {/* Title */}
      <div style={{
        fontSize: 10, letterSpacing: 6, fontWeight: 700, textTransform: "uppercase",
        color: "#C9A45C", marginBottom: 16,
      }}>
        Séfirat HaOmer
      </div>

      {/* Day number - hero */}
      <div style={{
        fontSize: 72, fontWeight: 900, lineHeight: 1,
        background: "linear-gradient(135deg, #D4AF63 0%, #C9A45C 40%, #E8D5A3 60%, #C9A45C 100%)",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
        marginBottom: 2,
        textShadow: "none",
      }}>
        {day}
      </div>

      {/* Séfira badge */}
      <div style={{
        background: "linear-gradient(135deg, rgba(201,164,92,0.2), rgba(201,164,92,0.08))",
        border: "1px solid rgba(201,164,92,0.3)",
        borderRadius: 20, padding: "8px 20px",
        fontSize: 12, fontWeight: 700, color: "#E8D5A3",
        letterSpacing: 1, marginTop: 10, marginBottom: 20,
      }}>
        {sefira.attribute} dans {sefira.within}
      </div>

      {/* Prayer text — Hebrew */}
      {/* Divider */}
      <div style={{
        width: 80, height: 1,
        background: "linear-gradient(90deg, transparent, #C9A45C, transparent)",
        marginBottom: 20,
      }} />

      <div style={{
        width: "100%",
        background: "rgba(201,164,92,0.06)",
        border: "1px solid rgba(201,164,92,0.15)",
        borderRadius: 16,
        padding: "20px 24px",
        marginBottom: 16,
      }}>
        <div style={{
          fontSize: 9, letterSpacing: 4, fontWeight: 700, textTransform: "uppercase",
          color: "#C9A45C", textAlign: "center", marginBottom: 12,
        }}>
          בְּרָכָה וּסְפִירָה
        </div>
        <div style={{
          fontFamily: "'David Libre', 'Frank Ruhl Libre', 'Times New Roman', serif",
          fontSize: 17,
          lineHeight: 2,
          direction: "rtl" as const,
          textAlign: "right" as const,
          color: "#F0E6D0",
          whiteSpace: "pre-wrap" as const,
        }}>
          {blessing.hebrew}
        </div>
      </div>

      {/* Phonetic */}
      <div style={{
        width: "100%",
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 12,
        padding: "14px 20px",
        marginBottom: 12,
      }}>
        <div style={{
          fontSize: 8, letterSpacing: 3, fontWeight: 700, textTransform: "uppercase",
          color: "rgba(255,255,255,0.4)", marginBottom: 8,
        }}>
          Phonétique
        </div>
        <div style={{
          fontSize: 13, lineHeight: 1.8, fontStyle: "italic",
          color: "rgba(255,255,255,0.7)", whiteSpace: "pre-wrap" as const,
        }}>
          {blessing.phonetic}
        </div>
      </div>

      {/* Translation */}
      <div style={{
        width: "100%",
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 12,
        padding: "14px 20px",
        marginBottom: 20,
      }}>
        <div style={{
          fontSize: 8, letterSpacing: 3, fontWeight: 700, textTransform: "uppercase",
          color: "rgba(255,255,255,0.4)", marginBottom: 8,
        }}>
          Traduction
        </div>
        <div style={{
          fontSize: 12, lineHeight: 1.7,
          color: "rgba(255,255,255,0.6)", whiteSpace: "pre-wrap" as const,
        }}>
          {blessing.french}
        </div>
      </div>

      {/* Divider */}
      <div style={{
        width: 60, height: 1,
        background: "linear-gradient(90deg, transparent, #C9A45C, transparent)",
        marginBottom: 16,
      }} />

      {/* CTA */} 
      <div style={{
        fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.6)",
        textAlign: "center", lineHeight: 1.6, marginBottom: 12,
      }}>
        Comptez le Omer chaque soir avec nous
      </div>

      <div style={{
        background: "linear-gradient(135deg, #C9A45C, #D4AF63)",
        borderRadius: 12, padding: "10px 28px",
        fontSize: 13, fontWeight: 800, color: "#0A1628",
        letterSpacing: 0.5,
      }}>
        chabbat-chalom.com/omer
      </div>

      {/* Bottom branding */}
      <div style={{ marginTop: "auto", paddingTop: 16, textAlign: "center" as const }}>
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
