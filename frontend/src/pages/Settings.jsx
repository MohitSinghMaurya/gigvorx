import { useEffect, useMemo, useState } from "react";
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
  Save,
  LogOut,
  Crown,
  Loader2,
  User,
  Building2,
  CreditCard,
  Globe,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const TRIAL_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

function getTrialDaysLeft(user) {
  const trialEnd = user?.trialEndsAt || user?.trial_ends_at;
  if (!trialEnd) return null;

  const endDate = new Date(trialEnd);
  if (Number.isNaN(endDate.getTime())) return null;

  const diff = endDate.getTime() - Date.now();
  if (diff <= 0) return 0;

  return Math.ceil(diff / DAY_MS);
}

function formatPlanName(plan) {
  if (!plan) return "Trial";
  return plan.charAt(0).toUpperCase() + plan.slice(1);
}

export default function Settings() {
  const { user, updateUser, logout } = useAuth();
  const { currency, setCurrency, symbol } = useCurrency();
  const navigate = useNavigate();

  const [profile, setProfile] = useState({
    name: user?.name || "",
    email: user?.email || "",
    phone: user?.phone || "",
  });

  const [business, setBusiness] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    gst: "",
  });

  const [savingProfile, setSavingProfile] = useState(false);
  const [savingBusiness, setSavingBusiness] = useState(false);
  const [savedProfile, setSavedProfile] = useState(false);
  const [savedBusiness, setSavedBusiness] = useState(false);

  useEffect(() => {
    if (!user) return;

    setProfile({
      name: user.name || "",
      email: user.email || "",
      phone: user.phone || "",
    });

    const savedBusiness = readSetting(user.id, "business", {
      name: user.name || "",
      email: user.email || "",
      phone: "",
      address: "",
      gst: "",
    });

    setBusiness(savedBusiness);
  }, [user]);

  const trialDaysLeft = useMemo(() => getTrialDaysLeft(user), [user]);
  const isTrial = user?.plan === "trial";
  const isTrialExpired = isTrial && trialDaysLeft === 0;

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

  const saveBusiness = async () => {
    if (!user?.id) return;

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
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="mt-1 text-muted-foreground">
          Profile, business details, currency, plan, and account settings.
        </p>
      </div>

      {isTrial && (
        <Card
          className={`p-5 ${
            isTrialExpired
              ? "border-red-200 bg-red-50"
              : "border-amber-200 bg-amber-50"
          }`}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex gap-3">
              <div
                className={`mt-0.5 rounded-full p-2 ${
                  isTrialExpired ? "bg-red-100" : "bg-amber-100"
                }`}
              >
                <AlertTriangle
                  className={`h-4 w-4 ${
                    isTrialExpired ? "text-red-600" : "text-amber-600"
                  }`}
                />
              </div>
              <div>
                <h3
                  className={`font-semibold ${
                    isTrialExpired ? "text-red-700" : "text-amber-700"
                  }`}
                >
                  {isTrialExpired
                    ? "Your trial has expired"
                    : `You are on a ${TRIAL_DAYS}-day free trial`}
                </h3>
                <p
                  className={`mt-1 text-sm ${
                    isTrialExpired ? "text-red-600" : "text-amber-700"
                  }`}
                >
                  {isTrialExpired
                    ? "Upgrade your plan to keep using GigVorx without interruptions."
                    : trialDaysLeft === 1
                    ? "1 day left in your trial."
                    : `${trialDaysLeft} days left in your trial.`}
                </p>
              </div>
            </div>

            <Button
              onClick={() => navigate("/pricing-app")}
              className="shrink-0 bg-gradient-to-r from-violet-600 to-indigo-600 text-white"
            >
              <Crown className="mr-1.5 h-4 w-4" />
              Upgrade
            </Button>
          </div>
        </Card>
      )}

      <Card className="p-6">
        <div className="mb-1 flex items-center gap-2">
          <User className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-bold">Profile</h3>
        </div>
        <p className="mb-4 text-xs text-muted-foreground">
          Your name and email shown across the app and on invoices.
        </p>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <Label>Full Name</Label>
            <Input
              data-testid="settings-name"
              value={profile.name}
              onChange={(e) =>
                setProfile({ ...profile, name: e.target.value })
              }
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
              onChange={(e) =>
                setProfile({ ...profile, email: e.target.value })
              }
              className="mt-1"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <Label>Phone</Label>
            <Input
              value={profile.phone}
              onChange={(e) =>
                setProfile({ ...profile, phone: e.target.value })
              }
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
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : savedProfile ? (
            <>
              <CheckCircle2 className="mr-1.5 h-4 w-4 text-green-300" />
              Saved!
            </>
          ) : (
            <>
              <Save className="mr-1.5 h-4 w-4" />
              Save profile
            </>
          )}
        </Button>
      </Card>

      <Card className="p-6">
        <div className="mb-1 flex items-center gap-2">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-bold">Business Info</h3>
        </div>
        <p className="mb-4 text-xs text-muted-foreground">
          This appears on your invoices and client-facing documents.
        </p>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <Label>Business Name</Label>
            <Input
              data-testid="settings-biz-name"
              value={business.name}
              onChange={(e) =>
                setBusiness({ ...business, name: e.target.value })
              }
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
              onChange={(e) =>
                setBusiness({ ...business, email: e.target.value })
              }
              className="mt-1"
              placeholder="business@example.com"
            />
          </div>

          <div>
            <Label>Phone</Label>
            <Input
              data-testid="settings-biz-phone"
              value={business.phone}
              onChange={(e) =>
                setBusiness({ ...business, phone: e.target.value })
              }
              className="mt-1"
              placeholder="+91 98765 43210"
            />
          </div>

          <div>
            <Label>GST / VAT Number (optional)</Label>
            <Input
              value={business.gst}
              onChange={(e) =>
                setBusiness({ ...business, gst: e.target.value })
              }
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
              onChange={(e) =>
                setBusiness({ ...business, address: e.target.value })
              }
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
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : savedBusiness ? (
            <>
              <CheckCircle2 className="mr-1.5 h-4 w-4 text-green-300" />
              Saved!
            </>
          ) : (
            <>
              <Save className="mr-1.5 h-4 w-4" />
              Save business info
            </>
          )}
        </Button>
      </Card>

      <Card className="p-6">
        <div className="mb-1 flex items-center gap-2">
          <Globe className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-bold">Currency</h3>
        </div>
        <p className="mb-4 text-xs text-muted-foreground">
          This symbol is used across invoices, dashboard totals, and money
          displays. Changing it saves automatically.
        </p>

        <div className="flex flex-wrap gap-3">
          {[
            { code: "INR", label: "₹ Indian Rupee", icon: "₹" },
            { code: "USD", label: "$ US Dollar", icon: "$" },
            { code: "GBP", label: "£ British Pound", icon: "£" },
            { code: "EUR", label: "€ Euro", icon: "€" },
          ].map((item) => (
            <button
              key={item.code}
              onClick={() => {
                setCurrency(item.code);
                toast.success(`Currency changed to ${item.label}`);
              }}
              className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-all ${
                currency === item.code
                  ? "border-blue-500 bg-blue-50 text-blue-700 shadow-sm"
                  : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground"
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              <span>{item.label}</span>
              {currency === item.code && (
                <CheckCircle2 className="h-4 w-4 text-blue-500" />
              )}
            </button>
          ))}
        </div>

        <p className="mt-3 text-xs text-muted-foreground">
          Currently selected: <strong>{symbol} ({currency})</strong>
        </p>
      </Card>

      <Card className="p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-bold">Current Plan</h3>
            </div>
            <p className="mb-3 text-xs text-muted-foreground">
              Review your current access and upgrade when you are ready.
            </p>

            <div className="flex flex-wrap items-center gap-2">
              <Badge
                className={`px-3 py-1 text-sm font-semibold capitalize ${
                  planColors[user?.plan] || planColors.trial
                }`}
              >
                {formatPlanName(user?.plan)}
              </Badge>

              {isTrial && (
                <Badge variant="outline" className="text-xs">
                  {trialDaysLeft === 0
                    ? "Trial expired"
                    : trialDaysLeft === 1
                    ? "1 day left"
                    : `${trialDaysLeft} days left`}
                </Badge>
              )}

              {user?.planStatus === "early_access" && (
                <Badge
                  variant="outline"
                  className="border-amber-200 text-xs text-amber-600"
                >
                  Early Access
                </Badge>
              )}
            </div>
          </div>

          <Button
            onClick={() => navigate("/pricing-app")}
            data-testid="settings-upgrade"
            className="shrink-0 bg-gradient-to-r from-violet-600 to-indigo-600 text-white"
          >
            <Crown className="mr-1.5 h-4 w-4" />
            {isTrial ? "Upgrade" : "Change plan"}
          </Button>
        </div>
      </Card>

      <Card className="border-destructive/20 p-6">
        <div className="mb-1 flex items-center gap-2">
          <LogOut className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-bold">Sign Out</h3>
        </div>
        <p className="mb-4 text-xs text-muted-foreground">
          End your current session on this device.
        </p>
        <Button
          variant="outline"
          onClick={handleLogout}
          data-testid="settings-logout"
          className="border-destructive/30 text-destructive hover:bg-destructive/10"
        >
          <LogOut className="mr-1.5 h-4 w-4" />
          Log out
        </Button>
      </Card>
    </div>
  );
}