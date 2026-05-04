import { useStore } from "@/lib/store";
import { fmtBRL } from "@/lib/finance";
import { CreditCard } from "lucide-react";

export function BankInvoices() {
  const { accounts } = useStore();
  const invoices = accounts
    .filter((a) => a.credit_limit && Number(a.credit_limit) > 0)
    .map((a) => {
      const used = Number(a.credit_used);
      const limit = Number(a.credit_limit);
      return {
        ...a,
        used,
        limit,
        pct: Math.min(100, (used / limit) * 100),
      };
    })
    .sort((a, b) => b.pct - a.pct);

  if (!invoices.length) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card p-4 text-sm text-muted-foreground">
        Nenhuma fatura disponivel.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {invoices.map((item) => (
        <div key={item.id} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-lg text-white" style={{ background: item.color }}>
                <CreditCard className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-semibold">{item.name}</p>
                <p className="text-xs text-muted-foreground">Fatura aberta</p>
              </div>
            </div>
            <p className="text-sm font-semibold tabular-nums">{fmtBRL(item.used)}</p>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${item.pct}%`,
                background: item.pct > 80 ? "hsl(var(--status-danger))" : item.pct > 50 ? "hsl(var(--status-warn))" : "hsl(var(--status-safe))",
              }}
            />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {fmtBRL(item.used)} / {fmtBRL(item.limit)} ({Math.round(item.pct)}%)
          </p>
        </div>
      ))}
    </div>
  );
}
