// frontend/src/pages/Settings.jsx
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useCurrency } from "@/lib/CurrencyContext";
import { readSetting, writeSetting } from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Save, LogOut, Crown, Loader2, User, Building2,
  CreditCard, Globe, CheckCircle2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export default function Settings() {
  const { user, updateUser, logout } = useAuth();
  const { currency, setCurrency, symbol } = useCurrency();
  const navigate = useNavigate();

  // Profile state — synced from user object
  const [profile, setProfile] = useState({
    name: user?.name || "",
    email: user?.email || "",
    phone: user?.phone || "",
  });

  // Business state — loaded from localStorage
  const [business, setBusiness] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    gst: "",
  });

  // Loading states for each save button
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingBusiness, setSavingBusiness] = useState(false);
  const [savedProfile, setSavedProfile] = useState(false);
  const [savedBusiness, setSavedBusiness] = useState(false);

  // Load business info from localStorage when user is ready
  useEffect(() => {
    if (user) {
      // Sync profile from user object every time user changes
      setProfile({
        name: user.name || "",
        email: user.email || "",
        phone: user.phone || "",
      });

      // Load business info from localStorage
      const saved = readSetting(user.id, "business", {
        name: user.name || "",
        email: user.email || "",
        phone: "",
        address: "",
        gst: "",
      });
      setBusiness(saved);
    }
  }, [user?.id]);

  // Save profile — updates Supabase via updateUser
  const saveProfile = async () => {
    if (!profile.name.trim()) {
      toast.error("Name cannot be empty");
      return;
    }
    setSavingProfile(true);
    try {
      await updateUser({
        name: profile.name.trim(),
        email: profile.email.trim(),
        phone: profile.phone.trim(),
      });
      setSavedProfile(true);
      toast.success("Profile saved successfully");
      setTimeout(() => setSavedProfile(false), 3000);
    } catch (err) {
      toast.error("Failed to save profile: " + (err.message || "Unknown error"));
    } finally {
      setSavingProfile(false);
    }
  };

  // Save business — saves to localStorage
  const saveBusiness = async () => {
    setSavingBusiness(true);
    try {
      writeSetting(user.id, "business", business);
      setSavedBusiness(true);
      toast.success("Business info saved");
      setTimeout(() => setSavedBusiness(false), 3000);
    } catch (err) {
      toast.error("Failed to save business info");
    } finally {
      setSavingBusiness(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const planColors = {
    trial: "bg-gray-100 text-gray-700",
    starter: "bg-blue-100 text-blue-700",
    pro: "bg-violet-100 text-violet-700",
    premium: "bg-amber-100 text-amber-700",
    agency: "bg-emerald-100 text-emerald-700",
  };

  return (
    <div className="max-w-3xl space-y-6 pb-10">

      {/* Page header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Profile, business details, currency, plan and account.
        </p>
      </div>

      {/* ── PROFILE ── */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-1">
          <User className="w-4 h-4 text-muted-foreground" />
          <h3 className="font-bold">Profile</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Your name and email shown across the app and on invoices.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <Label>Full Name</Label>
            <Input
              data-testid="settings-name"
              value={profile.name}
              onChange={(e) => setProfile({ ...profile, name: e.target.value })}
              className="mt-1"
              placeholder="Your name"
            />
          </div>
          <div>
            <Label>Email</Label>
            <Input
              data-testid="settings-email"
              type="email"
              value={profile.email}
              onChange={(e) => setProfile({ ...profile, email: e.target.value })}
              className="mt-1"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <Label>Phone</Label>
            <Input
              value={profile.phone}
              onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
              className="mt-1"
              placeholder="+91 98765 43210"
            />
          </div>
        </div>

        <Button
          onClick={saveProfile}
          disabled={savingProfile}
          data-testid="settings-save-profile"
          className="mt-4 bg-brand-gradient text-white"
        >
          {savingProfile ? (
            <>
              <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
              Saving...
            </>
          ) : savedProfile ? (
            <>
              <CheckCircle2 className="w-4 h-4 mr-1.5 text-green-300" />
              Saved!
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-1.5" />
              Save profile
            </>
          )}
        </Button>
      </Card>

      {/* ── BUSINESS INFO ── */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-1">
          <Building2 className="w-4 h-4 text-muted-foreground" />
          <h3 className="font-bold">Business Info</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          This appears on all your invoices and client briefs.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <Label>Business Name</Label>
            <Input
              data-testid="settings-biz-name"
              value={business.name}
              onChange={(e) => setBusiness({ ...business, name: e.target.value })}
              className="mt-1"
              placeholder="Your business or freelance name"
            />
          </div>
          <div>
            <Label>Business Email</Label>
            <Input
              data-testid="settings-biz-email"
              type="email"
              value={business.email}
              onChange={(e) => setBusiness({ ...business, email: e.target.value })}
              className="mt-1"
              placeholder="business@example.com"
            />
          </div>
          <div>
            <Label>Phone</Label>
            <Input
              data-testid="settings-biz-phone"
              value={business.phone}
              onChange={(e) => setBusiness({ ...business, phone: e.target.value })}
              className="mt-1"
              placeholder="+91 98765 43210"
            />
          </div>
          <div>
            <Label>GST / VAT Number (optional)</Label>
            <Input
              value={business.gst}
              onChange={(e) => setBusiness({ ...business, gst: e.target.value })}
              className="mt-1"
              placeholder="e.g. 22AAAAA0000A1Z5"
            />
          </div>
          <div className="md:col-span-2">
            <Label>Business Address</Label>
            <Textarea
              data-testid="settings-biz-address"
              rows={2}
              value={business.address}
              onChange={(e) => setBusiness({ ...business, address: e.target.value })}
              className="mt-1"
              placeholder="Your city, state, country"
            />
          </div>
        </div>

        <Button
          onClick={saveBusiness}
          disabled={savingBusiness}
          data-testid="settings-save-biz"
          className="mt-4 bg-brand-gradient text-white"
        >
          {savingBusiness ? (
            <>
              <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
              Saving...
            </>
          ) : savedBusiness ? (
            <>
              <CheckCircle2 className="w-4 h-4 mr-1.5 text-green-300" />
              Saved!
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-1.5" />
              Save business info
            </>
          )}
        </Button>
      </Card>

      {/* ── CURRENCY ── */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-1">
          <Globe className="w-4 h-4 text-muted-foreground" />
          <h3 className="font-bold">Currency</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          This symbol is used everywhere money is shown — invoices, dashboard, analytics.
          Changing it saves automatically.
        </p>

        <div className="flex gap-3 flex-wrap">
          {[
            { code: "INR", label: "₹ Indian Rupee", symbol: "₹" },
            { code: "USD", label: "$ US Dollar", symbol: "$" },
            { code: "GBP", label: "£ British Pound", symbol: "£" },
            { code: "EUR", label: "€ Euro", symbol: "€" },
          ].map((c) => (
            <button
              key={c.code}
              onClick={() => {
                setCurrency(c.code);
                toast.success(`Currency changed to ${c.label}`);
              }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                currency === c.code
                  ? "border-blue-500 bg-blue-50 text-blue-700 shadow-sm"
                  : "border-border hover:border-foreground/30 text-muted-foreground hover:text-foreground"
              }`}
            >
              <span className="text-lg">{c.symbol}</span>
              <span>{c.label}</span>
              {currency === c.code && (
                <CheckCircle2 className="w-4 h-4 text-blue-500" />
              )}
            </button>
          ))}
        </div>

        <p className="text-xs text-muted-foreground mt-3">
          Currently selected: <strong>{symbol} ({currency})</strong> — saved automatically
        </p>
      </Card>

      {/* ── CURRENT PLAN ── */}
      <Card className="p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <CreditCard className="w-4 h-4 text-muted-foreground" />
              <h3 className="font-bold">Current Plan</h3>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              Manage your subscription and billing.
            </p>
            <div className="flex items-center gap-2">
              <Badge
                className={`capitalize px-3 py-1 text-sm font-semibold ${
                  planColors[user?.plan] || planColors.trial
                }`}
              >
                {user?.plan || "trial"}
              </Badge>
              {user?.plan === "trial" && (
                <span className="text-xs text-muted-foreground">
                  7-day free trial
                </span>
              )}
              {user?.planStatus === "early_access" && (
                <Badge variant="outline" className="text-xs border-amber-200 text-amber-600">
                  Early Access
                </Badge>
              )}
            </div>
          </div>
          <Button
            onClick={() => navigate("/pricing-app")}
            data-testid="settings-upgrade"
            className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white shrink-0"
          >
            <Crown className="w-4 h-4 mr-1.5" />
            Upgrade
          </Button>
        </div>
      </Card>

      {/* ── SIGN OUT ── */}
      <Card className="p-6 border-destructive/20">
        <div className="flex items-center gap-2 mb-1">
          <LogOut className="w-4 h-4 text-muted-foreground" />
          <h3 className="font-bold">Sign Out</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          End your current session on this device.
        </p>
        <Button
          variant="outline"
          onClick={handleLogout}
          data-testid="settings-logout"
          className="border-destructive/30 text-destructive hover:bg-destructive/10"
        >
          <LogOut className="w-4 h-4 mr-1.5" />
          Log out
        </Button>
      </Card>

    </div>
  );
}