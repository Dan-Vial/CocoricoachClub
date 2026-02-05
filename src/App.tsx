import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { OfflineSyncProvider } from "@/contexts/OfflineSyncContext";
import { PublicAccessProvider, usePublicAccess } from "@/contexts/PublicAccessContext";
import { FieldModeProvider } from "@/contexts/FieldModeContext";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";
import PWAUpdatePrompt from "@/components/PWAUpdatePrompt";
import OfflineIndicator from "@/components/OfflineIndicator";
import { ViewerModeBanner } from "@/components/ViewerModeBanner";
import { FieldModeToggle } from "@/components/FieldModeToggle";
import Clubs from "./pages/Clubs";
import ClubDetails from "./pages/ClubDetails";
import CategoryDetails from "./pages/CategoryDetails";
import PlayerDetails from "./pages/PlayerDetails";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import AcceptInvitation from "./pages/AcceptInvitation";
import PublicView from "./pages/PublicView";
import PublicCategoryView from "./pages/PublicCategoryView";
import AthletePortal from "./pages/AthletePortal";
import Install from "./pages/Install";
import Admin from "./pages/Admin";
 import SuperAdmin from "./pages/SuperAdmin";
import Settings from "./pages/Settings";
import AcceptAmbassadorInvitation from "./pages/AcceptAmbassadorInvitation";
import NotFound from "./pages/NotFound";

// Auth wrapper component that allows public access
function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { isPublicAccess } = usePublicAccess();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  // Allow access if user is authenticated OR has public access
  if (!user && !isPublicAccess) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}

// Wrapped components that require auth or public access
const ClubDetailsWithAuth = () => (
  <AuthGuard><ClubDetails /></AuthGuard>
);
const CategoryDetailsWithAuth = () => (
  <AuthGuard><CategoryDetails /></AuthGuard>
);
const PlayerDetailsWithAuth = () => (
  <AuthGuard><PlayerDetails /></AuthGuard>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 60 * 24, // 24 hours (formerly cacheTime)
      retry: (failureCount, error) => {
        // Don't retry if offline
        if (!navigator.onLine) return false;
        return failureCount < 3;
      },
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <FieldModeProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <AuthProvider>
            <PublicAccessProvider>
              <OfflineSyncProvider>
                <ViewerModeBanner />
                <OfflineIndicator />
                <FieldModeToggle />
                <PWAUpdatePrompt />
                <PWAInstallPrompt />
                <Routes>
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/" element={<Clubs />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/accept-invitation" element={<AcceptInvitation />} />
                  <Route path="/public-view" element={<PublicView />} />
                  <Route path="/public/categories/:categoryId" element={<PublicCategoryView />} />
                  <Route path="/athlete-portal" element={<AthletePortal />} />
                  <Route path="/install" element={<Install />} />
                  <Route path="/admin" element={<Admin />} />
                   <Route path="/super-admin" element={<SuperAdmin />} />
                  <Route path="/ambassador-invitation" element={<AcceptAmbassadorInvitation />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/clubs/:clubId" element={<ClubDetailsWithAuth />} />
                  <Route path="/categories/:categoryId" element={<CategoryDetailsWithAuth />} />
                  <Route path="/players/:playerId" element={<PlayerDetailsWithAuth />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </OfflineSyncProvider>
            </PublicAccessProvider>
          </AuthProvider>
        </BrowserRouter>
      </FieldModeProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
