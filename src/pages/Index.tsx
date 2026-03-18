import { useState } from "react";
import { CityProvider } from "@/hooks/useCity";
import HeroSection from "@/components/HeroSection";
import AppHeader from "@/components/AppHeader";
import DateHeader from "@/components/DateHeader";
import InfoCarousel from "@/components/InfoCarousel";
import CitySelector from "@/components/CitySelector";
import CountdownWidget from "@/components/CountdownWidget";
import ShabbatWidget from "@/components/ShabbatWidget";
import ZmanimWidget from "@/components/ZmanimWidget";
import HolidaysWidget from "@/components/HolidaysWidget";
import ParashaSearchWidget from "@/components/ParashaSearchWidget";
import BottomNav from "@/components/BottomNav";

const Index = () => {
  const [showDashboard, setShowDashboard] = useState(false);
  const [activeTab, setActiveTab] = useState("chabbat");

  const renderTabContent = () => {
    switch (activeTab) {
      case "chabbat":
        return (
          <>
            <CountdownWidget />
            <ShabbatWidget />
            <ZmanimWidget />
            <HolidaysWidget />
            <ParashaSearchWidget />
          </>
        );
      case "zmanim":
        return <ZmanimWidget />;
      case "synagogue":
        return (
          <div className="rounded-3xl bg-white p-6 mb-4 text-center"
            style={{ border: "1px solid rgba(0,0,0,0.06)", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
            <span className="text-4xl">🏛️</span>
            <h3 className="font-hebrew text-lg font-semibold mt-3" style={{ color: "#1E293B" }}>Ma Synagogue</h3>
            <p className="text-sm mt-2" style={{ color: "#94A3B8" }}>Connectez-vous pour gérer votre synagogue</p>
            <button className="mt-4 px-6 py-3 rounded-xl text-sm font-semibold text-white border-none cursor-pointer"
              style={{ background: "linear-gradient(135deg, #B8860B, #D4AF37)" }}>
              🔑 Se connecter
            </button>
          </div>
        );
      case "carte":
        return (
          <div className="rounded-3xl bg-white p-6 mb-4 text-center"
            style={{ border: "1px solid rgba(0,0,0,0.06)", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
            <span className="text-4xl">🗺️</span>
            <h3 className="font-hebrew text-lg font-semibold mt-3" style={{ color: "#1E293B" }}>Carte des synagogues</h3>
            <p className="text-sm mt-2" style={{ color: "#94A3B8" }}>Bientôt disponible</p>
          </div>
        );
      case "fetes":
        return <HolidaysWidget />;
      case "convertisseur":
        return (
          <div className="rounded-3xl bg-white p-6 mb-4 text-center"
            style={{ border: "1px solid rgba(0,0,0,0.06)", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
            <span className="text-4xl">🔄</span>
            <h3 className="font-hebrew text-lg font-semibold mt-3" style={{ color: "#1E293B" }}>Convertisseur de dates</h3>
            <p className="text-sm mt-2" style={{ color: "#94A3B8" }}>Bientôt disponible</p>
          </div>
        );
      default:
        return (
          <div className="rounded-3xl bg-white p-6 mb-4 text-center"
            style={{ border: "1px solid rgba(0,0,0,0.06)", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
            <span className="text-4xl">🔜</span>
            <h3 className="font-hebrew text-lg font-semibold mt-3" style={{ color: "#1E293B" }}>
              {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
            </h3>
            <p className="text-sm mt-2" style={{ color: "#94A3B8" }}>Bientôt disponible</p>
          </div>
        );
    }
  };

  return (
    <CityProvider>
      {!showDashboard ? (
        <HeroSection onContinue={() => setShowDashboard(true)} />
      ) : (
        <div className="relative min-h-screen" style={{ background: "linear-gradient(180deg, #F8FAFC 0%, #EFF6FF 50%, #F8FAFC 100%)" }}>
          <div className="max-w-[1200px] mx-auto px-5 pb-24">
            {/* Auth bar */}
            <div className="flex justify-end py-2">
              <button
                className="px-4 py-2 rounded-full text-sm font-semibold cursor-pointer transition-all"
                style={{
                  background: "linear-gradient(135deg, #B8860B, #D4AF37)",
                  color: "#fff",
                  border: "none",
                  boxShadow: "0 2px 8px rgba(212,175,55,0.3)",
                }}
              >
                🔑 Connexion
              </button>
            </div>

            <AppHeader />
            <DateHeader />
            <InfoCarousel />
            <CitySelector />

            {renderTabContent()}

            {/* Footer */}
            <div className="text-center py-5 mt-6 text-xs" style={{ color: "#94A3B8", borderTop: "1px solid rgba(212, 168, 67, 0.1)" }}>
              Chabbat Chalom © {new Date().getFullYear()} — <a href="https://www.chabbat-chalom.com" style={{ color: "#D4AF37", textDecoration: "none", fontWeight: 500 }}>chabbat-chalom.com</a>
            </div>
          </div>

          <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
        </div>
      )}
    </CityProvider>
  );
};

export default Index;
