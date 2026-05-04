import { useStore } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { Navigate } from "react-router-dom";
import { DailyLimitCard } from "@/components/DailyLimitCard";
import { FastInput } from "@/components/FastInput";
import { StatsGrid } from "@/components/StatsGrid";
import { AccountsList } from "@/components/AccountsList";
import { RecentExpenses } from "@/components/RecentExpenses";
import { IncomeSheet } from "@/components/IncomeSheet";
import Profiles from "./Profiles";
import { ChevronDown, LogOut } from "lucide-react";
import { useState } from "react";

const Index = () => {
  const { session, loading: authLoading, signOut } = useAuth();
  const { activeProfile, setActiveProfile, profiles } = useStore();
  const [menuOpen, setMenuOpen] = useState(false);

  if (authLoading) {
    return <main className="grid min-h-screen place-items-center bg-gradient-surface text-sm text-muted-foreground">Carregando...</main>;
  }
  if (!session) return <Navigate to="/auth" replace />;
  if (!activeProfile) return <Profiles />;

  return (
    <main className="min-h-screen bg-gradient-surface pb-12">
      <div className="mx-auto max-w-md space-y-5 px-4 pt-6 safe-top">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Copilot</p>
            <h1 className="font-display text-2xl font-bold tracking-tight">Financeiro</h1>
          </div>
          <div className="relative">
            <button
              onClick={() => setMenuOpen(v => !v)}
              className="flex items-center gap-2 rounded-full border border-border bg-card py-1 pl-1 pr-3 shadow-sm hover:border-primary transition"
            >
              <div className="grid h-8 w-8 place-items-center rounded-full text-base" style={{ background: activeProfile.color }}>
                {activeProfile.emoji}
              </div>
              <span className="text-xs font-semibold">{activeProfile.name}</span>
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 overflow-hidden rounded-2xl border border-border bg-card shadow-elegant z-20">
                {profiles.map(p => (
                  <button key={p.id}
                    onClick={() => { setActiveProfile(p); setMenuOpen(false); }}
                    className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-secondary ${p.id === activeProfile.id ? "bg-primary/5" : ""}`}>
                    <span className="grid h-7 w-7 place-items-center rounded-lg text-sm" style={{ background: p.color }}>{p.emoji}</span>
                    <span className="font-medium">{p.name}</span>
                  </button>
                ))}
                <button
                  onClick={() => { setActiveProfile(null); setMenuOpen(false); }}
                  className="block w-full border-t border-border px-3 py-2 text-left text-xs text-muted-foreground hover:bg-secondary"
                >
                  Trocar de perfil
                </button>
                <button
                  onClick={() => signOut()}
                  className="flex w-full items-center gap-2 border-t border-border px-3 py-2 text-left text-xs text-destructive hover:bg-destructive/5"
                >
                  <LogOut className="h-3 w-3" /> Sair da conta
                </button>
              </div>
            )}
          </div>
        </header>

        <DailyLimitCard />
        <FastInput />
        <StatsGrid />

        <Section title="Contas">
          <AccountsList />
        </Section>

        <Section title="Renda">
          <IncomeSheet />
        </Section>

        <Section title="Últimos gastos">
          <RecentExpenses />
        </Section>
      </div>
    </main>
  );
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="px-1 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{title}</h2>
      {children}
    </section>
  );
}

export default Index;
