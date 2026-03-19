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
const PAD = 48;
const CARD_PAD = 50;

const GOLD_ACCENT = "#B8860B";
const NAVY = "#001F3F";
const ANTHRACITE = "#2C3E50";
const GREY_MED = "#6B7B8D";
const FONT_DISPLAY = "'Playfair Display', serif";
const FONT_BODY = "'Lora', serif";

/**
 * Compact ticket/card format for Cours de Torah exports.
 * Landscape-ish 1080×640 — looks like a premium event ticket.
 */
const TicketPosterTemplate = forwardRef<HTMLDivElement, Props>(
  ({ profile, content }, ref) => {
    const synaName = profile.name || "MA SYNAGOGUE";
    const accent = profile.secondary_color || GOLD_ACCENT;

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
            border: `2.5px solid ${accent}`,
            borderRadius: 16,
            boxShadow: "0 8px 30px rgba(0,0,0,0.08)",
            display: "flex",
            overflow: "hidden",
          }}
        >
          {/* Left accent strip */}
          <div
            style={{
              width: 8,
              background: content.actionColor,
              flexShrink: 0,
            }}
          />

          {/* Content */}
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
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span
                style={{
                  fontFamily: FONT_BODY,
                  fontSize: 16,
                  fontWeight: 700,
                  letterSpacing: 2,
                  textTransform: "uppercase",
                  color: "#fff",
                  background: content.badgeColor,
                  padding: "6px 18px",
                  borderRadius: 20,
                }}
              >
                {content.badge}
              </span>
              <span
                style={{
                  fontFamily: FONT_DISPLAY,
                  fontSize: 16,
                  fontWeight: 700,
                  letterSpacing: 3,
                  textTransform: "uppercase",
                  color: accent,
                }}
              >
                {synaName}
              </span>
            </div>

            {/* Center: title + subtitle */}
            <div style={{ textAlign: "center", padding: "16px 0" }}>
              <h2
                style={{
                  fontFamily: FONT_DISPLAY,
                  fontSize: 42,
                  fontWeight: 900,
                  color: NAVY,
                  margin: 0,
                  lineHeight: 1.2,
                }}
              >
                {content.title}
              </h2>
              {content.subtitle && (
                <p
                  style={{
                    fontFamily: FONT_BODY,
                    fontSize: 22,
                    color: accent,
                    margin: "8px 0 0",
                    fontWeight: 600,
                  }}
                >
                  {content.subtitle}
                </p>
              )}
            </div>

            {/* Bottom: details row */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 40, flexWrap: "wrap" }}>
              {content.details.map((d, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontFamily: FONT_BODY,
                    fontSize: 20,
                    color: ANTHRACITE,
                  }}
                >
                  <span style={{ fontSize: 22, color: GREY_MED }}>{d.icon}</span>
                  <span>{d.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right accent strip */}
          <div
            style={{
              width: 8,
              background: content.actionColor,
              flexShrink: 0,
            }}
          />
        </div>
      </div>
    );
  }
);

TicketPosterTemplate.displayName = "TicketPosterTemplate";
export default TicketPosterTemplate;
export type { TicketContent };
