import { lazy, Suspense, useEffect, useRef } from "react";
import { Capacitor } from "@capacitor/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { useServiceWorkerUpdate } from "@/hooks/useServiceWorkerUpdate";
import { supabase } from "@/integrations/supabase/client";
import { registerNativePush, requestNativePushPermission } from "@/lib/capacitorPush";
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
      staleTime: 1000 * 60 * 2,
      gcTime: 1000 * 60 * 10,
      refetchOnWindowFocus: true,
      retry: 2,
    },
  },
});

/**
 * Save the native push token to push_subscriptions.
 * Uses a raw SQL upsert via rpc to handle NULL synagogue_id correctly
 * (PostgreSQL NULL ≠ NULL in unique constraints).
 */
async function saveNativePushToken(userId: string, deviceToken: string) {
  // Use .insert() with manual conflict handling since NULL synagogue_id
  // doesn't work with onConflict. First try to find existing row.
  const { data: existing } = await supabase
    .from("push_subscriptions")
    .select("id")
    .eq("user_id", userId)
    .eq("push_type", "native")
    .is("synagogue_id", null)
    .maybeSingle();

  if (existing) {
    // Update existing row
    const { error } = await supabase
      .from("push_subscriptions")
      .update({ device_token: deviceToken } as never)
      .eq("id", existing.id);
    if (error) {
      console.error("[App] Failed to update native push token:", error);
      return false;
    }
  } else {
    // Insert new row
    const { error } = await supabase
      .from("push_subscriptions")
      .insert({
        user_id: userId,
        synagogue_id: null,
        push_type: "native",
        device_token: deviceToken,
        endpoint: null,
        p256dh: null,
        auth: null,
      } as never);
    if (error) {
      console.error("[App] Failed to insert native push token:", error);
      return false;
    }
  }
  return true;
}

function AppInner() {
  useServiceWorkerUpdate();

  const { user, loading } = useAuth();
  const permissionRequestedRef = useRef(false);
  const tokenSavedForUserRef = useRef<string | null>(null);
  const deviceTokenRef = useRef<string | null>(null);

  const isNative = Capacitor.isNativePlatform();

  // ─── STEP 1: Request push permission IMMEDIATELY on native, no auth needed ───
  useEffect(() => {
    if (!isNative) {
      console.log("[App] Not native platform, skipping push setup");
      return;
    }
    if (permissionRequestedRef.current) return;
    permissionRequestedRef.current = true;

    console.log("[App] 🔔 Native platform detected! Requesting push permission NOW (no auth needed)...");

    (async () => {
      try {
        const granted = await requestNativePushPermission();
        console.log("[App] 🔔 Push permission result:", granted);

        if (!granted) {
          console.warn("[App] Push permission denied by user");
          return;
        }

        console.log("[App] 🔔 Permission granted, registering for push token...");
        const token = await registerNativePush();
        console.log("[App] 🔔 Got device token:", token?.substring(0, 20) + "...");
        deviceTokenRef.current = token;

        // If user is already logged in, save immediately
        if (user && token) {
          console.log("[App] 🔔 User already logged in, saving token now...");
          const saved = await saveNativePushToken(user.id, token);
          if (saved) {
            tokenSavedForUserRef.current = user.id;
            console.log("[App] ✅ Native push token saved for user", user.id);
          }
        } else {
          console.log("[App] 🔔 No user yet, token will be saved after login");
        }
      } catch (err) {
        console.error("[App] ❌ Push bootstrap error:", err);
      }
    })();
  }, [isNative]); // Only depends on isNative, NOT on user/loading

  // ─── STEP 2: Save token when user becomes available (after login) ───
  useEffect(() => {
    if (!isNative || loading || !user) return;
    if (!deviceTokenRef.current) return;
    if (tokenSavedForUserRef.current === user.id) return;

    console.log("[App] 🔔 User now available, saving pending push token...");

    (async () => {
      try {
        const saved = await saveNativePushToken(user.id, deviceTokenRef.current!);
        if (saved) {
          tokenSavedForUserRef.current = user.id;
          console.log("[App] ✅ Native push token saved after login for user", user.id);
        }
      } catch (err) {
        console.error("[App] ❌ Failed to save push token after login:", err);
      }
    })();
  }, [isNative, loading, user]);

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
