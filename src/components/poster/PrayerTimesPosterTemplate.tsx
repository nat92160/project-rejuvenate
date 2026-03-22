import { forwardRef } from "react";
import type { SynaProfile } from "./MasterPosterTemplate";

interface PrayerTimesData {
  shacharit_time: string;
  shacharit_time_2: string;
  minha_time: string;
  minha_time_2: string;
  arvit_time: string;
  arvit_time_2: string;
}

interface Props {
  profile: SynaProfile;
  times: PrayerTimesData;
}

const W = 1080;
const SCENE_PAD = 48;
const CARD_PAD = 80;

const ANTHRACITE = "#2C3E50";
const GREY_MED = "#6B7B8D";
const SCENE_BG = "#F5F5F5";
const CARD_BG = "#FFFFFF";
const FONT_DISPLAY = "'Playfair Display', serif";
const FONT_BODY = "'Lora', serif";

const darkenHex = (hex: string, factor: number): string => {
  const h = hex.replace("#", "");
  const r = Math.round(parseInt(h.substring(0, 2), 16) * (1 - factor));
  const g = Math.round(parseInt(h.substring(2, 4), 16) * (1 - factor));
  const b = Math.round(parseInt(h.substring(4, 6), 16) * (1 - factor));
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
};

const CornerOrnament = ({ pos, color }: { pos: "tl" | "tr" | "bl" | "br"; color: string }) => {
  const positions: Record<string, React.CSSProperties> = {
    tl: { top: 0, left: 0 }, tr: { top: 0, right: 0 },
    bl: { bottom: 0, left: 0 }, br: { bottom: 0, right: 0 },
  };
  const rotations: Record<string, string> = {
    tl: "", tr: "translate(36,0) scale(-1,1)",
    br: "translate(36,36) scale(-1,-1)", bl: "translate(0,36) scale(1,-1)",
  };
  return (
    <svg width="36" height="36" viewBox="0 0 36 36" style={{ position: "absolute", ...positions[pos] }}>
      <g transform={rotations[pos]}>
        <path d="M2 2 L14 2 L14 4 L4 4 L4 14 L2 14 Z" fill={color} />
        <path d="M7 7 L15 7 L15 8.5 L8.5 8.5 L8.5 15 L7 15 Z" fill={color} opacity="0.4" />
      </g>
    </svg>
  );
};

const offices = [
  { key: "shacharit_time" as const, key2: "shacharit_time_2" as const, label: "Cha'harit", icon: "🌅", desc: "Office du matin" },
  { key: "minha_time" as const, key2: "minha_time_2" as const, label: "Min'ha", icon: "🌇", desc: "Office de l'après-midi" },
  { key: "arvit_time" as const, key2: "arvit_time_2" as const, label: "Arvit", icon: "🌙", desc: "Office du soir" },
];

const PrayerTimesPosterTemplate = forwardRef<HTMLDivElement, Props>(
  ({ profile, times }, ref) => {
    const synaName = profile.name || "MA SYNAGOGUE";
    const signature = profile.signature || `${synaName} — Chabbat Chalom`;
    const ACCENT = profile.secondary_color || "#B8860B";
    const ACCENT_DARK = darkenHex(ACCENT, 0.25);
    const TEXT_MAIN = profile.primary_color || "#001F3F";

    const today = new Date();
    const weekLabel = `Semaine du ${today.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}`;

    return (
      <div ref={ref} style={{ width: W, minHeight: 800, background: SCENE_BG, padding: SCENE_PAD, display: "flex", fontFamily: FONT_BODY, position: "relative" }}>
        <div style={{ flex: 1, background: CARD_BG, border: `3px solid ${ACCENT}`, borderRadius: 12, boxShadow: "0 12px 48px rgba(0,0,0,0.08)", position: "relative", display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {/* Double border */}
          <div style={{ position: "absolute", inset: 8, border: `1px solid ${ACCENT}55`, borderRadius: 6, pointerEvents: "none" }} />
          {/* Corners */}
          <div style={{ position: "absolute", inset: 12, pointerEvents: "none" }}>
            <CornerOrnament pos="tl" color={ACCENT} />
            <CornerOrnament pos="tr" color={ACCENT} />
            <CornerOrnament pos="bl" color={ACCENT} />
            <CornerOrnament pos="br" color={ACCENT} />
          </div>

          {/* Header */}
          <div style={{ padding: `${CARD_PAD}px ${CARD_PAD}px 0`, textAlign: "center", flexShrink: 0 }}>
            {profile.logo_url && (
              <img src={profile.logo_url} alt="" crossOrigin="anonymous" style={{ width: 96, height: 96, objectFit: "contain", margin: "0 auto 20px", display: "block", borderRadius: 12 }} />
            )}
            <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: 36, fontWeight: 700, letterSpacing: 8, textTransform: "uppercase", color: TEXT_MAIN, margin: 0, lineHeight: 1.3 }}>
              {synaName}
            </h1>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginTop: 24 }}>
              <div style={{ flex: 1, maxWidth: 80, height: 1, background: `linear-gradient(90deg, transparent, ${ACCENT})` }} />
              <span style={{ fontSize: 14, color: ACCENT, letterSpacing: 6 }}>✦</span>
              <div style={{ flex: 1, maxWidth: 80, height: 1, background: `linear-gradient(90deg, ${ACCENT}, transparent)` }} />
            </div>
          </div>

          {/* Content */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-start", padding: `40px ${CARD_PAD}px`, gap: 28 }}>
            <div style={{ textAlign: "center" }}>
              <span style={{ fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 700, letterSpacing: 5, textTransform: "uppercase", color: ACCENT_DARK }}>
                HORAIRES DES OFFICES
              </span>
            </div>

            <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: 40, fontWeight: 900, color: TEXT_MAIN, margin: 0, lineHeight: 1.25, textAlign: "center" }}>
              🕐 Horaires de la Semaine
            </h2>

            <div style={{ textAlign: "center" }}>
              <span style={{ fontFamily: FONT_BODY, fontSize: 20, color: GREY_MED }}>{weekLabel}</span>
            </div>

            {/* Divider */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
              <div style={{ width: 60, height: 1, background: `linear-gradient(90deg, transparent, ${ACCENT}88)` }} />
              <div style={{ width: 60, height: 1, background: `linear-gradient(90deg, ${ACCENT}88, transparent)` }} />
            </div>

            {/* Prayer times */}
            <div style={{ display: "flex", flexDirection: "column", gap: 32, padding: "0 40px" }}>
              {offices.map((office) => {
                const t1 = times[office.key];
                const t2 = times[office.key2];
                if (!t1 && !t2) return null;
                return (
                  <div key={office.key} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginBottom: 4 }}>
                      <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, transparent, ${ACCENT}55)` }} />
                      <span style={{ fontFamily: FONT_DISPLAY, fontSize: 24, fontWeight: 700, letterSpacing: 4, color: ACCENT_DARK }}>
                        {office.icon} {office.label}
                      </span>
                      <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${ACCENT}55, transparent)` }} />
                    </div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 24 }}>
                      {t1 && (
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, background: `${ACCENT}11`, borderRadius: 16, padding: "16px 40px", border: `1px solid ${ACCENT}33` }}>
                          <span style={{ fontSize: 16, color: GREY_MED, fontFamily: FONT_BODY }}>Horaire 1</span>
                          <span style={{ fontSize: 36, fontWeight: 800, color: TEXT_MAIN, fontFamily: FONT_DISPLAY }}>{t1}</span>
                        </div>
                      )}
                      {t2 && (
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, background: `${ACCENT}11`, borderRadius: 16, padding: "16px 40px", border: `1px solid ${ACCENT}33` }}>
                          <span style={{ fontSize: 16, color: GREY_MED, fontFamily: FONT_BODY }}>Horaire 2</span>
                          <span style={{ fontSize: 36, fontWeight: 800, color: TEXT_MAIN, fontFamily: FONT_DISPLAY }}>{t2}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer */}
          <div style={{ padding: `0 ${CARD_PAD}px ${CARD_PAD}px`, textAlign: "center", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginBottom: 16 }}>
              <div style={{ flex: 1, maxWidth: 120, height: 1, background: `linear-gradient(90deg, transparent, ${ACCENT}66)` }} />
              <span style={{ fontSize: 12, color: ACCENT, letterSpacing: 4 }}>✦</span>
              <div style={{ flex: 1, maxWidth: 120, height: 1, background: `linear-gradient(90deg, ${ACCENT}66, transparent)` }} />
            </div>
            <p style={{ fontFamily: FONT_BODY, fontSize: 18, color: GREY_MED, margin: 0, letterSpacing: 1 }}>
              {signature}
            </p>
          </div>
        </div>
      </div>
    );
  }
);

PrayerTimesPosterTemplate.displayName = "PrayerTimesPosterTemplate";
export default PrayerTimesPosterTemplate;
