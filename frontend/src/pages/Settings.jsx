import { useEffect, useState } from "react";
import { useAuth } from " @/lib/AuthContext";
import { readSetting, writeSetting } from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Save, LogOut, Crown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export default function Settings() {
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState({ name: user?.name || "", email: user?.email || "" });
  const [business, setBusiness] = useState({ name: "", email: "", phone: "", address: "" });

  useEffect(() => {
    if (user) {
      const b = readSetting(user.id, "business", { name: user.name || "", email: user.email || "", phone: "", address: "" });
      setBusiness(b);
    }
  }, [user]);

  const saveProfile = () => { updateUser(profile); toast.success("Profile updated"); };
  const saveBusiness = () => { writeSetting(user.id, "business", business); toast.success("Business info saved"); };

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">Profile, business details, plan & account.</p>
      </div>

      <Card className="p-6">
        <h3 className="font-bold mb-1">Profile</h3>
        <p className="text-xs text-muted-foreground mb-4">Used across the app and in invoices.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div><Label>Name</Label><Input data-testid="settings-name" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} className="mt-1" /></div>
          <div><Label>Email</Label><Input data-testid="settings-email" type="email" value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} className="mt-1" /></div>
        </div>
        <Button onClick={saveProfile} data-testid="settings-save-profile" className="mt-4 bg-brand-gradient text-white"><Save className="w-4 h-4 mr-1.5" />Save profile</Button>
      </Card>

      <Card className="p-6">
        <h3 className="font-bold mb-1">Business info</h3>
        <p className="text-xs text-muted-foreground mb-4">This appears on invoices and briefs.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div><Label>Business name</Label><Input data-testid="settings-biz-name" value={business.name} onChange={(e) => setBusiness({ ...business, name: e.target.value })} className="mt-1" /></div>
          <div><Label>Email</Label><Input data-testid="settings-biz-email" value={business.email} onChange={(e) => setBusiness({ ...business, email: e.target.value })} className="mt-1" /></div>
          <div><Label>Phone</Label><Input data-testid="settings-biz-phone" value={business.phone} onChange={(e) => setBusiness({ ...business, phone: e.target.value })} className="mt-1" /></div>
          <div><Label>Address</Label><Textarea data-testid="settings-biz-address" rows={2} value={business.address} onChange={(e) => setBusiness({ ...business, address: e.target.value })} className="mt-1" /></div>
        </div>
        <Button onClick={saveBusiness} data-testid="settings-save-biz" className="mt-4 bg-brand-gradient text-white"><Save className="w-4 h-4 mr-1.5" />Save business</Button>
      </Card>

      <Card className="p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-bold mb-1">Current plan</h3>
            <p className="text-xs text-muted-foreground mb-3">Manage your subscription and billing.</p>
            <Badge className="capitalize bg-foreground">{user?.plan}</Badge>
          </div>
          <Button onClick={() => navigate("/pricing-app")} data-testid="settings-upgrade" className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white"><Crown className="w-4 h-4 mr-1.5" />Upgrade</Button>
        </div>
      </Card>

      <Card className="p-6 border-destructive/30">
        <h3 className="font-bold mb-1">Sign out</h3>
        <p className="text-xs text-muted-foreground mb-4">End your session on this device.</p>
        <Button variant="outline" onClick={() => { logout(); navigate("/"); }} data-testid="settings-logout" className="border-destructive/30 text-destructive hover:bg-destructive/10"><LogOut className="w-4 h-4 mr-1.5" />Log out</Button>
      </Card>
    </div>
  );
}
