import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Phone, MapPin, Navigation, Mail, Building2 } from "lucide-react";
import { useCity } from "@/hooks/useCity";

interface SynaInfo {
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  latitude: number | null;
  longitude: number | null;
}

interface Props {
  info: SynaInfo;
}

const SynaInfoCard = ({ info }: Props) => {
  const { city } = useCity();
  const [distance, setDistance] = useState<string | null>(null);
  const isGps = !!city._gps;

  useEffect(() => {
    if (!info.latitude || !info.longitude) return;
    const R = 6371;
    const dLat = ((info.latitude - city.lat) * Math.PI) / 180;
    const dLon = ((info.longitude - city.lng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((city.lat * Math.PI) / 180) *
        Math.cos((info.latitude * Math.PI) / 180) *
        Math.sin(dLon / 2) ** 2;
    const d = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    setDistance(d < 1 ? `${Math.round(d * 1000)} m` : `${d.toFixed(1)} km`);
  }, [city.lat, city.lng, info.latitude, info.longitude]);

  const mapsUrl = info.latitude && info.longitude
    ? `https://www.google.com/maps/dir/?api=1&destination=${info.latitude},${info.longitude}`
    : info.address
      ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(info.address)}`
      : null;

  const wazeUrl = info.latitude && info.longitude
    ? `https://waze.com/ul?ll=${info.latitude},${info.longitude}&navigate=yes`
    : null;

  if (!info.name) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border bg-card overflow-hidden"
      style={{ boxShadow: "0 8px 30px -12px hsl(var(--gold) / 0.15)" }}
    >
      {/* Header */}
      <div
        className="px-5 py-4"
        style={{ background: "linear-gradient(135deg, hsl(var(--gold) / 0.1), hsl(var(--gold) / 0.03))" }}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <Building2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-display text-base font-bold text-foreground leading-tight">{info.name}</h3>
            {distance && (
              <p className="mt-0.5 text-[11px] font-semibold" style={{ color: "hsl(var(--gold-matte))" }}>
                📍 Vous êtes à {!isGps ? "≈ " : ""}{distance}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="px-5 py-4 space-y-3">
        {/* Address */}
        {info.address && (
          <div className="flex items-start gap-3">
            <MapPin className="h-5 w-5 shrink-0 mt-0.5 text-primary/60" />
            <p className="text-sm text-foreground leading-relaxed">{info.address}</p>
          </div>
        )}

        {/* Phone — big and tappable */}
        {info.phone && (
          <a
            href={`tel:${info.phone.replace(/\s/g, "")}`}
            className="flex items-center gap-3 rounded-xl border border-border bg-muted/40 px-4 py-3 no-underline transition-all active:scale-[0.98] hover:bg-muted"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-500/15">
              <Phone className="h-5 w-5 text-green-600" />
            </div>
            <span className="text-lg font-bold text-foreground tracking-wide">{info.phone}</span>
          </a>
        )}

        {/* Email */}
        {info.email && (
          <a
            href={`mailto:${info.email}`}
            className="flex items-center gap-3 rounded-xl border border-border bg-muted/40 px-4 py-2.5 no-underline transition-all active:scale-[0.98] hover:bg-muted"
          >
            <Mail className="h-5 w-5 shrink-0 text-primary/60" />
            <span className="text-sm text-foreground">{info.email}</span>
          </a>
        )}
      </div>

      {/* Actions */}
      {(mapsUrl || wazeUrl) && (
        <div className="flex gap-2 border-t border-border px-5 py-3">
          {mapsUrl && (
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-card py-2.5 text-xs font-bold text-foreground no-underline transition-all hover:bg-muted active:scale-95"
            >
              <Navigation className="h-4 w-4 text-blue-500" />
              Google Maps
            </a>
          )}
          {wazeUrl && (
            <a
              href={wazeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-card py-2.5 text-xs font-bold text-foreground no-underline transition-all hover:bg-muted active:scale-95"
            >
              <Navigation className="h-4 w-4 text-cyan-500" />
              Waze
            </a>
          )}
        </div>
      )}
    </motion.div>
  );
};

export default SynaInfoCard;
