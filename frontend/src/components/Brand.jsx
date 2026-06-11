import logo from "@/assets/gigvorx-logo.png";
import { cn } from "@/lib/utils";

// Round dark logo used in sidebar / header / auth side panels.
export function Brand({ size = 32, className }) {
  return (
    <img
      src={logo}
      alt="GigVorx"
      className={cn("rounded-full shrink-0 ring-1 ring-black/5", className)}
      style={{ width: size, height: size, objectFit: "cover" }}
    />
  );
}

// Word-mark used next to the logo on public/auth pages
export function BrandLockup({ size = 28, tagline = false, className }) {
  return (
    <div className={cn("inline-flex items-center gap-2.5", className)}>
      <Brand size={size} />
      <div className="leading-none">
        <span className="font-extrabold tracking-tight text-foreground" style={{ fontSize: size * 0.6 }}>
          Gig<span className="text-gradient">Vorx</span>
        </span>
        {tagline && (
          <p className="text-[9px] tracking-[0.18em] uppercase text-muted-foreground mt-0.5">Building the future together</p>
        )}
      </div>
    </div>
  );
}

// Full circular logo for landing/auth hero — bigger, with subtle shadow
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
