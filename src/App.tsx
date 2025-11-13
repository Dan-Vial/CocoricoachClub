import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Clubs from "./pages/Clubs";
import ClubDetails from "./pages/ClubDetails";
import CategoryDetails from "./pages/CategoryDetails";
import PlayerDetails from "./pages/PlayerDetails";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import AcceptInvitation from "./pages/AcceptInvitation";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/" element={<Clubs />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/accept-invitation" element={<AcceptInvitation />} />
            <Route path="/clubs/:clubId" element={<ClubDetails />} />
            <Route path="/categories/:categoryId" element={<CategoryDetails />} />
            <Route path="/players/:playerId" element={<PlayerDetails />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
