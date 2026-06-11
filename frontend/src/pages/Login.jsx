import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Zap, ArrowRight } from "lucide-react";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
          <Link to="/" className="flex items-center gap-2.5 mb-10">
            <div className="w-8 h-8 rounded-lg bg-foreground flex items-center justify-center"><Zap className="w-4 h-4 text-background" /></div>
            <span className="font-bold text-lg">GigVorx</span>
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">Welcome back</h1>
          <p className="text-muted-foreground mt-1.5 text-sm">Sign in to your workspace to continue.</p>

          <form onSubmit={submit} className="mt-8 space-y-4">
            <div>
              <Label htmlFor="email" className="text-sm">Email</Label>
              <Input id="email" data-testid="login-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1.5 h-11" placeholder="you@company.com" />
            </div>
            <div>
              <div className="flex justify-between items-center">
                <Label htmlFor="password" className="text-sm">Password</Label>
                <button type="button" className="text-xs text-muted-foreground hover:text-foreground" onClick={() => toast.info("Reset link sent (demo)")}>Forgot?</button>
              </div>
              <Input id="password" data-testid="login-password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1.5 h-11" placeholder="••••••••" />
            </div>
            <Button type="submit" disabled={loading} data-testid="login-submit" className="w-full h-11 bg-foreground text-background hover:bg-foreground/90 font-semibold">
              {loading ? "Signing in…" : <>Sign in <ArrowRight className="w-4 h-4 ml-1" /></>}
            </Button>
          </form>

          <div className="mt-6 p-4 rounded-lg bg-muted/50 border text-xs space-y-1">
            <p className="font-semibold text-foreground">Try the demo</p>
            <p className="text-muted-foreground">User: <span className="font-mono">demo@gigvorx.com / demo1234</span></p>
            <p className="text-muted-foreground">Admin: <span className="font-mono">admin@gigvorx.com / admin1234</span></p>
            <button type="button" data-testid="login-demo-fill" onClick={() => { setEmail("demo@gigvorx.com"); setPassword("demo1234"); }} className="text-brand font-medium hover:underline">Fill demo credentials</button>
          </div>

          <p className="mt-8 text-sm text-muted-foreground text-center">
            New here? <Link to="/signup" className="font-semibold text-foreground hover:underline" data-testid="login-signup-link">Create an account</Link>
          </p>
        </div>
      </div>
      <div className="hidden lg:flex flex-1 bg-foreground text-background items-center justify-center p-10 relative overflow-hidden">
        <div className="absolute inset-0 bg-dot opacity-10" />
        <div className="relative max-w-md">
          <p className="text-sm font-semibold uppercase tracking-widest text-background/60">For freelancers who care</p>
          <blockquote className="mt-4 text-3xl font-bold leading-tight tracking-tight">
            "GigVorx made me look like a $5,000 agency on day one. My closes went from 30% to 70%."
          </blockquote>
          <div className="mt-6 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-background/10 flex items-center justify-center font-bold">AK</div>
            <div>
              <p className="font-semibold text-sm">Anika Kapoor</p>
              <p className="text-xs text-background/60">Brand Strategist</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
