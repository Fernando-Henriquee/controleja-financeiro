import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { Wallet } from "lucide-react";

export default function Auth() {
  const { signIn, signUp, session } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  if (session) return <Navigate to="/" replace />;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) { toast.error("Senha precisa ter ao menos 6 caracteres"); return; }
    setLoading(true);
    const { error } = mode === "signin" ? await signIn(email, password) : await signUp(email, password);
    setLoading(false);
    if (error) { toast.error(error); return; }
    toast.success(mode === "signin" ? "Bem-vindo de volta" : "Conta criada");
    navigate("/");
  }

  return (
    <main className="min-h-screen bg-gradient-surface px-4 py-12">
      <div className="mx-auto max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-primary text-primary-foreground shadow-elegant">
            <Wallet className="h-6 w-6" />
          </div>
          <h1 className="font-display text-3xl font-bold">Copilot Financeiro</h1>
          <p className="mt-2 text-sm text-muted-foreground">Disciplina automática para seus gastos.</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-3 rounded-2xl border border-border bg-card p-5 shadow-card">
          <h2 className="font-display text-lg font-semibold">
            {mode === "signin" ? "Entrar" : "Criar conta"}
          </h2>

          <label className="block">
            <span className="text-xs text-muted-foreground">E-mail</span>
            <input
              type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
              autoComplete="email"
            />
          </label>
          <label className="block">
            <span className="text-xs text-muted-foreground">Senha</span>
            <input
              type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
            />
          </label>

          <button
            type="submit" disabled={loading}
            className="w-full rounded-xl bg-gradient-primary py-2.5 text-sm font-semibold text-primary-foreground shadow-elegant hover:opacity-90 active:scale-[0.99] transition disabled:opacity-50"
          >
            {loading ? "Aguarde..." : mode === "signin" ? "Entrar" : "Criar conta"}
          </button>

          <button
            type="button" onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="w-full text-center text-xs text-muted-foreground hover:text-primary transition"
          >
            {mode === "signin" ? "Não tem conta? Criar agora" : "Já tem conta? Entrar"}
          </button>
        </form>
      </div>
    </main>
  );
}
