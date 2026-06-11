import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Zap, ArrowRight, CheckCircle2 } from "lucide-react";

export default function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (password.length < 6) { toast.error("Password must be at least 6 characters."); return; }
    setLoading(true);
    try {
      await signup(name, email, password);
      toast.success("Account created — 7-day trial active!");
      navigate("/dashboard");
    } catch (err) { toast.error(err.message); } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex">
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <Link to="/" className="flex items-center gap-2.5 mb-10">
            <div className="w-8 h-8 rounded-lg bg-foreground flex items-center justify-center"><Zap className="w-4 h-4 text-background" /></div>
            <span className="font-bold text-lg">GigVorx</span>
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">Start your free trial</h1>
          <p className="text-muted-foreground mt-1.5 text-sm">7 days. No credit card. Cancel anytime.</p>

          <form onSubmit={submit} className="mt-8 space-y-4">
            <div>
              <Label htmlFor="name" className="text-sm">Full name</Label>
              <Input id="name" data-testid="signup-name" required value={name} onChange={(e) => setName(e.target.value)} className="mt-1.5 h-11" placeholder="Anika Kapoor" />
            </div>
            <div>
              <Label htmlFor="email" className="text-sm">Work email</Label>
              <Input id="email" data-testid="signup-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1.5 h-11" placeholder="you@company.com" />
            </div>
            <div>
              <Label htmlFor="password" className="text-sm">Password</Label>
              <Input id="password" data-testid="signup-password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1.5 h-11" placeholder="At least 6 characters" />
            </div>
            <Button type="submit" disabled={loading} data-testid="signup-submit" className="w-full h-11 bg-foreground text-background hover:bg-foreground/90 font-semibold">
              {loading ? "Creating…" : <>Create account <ArrowRight className="w-4 h-4 ml-1" /></>}
            </Button>
          </form>
          <p className="mt-8 text-sm text-muted-foreground text-center">
            Already have an account? <Link to="/login" className="font-semibold text-foreground hover:underline" data-testid="signup-login-link">Sign in</Link>
          </p>
        </div>
      </div>
      <div className="hidden lg:flex flex-1 bg-foreground text-background p-10 relative overflow-hidden">
        <div className="absolute inset-0 bg-dot opacity-10" />
        <div className="relative max-w-md m-auto">
          <p className="text-sm font-semibold uppercase tracking-widest text-background/60">What you get</p>
          <h3 className="mt-4 text-3xl font-bold leading-tight tracking-tight">Everything to look like a senior pro from day one.</h3>
          <ul className="mt-8 space-y-3 text-sm">
            {["17 niche brief templates", "Modern invoices with GST & UPI", "Client CRM that actually works", "WhatsApp + PDF sharing", "Real analytics, not vanity charts"].map(i => (
              <li key={i} className="flex items-center gap-3"><CheckCircle2 className="w-4 h-4 text-emerald-400" />{i}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
