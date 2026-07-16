import { useEffect, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, Users, MessageSquare, Settings, LogOut, Search, Bell, BarChart3, Tag, Megaphone, Layers, Building2, Menu, X, Package, Sliders, ShoppingCart, TrendingUp } from "lucide-react";
import { Logo } from "./Logo";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";
import { auth, Session } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/relatorios", label: "Dashboards", icon: BarChart3 },
  { to: "/leads", label: "Leads", icon: Users },
  { to: "/produtos", label: "Produtos", icon: Package, section: "Loja" },
  { to: "/estoque/movimentacoes", label: "Estoque", icon: Sliders },
  { to: "/vendas", label: "Vendas", icon: ShoppingCart },
  { to: "/dashboard-vendas", label: "Dashboard vendas", icon: TrendingUp },
  { to: "/config/status", label: "Status do funil", icon: Tag, section: "Configurações" },
  { to: "/config/anuncios", label: "Anúncios", icon: Megaphone },
  { to: "/config/plataformas", label: "Plataformas", icon: Layers },
  { to: "/config/clientes", label: "Clientes", icon: Building2 },
];

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleClick = (to: string) => {
    navigate(to);
    onNavigate?.();
  };

  return (
    <>
      <div className="px-5 pt-6 pb-4">
        <Logo />
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {nav.map((item) => {
          const Icon = item.icon;
          const active = location.pathname === item.to || (item.to === "/leads" && location.pathname.startsWith("/leads"));
          return (
            <div key={item.to}>
              {item.section && (
                <div className="px-3 pt-4 pb-1 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">
                  {item.section}
                </div>
              )}
              <button
                onClick={() => handleClick(item.to)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                  active
                    ? "bg-sidebar-accent text-sidebar-primary-foreground shadow-soft"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                )}
              >
                <Icon className={cn("h-4 w-4", active && "text-sidebar-primary")} />
                <span>{item.label}</span>
                {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-sidebar-primary animate-pulse-glow" />}
              </button>
            </div>
          );
        })}
      </nav>
    </>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    setSession(auth.get());
  }, []);

  if (!auth.get()) return <Navigate to="/login" replace />;

  const handleLogout = () => {
    auth.logout();
    setMobileOpen(false);
    navigate("/login", { replace: true });
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
        <SidebarContent />
        <div className="border-t border-sidebar-border p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-primary text-sm font-semibold uppercase text-primary-foreground">
              {session?.name?.[0] ?? "U"}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold capitalize">{session?.name}</div>
              <div className="truncate text-xs text-sidebar-foreground/60">{session?.email}</div>
            </div>
            <button
              onClick={handleLogout}
              className="rounded-md p-1.5 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
              aria-label="Sair"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Sheet */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-[280px] bg-sidebar p-0 border-sidebar-border flex flex-col">
          <SheetTitle className="sr-only">Menu de navegação</SheetTitle>
          <div className="flex flex-col flex-1 overflow-hidden">
            <SidebarContent onNavigate={() => setMobileOpen(false)} />
            <div className="border-t border-sidebar-border p-4 mt-auto">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-primary text-sm font-semibold uppercase text-primary-foreground">
                  {session?.name?.[0] ?? "U"}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold capitalize">{session?.name}</div>
                  <div className="truncate text-xs text-sidebar-foreground/60">{session?.email}</div>
                </div>
                <button
                  onClick={handleLogout}
                  className="rounded-md p-1.5 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                  aria-label="Sair"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Main */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 shrink-0 items-center gap-3 border-b border-border bg-card px-4 md:px-6">
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileOpen(true)}>
            <Menu className="h-5 w-5" />
            <span className="sr-only">Abrir menu</span>
          </Button>
          <div className="md:hidden"><Logo compact /></div>
          <WorkspaceSwitcher />
          <div className="relative hidden lg:block flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Buscar leads, conversas..." className="pl-9 bg-muted/50 border-transparent focus-visible:bg-card" />
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-4 w-4" />
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-destructive" />
            </Button>
          </div>
        </header>
        <main className="flex-1 overflow-auto scrollbar-thin">{children}</main>
      </div>
    </div>
  );
}
