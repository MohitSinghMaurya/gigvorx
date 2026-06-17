```jsx
import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BrandLockup, BrandLogoLarge } from "@/components/Brand";
import { toast } from "sonner";
import { ArrowRight, Eye, EyeOff } from "lucide-react";

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
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <Link to="/" className="inline-block mb-10">
            <BrandLockup size={32} />
          </Link>

          <h1 className="text-3xl font-bold tracking-tight">Welcome back</h1>

          <p className="text-muted-foreground mt-1.5 text-sm">
            Sign in to your workspace to continue.
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
              <div className="flex justify-between items-center">
                <Label htmlFor="password" className="text-sm">
                  Password
                </Label>

                <button
                  type="button"
                  className="text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => toast.info("Reset link sent (demo)")}
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
              className="w-full h-11 bg-brand-gradient text-white hover:opacity-90 font-semibold shadow-sm shadow-blue-500/20"
            >
              {loading ? (
                "Signing in…"
              ) : (
                <>
                  Sign in <ArrowRight className="w-4 h-4 ml-1" />
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 p-4 rounded-lg bg-muted/50 border text-xs space-y-1">
            <p className="font-semibold text-foreground">Try the demo</p>

            <p className="text-muted-foreground">
              User:{" "}
              <span className="font-mono">demo@gigvorx.com / demo1234</span>
            </p>

            <p className="text-muted-foreground">
              Admin:{" "}
              <span className="font-mono">admin@gigvorx.com / admin1234</span>
            </p>

            <button
              type="button"
              data-testid="login-demo-fill"
              onClick={() => {
                setEmail("demo@gigvorx.com");
                setPassword("demo1234");
              }}
              className="text-brand font-medium hover:underline"
            >
              Fill demo credentials
            </button>
          </div>

          <p className="mt-8 text-sm text-muted-foreground text-center">
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

      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 text-white items-center justify-center p-10 relative overflow-hidden">
        <div className="absolute inset-0 bg-dot opacity-10" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl" />

        <div className="relative max-w-md">
          <BrandLogoLarge size={88} className="mb-8" />

          <p className="text-sm font-semibold uppercase tracking-widest text-sky-300">
            For freelancers who care
          </p>

          <blockquote className="mt-4 text-3xl font-bold leading-tight tracking-tight">
            "GigVorx made me look like a $5,000 agency on day one. My closes
            went from 30% to 70%."
          </blockquote>

          <div className="mt-6 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center font-bold">
              AK
            </div>

            <div>
              <p className="font-semibold text-sm">Anika Kapoor</p>
              <p className="text-xs text-white/60">Brand Strategist</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```
