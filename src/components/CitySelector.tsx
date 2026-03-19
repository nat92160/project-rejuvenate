import { useCity } from "@/hooks/useCity";

const CitySelector = () => {
  const { geolocate, isGeolocating, city } = useCity();

  return (
    <div className="flex justify-center items-center gap-2.5 mb-5 mx-4">
      <span className="text-xs font-semibold text-muted-foreground truncate max-w-[180px]">📍 {city.name}</span>
      <button
        onClick={geolocate}
        disabled={isGeolocating}
        className="px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 whitespace-nowrap disabled:opacity-50 text-primary-foreground border-none cursor-pointer active:scale-95"
        style={{ background: "var(--gradient-gold)", boxShadow: "var(--shadow-gold)" }}
      >
        {isGeolocating ? "⏳ Localisation..." : "📍 Me localiser"}
      </button>
    </div>
  );
};

export default CitySelector;
