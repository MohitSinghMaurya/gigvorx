import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Menu, X } from "lucide-react";

import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { BrandLockup } from "@/components/Brand";

export default function PublicLayout({ children }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const scrollToFeatures = () => {
    setOpen(false);

    const element = document.getElementById("features");

    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
      return;
    }

    navigate("/?scroll=features");
  };

  const scrollToReviews = () => {
    setOpen(false);

    const element = document.getElementById("testimonials");

    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
      return;
    }

    navigate("/?scroll=reviews");
  };

  const goToDashboard = () => {
    setOpen(false);
    navigate("/dashboard");
  };

  const goToLogin = () => {
    setOpen(false);
    navigate("/login");
  };

  const goToSignup = () => {
    setOpen(false);
    navigate("/signup");
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link to="/" data-testid="public-brand" onClick={() => setOpen(false)}>
            <BrandLockup size={32} />
          </Link>

          <nav className="hidden items-center gap-8 text-sm md:flex">
            <button
              type="button"
              onClick={scrollToFeatures}
              className="font-medium text-muted-foreground hover:text-foreground"
            >
              Features
            </button>

            <Link
              to="/pricing"
              className="font-medium text-muted-foreground hover:text-foreground"
              data-testid="public-pricing-link"
            >
              Pricing
            </Link>

            <button
              type="button"
              onClick={scrollToReviews}
              className="font-medium text-muted-foreground hover:text-foreground"
            >
              Reviews
            </button>
          </nav>

          <div className="hidden items-center gap-2 md:flex">
            {user ? (
              <Button
                type="button"
                onClick={goToDashboard}
                data-testid="public-dashboard-btn"
                className="bg-brand-gradient text-white hover:opacity-90"
              >
                Go to App
              </Button>
            ) : (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={goToLogin}
                  data-testid="public-login-btn"
                >
                  Log in
                </Button>

                <Button
                  type="button"
                  onClick={goToSignup}
                  data-testid="public-signup-btn"
                  className="bg-brand-gradient text-white shadow-sm shadow-blue-500/20 hover:opacity-90"
                >
                  Start free trial
                </Button>
              </>
            )}
          </div>

          <button
            type="button"
            className="p-2 md:hidden"
            onClick={() => setOpen((value) => !value)}
            data-testid="public-mobile-toggle"
            aria-label={open ? "Close menu" : "Open menu"}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {open ? (
          <div className="space-y-3 border-t bg-background px-4 py-4 md:hidden">
            <button
              type="button"
              onClick={scrollToFeatures}
              className="block w-full text-left text-sm font-medium"
            >
              Features
            </button>

            <Link
              to="/pricing"
              className="block text-sm font-medium"
              onClick={() => setOpen(false)}
            >
              Pricing
            </Link>

            <button
              type="button"
              onClick={scrollToReviews}
              className="block w-full text-left text-sm font-medium"
            >
              Reviews
            </button>

            <div className="flex gap-2 border-t pt-3">
              {user ? (
                <Button
                  type="button"
                  className="flex-1 bg-brand-gradient text-white"
                  onClick={goToDashboard}
                >
                  Dashboard
                </Button>
              ) : (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={goToLogin}
                  >
                    Log in
                  </Button>

                  <Button
                    type="button"
                    className="flex-1 bg-brand-gradient text-white"
                    onClick={goToSignup}
                  >
                    Start trial
                  </Button>
                </>
              )}
            </div>
          </div>
        ) : null}
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t bg-muted/20">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-8 px-4 py-12 text-sm sm:px-6 md:grid-cols-4">
          <div className="col-span-2">
            <BrandLockup size={28} tagline />
            <p className="mt-4 max-w-sm text-muted-foreground">
              The client-work workspace for freelancers and agencies. Turn messy
              conversations into clear briefs, controlled revisions, invoices,
              follow-ups, and client records.
            </p>
          </div>

          <div>
            <p className="mb-3 font-semibold">Product</p>
            <ul className="space-y-2 text-muted-foreground">
              <li>
                <Link to="/pricing" className="hover:text-foreground">
                  Pricing
                </Link>
              </li>
              <li>
                <button
                  type="button"
                  onClick={scrollToFeatures}
                  className="hover:text-foreground"
                >
                  Features
                </button>
              </li>
              <li>
                <Link to="/signup" className="hover:text-foreground">
                  Start free trial
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <p className="mb-3 font-semibold">Company</p>
            <ul className="space-y-2 text-muted-foreground">
              <li>
                <Link to="/about" className="hover:text-foreground">
                  About
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="hover:text-foreground">
                  Privacy
                </Link>
              </li>
              <li>
                <Link to="/terms" className="hover:text-foreground">
                  Terms
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t py-6 text-center text-xs text-muted-foreground">
          © 2026 GigVorx. Built for freelancers and agencies everywhere.
        </div>
      </footer>
    </div>
  );
}