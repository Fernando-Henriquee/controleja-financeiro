import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { formatMoneyFromNumber, maskMoneyTyping, parseMoneyToNumber } from "@/lib/currency";

type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type"> & {
  value: number;
  onChange: (value: number) => void;
};

export function MoneyInput({ value, onChange, className, onFocus, onBlur, ...rest }: Props) {
  const [text, setText] = useState(
    () => (value !== 0 && Number.isFinite(value) ? formatMoneyFromNumber(value) : ""),
  );

  useEffect(() => {
    setText(value === 0 || !Number.isFinite(value) ? "" : formatMoneyFromNumber(value));
  }, [value]);

  return (
    <input
      {...rest}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      placeholder="R$ 0,00"
      value={text}
      className={cn(className)}
      onFocus={(e) => {
        if (parseMoneyToNumber(text) === 0) setText("");
        onFocus?.(e);
      }}
      onChange={(e) => {
        const next = maskMoneyTyping(text, e.target.value);
        setText(next);
        onChange(parseMoneyToNumber(next));
      }}
      onBlur={(e) => {
        const n = parseMoneyToNumber(text);
        if (n === 0) setText("");
        else setText(formatMoneyFromNumber(n));
        onChange(n);
        onBlur?.(e);
      }}
    />
  );
}
