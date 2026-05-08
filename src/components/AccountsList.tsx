import { useStore } from "@/lib/store";
import { fmtBRL } from "@/lib/finance";
import { CreditCard, Wallet, ShieldAlert } from "lucide-react";

export function AccountsList() {
  const { accounts } = useStore();
  return (
    <div className="space-y-2">
      {accounts.map((a) => {
        const usedPct = a.credit_limit ? Math.min(100, (Number(a.credit_used) / Number(a.credit_limit)) * 100) : 0;
        const overdraftLimit = Number(a.overdraft_limit ?? 0);
        const balance = Number(a.balance);
        const usingOverdraft = a.kind === "debit" && overdraftLimit > 0 && balance < 0;
        const overdraftUsed = usingOverdraft ? Math.min(overdraftLimit, Math.abs(balance)) : 0;
        const overdraftPct = overdraftLimit > 0 ? Math.min(100, (overdraftUsed / overdraftLimit) * 100) : 0;
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
              <p className={`font-display text-base font-semibold tabular-nums ${balance < 0 ? "text-status-danger" : ""}`}>{fmtBRL(balance)}</p>
            </div>
            {a.credit_limit ? (
              <div className="mt-3 border-t border-border pt-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <CreditCard className="h-3.5 w-3.5" /> Fatura aberta
                  </span>
                  <span className="tabular-nums">
                    {fmtBRL(Number(a.credit_used))} <span className="text-muted-foreground">/ {fmtBRL(Number(a.credit_limit))}</span>
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
            {a.kind === "debit" && overdraftLimit > 0 ? (
              <div className="mt-3 border-t border-border pt-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <ShieldAlert className="h-3.5 w-3.5" /> Cheque especial
                  </span>
                  <span className="tabular-nums">
                    {fmtBRL(overdraftUsed)} <span className="text-muted-foreground">/ {fmtBRL(overdraftLimit)}</span>
                  </span>
                </div>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${overdraftPct}%`,
                      background: overdraftPct > 85 ? "hsl(var(--status-danger))" : overdraftPct > 50 ? "hsl(var(--status-warn))" : "hsl(var(--status-safe))",
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
