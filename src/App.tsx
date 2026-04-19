import { lazy, Suspense, useEffect, useRef } from "react";
import { Capacitor } from "@capacitor/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { useServiceWorkerUpdate } from "@/hooks/useServiceWorkerUpdate";
import { useGpsProfileSync } from "@/hooks/useGpsProfileSync";
import { supabase } from "@/integrations/supabase/client";
import { registerNativePush, clearPushBadge, onNativePushActionPerformed } from "@/lib/capacitorPush";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import MinyanJoin from "./pages/MinyanJoin.tsx";
import TehilimJoin from "./pages/TehilimJoin.tsx";
import AdminDashboard from "./pages/AdminDashboard.tsx";
import Install from "./pages/Install.tsx";

const OmerLanding = lazy(() => import("./pages/OmerLanding.tsx"));
const DonationPage = lazy(() => import("./pages/DonationPage.tsx"));
const CerfaViewer = lazy(() => import("./pages/CerfaViewer.tsx"));
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
 * Updates ALL existing native rows for this user (any synagogue_id),
 * or inserts a new row with synagogue_id: null if none exist.
 */
async function saveNativePushToken(userId: string, deviceToken: string) {
  // Fetch ALL native push subscriptions for this user
  const { data: existing, error: fetchError } = await supabase
    .from("push_subscriptions")
    .select("id")
    .eq("user_id", userId)
    .eq("push_type", "native");

  if (fetchError) {
    console.error("[App] Failed to fetch native push subs:", fetchError);
    return false;
  }

  if (existing && existing.length > 0) {
    // Update device_token on ALL existing native rows
    const ids = existing.map((r) => r.id);
    const { error } = await supabase
      .from("push_subscriptions")
      .update({ device_token: deviceToken } as never)
      .in("id", ids);
    if (error) {
      console.error("[App] Failed to update native push tokens:", error);
      return false;
    }
    console.log(`[App] Updated ${ids.length} native push subscription(s)`);
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
  useGpsProfileSync();

  const { user, loading } = useAuth();
  const permissionRequestedRef = useRef(false);
  const tokenSavedForUserRef = useRef<string | null>(null);
  const deviceTokenRef = useRef<string | null>(null);

  const isNative = Capacitor.isNativePlatform();

  // ─── Push permissions are NOT requested on launch.
  // Only GPS is requested automatically (via useGpsProfileSync).
  // Notification permission is requested only when the user opts in
  // (e.g. activating Shabbat reminders from settings or the Omer page).
  // This keeps the first-launch experience light and respectful.
  //
  // If a token has already been granted in a previous session, we still
  // refresh it silently — but we never trigger the OS prompt here.
  useEffect(() => {
    if (!isNative) return;
    if (permissionRequestedRef.current) return;
    permissionRequestedRef.current = true;

    (async () => {
      try {
        const { PushNotifications } = await import("@capacitor/push-notifications");
        const status = await PushNotifications.checkPermissions();
        if (status.receive !== "granted") {
          console.log("[App] Push permission not yet granted — skipping silent token refresh");
          return;
        }
        console.log("[App] 🔕 Push already authorized, refreshing token silently…");
        const token = await registerNativePush();
        deviceTokenRef.current = token;
        if (user && token) {
          const saved = await saveNativePushToken(user.id, token);
          if (saved) tokenSavedForUserRef.current = user.id;
        }
      } catch (err) {
        console.warn("[App] Silent push token refresh skipped:", err);
      }
    })();
  }, [isNative, user]);

  // Save token when user logs in later (only if a token was already silently refreshed)
  useEffect(() => {
    if (!isNative || loading || !user) return;
    if (!deviceTokenRef.current) return;
    if (tokenSavedForUserRef.current === user.id) return;

    (async () => {
      const saved = await saveNativePushToken(user.id, deviceTokenRef.current!);
      if (saved) tokenSavedForUserRef.current = user.id;
    })();
  }, [isNative, loading, user]);

  // ─── STEP 3: Badge clearing on native ───
  useEffect(() => {
    if (!isNative) return;

    // Clear badge on app launch
    clearPushBadge();

    // Clear badge when tapping a notification
    onNativePushActionPerformed(() => {
      clearPushBadge();
    });

    // Clear badge when app resumes from background
    const handleResume = () => {
      clearPushBadge();
    };
    document.addEventListener("resume", handleResume);

    return () => {
      document.removeEventListener("resume", handleResume);
    };
  }, [isNative]);

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
          <Route path="/cerfa/:token" element={<Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" /></div>}><CerfaViewer /></Suspense>} />
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
