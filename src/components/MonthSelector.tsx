import { useStore } from "@/lib/store";
import { currentCycleKey, monthLabel, shiftCycleKey } from "@/lib/finance";

export function MonthSelector() {
  const { selectedMonth, setSelectedMonth, activeProfile } = useStore();
  const startDay = activeProfile?.cycle_start_day ?? 1;
  const current = currentCycleKey(startDay);
  const label = startDay > 1 ? "Ciclo" : "Mês de referência";

  function shift(delta: number) {
    setSelectedMonth(shiftCycleKey(selectedMonth, delta));
  }

  return (
    <div className="flex items-center justify-between rounded-2xl border border-border bg-card px-3 py-2 text-sm shadow-sm">
      <button onClick={() => shift(-1)} className="rounded-lg px-2 py-1 text-muted-foreground hover:bg-secondary">
        {"<"}
      </button>
      <div className="text-center">
        <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
        <p className="font-semibold capitalize">{monthLabel(selectedMonth, startDay)}</p>
      </div>
      <div className="flex items-center gap-1">
        {selectedMonth !== current ? (
          <button onClick={() => setSelectedMonth(current)} className="rounded-lg px-2 py-1 text-xs text-primary hover:bg-primary/10">
            Atual
          </button>
        ) : null}
        <button onClick={() => shift(1)} className="rounded-lg px-2 py-1 text-muted-foreground hover:bg-secondary">
          {">"}
        </button>
      </div>
    </div>
  );
}
