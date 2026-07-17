import { cn } from "@/lib/utils";
import logoUrl from "@/assets/aal-pecas-logo.png";

export function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  if (compact) {
    return (
      <div className={cn("flex items-center", className)}>
        <img
          src={logoAsset.url}
          alt="AAL Peças"
          className="h-9 w-9 rounded-xl object-cover bg-black shadow-glow"
        />
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <img
        src={logoAsset.url}
        alt="AAL Peças logo"
        className="h-11 w-11 rounded-xl object-cover bg-black shadow-glow"
      />
      <div className="leading-none">
        <div className="font-display text-[17px] font-bold tracking-tight">
          AAL<span className="text-primary"> Peças</span>
        </div>
        <div className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
          Força que move seu caminho
        </div>
      </div>
    </div>
  );
}
