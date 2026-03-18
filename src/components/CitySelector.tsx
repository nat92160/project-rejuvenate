import { CITIES } from "@/lib/cities";
import { useCity } from "@/hooks/useCity";

const CitySelector = () => {
  const { cityKey, setCityKey, geolocate, isGeolocating } = useCity();

  const grouped = Object.entries(CITIES).reduce((acc, [key, city]) => {
    const group = city.country === "FR" ? "🇫🇷 France" 
      : city.country === "IL" ? "🇮🇱 Israël"
      : city.country === "US" ? "🇺🇸 USA"
      : "🌍 Monde";
    if (!acc[group]) acc[group] = [];
    acc[group].push({ key, name: city.name });
    return acc;
  }, {} as Record<string, { key: string; name: string }[]>);

  return (
    <div className="flex items-center justify-center gap-3 flex-wrap">
      <span className="text-sm text-gold-dark font-medium">📍 Ville :</span>
      <select
        value={cityKey}
        onChange={(e) => setCityKey(e.target.value)}
        className="px-4 py-2 rounded-lg border border-border bg-card text-foreground text-sm font-sans cursor-pointer min-w-[160px] transition-all hover:border-gold focus:border-gold focus:outline-none"
        style={{ boxShadow: "var(--shadow-soft)" }}
      >
        {Object.entries(grouped).map(([group, cities]) => (
          <optgroup key={group} label={group}>
            {cities.map((c) => (
              <option key={c.key} value={c.key}>{c.name}</option>
            ))}
          </optgroup>
        ))}
      </select>
      <button
        onClick={geolocate}
        disabled={isGeolocating}
        className="px-4 py-2 rounded-lg border border-border bg-card text-gold-dark text-sm font-medium transition-all hover:border-gold disabled:opacity-50"
        style={{ boxShadow: "var(--shadow-soft)" }}
      >
        {isGeolocating ? "⏳ Localisation..." : "📍 Me localiser"}
      </button>
    </div>
  );
};

export default CitySelector;
