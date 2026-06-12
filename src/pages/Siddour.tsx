import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useSiddourFullOffice } from "@/hooks/useSiddourFullOffice";
import { detectOfficeNow, getOfficeMeta } from "@/lib/siddourCatalog";
import SiddourCleanReader from "@/components/siddour/SiddourCleanReader";

interface OfficeCard {
  key: string;
  label: string;
  icon: string;
  he: string;
  desc: string;
}
interface OfficeGroup {
  id: string;
  label: string;
  subtitle: string;
  offices: OfficeCard[];
}

const GROUPS: OfficeGroup[] = [
  {
    id: "daily",
    label: "Office quotidien",
    subtitle: "Les trois prières du jour",
    offices: [
      { key: "shacharit", label: "Cha'harit", he: "שחרית", icon: "🌅", desc: "Prière du matin" },
      { key: "minha",     label: "Min'ha",    he: "מנחה",   icon: "☀️", desc: "Prière de l'après-midi" },
      { key: "arvit",     label: "Arvit",     he: "ערבית",  icon: "🌙", desc: "Prière du soir" },
    ],
  },
  {
    id: "brakhot",
    label: "Brakhot & Bénédictions",
    subtitle: "Repas, vie quotidienne et événements",
    offices: [
      { key: "birkat",          label: "Birkat HaMazone", he: "ברכת המזון", icon: "🍞", desc: "Bénédiction après le repas" },
      { key: "berakhot",        label: "Brakhot",          he: "ברכות",       icon: "🙏", desc: "Mariage, Brit, Pidyon, Téfilat HaDérèkh" },
      { key: "birkat_halevana", label: "Birkat HaLévana",  he: "ברכת הלבנה",  icon: "🌕", desc: "Bénédiction de la lune" },
      { key: "tikoun_hatsot",   label: "Tikoun 'Hatsot",   he: "תיקון חצות",  icon: "🌑", desc: "Prière de minuit" },
    ],
  },
  {
    id: "fetes",
    label: "Fêtes & jours spéciaux",
    subtitle: "Roch 'Hodech, Chaloch Régalim, 'Hanouka, Pourim…",
    offices: [
      { key: "rosh_hodesh", label: "Roch 'Hodech",      he: "ראש חודש", icon: "🌙", desc: "Nouveau mois — Hallel & Moussaf" },
      { key: "fetes",       label: "Chaloch Régalim",   he: "שלוש רגלים", icon: "🎺", desc: "Pessa'h, Chavouot, Soukot" },
      { key: "hanukkah",    label: "'Hanouka",          he: "חנוכה",    icon: "🕎", desc: "Allumage de la Ménora & Hallel" },
      { key: "purim",       label: "Pourim",            he: "פורים",    icon: "🎭", desc: "Méguila & Séder du jour" },
      { key: "taanit",      label: "Jeûnes & Deuil",    he: "תענית",    icon: "🕊️", desc: "Sélihot & lois de deuil" },
      { key: "nissan",      label: "Birkat HaIlanot",   he: "ברכת האילנות", icon: "🌸", desc: "Bénédiction des arbres — Nissan" },
    ],
  },
];

const Siddour = () => {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const officeParam = params.get("office");

  const [openOffice, setOpenOffice] = useState<string | null>(
    officeParam && officeParam !== "sommaire" ? officeParam : null
  );

  // Auto-detect office only if no param
  const suggested = useMemo(() => detectOfficeNow(), []);

  // Sync URL with open office
  useEffect(() => {
    if (openOffice) {
      setParams({ office: openOffice }, { replace: true });
    } else if (officeParam) {
      setParams({}, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openOffice]);

  // Always load séfarade
  const { data, loading, error } = useSiddourFullOffice("sefarade", openOffice ?? "shacharit");
  const sections = openOffice ? (data?.sections || []) : [];

  const openMeta = openOffice ? getOfficeMeta(openOffice) : null;

  return (
    <div
      className="min-h-[100dvh]"
      style={{
        background: "linear-gradient(180deg, #FEFCF7 0%, #FBF7EE 60%, #F6EFDE 100%)",
        color: "hsl(25 30% 18%)",
        WebkitTapHighlightColor: "transparent",
      }}
    >
      {/* Header */}
      <header
        className="sticky top-0 z-20 backdrop-blur border-b"
        style={{
          paddingTop: "env(safe-area-inset-top, 0px)",
          background: "rgba(254, 252, 247, 0.94)",
          borderColor: "hsl(var(--gold) / 0.25)",
        }}
      >
        <div className="flex items-center gap-2 px-3 py-2.5 max-w-3xl mx-auto">
          <button
            onClick={() => navigate("/", { replace: true })}
            aria-label="Retour à l'accueil"
            className="p-2.5 rounded-lg hover:bg-black/5 active:scale-95 transition shrink-0"
            style={{ minWidth: 44, minHeight: 44 }}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0 text-center">
            <h1 className="font-display font-bold text-base sm:text-lg" style={{ color: "hsl(var(--primary))" }}>
              📖 Siddour Séfarade
            </h1>
            <p className="text-[11px] sm:text-xs" style={{ color: "hsl(var(--gold-matte))", fontWeight: 600 }}>
              Édot HaMizra'h
            </p>
          </div>
          <div style={{ minWidth: 44 }} />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-10 pb-32">
        {/* Hero */}
        <section className="text-center mb-10">
          <h2
            dir="rtl"
            className="font-bold"
            style={{
              fontFamily: "'Frank Ruhl Libre', 'Noto Serif Hebrew', serif",
              fontSize: "clamp(34px, 8vw, 52px)",
              color: "hsl(var(--primary))",
              lineHeight: 1.1,
              letterSpacing: "0.02em",
            }}
          >
            סדור עדות המזרח
          </h2>
          <p className="mt-3 text-sm sm:text-base text-muted-foreground max-w-md mx-auto">
            Sélectionnez un office pour ouvrir le livre des prières en hébreu, avec un découpage section par section.
          </p>

          {/* Suggested office */}
          {!openOffice && (() => {
            const sug = getOfficeMeta(suggested);
            if (!sug) return null;
            return (
              <button
                onClick={() => setOpenOffice(suggested)}
                className="mt-6 inline-flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-bold text-primary-foreground active:scale-[0.98] transition"
                style={{ background: "var(--gradient-gold)", boxShadow: "var(--shadow-gold)" }}
              >
                <span className="text-base">{sug.icon}</span>
                Ouvrir maintenant — {sug.label}
              </button>
            );
          })()}
        </section>

        {/* Groups */}
        {GROUPS.map((group) => (
          <section key={group.id} className="mb-10">
            <div className="mb-4 px-1">
              <h3 className="font-display text-base sm:text-lg font-bold" style={{ color: "hsl(var(--primary))" }}>
                {group.label}
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground">{group.subtitle}</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {group.offices.map((o) => {
                const isSuggested = o.key === suggested;
                return (
                  <button
                    key={o.key}
                    onClick={() => setOpenOffice(o.key)}
                    className="group relative text-left p-4 rounded-2xl border transition active:scale-[0.98] hover:shadow-md"
                    style={{
                      background: "white",
                      borderColor: isSuggested ? "hsl(var(--gold) / 0.55)" : "hsl(var(--gold) / 0.18)",
                      boxShadow: isSuggested
                        ? "0 6px 24px -8px hsl(var(--gold) / 0.35)"
                        : "0 1px 2px hsl(var(--foreground) / 0.04)",
                      minHeight: 88,
                    }}
                  >
                    {isSuggested && (
                      <span
                        className="absolute -top-2 right-3 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide text-primary-foreground"
                        style={{ background: "var(--gradient-gold)" }}
                      >
                        Maintenant
                      </span>
                    )}
                    <div className="flex items-start gap-3">
                      <div
                        className="shrink-0 w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                        style={{
                          background: "hsl(var(--gold) / 0.10)",
                        }}
                      >
                        {o.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between gap-2">
                          <span
                            className="font-display font-bold text-base"
                            style={{ color: "hsl(var(--primary))" }}
                          >
                            {o.label}
                          </span>
                          <span
                            dir="rtl"
                            className="text-sm font-semibold shrink-0"
                            style={{
                              fontFamily: "'Frank Ruhl Libre', 'Noto Serif Hebrew', serif",
                              color: "hsl(var(--gold-matte))",
                            }}
                          >
                            {o.he}
                          </span>
                        </div>
                        <p className="text-xs sm:text-[13px] text-muted-foreground mt-0.5 leading-snug">
                          {o.desc}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        ))}

        <p className="text-center text-[11px] text-muted-foreground mt-6">
          Texte hébreu : Siddour Édot HaMizra'h (Sefaria) — version étude.
        </p>
      </main>

      {/* Full-screen reader */}
      <SiddourCleanReader
        open={!!openOffice}
        onClose={() => setOpenOffice(null)}
        office={openOffice ?? ""}
        officeLabel={openMeta?.label || ""}
        officeIcon={openMeta?.icon || "📖"}
        sections={sections}
        loading={loading}
        error={error}
      />
    </div>
  );
};

export default Siddour;
