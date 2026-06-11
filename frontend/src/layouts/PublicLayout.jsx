import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Zap, Menu, X } from "lucide-react";
import { useState } from "react";

export default function PublicLayout({ children }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5" data-testid="public-brand">
            <div className="w-8 h-8 rounded-lg bg-foreground flex items-center justify-center">
              <Zap className="w-4 h-4 text-background" strokeWidth={2.5} />
            </div>
            <span className="font-bold text-lg tracking-tight">GigVorx</span>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm">
            <Link to="/" className="text-muted-foreground hover:text-foreground font-medium">Features</Link>
            <Link to="/pricing" className="text-muted-foreground hover:text-foreground font-medium" data-testid="public-pricing-link">Pricing</Link>
            <a href="#testimonials" className="text-muted-foreground hover:text-foreground font-medium">Reviews</a>
          </nav>

          <div className="hidden md:flex items-center gap-2">
            {user ? (
              <Button onClick={() => navigate("/dashboard")} data-testid="public-dashboard-btn">Go to App</Button>
            ) : (
              <>
                <Button variant="ghost" onClick={() => navigate("/login")} data-testid="public-login-btn">Log in</Button>
                <Button onClick={() => navigate("/signup")} data-testid="public-signup-btn" className="bg-foreground text-background hover:bg-foreground/90">
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
            <Link to="/" className="block text-sm font-medium" onClick={() => setOpen(false)}>Features</Link>
            <Link to="/pricing" className="block text-sm font-medium" onClick={() => setOpen(false)}>Pricing</Link>
            <div className="pt-3 border-t flex gap-2">
              {user ? (
                <Button className="flex-1" onClick={() => navigate("/dashboard")}>Dashboard</Button>
              ) : (
                <>
                  <Button variant="outline" className="flex-1" onClick={() => navigate("/login")}>Log in</Button>
                  <Button className="flex-1 bg-foreground text-background" onClick={() => navigate("/signup")}>Start trial</Button>
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
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-7 h-7 rounded-md bg-foreground flex items-center justify-center"><Zap className="w-3.5 h-3.5 text-background" /></div>
              <span className="font-bold">GigVorx</span>
            </div>
            <p className="text-muted-foreground max-w-sm">The all-in-one workspace for freelancers and agencies. Briefs, invoices, CRM, analytics — built to win clients faster.</p>
          </div>
          <div>
            <p className="font-semibold mb-3">Product</p>
            <ul className="space-y-2 text-muted-foreground">
              <li><Link to="/pricing" className="hover:text-foreground">Pricing</Link></li>
              <li><Link to="/" className="hover:text-foreground">Features</Link></li>
              <li><Link to="/signup" className="hover:text-foreground">Get started</Link></li>
            </ul>
          </div>
          <div>
            <p className="font-semibold mb-3">Company</p>
            <ul className="space-y-2 text-muted-foreground">
              <li><span className="hover:text-foreground">About</span></li>
              <li><span className="hover:text-foreground">Privacy</span></li>
              <li><span className="hover:text-foreground">Terms</span></li>
            </ul>
          </div>
        </div>
        <div className="border-t py-6 text-center text-xs text-muted-foreground">© 2026 GigVorx. Built for freelancers everywhere.</div>
      </footer>
    </div>
  );
}
