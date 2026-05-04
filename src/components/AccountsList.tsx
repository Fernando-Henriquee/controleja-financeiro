import { useStore } from "@/lib/store";
import { fmtBRL } from "@/lib/finance";
import { CreditCard, Wallet } from "lucide-react";

export function AccountsList() {
  const { state } = useStore();
  return (
    <div className="space-y-2">
      {state.accounts.map((a) => {
        const usedPct = a.creditLimit ? Math.min(100, ((a.creditUsed ?? 0) / a.creditLimit) * 100) : 0;
        return (
          <div key={a.id} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl text-white" style={{ background: a.color }}>
                  <Wallet className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-display text-sm font-semibold">{a.name}</p>
                  <p className="text-xs text-muted-foreground">Saldo</p>
                </div>
              </div>
              <p className="font-display text-base font-semibold tabular-nums">{fmtBRL(a.balance)}</p>
            </div>
            {a.creditLimit ? (
              <div className="mt-3 border-t border-border pt-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <CreditCard className="h-3.5 w-3.5" /> Fatura aberta
                  </span>
                  <span className="tabular-nums">
                    {fmtBRL(a.creditUsed ?? 0)} <span className="text-muted-foreground">/ {fmtBRL(a.creditLimit)}</span>
                  </span>
                </div>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${usedPct}%`,
                      background: usedPct > 80 ? "hsl(var(--status-danger))" : usedPct > 50 ? "hsl(var(--status-warn))" : "hsl(var(--status-safe))",
                    }}
                  />
                </div>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
