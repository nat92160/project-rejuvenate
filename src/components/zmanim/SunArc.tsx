import { useMemo, useEffect, useState } from "react";
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
  const [nowMin, setNowMin] = useState(() => {
    const n = new Date();
    return n.getHours() * 60 + n.getMinutes();
  });

  useEffect(() => {
    if (!isToday) return;
    const id = setInterval(() => {
      const n = new Date();
      setNowMin(n.getHours() * 60 + n.getMinutes());
    }, 30000);
    return () => clearInterval(id);
  }, [isToday]);

  const { sunriseMin, sunsetMin, progress } = useMemo(() => {
    const sunrise = zmanim.find(z => z.label.includes("HaNets") || z.label.includes("Nets"));
    const sunset = zmanim.find(z => z.label.includes("Chkia"));
    const sr = timeToMinutes(sunrise?.time || "");
    const ss = timeToMinutes(sunset?.time || "");

    if (!sr || !ss || sr >= ss) return { sunriseMin: 0, sunsetMin: 0, progress: 0.5 };

    let prog = isToday ? (nowMin - sr) / (ss - sr) : 0.5;
    prog = Math.max(-0.15, Math.min(1.15, prog));

    return { sunriseMin: sr, sunsetMin: ss, progress: prog };
  }, [zmanim, nowMin, isToday]);

  // SVG
  const width = 300;
  const height = 90;
  const padX = 30;
  const arcStartX = padX;
  const arcEndX = width - padX;
  const arcWidth = arcEndX - arcStartX;
  const arcTopY = 15;
  const arcBottomY = height - 15;

  const getArcPoint = (t: number) => {
    const ct = Math.max(0, Math.min(1, t));
    return {
      x: arcStartX + ct * arcWidth,
      y: arcBottomY - (arcBottomY - arcTopY) * 4 * ct * (1 - ct),
    };
  };

  const pathPoints = Array.from({ length: 50 }, (_, i) => {
    const t = i / 49;
    const pt = getArcPoint(t);
    return `${i === 0 ? "M" : "L"} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`;
  }).join(" ");

  const sunPos = getArcPoint(progress);
  const isNight = !isToday || progress < 0 || progress > 1;
  const isDusk = isToday && (progress > 0.85 || progress < 0.05);

  // Sky gradient — smooth transition blue → orange → violet
  let skyColor1: string, skyColor2: string, sunColor: string, sunGlow: string;

  if (isNight) {
    skyColor1 = "hsl(230 30% 18%)";
    skyColor2 = "hsl(250 25% 28%)";
    sunColor = "hsl(220 30% 60%)";
    sunGlow = "hsl(220 30% 45%)";
  } else if (isDusk) {
    skyColor1 = "hsl(25 70% 72%)";
    skyColor2 = "hsl(280 30% 55%)";
    sunColor = "hsl(30 90% 55%)";
    sunGlow = "hsl(30 80% 65%)";
  } else {
    skyColor1 = "hsl(210 60% 85%)";
    skyColor2 = "hsl(45 80% 92%)";
    sunColor = "hsl(45 95% 55%)";
    sunGlow = "hsl(45 95% 70%)";
  }

  const fmtHM = (min: number) => {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  };

  return (
    <div
      className="relative w-full mb-2 overflow-hidden rounded-t-2xl transition-all duration-1000"
      style={{ background: `linear-gradient(180deg, ${skyColor1}, ${skyColor2})` }}
    >
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
        {isToday && !isNight && (
          <circle cx={sunPos.x} cy={sunPos.y} r={22} fill="url(#sunGlowGrad)">
            <animate attributeName="r" values="20;24;20" dur="4s" repeatCount="indefinite" />
          </circle>
        )}

        {/* Sun dot */}
        <circle
          cx={sunPos.x}
          cy={sunPos.y}
          r={isNight ? 5 : 7}
          fill={sunColor}
          opacity={isToday ? 1 : 0.35}
          style={{ transition: "cx 1s ease, cy 1s ease" }}
        >
          {isToday && !isNight && (
            <animate attributeName="r" values="6;8;6" dur="3s" repeatCount="indefinite" />
          )}
        </circle>

        {/* Sunrise label */}
        {sunriseMin > 0 && (
          <text x={arcStartX} y={arcBottomY + 12} fontSize="9" fill="hsl(0 0% 100% / 0.8)" textAnchor="start" fontWeight="700" fontFamily="system-ui">
            🌅 {fmtHM(sunriseMin)}
          </text>
        )}

        {/* Sunset label */}
        {sunsetMin > 0 && (
          <text x={arcEndX} y={arcBottomY + 12} fontSize="9" fill="hsl(0 0% 100% / 0.8)" textAnchor="end" fontWeight="700" fontFamily="system-ui">
            🌇 {fmtHM(sunsetMin)}
          </text>
        )}
      </svg>
    </div>
  );
};

export default SunArc;
