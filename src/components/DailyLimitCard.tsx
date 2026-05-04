import { useStore } from "@/lib/store";
import { dailyLimit, todaySpent, dailyStatus, fmtBRL, daysRemaining } from "@/lib/finance";
import { cn } from "@/lib/utils";

export function DailyLimitCard() {
  const { income, expenses } = useStore();
  const limit = dailyLimit(income, expenses);
  const spent = todaySpent(expenses);
  const status = dailyStatus(income, expenses);
  const remaining = Math.max(0, limit - spent);
  const pct = limit > 0 ? Math.min(100, (spent / limit) * 100) : 100;

  const grad = status === "safe" ? "bg-gradient-safe" : status === "warn" ? "bg-gradient-warn" : "bg-gradient-danger";
  const message =
    status === "danger"
      ? "Não recomendado gastar mais hoje"
      : status === "warn"
      ? "Atenção, você está chegando no limite"
      : "Você está dentro do limite diário";

  return (
    <div className={cn("relative overflow-hidden rounded-2xl p-6 text-white shadow-elegant", grad)}>
      <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
      <div className="relative">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium uppercase tracking-wider text-white/80">Limite de hoje</p>
          <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-semibold">
            {daysRemaining()} dias restantes
          </span>
        </div>
        <p className="mt-2 font-display text-4xl font-bold">{fmtBRL(remaining)}</p>
        <p className="mt-1 text-xs text-white/80">
          de {fmtBRL(limit)} • gasto hoje {fmtBRL(spent)}
        </p>
        <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-white/20">
          <div className="h-full rounded-full bg-white transition-all duration-500" style={{ width: `${pct}%` }} />
        </div>
        <p className="mt-3 text-sm font-medium">{message}</p>
      </div>
    </div>
  );
}
