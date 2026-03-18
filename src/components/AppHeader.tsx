import StarOfDavid from "./StarOfDavid";

const AppHeader = () => {
  return (
    <div className="text-center py-3 px-5">
      <div className="flex items-center justify-center gap-2">
        <StarOfDavid size={34} />
        <h1 className="font-hebrew text-2xl font-bold" style={{ color: "#1E293B", letterSpacing: "0.5px" }}>
          Chabbat Chalom
        </h1>
      </div>
      <div className="font-hebrew text-sm mt-0.5" style={{ color: "#D4AF37", opacity: 0.5, direction: "rtl" }}>
        לוח השנה העברי
      </div>
    </div>
  );
};

export default AppHeader;
