import { Sparkles } from "lucide-react";
import { BehaviorAlerts } from "./BehaviorAlerts";
import { FinanceCoach } from "./FinanceCoach";

export function IntelligenceSection() {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2 px-1">
        <Sparkles className="h-3.5 w-3.5 text-primary" />
        <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Inteligencia financeira
        </h2>
      </div>
      <BehaviorAlerts />
      <FinanceCoach />
    </section>
  );
}
