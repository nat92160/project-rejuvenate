import { CITIES } from "@/lib/cities";
import { useCity } from "@/hooks/useCity";

const CitySelector = () => {
  const { cityKey, setCityKey, geolocate, isGeolocating } = useCity();

  const grouped = Object.entries(CITIES).reduce((acc, [key, city]) => {
    const group = city.country === "FR" ? "🇫🇷 France"
      : city.country === "IL" ? "🇮🇱 Israël"
      : city.country === "US" ? "🇺🇸 États-Unis"
      : "🌍 Autres";
    if (!acc[group]) acc[group] = [];
    acc[group].push({ key, name: city.name });
    return acc;
  }, {} as Record<string, { key: string; name: string }[]>);

  return (
    <div className="flex justify-center items-center gap-2.5 mb-4 flex-wrap mx-4">
      <label className="text-xs font-medium" style={{ color: "#D4AF37" }}>📍 Ville :</label>
      <select
        value={cityKey}
        onChange={(e) => setCityKey(e.target.value)}
        className="px-3 py-2 rounded-[10px] text-sm cursor-pointer min-w-[160px] transition-all duration-200"
        style={{
          border: "1px solid rgba(0,0,0,0.06)",
          background: "#FFFFFF",
          color: "#1E293B",
          fontFamily: "'Inter', sans-serif",
          boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
          appearance: "none",
          backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23D4AF37' d='M6 8L1 3h10z'/%3E%3C/svg%3E\")",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "right 10px center",
          paddingRight: "32px",
        }}
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
        className="px-3.5 py-2 rounded-[10px] text-xs font-medium transition-all duration-200 whitespace-nowrap disabled:opacity-50"
        style={{
          border: "1px solid rgba(0,0,0,0.06)",
          background: "#FFFFFF",
          color: "#B8860B",
          fontFamily: "'Inter', sans-serif",
          boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
        }}
      >
        {isGeolocating ? "⏳ Localisation..." : "📍 Me localiser"}
      </button>
    </div>
  );
};

export default CitySelector;
