import { useStore } from "@/lib/store";
import { buildBehaviorAlerts } from "@/lib/behavior";
import { cn } from "@/lib/utils";

export function BehaviorAlerts() {
  const { income, expenses, accounts } = useStore();
  const alerts = buildBehaviorAlerts(income, expenses, accounts);

  return (
    <div className="space-y-2">
      {alerts.map((alert) => (
        <div
          key={alert.id}
          className={cn(
            "rounded-xl border px-3 py-2 text-sm",
            alert.level === "danger" && "border-status-danger/30 bg-status-danger-bg text-status-danger",
            alert.level === "warn" && "border-status-warn/30 bg-status-warn-bg text-amber-800",
            alert.level === "safe" && "border-status-safe/30 bg-status-safe-bg text-status-safe",
          )}
        >
          {alert.message}
        </div>
      ))}
    </div>
  );
}
