import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { getStripeEnvironment } from "@/lib/stripe";

export type Plan = "free" | "pro" | "pro_ai";

type SubscriptionRow = {
  status: string;
  price_id: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
};

function planFromPriceId(priceId?: string | null): Plan {
  if (!priceId) return "free";
  if (priceId.startsWith("pro_ai")) return "pro_ai";
  if (priceId.startsWith("pro")) return "pro";
  return "free";
}

function isActiveStatus(row: SubscriptionRow | null): boolean {
  if (!row) return false;
  const futureEnd = !row.current_period_end || new Date(row.current_period_end) > new Date();
  if (["active", "trialing", "past_due"].includes(row.status) && futureEnd) return true;
  if (row.status === "canceled" && futureEnd) return true;
  return false;
}

export function useSubscription() {
  const { session } = useAuth();
  const userId = session?.user?.id;
  const [row, setRow] = useState<SubscriptionRow | null>(null);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!userId) {
      setRow(null);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("subscriptions")
      .select("status, price_id, current_period_end, cancel_at_period_end")
      .eq("user_id", userId)
      .eq("environment", getStripeEnvironment())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setRow(data as SubscriptionRow | null);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  useEffect(() => {
    if (!userId) return;
    const ch = supabase
      .channel(`sub-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "subscriptions", filter: `user_id=eq.${userId}` }, () => refetch())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [userId, refetch]);

  const isActive = isActiveStatus(row);
  const plan: Plan = isActive ? planFromPriceId(row?.price_id) : "free";

  return { plan, isActive, row, loading, refetch };
}

// Feature gates per plan
type Feature = "unlimited_accounts" | "unlimited_cards" | "ai_coach" | "ai_insights";

// Todos os recursos liberados para todos os usuários.
const ALL_FEATURES: Feature[] = ["unlimited_accounts", "unlimited_cards", "ai_coach", "ai_insights"];
const LIMITS: Record<Plan, { accounts: number; cards: number; features: Feature[] }> = {
  free:   { accounts: Infinity, cards: Infinity, features: ALL_FEATURES },
  pro:    { accounts: Infinity, cards: Infinity, features: ALL_FEATURES },
  pro_ai: { accounts: Infinity, cards: Infinity, features: ALL_FEATURES },
};

export function getPlanLimits(plan: Plan) {
  return LIMITS[plan];
}

export function canUseFeature(plan: Plan, feature: Feature): boolean {
  return LIMITS[plan].features.includes(feature);
}
