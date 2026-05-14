import { useStore } from "@/lib/store";
import { currentCycleKey, monthLabel, shiftCycleKey } from "@/lib/finance";

export function MonthSelector() {
  const { selectedMonth, setSelectedMonth, activeProfile } = useStore();
  const startDay = activeProfile?.cycle_start_day ?? 1;
  const current = currentCycleKey(startDay);
  const next = shiftCycleKey(current, 1);
  const label = startDay > 1 ? "Ciclo" : "Mês de referência";

  function shift(delta: number) {
    setSelectedMonth(shiftCycleKey(selectedMonth, delta));
  }

  const isCurrent = selectedMonth === current;
  const isNext = selectedMonth === next;

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-1 rounded-2xl border border-border bg-card p-1 shadow-sm">
        <button
          onClick={() => setSelectedMonth(current)}
          className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${
            isCurrent ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-secondary"
          }`}
        >
          Atual
        </button>
        <button
          onClick={() => setSelectedMonth(next)}
          className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${
            isNext ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-secondary"
          }`}
        >
          Próximo
        </button>
      </div>

      <div className="flex items-center justify-between rounded-2xl border border-border bg-card px-3 py-2 text-sm shadow-sm">
        <button onClick={() => shift(-1)} className="rounded-lg px-2 py-1 text-muted-foreground hover:bg-secondary">
          {"<"}
        </button>
        <div className="text-center">
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
          <p className="font-semibold capitalize">{monthLabel(selectedMonth, startDay)}</p>
        </div>
        <button onClick={() => shift(1)} className="rounded-lg px-2 py-1 text-muted-foreground hover:bg-secondary">
          {">"}
        </button>
      </div>
    </div>
  );
}
