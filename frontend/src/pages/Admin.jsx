import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";
import {
  Users,
  UserCheck,
  Activity,
  Clock,
  Crown,
  CreditCard,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";

function formatDate(value) {
  if (!value) return "—";

  try {
    return new Date(value).toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return value;
  }
}

function isToday(value) {
  if (!value) return false;

  const date = new Date(value);
  const now = new Date();

  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

function StatCard({ title, value, description, icon: Icon }) {
  return (
    <div className="rounded-2xl border bg-background p-5 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="mt-2 text-3xl font-bold">{value}</p>
          {description ? (
            <p className="mt-1 text-xs text-muted-foreground">{description}</p>
          ) : null}
        </div>

        <div className="rounded-xl border bg-muted/40 p-3">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

export default function Admin() {
  const { user } = useAuth();

  const [users, setUsers] = useState([]);
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  async function loadAdminData() {
    setIsLoading(true);
    setErrorMsg("");

    try {
      const { data: usersData, error: usersError } = await supabase
        .from("users_profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (usersError) throw usersError;

      const { data: eventsData, error: eventsError } = await supabase
        .from("analytics_events")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (eventsError) throw eventsError;

      setUsers(usersData || []);
      setEvents(eventsData || []);
    } catch (error) {
      console.error("Admin analytics load failed:", error);
      setErrorMsg(error.message || "Failed to load admin analytics.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadAdminData();
  }, []);

  const stats = useMemo(() => {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const totalUsers = users.length;

    const newUsersToday = users.filter((u) => isToday(u.created_at)).length;

    const activeToday = users.filter((u) => isToday(u.last_active_at)).length;

    const inactive7Days = users.filter((u) => {
      if (!u.last_active_at) return true;
      return new Date(u.last_active_at) < sevenDaysAgo;
    }).length;

    const trialUsers = users.filter((u) => u.plan === "trial").length;
    const starterUsers = users.filter((u) => u.plan === "starter").length;
    const proUsers = users.filter((u) => u.plan === "pro").length;
    const premiumUsers = users.filter((u) => u.plan === "premium").length;
    const agencyUsers = users.filter((u) => u.plan === "agency").length;

    const earlyAccessUsers = users.filter((u) => {
      return (
        u.plan_status === "early_access" ||
        u.billing_status === "free_beta" ||
        (u.plan && u.plan !== "trial")
      );
    }).length;

    const paidUsers = users.filter((u) => {
      return u.billing_status === "paid";
    }).length;

    return {
      totalUsers,
      newUsersToday,
      activeToday,
      inactive7Days,
      trialUsers,
      starterUsers,
      proUsers,
      premiumUsers,
      agencyUsers,
      earlyAccessUsers,
      paidUsers,
    };
  }, [users]);

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="w-8 h-8 border-2 border-foreground/20 border-t-foreground rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Admin Dashboard</p>
          <h1 className="text-3xl font-bold tracking-tight">
            GigVorx Analytics
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Signed in as {user?.email}
          </p>
        </div>

        <button
          onClick={loadAdminData}
          className="inline-flex items-center justify-center gap-2 rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {errorMsg ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {errorMsg}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total Users"
          value={stats.totalUsers}
          description="All registered users"
          icon={Users}
        />
        <StatCard
          title="New Users Today"
          value={stats.newUsersToday}
          description="Users created today"
          icon={UserCheck}
        />
        <StatCard
          title="Active Today"
          value={stats.activeToday}
          description="Users with activity today"
          icon={Activity}
        />
        <StatCard
          title="Inactive 7+ Days"
          value={stats.inactive7Days}
          description="Users not active recently"
          icon={Clock}
        />
        <StatCard
          title="Early Access Users"
          value={stats.earlyAccessUsers}
          description="Free beta plan users"
          icon={Crown}
        />
        <StatCard
          title="Paid Users"
          value={stats.paidUsers}
          description="Will work after Razorpay/Stripe"
          icon={CreditCard}
        />
        <StatCard
          title="Admin Users"
          value={users.filter((u) => u.role === "admin").length}
          description="Users with admin access"
          icon={ShieldCheck}
        />
        <StatCard
          title="Events Tracked"
          value={events.length}
          description="Latest 50 events loaded"
          icon={Activity}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
        <StatCard title="Trial" value={stats.trialUsers} description="Trial users" icon={Users} />
        <StatCard title="Starter" value={stats.starterUsers} description="Starter users" icon={Users} />
        <StatCard title="Pro" value={stats.proUsers} description="Pro users" icon={Users} />
        <StatCard title="Premium" value={stats.premiumUsers} description="Premium users" icon={Users} />
        <StatCard title="Agency" value={stats.agencyUsers} description="Agency users" icon={Users} />
      </div>

      <div className="rounded-2xl border bg-background">
        <div className="border-b p-5">
          <h2 className="text-lg font-semibold">Recent Users</h2>
          <p className="text-sm text-muted-foreground">
            Latest registered users and their plan status.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40">
              <tr>
                <th className="p-4 text-left font-medium">Name</th>
                <th className="p-4 text-left font-medium">Email</th>
                <th className="p-4 text-left font-medium">Plan</th>
                <th className="p-4 text-left font-medium">Role</th>
                <th className="p-4 text-left font-medium">Status</th>
                <th className="p-4 text-left font-medium">Created</th>
                <th className="p-4 text-left font-medium">Last Active</th>
              </tr>
            </thead>

            <tbody>
              {users.slice(0, 20).map((u) => (
                <tr key={u.id} className="border-b last:border-0">
                  <td className="p-4">{u.name || "—"}</td>
                  <td className="p-4">{u.email || "—"}</td>
                  <td className="p-4 capitalize">{u.plan || "trial"}</td>
                  <td className="p-4 capitalize">{u.role || "user"}</td>
                  <td className="p-4">
                    <span className="rounded-full border px-2 py-1 text-xs">
                      {u.plan_status || u.billing_status || "trial"}
                    </span>
                  </td>
                  <td className="p-4">{formatDate(u.created_at)}</td>
                  <td className="p-4">{formatDate(u.last_active_at)}</td>
                </tr>
              ))}

              {users.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-6 text-center text-muted-foreground">
                    No users found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-2xl border bg-background">
        <div className="border-b p-5">
          <h2 className="text-lg font-semibold">Recent Activity Events</h2>
          <p className="text-sm text-muted-foreground">
            Latest app usage events from analytics_events.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40">
              <tr>
                <th className="p-4 text-left font-medium">Event</th>
                <th className="p-4 text-left font-medium">User ID</th>
                <th className="p-4 text-left font-medium">Data</th>
                <th className="p-4 text-left font-medium">Time</th>
              </tr>
            </thead>

            <tbody>
              {events.map((event) => (
                <tr key={event.id} className="border-b last:border-0">
                  <td className="p-4 font-medium">{event.event_name}</td>
                  <td className="p-4 text-muted-foreground">{event.user_id || "—"}</td>
                  <td className="p-4 text-muted-foreground">
                    <pre className="max-w-[360px] overflow-x-auto whitespace-pre-wrap text-xs">
                      {JSON.stringify(event.event_data || {}, null, 2)}
                    </pre>
                  </td>
                  <td className="p-4">{formatDate(event.created_at)}</td>
                </tr>
              ))}

              {events.length === 0 ? (
                <tr>
                  <td colSpan="4" className="p-6 text-center text-muted-foreground">
                    No activity events found yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}