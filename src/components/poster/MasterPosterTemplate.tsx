import { forwardRef } from "react";

export interface PosterContentBlock {
  /** Bloc A – category label e.g. "COURS DE TORAH" */
  category: string;
  /** Bloc B – main title / speaker e.g. "Rav David Cohen" */
  title: string;
  /** Bloc C – detail lines */
  details: { icon?: string; text: string }[];
  /** Optional description paragraph */
  description?: string;
  /** Optional date line */
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

const FALLBACK_PRIMARY = "#1e3a5f";
const FALLBACK_SECONDARY = "#C5A059";
const POSTER_WIDTH = 600;
const POSTER_HEIGHT = 800;
const MARGIN = 60;

/**
 * Universal branded poster – pure inline styles for html2canvas fidelity.
 * Fixed header (logo + synagogue name) & footer (signature + line).
 * Variable 3-block centre: A (category), B (title), C (details).
 */
const MasterPosterTemplate = forwardRef<HTMLDivElement, Props>(
  ({ profile, content }, ref) => {
    const primary = profile.primary_color || FALLBACK_PRIMARY;
    const accent = profile.secondary_color || FALLBACK_SECONDARY;
    const fontDisplay = `'Playfair Display', serif`;
    const fontBody = `'Lora', serif`;

    return (
      <div
        ref={ref}
        style={{
          width: POSTER_WIDTH,
          height: POSTER_HEIGHT,
          background: "#FFFFFF",
          position: "relative",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          fontFamily: fontBody,
        }}
      >
        {/* ── HEADER ── */}
        <div
          style={{
            padding: `${MARGIN}px ${MARGIN}px 0`,
            textAlign: "center",
            flexShrink: 0,
          }}
        >
          {profile.logo_url && (
            <img
              src={profile.logo_url}
              alt=""
              crossOrigin="anonymous"
              style={{
                width: 64,
                height: 64,
                objectFit: "contain",
                margin: "0 auto 12px",
                display: "block",
                borderRadius: 8,
              }}
            />
          )}
          <h1
            style={{
              fontFamily: fontDisplay,
              fontSize: 18,
              fontWeight: 700,
              letterSpacing: 4,
              textTransform: "uppercase",
              color: primary,
              margin: 0,
              lineHeight: 1.3,
            }}
          >
            {profile.name || "MA SYNAGOGUE"}
          </h1>
          {/* thin gold rule */}
          <div
            style={{
              width: 80,
              height: 1,
              background: accent,
              margin: "14px auto 0",
            }}
          />
        </div>

        {/* ── CONTENT AREA ── */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            padding: `24px ${MARGIN}px`,
            textAlign: "center",
            gap: 16,
          }}
        >
          {/* Bloc A – Category */}
          <span
            style={{
              fontFamily: fontDisplay,
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: 3,
              textTransform: "uppercase",
              color: accent,
            }}
          >
            {content.category}
          </span>

          {/* Bloc B – Title */}
          <h2
            style={{
              fontFamily: fontBody,
              fontSize: 26,
              fontWeight: 700,
              color: "#2C3E50",
              margin: 0,
              lineHeight: 1.35,
              maxWidth: POSTER_WIDTH - MARGIN * 2,
            }}
          >
            {content.title}
          </h2>

          {/* Description */}
          {content.description && (
            <p
              style={{
                fontFamily: fontBody,
                fontSize: 13,
                color: "#555",
                lineHeight: 1.6,
                margin: 0,
                maxWidth: POSTER_WIDTH - MARGIN * 2 - 40,
              }}
            >
              {content.description}
            </p>
          )}

          {/* thin divider */}
          <div
            style={{
              width: 40,
              height: 1,
              background: accent,
              opacity: 0.5,
            }}
          />

          {/* Bloc C – Details */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {content.details.map((d, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  fontFamily: fontBody,
                  fontSize: 14,
                  color: "#2C3E50",
                }}
              >
                {d.icon && <span style={{ fontSize: 16 }}>{d.icon}</span>}
                <span>{d.text}</span>
              </div>
            ))}
          </div>

          {/* Date */}
          {content.date && (
            <span
              style={{
                fontFamily: fontBody,
                fontSize: 11,
                color: "#888",
                marginTop: 4,
              }}
            >
              {content.date}
            </span>
          )}
        </div>

        {/* ── FOOTER ── */}
        <div
          style={{
            padding: `0 ${MARGIN}px ${MARGIN}px`,
            textAlign: "center",
            flexShrink: 0,
          }}
        >
          {/* thin gold rule */}
          <div
            style={{
              width: "100%",
              height: 1,
              background: accent,
              opacity: 0.4,
              marginBottom: 14,
            }}
          />
          {profile.signature && (
            <p
              style={{
                fontFamily: fontBody,
                fontSize: 11,
                color: "#888",
                margin: 0,
                lineHeight: 1.5,
              }}
            >
              {profile.signature}
            </p>
          )}
        </div>
      </div>
    );
  }
);

MasterPosterTemplate.displayName = "MasterPosterTemplate";
export default MasterPosterTemplate;
