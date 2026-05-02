import { cn } from "@/lib/utils";
import logoSrc from "@/assets/converte-ai-logo.png";

export function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  if (compact) {
    return (
      <div className={cn("flex items-center", className)}>
        <img
          src={logoSrc}
          alt="Converte-ai"
          className="h-9 w-9 rounded-xl object-cover shadow-glow"
        />
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <img
        src={logoSrc}
        alt="Converte-ai logo"
        className="h-11 w-11 rounded-xl object-cover shadow-glow"
      />
      <div className="leading-none">
        <div className="font-display text-[17px] font-bold tracking-tight">
          Converte<span className="text-primary">-ai</span>
        </div>
        <div className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
          CRM • WhatsApp
        </div>
      </div>
    </div>
  );
}
