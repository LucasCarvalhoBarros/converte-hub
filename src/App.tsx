import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import Login from "./pages/Login.tsx";
import ForgotPassword from "./pages/ForgotPassword.tsx";
import ResetPassword from "./pages/ResetPassword.tsx";
import Leads from "./pages/Leads.tsx";
import Relatorios from "./pages/Relatorios.tsx";
import StatusConfig from "./pages/StatusConfig.tsx";
import AdsConfig from "./pages/AdsConfig.tsx";
import PlatformsConfig from "./pages/PlatformsConfig.tsx";
import ClientesConfig from "./pages/ClientesConfig.tsx";
import Products from "./pages/Products.tsx";
import StockMovements from "./pages/StockMovements.tsx";
import Sales from "./pages/Sales.tsx";
import SalesDashboard from "./pages/SalesDashboard.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/" element={<Index />} />
          <Route path="/leads" element={<Leads />} />
          <Route path="/conversas" element={<Leads />} />
          <Route path="/relatorios" element={<Relatorios />} />
          <Route path="/config/status" element={<StatusConfig />} />
          <Route path="/config/anuncios" element={<AdsConfig />} />
          <Route path="/config/plataformas" element={<PlatformsConfig />} />
          <Route path="/config/clientes" element={<ClientesConfig />} />
          <Route path="/produtos" element={<Products />} />
          <Route path="/estoque/movimentacoes" element={<StockMovements />} />
          <Route path="/vendas" element={<Sales />} />
          <Route path="/dashboard-vendas" element={<SalesDashboard />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
