import { DailyLimitCard } from "@/components/DailyLimitCard";
import { FastInput } from "@/components/FastInput";
import { StatsGrid } from "@/components/StatsGrid";
import { AccountsList } from "@/components/AccountsList";
import { RecentExpenses } from "@/components/RecentExpenses";
import { IncomeSheet } from "@/components/IncomeSheet";
import { StoreProvider } from "@/lib/store";

const Index = () => {
  return (
    <StoreProvider>
      <main className="min-h-screen bg-gradient-surface pb-12">
        <div className="mx-auto max-w-md space-y-5 px-4 pt-6 safe-top">
          <header className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Copilot</p>
              <h1 className="font-display text-2xl font-bold tracking-tight">Financeiro</h1>
            </div>
            <div className="grid h-10 w-10 place-items-center rounded-full bg-gradient-primary text-sm font-semibold text-primary-foreground shadow-elegant">
              JM
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
    </StoreProvider>
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
