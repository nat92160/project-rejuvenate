import { useState } from "react";

const HalakhicDisclaimer = () => {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex justify-end mb-1.5">
      <button
        onClick={() => setOpen(!open)}
        className="text-[10px] text-muted-foreground/70 hover:text-muted-foreground transition-colors flex items-center gap-1"
      >
        ⚠️ Horaires indicatifs
      </button>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-6"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-card border border-border rounded-xl p-4 max-w-xs shadow-lg text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-xs text-muted-foreground leading-relaxed">
              Les horaires sont donnés <strong className="text-foreground">à titre indicatif</strong>, sans engagement halakhique. En cas de doute, la responsabilité de l'allumage incombe à l'utilisateur. Consultez votre Rav.
            </p>
            <button
              onClick={() => setOpen(false)}
              className="mt-3 text-[11px] font-semibold text-primary"
            >
              Compris
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default HalakhicDisclaimer;
