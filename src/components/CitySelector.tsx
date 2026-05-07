import { useCity } from "@/hooks/useCity";
import { CITIES } from "@/lib/cities";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const CitySelector = () => {
  const { geolocate, isGeolocating, city, cityKey, setCityKey, locationError } = useCity();

  const sortedCities = Object.entries(CITIES).sort(([, a], [, b]) => a.name.localeCompare(b.name));

  return (
    <div className="mx-4 mb-5 flex flex-col items-center gap-1.5">
      <div className="flex items-center justify-center gap-2.5">
        <span className="max-w-[180px] truncate text-xs font-semibold text-muted-foreground">{city.name}</span>
        <button
          onClick={geolocate}
          disabled={isGeolocating}
          className="rounded-xl border-none px-4 py-2.5 text-xs font-bold text-primary-foreground transition-all duration-200 whitespace-nowrap disabled:opacity-50 cursor-pointer active:scale-95"
          style={{ background: "var(--gradient-gold)", boxShadow: "var(--shadow-gold)" }}
        >
          {isGeolocating ? "⏳ Localisation..." : city._gps ? "📍 Actualiser" : "📍 Me localiser"}
        </button>
      </div>

      <Select value={cityKey === "__gps__" ? "" : cityKey} onValueChange={setCityKey}>
        <SelectTrigger className="h-9 w-[220px] text-xs rounded-xl">
          <SelectValue placeholder="🏙️ Choisir une ville manuellement" />
        </SelectTrigger>
        <SelectContent className="max-h-[300px]">
          {sortedCities.map(([key, c]) => (
            <SelectItem key={key} value={key} className="text-xs">
              {c.name} <span className="text-muted-foreground">· {c.country}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {city._gps && city.accuracyMeters ? (
        <p className="text-center text-[11px] text-muted-foreground">
          Position GPS active · précision ±{city.accuracyMeters} m
        </p>
      ) : null}

      {locationError ? <p className="text-center text-[11px] text-destructive">{locationError}</p> : null}
    </div>
  );
};

export default CitySelector;
