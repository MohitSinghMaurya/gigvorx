import { useState, useMemo } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { daysFromNow } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Users, FileText, Receipt, BarChart3, Settings,
  Sparkles, LogOut, Menu, X, Shield, ChevronDown, Zap, Crown, User, ChevronRight,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, testid: "nav-dashboard" },
  { to: "/clients", label: "Clients", icon: Users, testid: "nav-clients" },
  { to: "/briefs", label: "Briefs", icon: FileText, testid: "nav-briefs" },
  { to: "/invoices", label: "Invoices", icon: Receipt, testid: "nav-invoices" },
  { to: "/analytics", label: "Analytics", icon: BarChart3, testid: "nav-analytics" },
];

const SECONDARY = [
  { to: "/settings", label: "Settings", icon: Settings, testid: "nav-settings" },
];

function NavLink({ to, label, icon: Icon, testid, onClick }) {
  const { pathname } = useLocation();
  const active = pathname === to || (to !== "/dashboard" && pathname.startsWith(to));
  return (
    <Link
      to={to}
      onClick={onClick}
      data-testid={testid}
      className={cn(
        "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
        active
          ? "bg-foreground text-background"
          : "text-muted-foreground hover:text-foreground hover:bg-muted"
      )}
    >
      <Icon className="w-4 h-4 shrink-0" />
      <span>{label}</span>
    </Link>
  );
}

function Breadcrumbs() {
  const { pathname } = useLocation();
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length === 0) return null;
  const labels = { dashboard: "Dashboard", clients: "Clients", briefs: "Briefs", invoices: "Invoices", analytics: "Analytics", settings: "Settings", admin: "Admin", new: "New", edit: "Edit", "pricing-app": "Pricing" };
  return (
    <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
      <Link to="/dashboard" className="hover:text-foreground">Home</Link>
      {parts.map((p, i) => {
        const path = "/" + parts.slice(0, i + 1).join("/");
        const isLast = i === parts.length - 1;
        const label = labels[p] || (p.length > 16 ? p.slice(0, 8) + "…" : p);
        return (
          <span key={path} className="flex items-center gap-1.5">
            <ChevronRight className="w-3.5 h-3.5" />
            {isLast ? (
              <span className="text-foreground font-medium">{label}</span>
            ) : (
              <Link to={path} className="hover:text-foreground capitalize">{label}</Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}

export default function AppLayout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const trialDays = useMemo(() => user?.trialEndsAt ? Math.max(0, daysFromNow(user.trialEndsAt)) : null, [user]);
  const initials = (user?.name || "U").split(" ").map(s => s[0]).join("").slice(0, 2).toUpperCase();
  const isTrial = user?.plan === "trial";
  const isAdmin = user?.role === "admin";

  const Sidebar = ({ onItemClick }) => (
    <div className="flex flex-col h-full bg-background">
      <div className="flex items-center h-16 px-5 border-b">
        <Link to="/dashboard" onClick={onItemClick} className="flex items-center gap-2.5" data-testid="brand-logo">
          <div className="relative w-8 h-8 rounded-lg bg-foreground flex items-center justify-center">
            <Zap className="w-4 h-4 text-background" strokeWidth={2.5} />
          </div>
          <span className="font-bold text-foreground text-lg tracking-tight">GigVorx</span>
        </Link>
      </div>
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        <p className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-widest px-3 mb-2">Workspace</p>
        {NAV.map(item => <NavLink key={item.to} {...item} onClick={onItemClick} />)}
        <div className="h-3" />
        <p className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-widest px-3 mb-2">Account</p>
        {SECONDARY.map(item => <NavLink key={item.to} {...item} onClick={onItemClick} />)}
        {isAdmin && (
          <NavLink to="/admin" label="Admin" icon={Shield} testid="nav-admin" onClick={onItemClick} />
        )}
      </div>
      {isTrial && (
        <div className="m-3 p-4 rounded-xl bg-foreground text-background relative overflow-hidden" data-testid="trial-card">
          <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-background/10" />
          <Sparkles className="w-5 h-5 mb-2" />
          <p className="font-semibold text-sm">{trialDays} {trialDays === 1 ? "day" : "days"} left in trial</p>
          <p className="text-xs text-background/70 mt-0.5">Upgrade to keep your workflow.</p>
          <Button
            data-testid="sidebar-upgrade-btn"
            onClick={() => { onItemClick?.(); navigate("/pricing-app"); }}
            size="sm"
            variant="secondary"
            className="mt-3 w-full bg-background text-foreground hover:bg-background/90"
          >
            Upgrade Now
          </Button>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-muted/30">
      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 md:hidden" onClick={() => setMobileOpen(false)} />
      )}
      <aside className={cn(
        "fixed md:relative inset-y-0 left-0 z-50 w-64 border-r transform transition-transform md:translate-x-0",
        mobileOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <Sidebar onItemClick={() => setMobileOpen(false)} />
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Top header */}
        <header className="h-16 border-b bg-background/80 backdrop-blur-sm flex items-center justify-between px-4 md:px-6 gap-4 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button
              data-testid="mobile-menu-toggle"
              onClick={() => setMobileOpen(true)}
              className="md:hidden p-2 -ml-2 text-foreground hover:bg-muted rounded-lg"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="hidden md:block">
              <Breadcrumbs />
            </div>
          </div>
          <div className="flex items-center gap-2 md:gap-3">
            {isTrial && trialDays !== null && (
              <Badge
                data-testid="trial-status-badge"
                variant="outline"
                className="hidden sm:inline-flex border-amber-300 bg-amber-50 text-amber-700 font-medium"
              >
                <Sparkles className="w-3 h-3 mr-1" />{trialDays}d trial left
              </Badge>
            )}
            <Button
              data-testid="header-upgrade-btn"
              size="sm"
              onClick={() => navigate("/pricing-app")}
              className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-sm"
            >
              <Crown className="w-3.5 h-3.5 mr-1.5" />
              Upgrade
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  data-testid="user-menu-trigger"
                  className="flex items-center gap-2 p-1.5 pr-2.5 rounded-lg hover:bg-muted transition-colors"
                >
                  <div className="w-7 h-7 rounded-md bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold">
                    {initials}
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <p className="text-sm font-semibold text-foreground">{user?.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/settings")} data-testid="menu-settings">
                  <User className="w-4 h-4 mr-2" />Profile & Settings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/pricing-app")} data-testid="menu-billing">
                  <Crown className="w-4 h-4 mr-2" />Billing & Plans
                </DropdownMenuItem>
                {isAdmin && (
                  <DropdownMenuItem onClick={() => navigate("/admin")} data-testid="menu-admin">
                    <Shield className="w-4 h-4 mr-2" />Admin Panel
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => { logout(); navigate("/"); }} data-testid="menu-logout" className="text-destructive focus:text-destructive">
                  <LogOut className="w-4 h-4 mr-2" />Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <div className="md:hidden px-4 py-2 border-b bg-background"><Breadcrumbs /></div>
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto p-4 md:p-8 animate-fade-up">{children}</div>
        </main>
      </div>
    </div>
  );
}
