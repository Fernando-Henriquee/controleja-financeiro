import { useStore } from "@/lib/store";
import { fmtBRL } from "@/lib/finance";
import { Trash2 } from "lucide-react";

export function RecentExpenses() {
  const { expenses, accounts, removeExpense } = useStore();
  const items = expenses.slice(0, 12);
  if (!items.length) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card p-6 text-center">
        <p className="text-sm text-muted-foreground">Nenhum gasto ainda. Use a barra acima para começar.</p>
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      {items.map((e, i) => {
        const account = accounts.find(a => a.id === e.account_id);
        return (
          <div key={e.id} className={`flex items-center gap-3 p-3 ${i > 0 ? "border-t border-border" : ""}`}>
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-[10px] font-bold text-white" style={{ background: account?.color ?? "#94a3b8" }}>
              {(account?.name ?? "?").slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{e.description}</p>
              <p className="text-[11px] text-muted-foreground">
                {e.category} • {e.method} • {new Date(e.occurred_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
            <p className="font-display text-sm font-semibold tabular-nums">-{fmtBRL(Number(e.amount))}</p>
            <button
              onClick={() => removeExpense(e.id)}
              className="grid h-7 w-7 place-items-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-status-danger transition"
              aria-label="Remover"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
