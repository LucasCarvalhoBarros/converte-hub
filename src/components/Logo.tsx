import { MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-primary shadow-glow">
        <MessageCircle className="h-5 w-5 text-primary-foreground" strokeWidth={2.5} />
        <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-warning ring-2 ring-background" />
      </div>
      {!compact && (
        <div className="leading-none">
          <div className="font-display text-[17px] font-bold tracking-tight">
            Converte<span className="text-primary">-ai</span>
          </div>
          <div className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            CRM • WhatsApp
          </div>
        </div>
      )}
    </div>
  );
}
