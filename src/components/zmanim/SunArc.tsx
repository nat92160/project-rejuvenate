import { useMemo } from "react";
import type { ZmanItem } from "@/lib/hebcal";

interface SunArcProps {
  zmanim: ZmanItem[];
  isToday: boolean;
}

function timeToMinutes(time: string): number | null {
  if (!time || time === "--:--") return null;
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

const SunArc = ({ zmanim, isToday }: SunArcProps) => {
  const { sunriseMin, sunsetMin, nowMin, progress } = useMemo(() => {
    const sunrise = zmanim.find(z => z.label.includes("Nets"));
    const sunset = zmanim.find(z => z.label.includes("Chkia"));
    const sr = timeToMinutes(sunrise?.time || "");
    const ss = timeToMinutes(sunset?.time || "");
    const now = new Date();
    const nMin = now.getHours() * 60 + now.getMinutes();

    if (!sr || !ss || sr >= ss) return { sunriseMin: 0, sunsetMin: 0, nowMin: 0, progress: 0.5 };

    let prog = (nMin - sr) / (ss - sr);
    prog = Math.max(-0.15, Math.min(1.15, prog));

    return { sunriseMin: sr, sunsetMin: ss, nowMin: nMin, progress: prog };
  }, [zmanim]);

  // SVG arc path
  const width = 300;
  const height = 90;
  const padX = 30;
  const arcStartX = padX;
  const arcEndX = width - padX;
  const arcWidth = arcEndX - arcStartX;
  const arcTopY = 15;
  const arcBottomY = height - 15;

  // Parabolic arc: y = arcBottomY - (arcBottomY - arcTopY) * 4 * t * (1-t)
  const getArcPoint = (t: number) => {
    const clampedT = Math.max(0, Math.min(1, t));
    const x = arcStartX + clampedT * arcWidth;
    const y = arcBottomY - (arcBottomY - arcTopY) * 4 * clampedT * (1 - clampedT);
    return { x, y };
  };

  // Build arc path
  const pathPoints = Array.from({ length: 50 }, (_, i) => {
    const t = i / 49;
    const pt = getArcPoint(t);
    return `${i === 0 ? "M" : "L"} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`;
  }).join(" ");

  const sunPos = getArcPoint(progress);
  const isNight = !isToday || progress < 0 || progress > 1;
  const isDusk = isToday && (progress > 0.85 || progress < 0.05);

  // Colors based on time of day
  const skyGradientId = "skyGrad";
  let skyColor1 = "hsl(210 60% 85%)"; // day blue
  let skyColor2 = "hsl(45 80% 92%)"; // warm
  let sunColor = "hsl(45 95% 55%)";
  let sunGlow = "hsl(45 95% 70%)";

  if (isNight) {
    skyColor1 = "hsl(230 30% 20%)";
    skyColor2 = "hsl(250 25% 30%)";
    sunColor = "hsl(220 30% 60%)";
    sunGlow = "hsl(220 30% 45%)";
  } else if (isDusk) {
    skyColor1 = "hsl(25 70% 75%)";
    skyColor2 = "hsl(280 30% 60%)";
    sunColor = "hsl(30 90% 55%)";
    sunGlow = "hsl(30 80% 65%)";
  }

  const fmtHM = (min: number) => {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  };

  return (
    <div className="relative w-full mb-2 overflow-hidden rounded-xl" style={{ background: `linear-gradient(180deg, ${skyColor1}, ${skyColor2})` }}>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ height: "auto", maxHeight: 90 }}>
        <defs>
          <radialGradient id="sunGlowGrad">
            <stop offset="0%" stopColor={sunGlow} stopOpacity="0.6" />
            <stop offset="100%" stopColor={sunGlow} stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Horizon line */}
        <line x1={arcStartX} y1={arcBottomY} x2={arcEndX} y2={arcBottomY} stroke="hsl(0 0% 100% / 0.25)" strokeWidth="1" strokeDasharray="4 3" />

        {/* Arc path */}
        <path d={pathPoints} fill="none" stroke="hsl(0 0% 100% / 0.3)" strokeWidth="1.5" strokeDasharray="3 4" />

        {/* Sun glow */}
        {isToday && (
          <circle cx={sunPos.x} cy={sunPos.y} r={20} fill="url(#sunGlowGrad)" />
        )}

        {/* Sun */}
        <circle cx={sunPos.x} cy={sunPos.y} r={isNight ? 6 : 8} fill={sunColor} opacity={isToday ? 1 : 0.4}>
          {isToday && !isNight && (
            <animate attributeName="r" values="7;9;7" dur="3s" repeatCount="indefinite" />
          )}
        </circle>

        {/* Sunrise label */}
        {sunriseMin > 0 && (
          <text x={arcStartX} y={arcBottomY + 12} fontSize="9" fill="hsl(0 0% 100% / 0.7)" textAnchor="start" fontWeight="600">
            🌅 {fmtHM(sunriseMin)}
          </text>
        )}

        {/* Sunset label */}
        {sunsetMin > 0 && (
          <text x={arcEndX} y={arcBottomY + 12} fontSize="9" fill="hsl(0 0% 100% / 0.7)" textAnchor="end" fontWeight="600">
            🌇 {fmtHM(sunsetMin)}
          </text>
        )}
      </svg>
    </div>
  );
};

export default SunArc;
