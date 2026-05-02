import { cn } from "@/lib/utils";
import { ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";

interface SignalBadgeProps {
  signal: string;
  className?: string;
  showIcon?: boolean;
}

export function SignalBadge({ signal, className, showIcon = true }: SignalBadgeProps) {
  const isCall = signal === "CALL";
  const isPut = signal === "PUT";
  const isNeutro = signal === "NEUTRO";

  return (
    <div
      className={cn(
        "inline-flex items-center justify-center font-mono font-bold text-xs px-2.5 py-1 rounded",
        isCall && "bg-[hsl(var(--call))/0.15] text-[hsl(var(--call))] border border-[hsl(var(--call))/0.3]",
        isPut && "bg-[hsl(var(--put))/0.15] text-[hsl(var(--put))] border border-[hsl(var(--put))/0.3]",
        isNeutro && "bg-muted text-muted-foreground border border-border",
        className
      )}
    >
      {showIcon && isCall && <ArrowUpRight className="w-3.5 h-3.5 mr-1" />}
      {showIcon && isPut && <ArrowDownRight className="w-3.5 h-3.5 mr-1" />}
      {showIcon && isNeutro && <Minus className="w-3.5 h-3.5 mr-1" />}
      {signal}
    </div>
  );
}
