import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { useServiceWorkerUpdate } from "@/hooks/useServiceWorkerUpdate";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import MinyanJoin from "./pages/MinyanJoin.tsx";
import TehilimJoin from "./pages/TehilimJoin.tsx";
import AdminDashboard from "./pages/AdminDashboard.tsx";
import Install from "./pages/Install.tsx";

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
