import { useCallback, useEffect, useState } from "react";

export type MonthPlan = {
  savingsGoal: number;
  skippedAccountIds: string[];      // faturas marcadas como "vou parcelar / nao pago esse mes"
  skippedRecurringIds: string[];    // recorrentes marcadas como "vou pular"
  categoryGoals: Record<string, number>;
};

const EMPTY: MonthPlan = { savingsGoal: 0, skippedAccountIds: [], skippedRecurringIds: [], categoryGoals: {} };

function key(profileId: string, month: string) {
  return `copilot.plan.${profileId}.${month}`;
}

export function useMonthPlan(profileId: string | null | undefined, month: string) {
  const [plan, setPlan] = useState<MonthPlan>(EMPTY);

  useEffect(() => {
    if (!profileId) { setPlan(EMPTY); return; }
    try {
      const raw = localStorage.getItem(key(profileId, month));
      setPlan(raw ? { ...EMPTY, ...JSON.parse(raw) } : EMPTY);
    } catch { setPlan(EMPTY); }
  }, [profileId, month]);

  const update = useCallback((patch: Partial<MonthPlan>) => {
    if (!profileId) return;
    setPlan((prev) => {
      const next = { ...prev, ...patch };
      localStorage.setItem(key(profileId, month), JSON.stringify(next));
      return next;
    });
  }, [profileId, month]);

  const toggleAccount = useCallback((id: string) => {
    update({
      skippedAccountIds: plan.skippedAccountIds.includes(id)
        ? plan.skippedAccountIds.filter(x => x !== id)
        : [...plan.skippedAccountIds, id],
    });
  }, [plan, update]);

  const toggleRecurring = useCallback((id: string) => {
    update({
      skippedRecurringIds: plan.skippedRecurringIds.includes(id)
        ? plan.skippedRecurringIds.filter(x => x !== id)
        : [...plan.skippedRecurringIds, id],
    });
  }, [plan, update]);

  return { plan, update, toggleAccount, toggleRecurring };
}
