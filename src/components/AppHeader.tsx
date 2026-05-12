import StarOfDavid from "./StarOfDavid";

const AppHeader = ({ onLogoClick }: { onLogoClick?: () => void }) => {
  return (
    <div className="text-center py-4 px-5">
      <button
        onClick={onLogoClick}
        className="inline-flex items-center justify-center gap-2.5 bg-transparent border-none cursor-pointer p-2 -m-2 min-h-[44px] active:scale-95 transition-transform"
      >
        <StarOfDavid size={32} />
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-foreground">
          Chabbat <span className="text-primary">Chalom</span>
        </h1>
      </button>
      <div className="font-hebrew text-sm mt-1 text-primary/50" style={{ direction: "rtl" }}>
        שבת שלום
      </div>
    </div>
  );
};

export default AppHeader;
