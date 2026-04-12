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
import { registerNativePush, requestNativePushPermission, clearPushBadge, onNativePushActionPerformed } from "@/lib/capacitorPush";
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
          // Listen for auth state change to save token when user signs in
          const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
              if (
                (event === "SIGNED_IN" || event === "INITIAL_SESSION") &&
                session?.user &&
                deviceTokenRef.current &&
                tokenSavedForUserRef.current !== session.user.id
              ) {
                console.log("[App] 🔔 Auth event", event, "— saving push token for", session.user.id);
                const saved = await saveNativePushToken(session.user.id, deviceTokenRef.current);
                if (saved) {
                  tokenSavedForUserRef.current = session.user.id;
                  console.log("[App] ✅ Native push token saved via auth listener");
                }
                subscription.unsubscribe();
              }
            }
          );
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
