import { useStore } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { Navigate } from "react-router-dom";
import { MonthHeroCard } from "@/components/MonthHeroCard";
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
import { AppShell } from "@/components/AppShell";
import Profiles from "./Profiles";
import { Link } from "react-router-dom";
import { PlusCircle } from "lucide-react";

const Index = () => {
  const { session, loading: authLoading } = useAuth();
  const { activeProfile } = useStore();

  if (authLoading) {
    return <main className="grid min-h-screen place-items-center bg-gradient-surface text-sm text-muted-foreground">Carregando...</main>;
  }
  if (!session) return <Navigate to="/auth" replace />;
  if (!activeProfile) return <Profiles />;

  return (
    <AppShell>
      <ReminderWatcher />
      <div className="mx-auto max-w-6xl space-y-8 px-4 pt-6 pb-12 lg:px-6">
        <header className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Visão geral</p>
            <h1 className="font-display text-2xl font-bold tracking-tight">Olá, {activeProfile.name}</h1>
          </div>
          <Link
            to="/lancar"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-gradient-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-elegant hover:opacity-90"
          >
            <PlusCircle className="h-3.5 w-3.5" /> Lançar
          </Link>
        </header>

        <MonthSelector />

        <MonthHeroCard />

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

        <Section title="Planejamento">
          <div className="grid gap-4 lg:grid-cols-2">
            <MonthCalendar />
            <div className="space-y-4">
              <IncomeSheet />
              <AutomationPanel />
            </div>
          </div>
        </Section>

        <Section title="Últimos gastos" actions={
          <Link to="/lancar" className="rounded-lg border border-border bg-card px-2 py-1 text-[11px] text-primary hover:border-primary/50">
            Lançar novo
          </Link>
        }>
          <RecentExpenses />
        </Section>
      </div>
    </AppShell>
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
