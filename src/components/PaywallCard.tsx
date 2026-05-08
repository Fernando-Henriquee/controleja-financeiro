import { Link } from "react-router-dom";
import { Lock, Sparkles } from "lucide-react";

interface Props {
  title: string;
  description: string;
  requiredPlan: "Pro" | "Pro + IA";
}

export function PaywallCard({ title, description, requiredPlan }: Props) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/5 via-card to-card p-6 text-center shadow-sm">
      <div className="mx-auto mb-3 grid h-10 w-10 place-items-center rounded-2xl bg-primary/10 text-primary">
        <Lock className="h-4 w-4" />
      </div>
      <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-primary">
        Disponível no plano {requiredPlan}
      </p>
      <h3 className="font-display text-lg font-bold">{title}</h3>
      <p className="mx-auto mt-1 max-w-sm text-xs text-muted-foreground">{description}</p>
      <Link
        to="/planos"
        className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90"
      >
        <Sparkles className="h-3 w-3" /> Conhecer plano {requiredPlan}
      </Link>
    </div>
  );
}
