import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BrandLockup, BrandLogoLarge } from "@/components/Brand";
import { toast } from "sonner";
import { ArrowRight, CheckCircle2 } from "lucide-react";

export default function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);

    try {
      await signup(name, email, password);
      toast.success("Account created — your 7-day trial is now active.");
      navigate("/dashboard");
    } catch (err) {
      toast.error(err.message || "Signup failed");
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

          <h1 className="text-3xl font-bold tracking-tight">
            Start your 7-day free trial
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Create your GigVorx account and start organizing briefs, clients,
            invoices, and follow-ups today.
          </p>

          <form onSubmit={submit} className="mt-8 space-y-4">
            <div>
              <Label htmlFor="name" className="text-sm">
                Full name
              </Label>
              <Input
                id="name"
                data-testid="signup-name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1.5 h-11"
                placeholder="Your name"
              />
            </div>

            <div>
              <Label htmlFor="email" className="text-sm">
                Email
              </Label>
              <Input
                id="email"
                data-testid="signup-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1.5 h-11"
                placeholder="you@company.com"
              />
            </div>

            <div>
              <Label htmlFor="password" className="text-sm">
                Password
              </Label>
              <Input
                id="password"
                data-testid="signup-password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1.5 h-11"
                placeholder="Minimum 6 characters"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              data-testid="signup-submit"
              className="h-11 w-full bg-brand-gradient font-semibold text-white shadow-sm shadow-blue-500/20 hover:opacity-90"
            >
              {loading ? (
                "Creating account..."
              ) : (
                <>
                  Start free trial <ArrowRight className="ml-1 h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 space-y-2 rounded-lg border bg-muted/40 p-4 text-xs text-muted-foreground">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
              <p>Your 7-day trial starts after signup.</p>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
              <p>No permanent free plan.</p>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
              <p>Upgrade after trial to keep using GigVorx.</p>
            </div>
          </div>

          <p className="mt-8 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link
              to="/login"
              className="font-semibold text-foreground hover:underline"
              data-testid="signup-login-link"
            >
              Sign in
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
            Trial with real workflows
          </p>

          <blockquote className="mt-4 text-3xl font-bold leading-tight tracking-tight">
            “GigVorx helped me collect cleaner client requirements, control
            scope, and send invoices without chaos.”
          </blockquote>

          <div className="mt-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 font-bold">
              RK
            </div>

            <div>
              <p className="text-sm font-semibold">Riya Khanna</p>
              <p className="text-xs text-white/60">Freelance Designer</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}