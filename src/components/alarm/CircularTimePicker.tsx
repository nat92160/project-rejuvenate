import { useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";

interface Props {
  hours: number;
  minutes: number;
  onChange: (h: number, m: number) => void;
}

const CircularTimePicker = ({ hours, minutes, onChange }: Props) => {
  const [editing, setEditing] = useState<"h" | "m">("h");
  const svgRef = useRef<SVGSVGElement>(null);

  const size = 220;
  const cx = size / 2;
  const cy = size / 2;
  const radius = 85;

  const values = editing === "h" ? Array.from({ length: 24 }, (_, i) => i) : [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
  const current = editing === "h" ? hours : minutes;

  const angleForValue = (v: number) => {
    const total = editing === "h" ? 24 : 60;
    return (v / total) * 360 - 90;
  };

  const currentAngle = angleForValue(current);
  const handX = cx + radius * 0.65 * Math.cos((currentAngle * Math.PI) / 180);
  const handY = cy + radius * 0.65 * Math.sin((currentAngle * Math.PI) / 180);

  const handleInteraction = useCallback(
    (clientX: number, clientY: number) => {
      if (!svgRef.current) return;
      const rect = svgRef.current.getBoundingClientRect();
      const x = clientX - rect.left - cx;
      const y = clientY - rect.top - cy;
      let angle = Math.atan2(y, x) * (180 / Math.PI) + 90;
      if (angle < 0) angle += 360;

      if (editing === "h") {
        const h = Math.round((angle / 360) * 24) % 24;
        onChange(h, minutes);
      } else {
        const m = Math.round((angle / 360) * 60) % 60;
        // Snap to 5
        const snapped = Math.round(m / 5) * 5;
        onChange(hours, snapped % 60);
      }
    },
    [editing, hours, minutes, onChange, cx, cy],
  );

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    handleInteraction(e.clientX, e.clientY);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (e.buttons === 0) return;
    handleInteraction(e.clientX, e.clientY);
  };

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Digital display */}
      <div className="flex items-center gap-1 select-none">
        <button
          onClick={() => setEditing("h")}
          className={`text-4xl font-light tracking-wider transition-colors cursor-pointer ${
            editing === "h" ? "text-gold-DEFAULT" : "text-muted-foreground"
          }`}
        >
          {String(hours).padStart(2, "0")}
        </button>
        <span className="text-4xl font-light text-muted-foreground animate-pulse">:</span>
        <button
          onClick={() => setEditing("m")}
          className={`text-4xl font-light tracking-wider transition-colors cursor-pointer ${
            editing === "m" ? "text-gold-DEFAULT" : "text-muted-foreground"
          }`}
        >
          {String(minutes).padStart(2, "0")}
        </button>
      </div>

      {/* Circular dial */}
      <svg
        ref={svgRef}
        width={size}
        height={size}
        className="touch-none select-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
      >
        {/* Outer glow ring */}
        <defs>
          <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(38, 55%, 45%)" />
            <stop offset="50%" stopColor="hsl(40, 80%, 50%)" />
            <stop offset="100%" stopColor="hsl(40, 70%, 38%)" />
          </linearGradient>
          <filter id="glowFilter">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background circle */}
        <circle cx={cx} cy={cy} r={radius} fill="none" stroke="hsl(220, 16%, 90%)" strokeWidth="2" opacity="0.5" />

        {/* Active arc */}
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke="url(#goldGrad)"
          strokeWidth="3"
          strokeLinecap="round"
          filter="url(#glowFilter)"
          opacity="0.8"
        />

        {/* Number labels */}
        {values.map((v) => {
          const a = angleForValue(v);
          const lx = cx + (radius - 20) * Math.cos((a * Math.PI) / 180);
          const ly = cy + (radius - 20) * Math.sin((a * Math.PI) / 180);
          const isActive = v === current;
          // Only show subset of labels
          const show = editing === "h" ? v % 3 === 0 : true;
          if (!show) return null;
          return (
            <text
              key={v}
              x={lx}
              y={ly}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={isActive ? 14 : 11}
              fontWeight={isActive ? 700 : 400}
              fill={isActive ? "hsl(40, 80%, 50%)" : "hsl(220, 12%, 50%)"}
              className="transition-all pointer-events-none"
            >
              {editing === "m" ? String(v).padStart(2, "0") : v}
            </text>
          );
        })}

        {/* Hand */}
        <motion.line
          x1={cx}
          y1={cy}
          x2={handX}
          y2={handY}
          stroke="url(#goldGrad)"
          strokeWidth="2.5"
          strokeLinecap="round"
          filter="url(#glowFilter)"
          initial={false}
          animate={{ x2: handX, y2: handY }}
          transition={{ type: "spring", stiffness: 200, damping: 25 }}
        />

        {/* Center dot */}
        <circle cx={cx} cy={cy} r="4" fill="hsl(40, 80%, 50%)" />

        {/* Thumb */}
        <motion.circle
          cx={handX}
          cy={handY}
          r="10"
          fill="hsl(40, 80%, 50%)"
          fillOpacity="0.2"
          stroke="hsl(40, 80%, 50%)"
          strokeWidth="2"
          initial={false}
          animate={{ cx: handX, cy: handY }}
          transition={{ type: "spring", stiffness: 200, damping: 25 }}
        />
      </svg>

      <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
        {editing === "h" ? "Sélectionner l'heure" : "Sélectionner les minutes"}
      </p>
    </div>
  );
};

export default CircularTimePicker;
