import { useEffect, useMemo, useState } from "react";
import { Navigate, Link } from "react-router-dom";
import {
  ResponsiveContainer,
  BarChart, Bar,
  LineChart, Line,
  AreaChart, Area,
  PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from "recharts";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useStore } from "@/lib/store";
import { supabase } from "@/integrations/supabase/client";
import { expectedMonthlyIncome, fmtBRL, monthKey, monthLabel } from "@/lib/finance";
import type { Expense } from "@/lib/types";
import Profiles from "./Profiles";

const CATEGORY_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--status-warning))",
  "hsl(var(--status-danger))",
  "#10b981",
  "#8b5cf6",
  "#f59e0b",
  "#06b6d4",
  "#ec4899",
];

type MonthRow = {
  key: string;
  label: string;
  isPast: boolean;
  isCurrent: boolean;
  isFuture: boolean;
  income: number;
  spent: number;          // real (passado/atual) ou projetado (futuro)
  recurring: number;      // soma das recorrentes do mês
  net: number;            // income - spent
};

function shortMonthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
}

const Dashboard = () => {
  const { session, loading: authLoading } = useAuth();
  const { activeProfile, income, recurringRules } = useStore();

  const [yearExpenses, setYearExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonthIdx = now.getMonth(); // 0..11
  const currentKey = monthKey(now);

  // Carrega TODOS os gastos do ano atual
  useEffect(() => {
    if (!activeProfile) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      const start = new Date(currentYear, 0, 1).toISOString();
      const end = new Date(currentYear + 1, 0, 1).toISOString();
      const { data } = await supabase
        .from("expenses")
        .select("*")
        .eq("profile_id", activeProfile.id)
        .gte("occurred_at", start)
        .lt("occurred_at", end)
        .order("occurred_at", { ascending: false })
        .limit(5000);
      if (!cancelled) {
        setYearExpenses((data ?? []) as Expense[]);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [activeProfile, currentYear]);

  const monthlyIncome = useMemo(() => expectedMonthlyIncome(income), [income]);

  // Soma das recorrentes (vale como gasto base mensal)
  const recurringMonthly = useMemo(
    () => recurringRules.reduce((s, r) => s + Number(r.amount ?? 0), 0),
    [recurringRules],
  );

  // Agrupa gastos reais por mês
  const realSpentByMonth = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of yearExpenses) {
      const d = new Date(e.occurred_at);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      map.set(k, (map.get(k) ?? 0) + Number(e.amount));
    }
    return map;
  }, [yearExpenses]);

  // Média mensal dos últimos meses concluídos (até o mês passado)
  const avgPastSpent = useMemo(() => {
    let total = 0;
    let count = 0;
    for (let m = 0; m < currentMonthIdx; m += 1) {
      const k = `${currentYear}-${String(m + 1).padStart(2, "0")}`;
      const v = realSpentByMonth.get(k) ?? 0;
      if (v > 0) {
        total += v;
        count += 1;
      }
    }
    return count > 0 ? total / count : 0;
  }, [realSpentByMonth, currentMonthIdx, currentYear]);

  // Linhas mensais até dezembro
  const monthRows: MonthRow[] = useMemo(() => {
    const rows: MonthRow[] = [];
    for (let m = 0; m < 12; m += 1) {
      const key = `${currentYear}-${String(m + 1).padStart(2, "0")}`;
      const isPast = m < currentMonthIdx;
      const isCurrent = m === currentMonthIdx;
      const isFuture = m > currentMonthIdx;

      let spent: number;
      if (isPast) {
        spent = realSpentByMonth.get(key) ?? 0;
      } else if (isCurrent) {
        // Mês atual: o que já foi gasto (real)
        spent = realSpentByMonth.get(key) ?? 0;
      } else {
        // Futuro: recorrentes + média de gastos variáveis
        // Como recorrentes podem estar embutidas na média, usamos o maior entre média e recorrentes
        const projected = Math.max(avgPastSpent, recurringMonthly);
        spent = projected;
      }

      rows.push({
        key,
        label: shortMonthLabel(key),
        isPast,
        isCurrent,
        isFuture,
        income: monthlyIncome,
        spent,
        recurring: recurringMonthly,
        net: monthlyIncome - spent,
      });
    }
    return rows;
  }, [currentYear, currentMonthIdx, realSpentByMonth, avgPastSpent, recurringMonthly, monthlyIncome]);

  // Saldo acumulado ao longo do ano
  const cumulativeData = useMemo(() => {
    let acc = 0;
    return monthRows.map((r) => {
      acc += r.net;
      return { label: r.label, key: r.key, saldo: acc, isFuture: r.isFuture, isCurrent: r.isCurrent };
    });
  }, [monthRows]);

  // Projeção do resto do ano (mês atual + futuros)
  const restOfYearRows = useMemo(
    () => monthRows.filter((_, i) => i >= currentMonthIdx),
    [monthRows, currentMonthIdx],
  );

  // Sobra/déficit acumulado do mês atual até dezembro
  const projectedData = useMemo(() => {
    let acc = 0;
    return restOfYearRows.map((r) => {
      acc += r.net;
      return {
        label: r.label,
        sobra: acc,
        positivo: acc >= 0 ? acc : 0,
        negativo: acc < 0 ? acc : 0,
      };
    });
  }, [restOfYearRows]);

  // Pizza por categoria (ano até agora)
  const categoryData = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of yearExpenses) {
      const cat = e.category || "Outros";
      map.set(cat, (map.get(cat) ?? 0) + Number(e.amount));
    }
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [yearExpenses]);

  // Totais resumo (resto do ano)
  const restSummary = useMemo(() => {
    const totalIncome = restOfYearRows.reduce((s, r) => s + r.income, 0);
    const totalSpent = restOfYearRows.reduce((s, r) => s + r.spent, 0);
    const net = totalIncome - totalSpent;
    return { totalIncome, totalSpent, net };
  }, [restOfYearRows]);

  if (authLoading) {
    return <main className="grid min-h-screen place-items-center bg-gradient-surface text-sm text-muted-foreground">Carregando...</main>;
  }
  if (!session) return <Navigate to="/auth" replace />;
  if (!activeProfile) return <Profiles />;

  return (
    <main className="min-h-screen bg-gradient-surface pb-12">
      <div className="mx-auto max-w-6xl space-y-5 px-4 pt-6 safe-top lg:px-6">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="grid h-9 w-9 place-items-center rounded-full border border-border bg-card hover:border-primary transition"
              aria-label="Voltar"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Visão anual</p>
              <h1 className="font-display text-2xl font-bold tracking-tight">Dashboard</h1>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Perfil</p>
            <p className="text-xs font-semibold">{activeProfile.emoji} {activeProfile.name}</p>
          </div>
        </header>

        {loading ? (
          <div className="grid place-items-center rounded-3xl border border-border bg-card py-16 text-sm text-muted-foreground">
            Carregando dados do ano...
          </div>
        ) : (
          <>
            {/* Resumo do resto do ano */}
            <section className="grid gap-3 sm:grid-cols-3">
              <SummaryCard
                label={`Renda prevista (${monthLabel(currentKey)} → dez)`}
                value={fmtBRL(restSummary.totalIncome)}
                tone="neutral"
              />
              <SummaryCard
                label="Saída projetada"
                value={fmtBRL(restSummary.totalSpent)}
                tone="warning"
              />
              <SummaryCard
                label={restSummary.net >= 0 ? "Sobra projetada" : "Déficit projetado"}
                value={fmtBRL(restSummary.net)}
                tone={restSummary.net >= 0 ? "success" : "danger"}
              />
            </section>

            {/* Entrada vs Saída por mês */}
            <Section title="Entrada vs Saída — ano inteiro" subtitle="Meses futuros usam média histórica + recorrentes">
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthRows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} />
                    <Tooltip
                      formatter={(v: number) => fmtBRL(v)}
                      contentStyle={tooltipStyle}
                      labelStyle={{ color: "hsl(var(--foreground))", fontWeight: 600 }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="income" name="Entrada" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="spent" name="Saída" fill="hsl(var(--status-danger))" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Section>

            <div className="grid gap-5 lg:grid-cols-2">
              {/* Saldo acumulado */}
              <Section title="Saldo acumulado" subtitle="Soma de (entrada − saída) mês a mês">
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={cumulativeData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} />
                      <Tooltip formatter={(v: number) => fmtBRL(v)} contentStyle={tooltipStyle} />
                      <Line
                        type="monotone"
                        dataKey="saldo"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2.5}
                        dot={{ r: 3, fill: "hsl(var(--primary))" }}
                        activeDot={{ r: 5 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Section>

              {/* Categorias */}
              <Section title="Gastos por categoria — ano" subtitle="Baseado nos lançamentos reais">
                {categoryData.length === 0 ? (
                  <div className="grid h-64 place-items-center rounded-2xl border border-dashed border-border text-xs text-muted-foreground">
                    Nenhum gasto registrado este ano.
                  </div>
                ) : (
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={categoryData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={90}
                          paddingAngle={2}
                        >
                          {categoryData.map((_, i) => (
                            <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v: number) => fmtBRL(v)} contentStyle={tooltipStyle} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </Section>
            </div>

            {/* Projeção de sobra/déficit */}
            <Section title="Projeção até dezembro" subtitle="Sobra/déficit acumulado a partir do mês atual">
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={projectedData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="posGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.5} />
                        <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="negGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--status-danger))" stopOpacity={0.5} />
                        <stop offset="100%" stopColor="hsl(var(--status-danger))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: number) => fmtBRL(v)} contentStyle={tooltipStyle} />
                    <Area type="monotone" dataKey="positivo" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#posGrad)" />
                    <Area type="monotone" dataKey="negativo" stroke="hsl(var(--status-danger))" strokeWidth={2} fill="url(#negGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <p className="px-1 pt-2 text-[11px] text-muted-foreground">
                Projeção considera renda de <strong>{fmtBRL(monthlyIncome)}</strong>/mês,
                contas recorrentes (<strong>{fmtBRL(recurringMonthly)}</strong>/mês) e
                média de gastos variáveis (<strong>{fmtBRL(avgPastSpent)}</strong>/mês).
              </p>
            </Section>
          </>
        )}
      </div>
    </main>
  );
};

const tooltipStyle = {
  background: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 12,
  fontSize: 12,
  color: "hsl(var(--foreground))",
};

function SummaryCard({ label, value, tone }: { label: string; value: string; tone: "neutral" | "success" | "warning" | "danger" }) {
  const toneClass =
    tone === "success" ? "text-emerald-600" :
    tone === "danger" ? "text-rose-600" :
    tone === "warning" ? "text-amber-600" :
    "text-foreground";
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className={`mt-1 font-display text-xl font-bold ${toneClass}`}>{value}</p>
    </div>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-border bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{title}</h2>
        {subtitle && <span className="text-[10px] text-muted-foreground">{subtitle}</span>}
      </div>
      {children}
    </section>
  );
}

export default Dashboard;
