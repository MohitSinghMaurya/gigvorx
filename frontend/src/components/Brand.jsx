import logo from "@/assets/gigvorx-logo.png";
import { cn } from "@/lib/utils";

export function Brand({ size = 32, className }) {
  return (
    <img
      src={logo}
      alt="GigVorx"
      className={cn("shrink-0 rounded-full ring-1 ring-black/5", className)}
      style={{ width: size, height: size, objectFit: "cover" }}
    />
  );
}

export function BrandLockup({ size = 28, tagline = false, className }) {
  return (
    <div className={cn("inline-flex items-center gap-2.5", className)}>
      <Brand size={size} />

      <div className="leading-none">
        <span
          className="font-extrabold tracking-tight text-foreground"
          style={{ fontSize: size * 0.6 }}
        >
          Gig<span className="text-gradient">Vorx</span>
        </span>

        {tagline ? (
          <p className="mt-0.5 text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
            Client work, clearer
          </p>
        ) : null}
      </div>
    </div>
  );
}

export function BrandLogoLarge({ size = 96, className }) {
  return (
    <img
      src={logo}
      alt="GigVorx"
      className={cn("rounded-full shadow-xl shadow-blue-500/20", className)}
      style={{ width: size, height: size, objectFit: "cover" }}
    />
  );
}