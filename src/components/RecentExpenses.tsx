import { useStore } from "@/lib/store";
import { fmtBRL } from "@/lib/finance";
import { Car, ShoppingCart, Soup, Stethoscope, Home, Receipt, Trash2 } from "lucide-react";

function groupLabel(date: Date): string {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const dayMs = 24 * 60 * 60 * 1000;
  const value = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  if (value === today) return "HOJE";
  if (value === today - dayMs) return "ONTEM";
  if (value >= today - 6 * dayMs) return "ESTA SEMANA";
  return "ANTERIORES";
}

function CategoryIcon({ category }: { category: string }) {
  const key = category.toLowerCase();
  const Icon = key.includes("transporte")
    ? Car
    : key.includes("aliment")
    ? Soup
    : key.includes("sa")
    ? Stethoscope
    : key.includes("moradia")
    ? Home
    : key.includes("compras")
    ? ShoppingCart
    : Receipt;
  return <Icon className="h-3.5 w-3.5" />;
}

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
        const currentGroup = groupLabel(new Date(e.occurred_at));
        const prevGroup = i > 0 ? groupLabel(new Date(items[i - 1].occurred_at)) : null;
        const showGroup = i === 0 || prevGroup !== currentGroup;
        return (
          <div key={e.id}>
            {showGroup ? (
              <div className={`px-3 py-2 text-[10px] font-semibold tracking-[0.18em] text-muted-foreground ${i > 0 ? "border-t border-border" : ""}`}>
                {currentGroup}
              </div>
            ) : null}
            <div className={`flex items-center gap-3 p-3 ${!showGroup ? "border-t border-border" : ""}`}>
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-secondary text-muted-foreground">
                <CategoryIcon category={e.category} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{e.description}</p>
                <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                  <span className="rounded-full bg-secondary px-2 py-0.5">{e.category}</span>
                  <span className="rounded-full px-2 py-0.5 text-white" style={{ background: account?.color ?? "#94a3b8" }}>
                    {account?.name ?? "Conta"}
                  </span>
                  <span className="rounded-full border border-border px-2 py-0.5">{e.method}</span>
                  <span>{new Date(e.occurred_at).toLocaleDateString("pt-BR")}</span>
                </div>
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
          </div>
        );
      })}
    </div>
  );
}
