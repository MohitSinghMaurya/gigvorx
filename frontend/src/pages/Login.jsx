import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BrandLockup, BrandLogoLarge } from "@/components/Brand";
import { toast } from "sonner";
import { ArrowRight, Eye, EyeOff, CheckCircle2 } from "lucide-react";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await login(email, password);
      toast.success("Welcome back!");
      navigate(location.state?.from || "/dashboard");
    } catch (err) {
      toast.error(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <Link to="/" className="mb-10 inline-block">
            <BrandLockup size={32} />
          </Link>

          <h1 className="text-3xl font-bold tracking-tight">Welcome back</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Sign in to continue managing briefs, invoices, clients, and your
            trial status.
          </p>

          <form onSubmit={submit} className="mt-8 space-y-4">
            <div>
              <Label htmlFor="email" className="text-sm">
                Email
              </Label>
              <Input
                id="email"
                data-testid="login-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1.5 h-11"
                placeholder="you@company.com"
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm">
                  Password
                </Label>

                <button
                  type="button"
                  className="text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => toast.info("Password reset is not available yet.")}
                >
                  Forgot?
                </button>
              </div>

              <div className="relative mt-1.5">
                <Input
                  id="password"
                  data-testid="login-password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 pr-11"
                  placeholder="••••••••"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              data-testid="login-submit"
              className="h-11 w-full bg-brand-gradient font-semibold text-white shadow-sm shadow-blue-500/20 hover:opacity-90"
            >
              {loading ? (
                "Signing in..."
              ) : (
                <>
                  Sign in <ArrowRight className="ml-1 h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 space-y-2 rounded-lg border bg-muted/40 p-4 text-xs text-muted-foreground">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
              <p>If your trial has not started yet, it begins when you sign in.</p>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
              <p>Your remaining trial days are shown inside the app.</p>
            </div>
          </div>

          <div className="mt-6 space-y-1 rounded-lg border bg-muted/50 p-4 text-xs">
            <p className="font-semibold text-foreground">Try the demo</p>
            <p className="text-muted-foreground">
              User: <span className="font-mono">demo@gigvorx.com / demo1234</span>
            </p>
            <p className="text-muted-foreground">
              Admin: <span className="font-mono">admin@gigvorx.com / admin1234</span>
            </p>

            <button
              type="button"
              data-testid="login-demo-fill"
              onClick={() => {
                setEmail("demo@gigvorx.com");
                setPassword("demo1234");
              }}
              className="font-medium text-brand hover:underline"
            >
              Fill demo credentials
            </button>
          </div>

          <p className="mt-8 text-center text-sm text-muted-foreground">
            New here?{" "}
            <Link
              to="/signup"
              className="font-semibold text-foreground hover:underline"
              data-testid="login-signup-link"
            >
              Create an account
            </Link>
          </p>
        </div>
      </div>

      <div className="relative hidden flex-1 items-center justify-center overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 p-10 text-white lg:flex">
        <div className="absolute inset-0 bg-dot opacity-10" />
        <div className="absolute left-1/2 top-1/3 h-96 w-96 -translate-x-1/2 rounded-full bg-blue-500/20 blur-3xl" />

        <div className="relative max-w-md">
          <BrandLogoLarge size={88} className="mb-8" />

          <p className="text-sm font-semibold uppercase tracking-widest text-sky-300">
            Built for freelancers and agencies
          </p>

          <blockquote className="mt-4 text-3xl font-bold leading-tight tracking-tight">
            “Instead of chasing client details in chats, I now collect everything
            in one structured workflow.”
          </blockquote>

          <div className="mt-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 font-bold">
              AK
            </div>

            <div>
              <p className="text-sm font-semibold">Anika Kapoor</p>
              <p className="text-xs text-white/60">Brand Strategist</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}