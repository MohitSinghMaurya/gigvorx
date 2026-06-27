import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Brand, BrandLockup } from "@/components/Brand";
import { Menu, X } from "lucide-react";
import { useState } from "react";

export default function PublicLayout({ children }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const scrollToFeatures = () => {
    setOpen(false);
    const el = document.getElementById("features");
    if (el) el.scrollIntoView({ behavior: "smooth" });
    else navigate("/#features");
  };

  const scrollToReviews = () => {
  setOpen(false);
  const el = document.getElementById("testimonials");
  if (el) {
    el.scrollIntoView({ behavior: "smooth" });
  } else {
    navigate("/?scroll=reviews");
  }

  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/" data-testid="public-brand">
            <BrandLockup size={32} />
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm">
            <button onClick={scrollToFeatures} className="text-muted-foreground hover:text-foreground font-medium">Features</button>
            <Link to="/pricing" className="text-muted-foreground hover:text-foreground font-medium" data-testid="public-pricing-link">Pricing</Link>
            <button onClick={scrollToReviews} className="text-muted-foreground hover:text-foreground font-medium">Reviews</button>
          </nav>

          <div className="hidden md:flex items-center gap-2">
            {user ? (
              <Button onClick={() => navigate("/dashboard")} data-testid="public-dashboard-btn" className="bg-brand-gradient text-white hover:opacity-90">Go to App</Button>
            ) : (
              <>
                <Button variant="ghost" onClick={() => navigate("/login")} data-testid="public-login-btn">Log in</Button>
                <Button onClick={() => navigate("/signup")} data-testid="public-signup-btn" className="bg-brand-gradient text-white hover:opacity-90 shadow-sm shadow-blue-500/20">
                  Start free trial
                </Button>
              </>
            )}
          </div>

          <button className="md:hidden p-2" onClick={() => setOpen(v => !v)} data-testid="public-mobile-toggle">
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
        {open && (
          <div className="md:hidden border-t bg-background px-4 py-4 space-y-3">
            <button onClick={scrollToFeatures} className="block text-sm font-medium w-full text-left">Features</button>
            <Link to="/pricing" className="block text-sm font-medium" onClick={() => setOpen(false)}>Pricing</Link>
            <button onClick={scrollToReviews} className="block text-sm font-medium w-full text-left">Reviews</button>
            <div className="pt-3 border-t flex gap-2">
              {user ? (
                <Button className="flex-1 bg-brand-gradient text-white" onClick={() => navigate("/dashboard")}>Dashboard</Button>
              ) : (
                <>
                  <Button variant="outline" className="flex-1" onClick={() => navigate("/login")}>Log in</Button>
                  <Button className="flex-1 bg-brand-gradient text-white" onClick={() => navigate("/signup")}>Start trial</Button>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t bg-muted/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 grid grid-cols-2 md:grid-cols-4 gap-8 text-sm">
          <div className="col-span-2">
            <BrandLockup size={28} tagline />
            <p className="text-muted-foreground max-w-sm mt-4">The all-in-one workspace for freelancers and agencies. Briefs, invoices, leads, CRM, analytics — built to win clients faster.</p>
          </div>
          <div>
            <p className="font-semibold mb-3">Product</p>
            <ul className="space-y-2 text-muted-foreground">
              <li><Link to="/pricing" className="hover:text-foreground">Pricing</Link></li>
              <li><button onClick={scrollToFeatures} className="hover:text-foreground">Features</button></li>
              <li><Link to="/signup" className="hover:text-foreground">Get started</Link></li>
            </ul>
          </div>
          <div>
            <p className="font-semibold mb-3">Company</p>
            <ul className="space-y-2 text-muted-foreground">
              <li><Link to="/about" className="hover:text-foreground">About</Link></li>
              <li><Link to="/privacy" className="hover:text-foreground">Privacy</Link></li>
              <li><Link to="/terms" className="hover:text-foreground">Terms</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t py-6 text-center text-xs text-muted-foreground">© 2026 GigVorx. Built for freelancers everywhere.</div>
      </footer>
    </div>
  );
}