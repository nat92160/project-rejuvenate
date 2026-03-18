import StarOfDavid from "./StarOfDavid";

const AppHeader = () => {
  return (
    <div className="text-center py-4 px-5">
      <div className="flex items-center justify-center gap-2.5">
        <StarOfDavid size={32} />
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-foreground">
          Chabbat <span className="text-primary">Chalom</span>
        </h1>
      </div>
      <div className="font-hebrew text-sm mt-1 text-primary/50" style={{ direction: "rtl" }}>
        שבת שלום
      </div>
    </div>
  );
};

export default AppHeader;
