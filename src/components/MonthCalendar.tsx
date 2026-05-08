import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { buildMonthCalendar, fmtBRL, monthLabel, type DayCell } from "@/lib/finance";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ExpenseForm } from "@/components/ExpenseForm";

const WEEKDAYS = ["D", "S", "T", "Q", "Q", "S", "S"];

export function MonthCalendar() {
  const { selectedMonth, income, expenses } = useStore();
  const [simSpend, setSimSpend] = useState<number>(0);
  const [selected, setSelected] = useState<DayCell | null>(null);
  const [expanded, setExpanded] = useState(false);

  const real = useMemo(
    () => buildMonthCalendar(selectedMonth, income, expenses),
    [selectedMonth, income, expenses],
  );

  // Average daily spend so far (based on days that already had any activity / elapsed days of the month)
  const { avgDaily, daysElapsed, daysLeft } = useMemo(() => {
    const today = new Date();
    const [y, m] = selectedMonth.split("-").map(Number);
    const isCurrent = today.getFullYear() === y && today.getMonth() === m - 1;
    const elapsed = isCurrent ? today.getDate() : real.monthDays.length;
    const left = Math.max(0, real.monthDays.length - elapsed);
    const avg = elapsed > 0 ? real.spentSoFar / elapsed : 0;
    return { avgDaily: avg, daysElapsed: elapsed, daysLeft: left };
  }, [selectedMonth, real]);

  // Default projection: keep spending at current average pace
  const paceProjection = useMemo(
    () => buildMonthCalendar(selectedMonth, income, expenses, avgDaily > 0 ? avgDaily : undefined),
    [selectedMonth, income, expenses, avgDaily],
  );

  // Simulation: replace future projection with `simSpend` per day
  const sim = useMemo(
    () => buildMonthCalendar(selectedMonth, income, expenses, simSpend > 0 ? simSpend : undefined),
    [selectedMonth, income, expenses, simSpend],
  );

  const useSim = simSpend > 0;
  const view = useSim ? sim : real;

  const monthName = monthLabel(selectedMonth);
  const paceEnd = paceProjection.endBalance;
  const limit = real.evenDailyLimit;
  const overUnder = avgDaily - limit;

  return (
    <div className="rounded-2xl border border-border bg-card p-3 shadow-sm">
      <header className="flex items-center justify-between gap-2">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Calendário</p>
          <h3 className="font-display text-sm font-bold capitalize">{monthName}</h3>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Limite/dia</p>
            <p className="font-display text-sm font-bold text-primary tabular-nums">{fmtBRL(real.evenDailyLimit)}</p>
          </div>
          <button
            onClick={() => setExpanded(v => !v)}
            className="rounded-full border border-border bg-secondary/40 p-1.5 hover:border-primary/40"
            aria-label={expanded ? "Recolher" : "Expandir"}
          >
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
        </div>
      </header>

      {!expanded ? (
        <div className="mt-2 grid grid-cols-3 gap-2 text-center">
          <Stat label="Gasto" value={fmtBRL(real.spentSoFar)} />
          <Stat label="Projeção" value={fmtBRL(view.projectedTotal)} tone={view.endBalance < 0 ? "danger" : "default"} />
          <Stat label={view.endBalance < 0 ? "Vermelho" : "Sobra"} value={fmtBRL(view.endBalance)} tone={view.endBalance < 0 ? "danger" : "safe"} />
        </div>
      ) : (
      <>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <Stat label="Gasto até hoje" value={fmtBRL(real.spentSoFar)} />
        <Stat label="Projeção fim mês" value={fmtBRL(view.projectedTotal)} tone={view.endBalance < 0 ? "danger" : "default"} />
        <Stat label={view.endBalance < 0 ? "No vermelho" : "Sobra estimada"} value={fmtBRL(view.endBalance)} tone={view.endBalance < 0 ? "danger" : "safe"} />
      </div>

      <div className="mb-2 grid grid-cols-7 gap-1 text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {WEEKDAYS.map((w, i) => <div key={i}>{w}</div>)}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {view.cells.map((cell, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => cell.inMonth && setSelected(cell)}
            disabled={!cell.inMonth}
            className={cn(
              "relative aspect-square rounded-lg border p-1 text-left text-[10px] transition",
              !cell.inMonth && "border-transparent bg-transparent opacity-30",
              cell.inMonth && cellClasses(cell),
              cell.isToday && "ring-2 ring-primary",
              selected?.day === cell.day && cell.inMonth && "ring-2 ring-foreground",
            )}
          >
            <div className="flex items-start justify-between">
              <span className={cn("font-bold", cell.isToday && "text-primary")}>{cell.day}</span>
            </div>
            {cell.inMonth && (cell.spent > 0 || cell.projected > 0) && (
              <div className="absolute inset-x-1 bottom-1 truncate text-[9px] font-semibold leading-tight">
                {cell.isFuture ? `~${shortBRL(cell.projected)}` : shortBRL(cell.spent)}
              </div>
            )}
          </button>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
        <Legend color="bg-emerald-500/15 border-emerald-500/40" label="Dentro do limite" />
        <Legend color="bg-amber-500/15 border-amber-500/40" label="Perto do limite" />
        <Legend color="bg-rose-500/15 border-rose-500/40" label="Acima do limite" />
        <Legend color="bg-primary/5 border-primary/30 border-dashed" label="Projeção futura" />
        <Legend color="bg-rose-500/10 border-rose-500/50 border-dashed" label="Projeção no vermelho" />
      </div>

      {daysElapsed > 0 && daysLeft > 0 && (
        <div className={cn(
          "mt-4 rounded-2xl border p-3 text-xs",
          paceEnd < 0 ? "border-rose-500/40 bg-rose-500/5" : "border-emerald-500/40 bg-emerald-500/5",
        )}>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            No seu ritmo atual
          </p>
          <p className="mt-1 font-display text-sm">
            Você está gastando em média{" "}
            <span className="font-bold tabular-nums">{fmtBRL(avgDaily)}</span>/dia
            {limit > 0 && (
              <span className={cn("ml-1 text-[11px]", overUnder > 0 ? "text-rose-500" : "text-emerald-600")}>
                ({overUnder > 0 ? "+" : ""}{fmtBRL(overUnder)} vs limite de {fmtBRL(limit)})
              </span>
            )}.
          </p>
          <p className={cn("mt-1 text-xs font-semibold", paceEnd < 0 ? "text-rose-500" : "text-emerald-600")}>
            {paceEnd < 0
              ? `Mantendo esse ritmo nos próximos ${daysLeft} dias, você terminaria o mês ${fmtBRL(Math.abs(paceEnd))} no vermelho.`
              : `Mantendo esse ritmo nos próximos ${daysLeft} dias, você sobraria ${fmtBRL(paceEnd)} no fim do mês.`}
          </p>
        </div>
      )}

      <div className="mt-4 rounded-2xl border border-dashed border-border bg-secondary/30 p-3">
        <label className="flex flex-col gap-2 text-xs">
          <span className="font-semibold text-muted-foreground">
            Simular: e se eu gastar <span className="text-foreground">R$ {simSpend || 0}</span> por dia até o fim do mês?
          </span>
          <input
            type="range"
            min={0}
            max={Math.max(300, Math.round(real.evenDailyLimit * 3))}
            step={5}
            value={simSpend}
            onChange={(e) => setSimSpend(Number(e.target.value))}
            className="accent-primary"
          />
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span>R$ 0</span>
            <button
              type="button"
              onClick={() => setSimSpend(0)}
              className="rounded-md border border-border bg-card px-2 py-1 hover:border-primary"
            >
              Limpar simulação
            </button>
            <span>R$ {Math.max(300, Math.round(real.evenDailyLimit * 3))}</span>
          </div>
        </label>
        {useSim && (
          <p className={cn("mt-2 text-xs font-semibold", sim.endBalance < 0 ? "text-rose-500" : "text-emerald-600")}>
            {sim.endBalance < 0
              ? `Você ficaria ${fmtBRL(Math.abs(sim.endBalance))} no vermelho.`
              : `Você ainda sobraria ${fmtBRL(sim.endBalance)} no fim do mês.`}
          </p>
        )}
      </div>

      {selected && (
        <div className="mt-3 rounded-2xl border border-border bg-secondary/40 p-3 text-xs">
          <div className="mb-1 flex items-center justify-between">
            <p className="font-display text-sm font-bold">
              Dia {selected.day} · {selected.date.toLocaleDateString("pt-BR", { weekday: "long" })}
            </p>
            <button onClick={() => setSelected(null)} className="text-[10px] text-muted-foreground hover:text-foreground">fechar</button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Detail label={selected.isFuture ? "Projetado" : "Gasto"} value={fmtBRL(selected.isFuture ? selected.projected : selected.spent)} />
            <Detail label="Limite ideal" value={fmtBRL(selected.dailyLimit)} />
          </div>
          <p className="mt-2 text-muted-foreground">
            Saldo estimado após este dia: <span className={cn("font-semibold", selected.cumulativeBalance < 0 ? "text-rose-500" : "text-foreground")}>{fmtBRL(selected.cumulativeBalance)}</span>
          </p>
        </div>
      )}
      </>
      )}
    </div>
  );
}

function cellClasses(cell: DayCell): string {
  switch (cell.status) {
    case "safe": return "border-emerald-500/40 bg-emerald-500/10 text-foreground";
    case "warn": return "border-amber-500/40 bg-amber-500/15 text-foreground";
    case "danger": return "border-rose-500/40 bg-rose-500/15 text-foreground";
    case "future-safe": return "border-dashed border-primary/30 bg-primary/5 text-muted-foreground";
    case "future-danger": return "border-dashed border-rose-500/50 bg-rose-500/10 text-rose-600";
    default: return "border-border bg-card text-muted-foreground";
  }
}

function shortBRL(v: number): string {
  if (v >= 1000) return `${(v / 1000).toFixed(1)}k`;
  return Math.round(v).toString();
}

function Stat({ label, value, tone = "default" }: { label: string; value: string; tone?: "default" | "safe" | "danger" }) {
  return (
    <div className="rounded-xl border border-border bg-secondary/40 p-2">
      <p className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={cn(
        "font-display text-sm font-bold",
        tone === "danger" && "text-rose-500",
        tone === "safe" && "text-emerald-600",
      )}>{value}</p>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-card p-2">
      <p className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="font-display text-sm font-bold">{value}</p>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className={cn("inline-block h-3 w-3 rounded border", color)} />
      {label}
    </span>
  );
}
