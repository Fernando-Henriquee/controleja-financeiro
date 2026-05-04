import { useState, useRef } from "react";
import { useStore } from "@/lib/store";
import { Mic, Send, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { fmtBRL } from "@/lib/finance";

const SUGGESTIONS = [
  "30 almoço debito itau",
  "50 gasolina credito nubank",
  "15 uber pix picpay",
  "120 mercado credito itau",
];

export function FastInput() {
  const { addExpenseFromText } = useStore();
  const [value, setValue] = useState("");
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  function submit(text?: string) {
    const t = (text ?? value).trim();
    if (!t) return;
    const exp = addExpenseFromText(t);
    if (!exp) {
      toast.error("Não consegui entender. Tente: 30 almoço debito");
      return;
    }
    toast.success(`${fmtBRL(exp.amount)} • ${exp.category} • ${exp.method}`);
    setValue("");
  }

  function startVoice() {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { toast.error("Voz não suportada neste navegador"); return; }
    const rec = new SR();
    rec.lang = "pt-BR";
    rec.continuous = false;
    rec.interimResults = false;
    rec.onresult = (e: any) => {
      const t = e.results[0][0].transcript;
      setValue(t);
      submit(t);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    rec.start();
    recognitionRef.current = rec;
    setListening(true);
  }

  return (
    <div className="space-y-2">
      <form
        onSubmit={(e) => { e.preventDefault(); submit(); }}
        className="flex items-center gap-2 rounded-2xl border border-border bg-card p-2 shadow-card focus-within:border-primary focus-within:shadow-glow transition-all"
      >
        <Sparkles className="ml-2 h-4 w-4 shrink-0 text-primary" />
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="ex: 50 gasolina credito nubank"
          className="flex-1 bg-transparent py-2 text-sm outline-none placeholder:text-muted-foreground"
          autoComplete="off"
        />
        <button
          type="button"
          onClick={startVoice}
          aria-label="Voz"
          className={`grid h-9 w-9 place-items-center rounded-xl text-muted-foreground hover:bg-secondary transition ${listening ? "animate-pulse-glow text-primary" : ""}`}
        >
          <Mic className="h-4 w-4" />
        </button>
        <button
          type="submit"
          aria-label="Enviar"
          className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-primary text-primary-foreground shadow-elegant hover:opacity-90 active:scale-95 transition"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
      <div className="no-scrollbar flex gap-2 overflow-x-auto">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => submit(s)}
            className="shrink-0 rounded-full border border-border bg-surface px-3 py-1 text-xs text-muted-foreground hover:border-primary hover:text-primary transition"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
