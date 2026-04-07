import { forwardRef } from "react";
import { getSefiratDay, getWeeksAndDays, getOmerBlessing } from "@/components/omer/omerData";

interface OmerShareCardProps {
  day: number;
}

const NAVY = "#001F3F";
const GOLD = "#996515";
const GOLD_LIGHT = "#C9A45C";
const CREAM = "#FAF6EF";

const OmerShareCard = forwardRef<HTMLDivElement, OmerShareCardProps>(({ day }, ref) => {
  const { weeks, days } = getWeeksAndDays(day);
  const sefira = getSefiratDay(day);
  const blessing = getOmerBlessing(day);

  return (
    <div
      ref={ref}
      style={{
        width: 720,
        minHeight: 480,
        background: CREAM,
        fontFamily: "'Lora', 'Georgia', serif",
        color: NAVY,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "40px 36px 28px",
        position: "relative",
        overflow: "hidden",
        boxSizing: "border-box",
      }}
    >
      {/* Subtle top border accent */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 4,
        background: `linear-gradient(90deg, ${GOLD}, ${GOLD_LIGHT}, ${GOLD})`,
      }} />

      {/* Title */}
      <div style={{
        fontSize: 10, letterSpacing: 6, fontWeight: 700, textTransform: "uppercase",
        color: GOLD, marginBottom: 24, marginTop: 8,
      }}>
        Séfirat HaOmer
      </div>

      {/* Day number */}
      <div style={{
        fontFamily: "'Playfair Display', 'Georgia', serif",
        fontSize: 80, fontWeight: 900, lineHeight: 1,
        color: NAVY,
        marginBottom: 4,
      }}>
        {day}
      </div>

      <div style={{
        fontSize: 11, letterSpacing: 3, textTransform: "uppercase",
        color: GOLD, fontWeight: 600, marginBottom: 20,
      }}>
        Jour {day} / 49
      </div>

      {/* Séfira badge */}
      <div style={{
        background: NAVY,
        borderRadius: 24, padding: "10px 24px",
        fontSize: 13, fontWeight: 700, color: GOLD_LIGHT,
        letterSpacing: 0.5, marginBottom: 28,
      }}>
        {sefira.attribute} · {sefira.within}
      </div>

      {/* Divider */}
      <div style={{
        width: 60, height: 1, background: GOLD, opacity: 0.3,
        marginBottom: 24,
      }} />

      {/* Hebrew prayer */}
      <div style={{
        width: "100%",
        background: "#FFFFFF",
        border: `1px solid ${GOLD}33`,
        borderRadius: 16,
        padding: "20px 24px",
        marginBottom: 14,
      }}>
        <div style={{
          fontSize: 9, letterSpacing: 4, fontWeight: 700, textTransform: "uppercase",
          color: GOLD, textAlign: "center", marginBottom: 12,
        }}>
          בְּרָכָה וּסְפִירָה
        </div>
        <div style={{
          fontFamily: "'David Libre', 'Frank Ruhl Libre', 'Times New Roman', serif",
          fontSize: 17, lineHeight: 2,
          direction: "rtl" as const, textAlign: "right" as const,
          color: NAVY, whiteSpace: "pre-wrap" as const,
        }}>
          {blessing.hebrew}
        </div>
      </div>

      {/* Phonetic */}
      <div style={{
        width: "100%",
        background: `${NAVY}08`,
        border: `1px solid ${NAVY}12`,
        borderRadius: 12,
        padding: "14px 20px",
        marginBottom: 10,
      }}>
        <div style={{
          fontSize: 8, letterSpacing: 3, fontWeight: 700, textTransform: "uppercase",
          color: GOLD, marginBottom: 8,
        }}>
          Phonétique
        </div>
        <div style={{
          fontSize: 13, lineHeight: 1.8, fontStyle: "italic",
          color: `${NAVY}AA`, whiteSpace: "pre-wrap" as const,
        }}>
          {blessing.phonetic}
        </div>
      </div>

      {/* Translation */}
      <div style={{
        width: "100%",
        background: `${NAVY}08`,
        border: `1px solid ${NAVY}12`,
        borderRadius: 12,
        padding: "14px 20px",
        marginBottom: 24,
      }}>
        <div style={{
          fontSize: 8, letterSpacing: 3, fontWeight: 700, textTransform: "uppercase",
          color: GOLD, marginBottom: 8,
        }}>
          Traduction
        </div>
        <div style={{
          fontSize: 12, lineHeight: 1.7,
          color: `${NAVY}99`, whiteSpace: "pre-wrap" as const,
        }}>
          {blessing.french}
        </div>
      </div>

      {/* Divider */}
      <div style={{
        width: 40, height: 1, background: GOLD, opacity: 0.3,
        marginBottom: 20,
      }} />

      {/* CTA */}
      <div style={{
        fontSize: 13, fontWeight: 600, color: `${NAVY}88`,
        textAlign: "center", lineHeight: 1.6, marginBottom: 12,
      }}>
        Comptez le Omer chaque soir avec nous
      </div>

      <div style={{
        background: NAVY,
        borderRadius: 12, padding: "10px 28px",
        fontSize: 13, fontWeight: 800, color: GOLD_LIGHT,
        letterSpacing: 0.5,
      }}>
        chabbat-chalom.com/omer
      </div>

      {/* Bottom branding */}
      <div style={{ marginTop: "auto", paddingTop: 20, textAlign: "center" as const }}>
        <div style={{ fontSize: 10, letterSpacing: 3, color: GOLD, fontWeight: 700, opacity: 0.5 }}>
          CHABBAT CHALOM
        </div>
        <div style={{ fontSize: 9, color: `${NAVY}44`, marginTop: 4 }}>
          Votre Synagogue en Temps Réel
        </div>
      </div>
    </div>
  );
});

OmerShareCard.displayName = "OmerShareCard";
export default OmerShareCard;
