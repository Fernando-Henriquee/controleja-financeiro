import { Sparkles } from "lucide-react";
import { BehaviorAlerts } from "./BehaviorAlerts";
import { FinanceCoach } from "./FinanceCoach";
import { PaywallCard } from "./PaywallCard";
import { useSubscription, canUseFeature } from "@/hooks/useSubscription";

export function IntelligenceSection() {
  const { plan, loading } = useSubscription();
  const hasAi = canUseFeature(plan, "ai_coach");

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2 px-1">
        <Sparkles className="h-3.5 w-3.5 text-primary" />
        <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Inteligencia financeira
        </h2>
      </div>
      <BehaviorAlerts />
      {loading ? null : hasAi ? (
        <FinanceCoach />
      ) : (
        <PaywallCard
          title="Coach Financeiro IA"
          description="Análise mensal automática, chat ilimitado e fila inteligente de pagamentos. Disponível no plano Pro + IA."
          requiredPlan="Pro + IA"
        />
      )}
    </section>
  );
}
