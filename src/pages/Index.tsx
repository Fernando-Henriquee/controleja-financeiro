import { useStore } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { Navigate } from "react-router-dom";
import { MonthHeroCard } from "@/components/MonthHeroCard";
import { FastInput } from "@/components/FastInput";
import { StatsGrid } from "@/components/StatsGrid";
import { AccountsList } from "@/components/AccountsList";
import { RecentExpenses } from "@/components/RecentExpenses";
import { IncomeSheet } from "@/components/IncomeSheet";
import { BankInvoices } from "@/components/BankInvoices";
import { IntelligenceSection } from "@/components/IntelligenceSection";
import { AutomationPanel } from "@/components/AutomationPanel";
import { ReminderWatcher } from "@/components/ReminderWatcher";
import { MonthSelector } from "@/components/MonthSelector";
import { MonthCalendar } from "@/components/MonthCalendar";
import Profiles from "./Profiles";
import { ChevronDown, LogOut, BarChart3, Sparkles } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

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
      <ReminderWatcher />
      <div className="mx-auto max-w-6xl space-y-8 px-4 pt-6 safe-top lg:px-6">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Copilot</p>
            <h1 className="font-display text-2xl font-bold tracking-tight">Financeiro</h1>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/planos"
              className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-primary to-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-sm hover:opacity-90 transition"
            >
              <Sparkles className="h-3.5 w-3.5" /> Planos
            </Link>
            <Link
              to="/dashboard"
              className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold shadow-sm hover:border-primary transition"
            >
              <BarChart3 className="h-3.5 w-3.5" /> Dashboard
            </Link>
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
                <div className="absolute right-0 top-full z-20 mt-2 w-56 overflow-hidden rounded-2xl border border-border bg-card shadow-elegant">
                  {profiles.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => { setActiveProfile(p); setMenuOpen(false); }}
                      className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-secondary ${p.id === activeProfile.id ? "bg-primary/5" : ""}`}
                    >
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
          </div>
        </header>

        <MonthSelector />

        {/* HERO — Saúde do mês */}
        <MonthHeroCard />

        {/* INTELIGÊNCIA + CONTAS lado a lado em desktop */}
        <div className="grid gap-6 lg:grid-cols-12">
          <div className="space-y-6 lg:col-span-7">
            <IntelligenceSection />
            <Section title="Resumo financeiro">
              <StatsGrid />
            </Section>
          </div>

          <div className="space-y-6 lg:col-span-5">
            <Section title="Cartões e faturas" actions={
              <Link to="/cards" className="rounded-lg border border-border bg-card px-2 py-1 text-[11px] text-primary hover:border-primary/50">
                Gerenciar
              </Link>
            }>
              <BankInvoices />
            </Section>
            <Section title="Contas">
              <AccountsList />
            </Section>
          </div>
        </div>

        {/* PLANEJAMENTO */}
        <Section title="Planejamento">
          <div className="grid gap-4 lg:grid-cols-2">
            <MonthCalendar />
            <div className="space-y-4">
              <IncomeSheet />
              <AutomationPanel />
            </div>
          </div>
        </Section>

        {/* ÚLTIMOS GASTOS */}
        <Section title="Últimos gastos">
          <FastInput />
          <div className="mt-4">
            <RecentExpenses />
          </div>
        </Section>
      </div>
    </main>
  );
};

function Section({ title, children, actions }: { title: string; children: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2 px-1">
        <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{title}</h2>
        {actions}
      </div>
      {children}
    </section>
  );
}

export default Index;

