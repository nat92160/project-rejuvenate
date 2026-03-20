import { forwardRef } from "react";

/* ─── Public types ─── */
export interface CardPosterContent {
  /** Large emoji displayed at top */
  topEmoji: string;
  /** Badge text (e.g. "ANNONCE URGENTE", "COURS ZOOM") */
  badge: string;
  /** Badge background color */
  badgeColor: string;
  /** Badge text color */
  badgeTextColor?: string;
  /** Badge left emoji */
  badgeEmoji?: string;
  /** Main title */
  title: string;
  /** Optional description under the title */
  description?: string;
  /** Date string */
  date?: string;
  /** Date emoji */
  dateEmoji?: string;
  /** Extra detail lines */
  details?: { icon: string; text: string }[];
  /** Accent / theme color for dots, dividers */
  accentColor: string;
  /** Background tint color (light) */
  bgColor?: string;
}

export interface CardPosterProfile {
  name?: string;
  logo_url?: string | null;
  website?: string;
}

interface Props {
  profile: CardPosterProfile;
  content: CardPosterContent;
}

const W = 1080;
const MIN_H = 800;

const FONT_DISPLAY = "'Playfair Display', serif";
const FONT_BODY = "'Lora', serif";

const CardPosterTemplate = forwardRef<HTMLDivElement, Props>(
  ({ profile, content }, ref) => {
    const bg = content.bgColor || "#FFF5F5";
    const accent = content.accentColor || "#DC2626";
    const badgeBg = content.badgeColor || accent;
    const badgeText = content.badgeTextColor || "#FFFFFF";
    const synaName = profile.name || "Chabbat Chalom";

    return (
      <div
        ref={ref}
        style={{
          width: W,
          minHeight: MIN_H,
          background: bg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "50px 0",
          fontFamily: FONT_BODY,
          position: "relative",
        }}
      >
        {/* Card */}
        <div
          style={{
            width: W - 100,
            background: "#FFFFFF",
            borderRadius: 40,
            boxShadow: "0 20px 80px rgba(0,0,0,0.08), 0 4px 20px rgba(0,0,0,0.04)",
            padding: "64px 60px 52px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 8,
          }}
        >
          {/* Top emoji */}
          <div style={{ fontSize: 80, lineHeight: 1, marginBottom: 8 }}>
            {content.topEmoji}
          </div>

          {/* Badge banner */}
          <div
            style={{
              background: badgeBg,
              borderRadius: 60,
              padding: "16px 56px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 14,
              marginBottom: 12,
            }}
          >
            {content.badgeEmoji && (
              <span style={{ fontSize: 24 }}>{content.badgeEmoji}</span>
            )}
            <span
              style={{
                fontFamily: FONT_DISPLAY,
                fontSize: 26,
                fontWeight: 900,
                letterSpacing: 6,
                textTransform: "uppercase",
                color: badgeText,
              }}
            >
              {content.badge}
            </span>
          </div>

          {/* Title */}
          <h2
            style={{
              fontFamily: FONT_DISPLAY,
              fontSize: 58,
              fontWeight: 900,
              color: "#1A1A1A",
              margin: "12px 0 0",
              lineHeight: 1.25,
              textAlign: "center",
              maxWidth: W - 240,
            }}
          >
            {content.title}
          </h2>

          {/* Decorative dots */}
          <div
            style={{
              display: "flex",
              gap: 12,
              margin: "16px 0",
              alignItems: "center",
            }}
          >
            <span style={{ fontSize: 14, color: accent }}>✦</span>
            <span style={{ fontSize: 18, color: accent }}>✦</span>
            <span style={{ fontSize: 14, color: accent }}>✦</span>
          </div>

          {/* Description */}
          {content.description && (
            <p
              style={{
                fontFamily: FONT_BODY,
                fontSize: 28,
                color: "#444444",
                margin: 0,
                textAlign: "center",
                lineHeight: 1.6,
                maxWidth: W - 280,
              }}
            >
              {content.description}
            </p>
          )}

          {/* Detail lines */}
          {content.details && content.details.length > 0 && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 10,
                marginTop: 12,
                alignItems: "center",
              }}
            >
              {content.details.map((d, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    fontSize: 24,
                    color: "#555555",
                    fontFamily: FONT_BODY,
                  }}
                >
                  <span>{d.icon}</span>
                  <span>{d.text}</span>
                </div>
              ))}
            </div>
          )}

          {/* Date */}
          {content.date && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginTop: 16,
                fontSize: 24,
                color: accent,
                fontWeight: 600,
                fontFamily: FONT_BODY,
              }}
            >
              <span>{content.dateEmoji || "📅"}</span>
              <span>{content.date}</span>
            </div>
          )}

          {/* Divider */}
          <div
            style={{
              width: "70%",
              height: 2,
              background: `linear-gradient(90deg, transparent, ${accent}44, ${accent}, ${accent}44, transparent)`,
              margin: "24px 0 20px",
              borderRadius: 2,
            }}
          />

          {/* Footer */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {profile.logo_url && (
                <img
                  src={profile.logo_url}
                  alt=""
                  crossOrigin="anonymous"
                  style={{ width: 44, height: 44, objectFit: "contain", borderRadius: 8 }}
                />
              )}
              {!profile.logo_url && (
                <span style={{ fontSize: 36 }}>✡️</span>
              )}
              <span
                style={{
                  fontFamily: FONT_DISPLAY,
                  fontSize: 34,
                  fontWeight: 900,
                  color: accent,
                }}
              >
                {synaName}
              </span>
            </div>
            {profile.website && (
              <span style={{ fontSize: 20, color: "#999999", fontFamily: FONT_BODY }}>
                {profile.website}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }
);

CardPosterTemplate.displayName = "CardPosterTemplate";
export default CardPosterTemplate;
