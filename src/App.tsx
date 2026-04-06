import { lazy, Suspense, useEffect, useRef } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { useServiceWorkerUpdate } from "@/hooks/useServiceWorkerUpdate";
import { supabase } from "@/integrations/supabase/client";
import { isNativePlatform, registerNativePush, requestNativePushPermission } from "@/lib/capacitorPush";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import MinyanJoin from "./pages/MinyanJoin.tsx";
import TehilimJoin from "./pages/TehilimJoin.tsx";
import AdminDashboard from "./pages/AdminDashboard.tsx";
import Install from "./pages/Install.tsx";

const OmerLanding = lazy(() => import("./pages/OmerLanding.tsx"));
const DonationPage = lazy(() => import("./pages/DonationPage.tsx"));
const ZoomCallback = lazy(() => import("./pages/ZoomCallback.tsx"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy.tsx"));
const TermsOfService = lazy(() => import("./pages/TermsOfService.tsx"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2, // 2 minutes before data is considered stale
      gcTime: 1000 * 60 * 10,   // 10 minutes garbage collection
      refetchOnWindowFocus: true, // Re-fetch when user returns to tab
      retry: 2,
    },
  },
});

function AppInner() {
  useServiceWorkerUpdate();

  const { user, loading } = useAuth();
  const nativePushBootstrappedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isNativePlatform() || loading || !user) return;
    if (nativePushBootstrappedRef.current === user.id) return;

    nativePushBootstrappedRef.current = user.id;

    const bootstrapNativePush = async () => {
      try {
        console.log("[App] Native platform detected, requesting push permission...");
        const granted = await requestNativePushPermission();
        console.log("[App] Native push permission granted:", granted);
        if (!granted) return;

        console.log("[App] Registering native push token at app startup...");
        const deviceToken = await registerNativePush();
        if (!deviceToken) return;

        const { error } = await supabase.from("push_subscriptions").upsert(
          {
            user_id: user.id,
            synagogue_id: null,
            push_type: "native",
            device_token: deviceToken,
            endpoint: null,
            p256dh: null,
            auth: null,
          } as never,
          { onConflict: "user_id,synagogue_id,push_type" }
        );

        if (error) {
          console.error("[App] Failed to save native push token:", error);
          nativePushBootstrappedRef.current = null;
          return;
        }

        console.log("[App] Native push token saved successfully.");
      } catch (error) {
        console.error("[App] Native push bootstrap failed:", error);
        nativePushBootstrappedRef.current = null;
      }
    };

    void bootstrapNativePush();
  }, [loading, user]);

  return (
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/minyan/:id" element={<MinyanJoin />} />
          <Route path="/tehilim/:id" element={<TehilimJoin />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/install" element={<Install />} />
          <Route path="/omer" element={<Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" /></div>}><OmerLanding /></Suspense>} />
          <Route path="/don/:slug" element={<Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" /></div>}><DonationPage /></Suspense>} />
          <Route path="/zoom-callback" element={<Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" /></div>}><ZoomCallback /></Suspense>} />
          <Route path="/privacy" element={<Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" /></div>}><PrivacyPolicy /></Suspense>} />
          <Route path="/terms" element={<Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" /></div>}><TermsOfService /></Suspense>} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
