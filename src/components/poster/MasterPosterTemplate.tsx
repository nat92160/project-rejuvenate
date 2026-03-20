import { forwardRef } from "react";

/* ─── Public types ─── */

export interface PosterContentBlock {
  category: string;
  title: string;
  details: { icon?: string; section?: string; label: string; value: string; sub?: string }[];
  description?: string;
  date?: string;
}

export interface SynaProfile {
  name: string;
  logo_url?: string | null;
  signature?: string;
  primary_color?: string;
  secondary_color?: string;
  font_family?: string;
}

interface Props {
  profile: SynaProfile;
  content: PosterContentBlock;
}

/* ─── Layout tokens ─── */
const W = 1080;
const MIN_H = 800;
const SCENE_PAD = 48;
const CARD_BORDER = 3;
const INNER_BORDER = 1;
const INNER_GAP = 8;
const CARD_PAD = 80;

const ANTHRACITE = "#2C3E50";
const GREY_MED = "#6B7B8D";
const SCENE_BG = "#F5F5F5";
const CARD_BG = "#FFFFFF";

const FONT_DISPLAY = "'Playfair Display', serif";
const FONT_BODY = "'Lora', serif";

/* ─── Helpers ─── */

/** Simple hex darkener (factor 0–1, 0 = same, 1 = black) */
const darkenHex = (hex: string, factor: number): string => {
  const h = hex.replace("#", "");
  const r = Math.round(parseInt(h.substring(0, 2), 16) * (1 - factor));
  const g = Math.round(parseInt(h.substring(2, 4), 16) * (1 - factor));
  const b = Math.round(parseInt(h.substring(4, 6), 16) * (1 - factor));
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
};

/* ─── Tiny SVG corner ornament ─── */
const CornerOrnament = ({ pos, color }: { pos: "tl" | "tr" | "bl" | "br"; color: string }) => {
  const positions: Record<string, React.CSSProperties> = {
    tl: { top: 0, left: 0 },
    tr: { top: 0, right: 0 },
    bl: { bottom: 0, left: 0 },
    br: { bottom: 0, right: 0 },
  };
  const rotations: Record<string, string> = {
    tl: "",
    tr: "translate(36,0) scale(-1,1)",
    br: "translate(36,36) scale(-1,-1)",
    bl: "translate(0,36) scale(1,-1)",
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

/* ─── Component ─── */

const MasterPosterTemplate = forwardRef<HTMLDivElement, Props>(
  ({ profile, content }, ref) => {
    const synaName = profile.name || "MA SYNAGOGUE";
    const signature = profile.signature || `${synaName} — Chabbat Chalom`;

    // Dynamic theme colors
    const ACCENT = profile.secondary_color || "#B8860B";
    const ACCENT_DARK = darkenHex(ACCENT, 0.25);
    const TEXT_MAIN = profile.primary_color || "#001F3F";

    return (
      <div
        ref={ref}
        style={{
          width: W,
          minHeight: MIN_H,
          background: SCENE_BG,
          padding: SCENE_PAD,
          display: "flex",
          fontFamily: FONT_BODY,
          position: "relative",
        }}
      >
        <div
          style={{
            flex: 1,
            background: CARD_BG,
            border: `${CARD_BORDER}px solid ${ACCENT}`,
            borderRadius: 12,
            boxShadow: "0 12px 48px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.04)",
            position: "relative",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {/* Double border (inner) */}
          <div
            style={{
              position: "absolute",
              inset: INNER_GAP,
              border: `${INNER_BORDER}px solid ${ACCENT}55`,
              borderRadius: 6,
              pointerEvents: "none",
            }}
          />

          {/* Corner ornaments */}
          <div style={{ position: "absolute", inset: INNER_GAP + 4, pointerEvents: "none" }}>
            <CornerOrnament pos="tl" color={ACCENT} />
            <CornerOrnament pos="tr" color={ACCENT} />
            <CornerOrnament pos="bl" color={ACCENT} />
            <CornerOrnament pos="br" color={ACCENT} />
          </div>

          {/* ── HEADER ── */}
          <div style={{ padding: `${CARD_PAD}px ${CARD_PAD}px 0`, textAlign: "center", flexShrink: 0 }}>
            {profile.logo_url && (
              <img
                src={profile.logo_url}
                alt=""
                crossOrigin="anonymous"
                style={{ width: 96, height: 96, objectFit: "contain", margin: "0 auto 20px", display: "block", borderRadius: 12 }}
              />
            )}
            <h1
              style={{
                fontFamily: FONT_DISPLAY,
                fontSize: 36,
                fontWeight: 700,
                letterSpacing: 8,
                textTransform: "uppercase",
                color: TEXT_MAIN,
                margin: 0,
                lineHeight: 1.3,
              }}
            >
              {synaName}
            </h1>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginTop: 24 }}>
              <div style={{ flex: 1, maxWidth: 80, height: 1, background: `linear-gradient(90deg, transparent, ${ACCENT})` }} />
              <span style={{ fontSize: 14, color: ACCENT, letterSpacing: 6 }}>✦</span>
              <div style={{ flex: 1, maxWidth: 80, height: 1, background: `linear-gradient(90deg, ${ACCENT}, transparent)` }} />
            </div>
          </div>

          {/* ── CONTENT ── */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-start", padding: `40px ${CARD_PAD}px`, gap: 28 }}>
            {/* Category */}
            <div style={{ textAlign: "center" }}>
              <span style={{ fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 700, letterSpacing: 5, textTransform: "uppercase", color: ACCENT_DARK }}>
                {content.category}
              </span>
            </div>

            {/* Title */}
            <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: 44, fontWeight: 900, color: TEXT_MAIN, margin: 0, lineHeight: 1.25, textAlign: "center" }}>
              {content.title}
            </h2>

            {/* Description */}
            {content.description && (
              <p style={{ fontFamily: FONT_BODY, fontSize: 22, color: ANTHRACITE, lineHeight: 1.7, margin: 0, textAlign: "center", maxWidth: W - SCENE_PAD * 2 - CARD_PAD * 2 - 40, alignSelf: "center" }}>
                {content.description}
              </p>
            )}

            {/* Divider */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
              <div style={{ width: 60, height: 1, background: `linear-gradient(90deg, transparent, ${ACCENT}88)` }} />
              <div style={{ width: 60, height: 1, background: `linear-gradient(90deg, ${ACCENT}88, transparent)` }} />
            </div>

            {/* Details */}
            {content.details.length > 0 && (() => {
              const grouped = content.details.reduce<Record<string, typeof content.details>>((acc, item) => {
                const key = item.section || "";
                if (!acc[key]) acc[key] = [];
                acc[key].push(item);
                return acc;
              }, {});

              return (
                <div style={{ display: "flex", flexDirection: "column", gap: 28, padding: "0 20px" }}>
                  {Object.entries(grouped).map(([section, items]) => (
                    <div key={section} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                      {section && (
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginBottom: 4 }}>
                          <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, transparent, ${ACCENT}55)` }} />
                          <span style={{ fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 700, letterSpacing: 4, color: ACCENT_DARK }}>{section}</span>
                          <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${ACCENT}55, transparent)` }} />
                        </div>
                      )}
                      {items.map((d, i) => (
                        <div key={`${section}-${i}`} style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 16 }}>
                          <div style={{ display: "flex", alignItems: "baseline", gap: 10, flex: 1, minWidth: 0 }}>
                            {d.icon && <span style={{ fontSize: 18, color: ACCENT_DARK, flexShrink: 0 }}>{d.icon}</span>}
                            <span style={{ fontFamily: FONT_BODY, fontSize: 22, color: ANTHRACITE }}>
                              {d.label}
                              {d.sub && <span style={{ fontSize: 17, color: GREY_MED, fontStyle: "italic", marginLeft: 8 }}>{d.sub}</span>}
                            </span>
                          </div>
                          <span style={{ fontFamily: FONT_BODY, fontSize: 26, fontWeight: 700, color: TEXT_MAIN, flexShrink: 0, whiteSpace: "pre-wrap", textAlign: "right", maxWidth: 420 }}>
                            {d.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              );
            })()}

            {/* Date */}
            {content.date && (
              <div style={{ textAlign: "center", marginTop: 8 }}>
                <span style={{ fontFamily: FONT_BODY, fontSize: 18, color: GREY_MED }}>{content.date}</span>
              </div>
            )}
          </div>

          {/* ── FOOTER ── */}
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

MasterPosterTemplate.displayName = "MasterPosterTemplate";
export default MasterPosterTemplate;
