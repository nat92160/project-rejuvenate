import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useCity } from "@/hooks/useCity";

const JERUSALEM = { lat: 31.7683, lng: 35.2137 };

function calculateBearing(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const toDeg = (r: number) => (r * 180) / Math.PI;
  const dLng = toRad(lng2 - lng1);
  const y = Math.sin(dLng) * Math.cos(toRad(lat2));
  const x = Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) - Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLng);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

function getDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Low-pass filter to smooth compass readings and prevent jitter */
function smoothAngle(prev: number, next: number, factor: number): number {
  // Handle angle wrapping (0/360 boundary)
  let delta = next - prev;
  if (delta > 180) delta -= 360;
  if (delta < -180) delta += 360;
  return (prev + delta * factor + 360) % 360;
}

const MizrahCompass = () => {
  const { city } = useCity();
  const [deviceHeading, setDeviceHeading] = useState<number | null>(null);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const smoothedHeading = useRef<number | null>(null);

  const bearing = calculateBearing(city.lat, city.lng, JERUSALEM.lat, JERUSALEM.lng);
  const distance = Math.round(getDistanceKm(city.lat, city.lng, JERUSALEM.lat, JERUSALEM.lng));

  const requestPermission = async () => {
    try {
      if (typeof (DeviceOrientationEvent as any).requestPermission === "function") {
        const perm = await (DeviceOrientationEvent as any).requestPermission();
        if (perm === "granted") setPermissionGranted(true);
      } else {
        setPermissionGranted(true);
      }
    } catch {
      setPermissionGranted(true);
    }
  };

  useEffect(() => {
    if (!permissionGranted) return;
    const handler = (e: DeviceOrientationEvent) => {
      if (e.alpha === null) return;
      const raw = e.alpha;
      if (smoothedHeading.current === null) {
        smoothedHeading.current = raw;
      } else {
        // Low-pass filter: only take 15% of new value to smooth jitter
        smoothedHeading.current = smoothAngle(smoothedHeading.current, raw, 0.15);
      }
      setDeviceHeading(smoothedHeading.current);
    };
    window.addEventListener("deviceorientation", handler);
    return () => window.removeEventListener("deviceorientation", handler);
  }, [permissionGranted]);

  const needleRotation = deviceHeading !== null ? bearing - deviceHeading : bearing;

  return (
    <motion.div
      className="rounded-2xl bg-card p-6 mb-4 border border-border"
      style={{ boxShadow: "var(--shadow-card)" }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <h3 className="font-display text-base font-bold flex items-center gap-2 text-foreground">
        🧭 Mizra'h — Direction de Jérusalem
      </h3>
      <p className="text-xs mt-1 text-muted-foreground">
        Depuis {city.name} • {distance} km de Jérusalem
      </p>

      {/* Compass visual */}
      <div className="flex justify-center mt-6 mb-4">
        <div className="relative w-52 h-52">
          {/* Outer ring */}
          <div
            className="absolute inset-0 rounded-full border-2 border-border"
            style={{ background: "hsl(var(--muted))" }}
          />

          {/* Cardinal points */}
          {["N", "E", "S", "O"].map((dir, i) => (
            <div
              key={dir}
              className="absolute text-xs font-bold text-muted-foreground"
              style={{
                top: i === 0 ? "8px" : i === 2 ? "auto" : "50%",
                bottom: i === 2 ? "8px" : "auto",
                left: i === 3 ? "8px" : i === 1 ? "auto" : "50%",
                right: i === 1 ? "8px" : "auto",
                transform: i === 0 || i === 2 ? "translateX(-50%)" : "translateY(-50%)",
              }}
            >
              {dir}
            </div>
          ))}

          {/* Needle pointing to Jerusalem — use CSS transition for smooth movement */}
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{
              transform: `rotate(${needleRotation}deg)`,
              transition: "transform 0.3s ease-out",
            }}
          >
            <div className="relative h-full flex flex-col items-center">
              {/* Arrow */}
              <div
                className="w-0 h-0 mt-4"
                style={{
                  borderLeft: "10px solid transparent",
                  borderRight: "10px solid transparent",
                  borderBottom: "60px solid hsl(var(--gold))",
                  filter: "drop-shadow(0 2px 4px hsl(var(--gold) / 0.4))",
                }}
              />
              <div className="flex-1" />
              <div
                className="w-0 h-0 mb-4"
                style={{
                  borderLeft: "6px solid transparent",
                  borderRight: "6px solid transparent",
                  borderTop: "30px solid hsl(var(--muted-foreground) / 0.3)",
                }}
              />
            </div>
          </div>

          {/* Center dot */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-card"
            style={{ background: "hsl(var(--gold))" }} />
        </div>
      </div>

      <div className="text-center">
        <p className="text-sm font-bold text-foreground">{Math.round(bearing)}° depuis le Nord</p>
        {deviceHeading === null && (
          <button
            onClick={requestPermission}
            className="mt-3 px-5 py-2 rounded-xl text-xs font-bold text-primary-foreground border-none cursor-pointer transition-all hover:-translate-y-0.5 active:scale-95"
            style={{ background: "var(--gradient-gold)", boxShadow: "var(--shadow-gold)" }}
          >
            📱 Activer la boussole
          </button>
        )}
        {deviceHeading !== null && (
          <p className="text-xs text-muted-foreground mt-1">Boussole active — orientez votre appareil</p>
        )}
      </div>
    </motion.div>
  );
};

export default MizrahCompass;
