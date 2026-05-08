import { ReactNode, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger,
  SidebarFooter, SidebarHeader, useSidebar,
} from "@/components/ui/sidebar";
import { Home, BarChart3, CreditCard, Sparkles, PlusCircle, ChevronDown, LogOut } from "lucide-react";
import { useStore } from "@/lib/store";
import { useAuth } from "@/lib/auth";

const NAV = [
  { title: "Início", url: "/", icon: Home },
  { title: "Lançar gasto", url: "/lancar", icon: PlusCircle },
  { title: "Cartões e contas", url: "/cards", icon: CreditCard },
  { title: "Dashboard", url: "/dashboard", icon: BarChart3 },
  { title: "Planos", url: "/planos", icon: Sparkles },
];

function AppSidebar() {
  const { pathname } = useLocation();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { activeProfile, profiles, setActiveProfile } = useStore();
  const { signOut } = useAuth();
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-2 py-2">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-primary text-primary-foreground font-bold">
            $
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Copilot</p>
              <p className="truncate font-display text-sm font-bold">Financeiro</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navegação</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV.map((item) => {
                const active = pathname === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={active}>
                      <Link to={item.url} className="flex items-center gap-2">
                        <item.icon className="h-4 w-4 shrink-0" />
                        {!collapsed && <span>{item.title}</span>}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        {activeProfile && (
          <div className="px-1 py-2">
            <button
              onClick={() => setProfileMenuOpen(v => !v)}
              className="flex w-full items-center gap-2 rounded-xl border border-border bg-card p-2 text-left hover:border-primary transition"
            >
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-base" style={{ background: activeProfile.color }}>
                {activeProfile.emoji}
              </div>
              {!collapsed && (
                <>
                  <span className="flex-1 truncate text-xs font-semibold">{activeProfile.name}</span>
                  <ChevronDown className="h-3 w-3 text-muted-foreground" />
                </>
              )}
            </button>
            {profileMenuOpen && !collapsed && (
              <div className="mt-2 overflow-hidden rounded-xl border border-border bg-card">
                {profiles.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => { setActiveProfile(p); setProfileMenuOpen(false); }}
                    className={`flex w-full items-center gap-2 px-2 py-2 text-left text-xs hover:bg-secondary ${p.id === activeProfile.id ? "bg-primary/5" : ""}`}
                  >
                    <span className="grid h-6 w-6 place-items-center rounded-md text-xs" style={{ background: p.color }}>{p.emoji}</span>
                    <span className="font-medium">{p.name}</span>
                  </button>
                ))}
                <button
                  onClick={() => { setActiveProfile(null); setProfileMenuOpen(false); }}
                  className="block w-full border-t border-border px-2 py-2 text-left text-xs text-muted-foreground hover:bg-secondary"
                >
                  Trocar de perfil
                </button>
                <button
                  onClick={() => signOut()}
                  className="flex w-full items-center gap-2 border-t border-border px-2 py-2 text-left text-xs text-destructive hover:bg-destructive/5"
                >
                  <LogOut className="h-3 w-3" /> Sair da conta
                </button>
              </div>
            )}
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-gradient-surface">
        <AppSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 flex h-12 items-center gap-2 border-b border-border bg-background/80 px-3 backdrop-blur safe-top">
            <SidebarTrigger />
            <span className="font-display text-sm font-semibold">Financeiro</span>
          </header>
          <main className="min-w-0 flex-1">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
