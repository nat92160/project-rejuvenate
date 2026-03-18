import { useState } from "react";
import { CityProvider } from "@/hooks/useCity";
import HeroSection from "@/components/HeroSection";
import DateHeader from "@/components/DateHeader";
import CitySelector from "@/components/CitySelector";
import CountdownWidget from "@/components/CountdownWidget";
import ShabbatWidget from "@/components/ShabbatWidget";
import ZmanimWidget from "@/components/ZmanimWidget";
import HolidaysWidget from "@/components/HolidaysWidget";
import HalakhaWidget from "@/components/HalakhaWidget";
import BottomNav from "@/components/BottomNav";

const Index = () => {
  const [showDashboard, setShowDashboard] = useState(false);

  return (
    <CityProvider>
      {!showDashboard ? (
        <div className="min-h-screen">
          <HeroSection onContinue={() => setShowDashboard(true)} />
          <BottomNav />
        </div>
      ) : (
        <div className="min-h-screen pb-20">
          <DateHeader />
          <div className="max-w-lg mx-auto px-4 space-y-6">
            <CitySelector />
            <CountdownWidget />
            <HalakhaWidget />
            <ShabbatWidget />
            <ZmanimWidget />
            <HolidaysWidget />
          </div>
          <BottomNav />
        </div>
      )}
    </CityProvider>
  );
};

export default Index;
