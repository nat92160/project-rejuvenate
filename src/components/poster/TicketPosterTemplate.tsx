import { forwardRef } from "react";
import type { SynaProfile } from "./MasterPosterTemplate";

interface TicketContent {
  badge: string;
  badgeColor: string;
  title: string;
  subtitle?: string;
  details: { icon: string; text: string }[];
  actionLabel: string;
  actionColor: string;
}

interface Props {
  profile: SynaProfile;
  content: TicketContent;
}

const W = 1080;
const H = 640;
const PAD = 36;
const CARD_PAD = 48;

const GOLD = "#C5A059";
const GOLD_DARK = "#996515";
const NAVY = "#001F3F";
const ANTHRACITE = "#2C3E50";
const GREY_MED = "#6B7B8D";
const FONT_DISPLAY = "'Playfair Display', serif";
const FONT_BODY = "'Lora', serif";

/* Inline SVG corner ornament */
const cornerSvg = (pos: "tl" | "tr" | "bl" | "br") => {
  const positions: Record<string, React.CSSProperties> = {
    tl: { top: 0, left: 0 },
    tr: { top: 0, right: 0, transform: "scaleX(-1)" },
    bl: { bottom: 0, left: 0, transform: "scaleY(-1)" },
    br: { bottom: 0, right: 0, transform: "scale(-1,-1)" },
  };
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" style={{ position: "absolute", ...positions[pos] }}>
      <path d="M2 2 L12 2 L12 3.5 L3.5 3.5 L3.5 12 L2 12 Z" fill={GOLD} />
      <path d="M6 6 L13 6 L13 7 L7 7 L7 13 L6 13 Z" fill={GOLD} opacity="0.35" />
    </svg>
  );
};

/* Filaire icon components (no emojis) */
const ClockIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={GOLD_DARK} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const VideoIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={GOLD_DARK} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="5" width="14" height="14" rx="2" />
    <path d="M16 10l5-3v10l-5-3" />
  </svg>
);

const MapPinIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={GOLD_DARK} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 6-9 13-9 13S3 16 3 10a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

const BookIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={GOLD_DARK} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    <path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15z" />
  </svg>
);

const iconMap: Record<string, React.FC> = {
  "📅": ClockIcon,
  "🎥": VideoIcon,
  "📍": MapPinIcon,
  "📝": BookIcon,
};

const TicketPosterTemplate = forwardRef<HTMLDivElement, Props>(
  ({ profile, content }, ref) => {
    const synaName = profile.name || "MA SYNAGOGUE";

    return (
      <div
        ref={ref}
        style={{
          width: W,
          height: H,
          background: "#F5F5F5",
          padding: PAD,
          display: "flex",
          fontFamily: FONT_BODY,
        }}
      >
        {/* Card */}
        <div
          style={{
            flex: 1,
            background: "#FFFFFF",
            border: `2.5px solid ${GOLD}`,
            borderRadius: 10,
            boxShadow: "0 8px 32px rgba(0,0,0,0.07)",
            position: "relative",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {/* Inner border */}
          <div
            style={{
              position: "absolute",
              inset: 6,
              border: `1px solid ${GOLD}44`,
              borderRadius: 5,
              pointerEvents: "none",
            }}
          />

          {/* Corner ornaments */}
          <div style={{ position: "absolute", inset: 10, pointerEvents: "none" }}>
            {cornerSvg("tl")}
            {cornerSvg("tr")}
            {cornerSvg("bl")}
            {cornerSvg("br")}
          </div>

          {/* Content area */}
          <div
            style={{
              flex: 1,
              padding: CARD_PAD,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            {/* Top row: badge + syna name */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
              <span
                style={{
                  fontFamily: FONT_DISPLAY,
                  fontSize: 20,
                  fontWeight: 900,
                  letterSpacing: 5,
                  textTransform: "uppercase",
                  color: content.badge === "ZOOM" ? "#2D8CFF" : "#16a34a",
                }}
              >
                {content.badge === "ZOOM" ? "COURS ZOOM" : "COURS PRÉSENTIEL"}
              </span>
              <span
                style={{
                  fontFamily: FONT_DISPLAY,
                  fontSize: 14,
                  fontWeight: 700,
                  letterSpacing: 4,
                  textTransform: "uppercase",
                  color: GOLD_DARK,
                }}
              >
                {synaName}
              </span>
            </div>

            {/* Center: title + subtitle */}
            <div style={{ textAlign: "center", padding: "8px 0" }}>
              <h2
                style={{
                  fontFamily: FONT_DISPLAY,
                  fontSize: 42,
                  fontWeight: 900,
                  color: NAVY,
                  margin: 0,
                  lineHeight: 1.2,
                  letterSpacing: 2,
                  textTransform: "uppercase",
                }}
              >
                {content.title}
              </h2>
              {content.subtitle && (
                <p
                  style={{
                    fontFamily: FONT_BODY,
                    fontSize: 22,
                    color: NAVY,
                    margin: "10px 0 0",
                    fontWeight: 600,
                  }}
                >
                  {content.subtitle}
                </p>
              )}
            </div>

            {/* Bottom: details row + gold line */}
            <div>
              {/* Gold divider */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 16 }}>
                <div style={{ flex: 1, maxWidth: 80, height: 1, background: `linear-gradient(90deg, transparent, ${GOLD})` }} />
                <span style={{ fontSize: 10, color: GOLD, letterSpacing: 4 }}>✦</span>
                <div style={{ flex: 1, maxWidth: 80, height: 1, background: `linear-gradient(90deg, ${GOLD}, transparent)` }} />
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 36, flexWrap: "wrap" }}>
                {content.details.map((d, i) => {
                  const IconComp = iconMap[d.icon] || ClockIcon;
                  return (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        fontFamily: FONT_BODY,
                        fontSize: 18,
                        color: NAVY,
                      }}
                    >
                      <IconComp />
                      <span>{d.text}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

TicketPosterTemplate.displayName = "TicketPosterTemplate";
export default TicketPosterTemplate;
export type { TicketContent };
