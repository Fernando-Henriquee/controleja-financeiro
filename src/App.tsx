import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth";
import { StoreProvider } from "@/lib/store";
import Index from "./pages/Index.tsx";
import Auth from "./pages/Auth.tsx";
import Cards from "./pages/Cards.tsx";
import Dashboard from "./pages/Dashboard.tsx";
import Plans from "./pages/Plans.tsx";
import Lancar from "./pages/Lancar.tsx";
import NotFound from "./pages/NotFound.tsx";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <StoreProvider>
            <PaymentTestModeBanner />
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/lancar" element={<Lancar />} />
              <Route path="/cards" element={<Cards />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/planos" element={<Plans />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </StoreProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
