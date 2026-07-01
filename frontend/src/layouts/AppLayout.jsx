import { useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { cn } from "@/lib/utils";
import { Brand } from "@/components/Brand";
import {
  LayoutDashboard,
  Users,
  FileText,
  Receipt,
  BarChart3,
  Settings,
  Sparkles,
  LogOut,
  Menu,
  X,
  Shield,
  ChevronDown,
  Crown,
  User,
  ChevronRight,
  Target,
  AlertTriangle,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const NAV = [
  {
    to: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    testid: "nav-dashboard",
  },
  { to: "/leads", label: "Leads", icon: Target, testid: "nav-leads" },
  { to: "/clients", label: "Clients", icon: Users, testid: "nav-clients" },
  { to: "/briefs", label: "Briefs", icon: FileText, testid: "nav-briefs" },
  {
    to: "/invoices",
    label: "Invoices",
    icon: Receipt,
    testid: "nav-invoices",
  },
  {
    to: "/analytics",
    label: "Analytics",
    icon: BarChart3,
    testid: "nav-analytics",
  },
];

const SECONDARY = [
  {
    to: "/settings",
    label: "Settings",
    icon: Settings,
    testid: "nav-settings",
  },
];

const DAY_MS = 24 * 60 * 60 * 1000;

function getTrialStatus(user) {
  const isTrial = user?.plan === "trial";

  if (!isTrial) {
    return {
      isTrial: false,
      daysLeft: null,
      isExpired: false,
      isLastDay: false,
      label: null,
      description: null,
    };
  }

  const trialEnd = user?.trialEndsAt || user?.trial_ends_at;

  if (!trialEnd) {
    return {
      isTrial: true,
      daysLeft: null,
      isExpired: false,
      isLastDay: false,
      label: "Trial: starts today",
      description: "Your 7-day trial starts when your account is ready.",
    };
  }

  const endDate = new Date(trialEnd);

  if (Number.isNaN(endDate.getTime())) {
    return {
      isTrial: true,
      daysLeft: null,
      isExpired: false,
      isLastDay: false,
      label: "Trial active",
      description: "Your trial is active. Upgrade anytime to continue later.",
    };
  }

  const msLeft = endDate.getTime() - Date.now();
  const isExpired = msLeft <= 0;
  const daysLeft = isExpired ? 0 : Math.ceil(msLeft / DAY_MS);

  if (isExpired) {
    return {
      isTrial: true,
      daysLeft: 0,
      isExpired: true,
      isLastDay: false,
      label: "Trial expired — upgrade to continue",
      description: "Choose a paid plan to keep using GigVorx.",
    };
  }

  if (daysLeft <= 1) {
    return {
      isTrial: true,
      daysLeft: 1,
      isExpired: false,
      isLastDay: true,
      label: "Trial ends today",
      description: "Upgrade today to avoid interruption.",
    };
  }

  return {
    isTrial: true,
    daysLeft,
    isExpired: false,
    isLastDay: false,
    label: `Trial: ${daysLeft} days left`,
    description: "Upgrade to keep your workflow after the trial.",
  };
}

function NavLink({ to, label, icon: Icon, testid, onClick }) {
  const { pathname } = useLocation();
  const active = pathname === to || (to !== "/dashboard" && pathname.startsWith(to));

  return (
    <Link
      to={to}
      onClick={onClick}
      data-testid={testid}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-foreground text-background"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span>{label}</span>
    </Link>
  );
}

function Breadcrumbs() {
  const { pathname } = useLocation();
  const parts = pathname.split("/").filter(Boolean);

  if (parts.length === 0) return null;

  const labels = {
    dashboard: "Dashboard",
    leads: "Leads",
    clients: "Clients",
    briefs: "Briefs",
    invoices: "Invoices",
    analytics: "Analytics",
    settings: "Settings",
    admin: "Admin",
    new: "New",
    edit: "Edit",
    "pricing-app": "Pricing",
  };

  return (
    <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
      <Link to="/dashboard" className="hover:text-foreground">
        Home
      </Link>

      {parts.map((part, index) => {
        const path = "/" + parts.slice(0, index + 1).join("/");
        const isLast = index === parts.length - 1;
        const label =
          labels[part] || (part.length > 16 ? part.slice(0, 8) + "..." : part);

        return (
          <span key={path} className="flex items-center gap-1.5">
            <ChevronRight className="h-3.5 w-3.5" />
            {isLast ? (
              <span className="font-medium text-foreground">{label}</span>
            ) : (
              <Link to={path} className="capitalize hover:text-foreground">
                {label}
              </Link>
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

  const trialStatus = useMemo(() => getTrialStatus(user), [user]);

  const initials = (user?.name || user?.email || "U")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const isTrial = trialStatus.isTrial;
  const isAdmin = user?.role === "admin";
  const isExpired = trialStatus.isExpired;
  const isLastDay = trialStatus.isLastDay;

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const Sidebar = ({ onItemClick }) => (
    <div className="flex h-full flex-col bg-background">
      <div className="flex h-16 items-center border-b px-5">
        <Link
          to="/dashboard"
          onClick={onItemClick}
          className="flex items-center gap-2.5"
          data-testid="brand-logo"
        >
          <Brand size={32} />
          <span className="text-lg font-extrabold tracking-tight text-foreground">
            Gig<span className="text-gradient">Vorx</span>
          </span>
        </Link>
      </div>

      <div className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
          Workspace
        </p>

        {NAV.map((item) => (
          <NavLink key={item.to} {...item} onClick={onItemClick} />
        ))}

        <div className="h-3" />

        <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
          Account
        </p>

        {SECONDARY.map((item) => (
          <NavLink key={item.to} {...item} onClick={onItemClick} />
        ))}

        {isAdmin && (
          <NavLink
            to="/admin"
            label="Admin"
            icon={Shield}
            testid="nav-admin"
            onClick={onItemClick}
          />
        )}
      </div>

      {isTrial && (
        <div
          className={`relative m-3 overflow-hidden rounded-xl p-4 text-white ${
            isExpired
              ? "bg-gradient-to-br from-rose-900 to-rose-800"
              : isLastDay
              ? "bg-gradient-to-br from-amber-900 to-amber-800"
              : "bg-gradient-to-br from-slate-900 to-slate-800"
          }`}
          data-testid="trial-card"
        >
          <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-blue-500/30 blur-xl" />

          {isExpired ? (
            <AlertTriangle className="mb-2 h-5 w-5 text-rose-300" />
          ) : isLastDay ? (
            <AlertTriangle className="mb-2 h-5 w-5 text-amber-300" />
          ) : (
            <Sparkles className="mb-2 h-5 w-5 text-sky-300" />
          )}

          <p className="text-sm font-semibold">{trialStatus.label}</p>
          <p className="mt-0.5 text-xs text-white/70">
            {trialStatus.description}
          </p>

          <Button
            data-testid="sidebar-upgrade-btn"
            onClick={() => {
              onItemClick?.();
              navigate("/pricing-app");
            }}
            size="sm"
            className={`mt-3 w-full ${
              isExpired
                ? "bg-rose-400 text-white hover:bg-rose-300"
                : "bg-white text-slate-900 hover:bg-white/90"
            }`}
          >
            Upgrade Now
          </Button>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-muted/30">
      {isExpired && (
        <div className="fixed left-0 right-0 top-0 z-50 flex items-center justify-between gap-3 bg-rose-600 px-4 py-2.5 text-white">
          <div className="flex items-center gap-2 text-sm font-medium">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            Trial expired — upgrade to continue using GigVorx.
          </div>
          <Button
            size="sm"
            onClick={() => navigate("/pricing-app")}
            className="shrink-0 bg-white font-semibold text-rose-600 hover:bg-white/90"
          >
            Upgrade Now
          </Button>
        </div>
      )}

      {isLastDay && (
        <div className="fixed left-0 right-0 top-0 z-50 flex items-center justify-between gap-3 bg-amber-500 px-4 py-2.5 text-white">
          <div className="flex items-center gap-2 text-sm font-medium">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            Trial ends today. Upgrade today to avoid interruption.
          </div>
          <Button
            size="sm"
            onClick={() => navigate("/pricing-app")}
            className="shrink-0 bg-white font-semibold text-amber-600 hover:bg-white/90"
          >
            Upgrade Now
          </Button>
        </div>
      )}

      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 transform border-r transition-transform md:relative md:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
          isExpired || isLastDay ? "mt-10 md:mt-0" : ""
        )}
      >
        <Sidebar onItemClick={() => setMobileOpen(false)} />
      </aside>

      <div
        className={`flex min-w-0 flex-1 flex-col overflow-hidden ${
          isExpired || isLastDay ? "pt-10" : ""
        }`}
      >
        <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b bg-background/80 px-4 backdrop-blur-sm md:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              data-testid="mobile-menu-toggle"
              onClick={() => setMobileOpen(true)}
              className="-ml-2 rounded-lg p-2 text-foreground hover:bg-muted md:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>

            <div className="hidden md:block">
              <Breadcrumbs />
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-3">
            {isTrial && trialStatus.label && (
              <Badge
                data-testid="trial-status-badge"
                variant="outline"
                className={`hidden font-medium sm:inline-flex ${
                  isExpired
                    ? "border-rose-300 bg-rose-50 text-rose-700"
                    : isLastDay
                    ? "border-amber-300 bg-amber-50 text-amber-700"
                    : "border-amber-300 bg-amber-50 text-amber-700"
                }`}
              >
                <Sparkles className="mr-1 h-3 w-3" />
                {trialStatus.label}
              </Badge>
            )}

            <Button
              data-testid="header-upgrade-btn"
              size="sm"
              onClick={() => navigate("/pricing-app")}
              className="bg-brand-gradient text-white shadow-sm shadow-blue-500/20 hover:opacity-90"
            >
              <Crown className="mr-1.5 h-3.5 w-3.5" />
              Upgrade
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  data-testid="user-menu-trigger"
                  className="flex items-center gap-2 rounded-lg p-1.5 pr-2.5 transition-colors hover:bg-muted"
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-md bg-logo-gradient text-xs font-bold text-white">
                    {initials}
                  </div>
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <p className="text-sm font-semibold text-foreground">
                    {user?.name || "User"}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {user?.email}
                  </p>
                </DropdownMenuLabel>

                <DropdownMenuSeparator />

                <DropdownMenuItem
                  onClick={() => navigate("/settings")}
                  data-testid="menu-settings"
                >
                  <User className="mr-2 h-4 w-4" />
                  Profile & Settings
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={() => navigate("/pricing-app")}
                  data-testid="menu-billing"
                >
                  <Crown className="mr-2 h-4 w-4" />
                  Billing & Plans
                </DropdownMenuItem>

                {isAdmin && (
                  <DropdownMenuItem
                    onClick={() => navigate("/admin")}
                    data-testid="menu-admin"
                  >
                    <Shield className="mr-2 h-4 w-4" />
                    Admin Panel
                  </DropdownMenuItem>
                )}

                <DropdownMenuSeparator />

                <DropdownMenuItem
                  onClick={handleLogout}
                  data-testid="menu-logout"
                  className="text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <div className="border-b bg-background px-4 py-2 md:hidden">
          <Breadcrumbs />
        </div>

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl animate-fade-up p-4 md:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}