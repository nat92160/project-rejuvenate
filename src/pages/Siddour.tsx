import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, BookOpen, Minus, Plus, X } from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useSiddourRite } from "@/hooks/useSiddourRite";
import { useSiddourFullOffice } from "@/hooks/useSiddourFullOffice";
import { detectOfficeNow, getOfficeMeta } from "@/lib/siddourCatalog";
import SiddourBookSidebar from "@/components/siddour/SiddourBookSidebar";
import SiddourBookReader from "@/components/siddour/SiddourBookReader";
import LiturgicalContextBar from "@/components/siddour/LiturgicalContextBar";
import { getLiturgicalContext, type LiturgicalPeriod } from "@/lib/liturgicalContext";

const FONT_KEY = "siddour_book_font_v1";

const Siddour = () => {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { rite, setRite } = useSiddourRite();

  const officeParam = params.get("office");
  const initialOffice = (officeParam && officeParam !== "sommaire") ? officeParam : (detectOfficeNow() || "shacharit");
  const [office, setOffice] = useState(initialOffice);
  const [activeSection, setActiveSection] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [litContext, setLitContext] = useState<LiturgicalPeriod>(() => getLiturgicalContext());

  const [fontSize, setFontSize] = useState<number>(() => {
    try { return Number(localStorage.getItem(FONT_KEY)) || 22; } catch { return 22; }
  });
  useEffect(() => { try { localStorage.setItem(FONT_KEY, String(fontSize)); } catch { /* */ } }, [fontSize]);

  // Sync URL
  useEffect(() => {
    setParams({ office, rite }, { replace: true });
  }, [office, rite, setParams]);

  const { data, loading, error } = useSiddourFullOffice(rite, office);
  const sections = data?.sections || [];

  // Refs des sections pour scrollspy
  const sectionRefs = useRef<Map<number, HTMLElement>>(new Map());
  const registerSectionRef = useCallback((index: number, el: HTMLElement | null) => {
    if (el) sectionRefs.current.set(index, el);
    else sectionRefs.current.delete(index);
  }, []);

  // Scrollspy via IntersectionObserver
  useEffect(() => {
    if (sections.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter(e => e.isIntersecting)
          .sort((a, b) => (a.target as HTMLElement).offsetTop - (b.target as HTMLElement).offsetTop);
        if (visible.length > 0) {
          const id = (visible[0].target as HTMLElement).id;
          const idx = parseInt(id.replace("sec-", ""), 10);
          if (!isNaN(idx)) setActiveSection(idx);
        }
      },
      { rootMargin: "-30% 0px -60% 0px", threshold: 0 }
    );
    sectionRefs.current.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [sections]);

  const handleSelectOffice = useCallback((newOffice: string) => {
    if (newOffice === office) {
      // scroll back to top
      window.scrollTo({ top: 0, behavior: "smooth" });
      setDrawerOpen(false);
      return;
    }
    setOffice(newOffice);
    setActiveSection(0);
    setDrawerOpen(false);
    window.scrollTo({ top: 0 });
  }, [office]);

  const handleSelectSection = useCallback((idx: number) => {
    const el = sectionRefs.current.get(idx);
    if (el) {
      const y = el.getBoundingClientRect().top + window.scrollY - 80;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
    setDrawerOpen(false);
  }, []);

  const officeMeta = useMemo(() => getOfficeMeta(office), [office]);

  const sidebar = (
    <SiddourBookSidebar
      currentOffice={office}
      onSelectOffice={handleSelectOffice}
      sections={sections}
      activeSectionIndex={activeSection}
      onSelectSection={handleSelectSection}
    />
  );

  return (
    <div
      className="min-h-screen overflow-x-hidden"
      style={{
        background: "linear-gradient(180deg, hsl(38 70% 94%) 0%, hsl(38 65% 91%) 100%)",
        color: "hsl(25 30% 18%)",
        WebkitTapHighlightColor: "transparent",
        overscrollBehaviorY: "contain",
      }}
    >
      {/* Header sticky */}
      <header
        className="sticky top-0 z-30 backdrop-blur border-b"
        style={{
          paddingTop: "env(safe-area-inset-top, 0px)",
          background: "hsla(38, 70%, 94%, 0.92)",
          borderColor: "hsl(var(--gold) / 0.3)",
        }}
      >
        <div className="flex items-center gap-1.5 px-2 py-2 sm:px-6">
          <button
            onClick={() => {
              if (window.history.length > 1) {
                navigate(-1);
                // Fallback if navigate(-1) didn't actually change route (e.g. direct entry)
                setTimeout(() => {
                  if (window.location.pathname.startsWith("/siddour")) {
                    navigate("/", { replace: true });
                  }
                }, 150);
              } else {
                navigate("/", { replace: true });
              }
            }}
            aria-label="Retour"
            className="p-2.5 rounded-lg hover:bg-muted active:scale-95 transition shrink-0"
            style={{ minWidth: 44, minHeight: 44 }}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <button
            onClick={() => navigate("/", { replace: true })}
            className="flex items-center gap-1 px-2 py-1 rounded-lg active:scale-95 transition shrink-0"
            style={{ minHeight: 36 }}
            aria-label="Retour à l'accueil Chabbat Chalom"
          >
            <span
              className="font-display font-bold text-[13px] sm:text-sm whitespace-nowrap tracking-wide"
              style={{ color: "hsl(var(--primary))" }}
            >
              Chabbat Chalom
            </span>
          </button>

          <button
              onClick={() => setDrawerOpen(true)}
              className="lg:hidden p-2.5 rounded-lg hover:bg-muted active:scale-95 transition shrink-0"
              style={{ minWidth: 44, minHeight: 44 }}
              aria-label="Ouvrir le sommaire de l'office"
            >
              <BookOpen className="w-5 h-5" style={{ color: "hsl(var(--gold-matte))" }} />
          </button>

          <div className="flex-1 min-w-0">
            <h1 className="font-display font-bold text-sm sm:text-base truncate" style={{ color: "hsl(var(--primary))" }}>
              {`${officeMeta?.icon || ""} ${officeMeta?.label || "Siddour"}`}
            </h1>
            <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
              {sections[activeSection]?.title || "Livre des prières"}
            </p>
          </div>

          {/* Sélecteur de rite */}
          <div className="flex rounded-lg p-0.5 bg-muted text-[11px] font-semibold shrink-0">
            <button
              onClick={() => setRite("sefarade")}
              className="px-2.5 py-1.5 rounded-md transition-all"
              style={{ minHeight: 32, ...(rite === "sefarade" ? {
                background: "hsl(var(--background))",
                color: "hsl(var(--gold-matte))",
                boxShadow: "0 1px 3px hsl(var(--foreground) / 0.08)",
              } : { color: "hsl(var(--muted-foreground))" }) }}
            >
              Séf.
            </button>
            <button
              onClick={() => setRite("ashkenaz")}
              className="px-2.5 py-1.5 rounded-md transition-all"
              style={{ minHeight: 32, ...(rite === "ashkenaz" ? {
                background: "hsl(var(--background))",
                color: "hsl(var(--gold-matte))",
                boxShadow: "0 1px 3px hsl(var(--foreground) / 0.08)",
              } : { color: "hsl(var(--muted-foreground))" }) }}
            >
              Ashk.
            </button>
          </div>

          {/* Taille de police — visible aussi sur mobile pour réglage rapide */}
          <div className="flex items-center gap-0.5 ml-0.5 shrink-0">
            <button onClick={() => setFontSize(s => Math.max(16, s - 2))}
              className="p-2 rounded-md hover:bg-muted active:scale-95 transition"
              style={{ minWidth: 36, minHeight: 36 }}
              aria-label="Réduire police">
              <Minus className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => setFontSize(s => Math.min(36, s + 2))}
              className="p-2 rounded-md hover:bg-muted active:scale-95 transition"
              style={{ minWidth: 36, minHeight: 36 }}
              aria-label="Augmenter police">
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar desktop */}
        <aside className={`hidden lg:block w-72 shrink-0 border-r border-border/40 sticky top-[60px] self-start`}
          style={{ height: "calc(100vh - 60px - env(safe-area-inset-top, 0px))" }}>
          {sidebar}
        </aside>

        {/* Drawer mobile */}
        <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
          <SheetContent side="left" className="w-[300px] p-0 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
              <h2 className="font-display font-bold text-sm" style={{ color: "hsl(var(--primary))" }}>📖 Sommaire</h2>
              <button onClick={() => setDrawerOpen(false)} className="p-1 rounded-md hover:bg-muted">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div
              className="overflow-y-auto"
              style={{
                height: "calc(100dvh - 50px - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px))",
                WebkitOverflowScrolling: "touch",
              }}
            >
              {sidebar}
            </div>
          </SheetContent>
        </Sheet>

        {/* Main content */}
        <main className="flex-1 min-w-0">
          <div className="max-w-3xl mx-auto px-4 sm:px-8 py-4 sm:py-8">
            {/* Contexte liturgique du jour — scrolle avec la page pour libérer
                l'écran sur mobile (sinon le bandeau bloquait l'accès aux prières) */}
            <div className="mb-5">
              <LiturgicalContextBar context={litContext} onContextChange={setLitContext} />
            </div>
            {loading && sections.length === 0 ? (
              <div className="py-24 text-center">
                <div className="animate-spin w-8 h-8 border-2 border-t-transparent rounded-full mx-auto"
                  style={{ borderColor: "hsl(var(--gold)) transparent transparent transparent" }} />
                <p className="text-sm mt-4 text-muted-foreground">
                  Ouverture du livre… ({rite === "sefarade" ? "Édot HaMizrah" : "Nusach Ashkenaz"})
                </p>
              </div>
            ) : error ? (
              <div className="py-16 text-center">
                <p className="text-sm text-destructive">Erreur : {error}</p>
                <p className="text-xs mt-2 text-muted-foreground">
                  Cet office n'est peut-être pas encore disponible pour le rite {rite === "sefarade" ? "Séfarade" : "Ashkénaze"}.
                </p>
              </div>
            ) : (
              <SiddourBookReader
                sections={sections}
                fontSize={fontSize}
                registerSectionRef={registerSectionRef}
                rite={rite}
                office={office}
                litContext={litContext}
                onJumpToSection={handleSelectSection}
              />
            )}
          </div>
        </main>
      </div>

      {/* FAB mobile pour rouvrir le sommaire */}
      <button
          onClick={() => setDrawerOpen(true)}
          className="lg:hidden fixed right-5 z-30 w-14 h-14 rounded-full shadow-lg flex items-center justify-center active:scale-95 transition"
          style={{
            background: "hsl(var(--primary))",
            color: "hsl(var(--primary-foreground))",
            bottom: "calc(1.25rem + env(safe-area-inset-bottom, 0px))",
          }}
          aria-label="Sommaire du livre"
        >
          <BookOpen className="w-6 h-6" />
      </button>
    </div>
  );
};

export default Siddour;
