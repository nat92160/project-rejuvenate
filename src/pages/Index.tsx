import { useState } from "react";
import HeroSection from "@/components/HeroSection";
import DateHeader from "@/components/DateHeader";
import CountdownWidget from "@/components/CountdownWidget";
import ShabbatWidget from "@/components/ShabbatWidget";
import ZmanimWidget from "@/components/ZmanimWidget";
import HolidaysWidget from "@/components/HolidaysWidget";
import HalakhaWidget from "@/components/HalakhaWidget";
import BottomNav from "@/components/BottomNav";

const Index = () => {
  const [showDashboard, setShowDashboard] = useState(false);

  if (!showDashboard) {
    return (
      <div className="min-h-screen">
        <HeroSection onContinue={() => setShowDashboard(true)} />
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      <DateHeader />
      <div className="max-w-lg mx-auto px-4 space-y-6">
        <CountdownWidget />
        <HalakhaWidget />
        <ShabbatWidget />
        <ZmanimWidget />
        <HolidaysWidget />
      </div>
      <BottomNav />
    </div>
  );
};

export default Index;
