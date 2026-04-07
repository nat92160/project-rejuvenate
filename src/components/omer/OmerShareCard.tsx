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
  const sefira = getSefiratDay(day);
  const blessing = getOmerBlessing(day);

  return (
    <div
      ref={ref}
      style={{
        width: 600,
        background: CREAM,
        fontFamily: "'Lora', 'Georgia', serif",
        color: NAVY,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "28px 32px 24px",
        position: "relative",
        overflow: "hidden",
        boxSizing: "border-box",
      }}
    >
      {/* Top gold line */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 3,
        background: `linear-gradient(90deg, ${GOLD}, ${GOLD_LIGHT}, ${GOLD})`,
      }} />

      {/* Header row: title + day */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        gap: 16, marginBottom: 6, marginTop: 4,
      }}>
        <div style={{
          fontSize: 9, letterSpacing: 5, fontWeight: 700, textTransform: "uppercase",
          color: GOLD,
        }}>
          Séfirat HaOmer
        </div>
        <div style={{
          width: 1, height: 16, background: `${GOLD}44`,
        }} />
        <div style={{
          fontFamily: "'Playfair Display', 'Georgia', serif",
          fontSize: 32, fontWeight: 900, color: NAVY, lineHeight: 1,
        }}>
          Jour {day}
        </div>
      </div>

      {/* Séfira */}
      <div style={{
        background: NAVY, borderRadius: 20, padding: "6px 18px",
        fontSize: 11, fontWeight: 700, color: GOLD_LIGHT,
        letterSpacing: 0.5, marginBottom: 16,
      }}>
        {sefira.attribute} · {sefira.within}
      </div>

      {/* Hebrew — compact */}
      <div style={{
        width: "100%", background: "#FFFFFF",
        border: `1px solid ${GOLD}22`, borderRadius: 12,
        padding: "14px 18px", marginBottom: 10,
      }}>
        <div style={{
          fontFamily: "'David Libre', 'Frank Ruhl Libre', 'Times New Roman', serif",
          fontSize: 15, lineHeight: 1.9,
          direction: "rtl" as const, textAlign: "right" as const,
          color: NAVY, whiteSpace: "pre-wrap" as const,
        }}>
          {blessing.hebrew}
        </div>
      </div>

      {/* Phonetic + Translation side by side */}
      <div style={{
        width: "100%", display: "flex", gap: 8, marginBottom: 16,
      }}>
        <div style={{
          flex: 1, background: `${NAVY}06`, border: `1px solid ${NAVY}0D`,
          borderRadius: 10, padding: "10px 14px",
        }}>
          <div style={{
            fontSize: 7, letterSpacing: 2, fontWeight: 700, textTransform: "uppercase",
            color: GOLD, marginBottom: 6,
          }}>
            Phonétique
          </div>
          <div style={{
            fontSize: 11, lineHeight: 1.7, fontStyle: "italic",
            color: `${NAVY}AA`, whiteSpace: "pre-wrap" as const,
          }}>
            {blessing.phonetic}
          </div>
        </div>
        <div style={{
          flex: 1, background: `${NAVY}06`, border: `1px solid ${NAVY}0D`,
          borderRadius: 10, padding: "10px 14px",
        }}>
          <div style={{
            fontSize: 7, letterSpacing: 2, fontWeight: 700, textTransform: "uppercase",
            color: GOLD, marginBottom: 6,
          }}>
            Traduction
          </div>
          <div style={{
            fontSize: 11, lineHeight: 1.7,
            color: `${NAVY}88`, whiteSpace: "pre-wrap" as const,
          }}>
            {blessing.french}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        width: "100%",
      }}>
        <div style={{ fontSize: 9, letterSpacing: 2, color: GOLD, fontWeight: 700, opacity: 0.6 }}>
          CHABBAT CHALOM
        </div>
        <div style={{
          background: NAVY, borderRadius: 8, padding: "6px 16px",
          fontSize: 11, fontWeight: 800, color: GOLD_LIGHT,
        }}>
          chabbat-chalom.com/omer
        </div>
      </div>
    </div>
  );
});

OmerShareCard.displayName = "OmerShareCard";
export default OmerShareCard;
