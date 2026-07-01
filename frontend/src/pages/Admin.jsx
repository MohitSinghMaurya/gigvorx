import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  Clock,
  CreditCard,
  Crown,
  RefreshCw,
  ShieldCheck,
  UserCheck,
  Users,
} from "lucide-react";

import { useAuth } from "@/lib/AuthContext";
import { isSupabaseEnabled, supabase } from "@/lib/supabase";

const PAID_PLANS = ["starter", "pro", "premium", "agency"];

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function isToday(value) {
  if (!value) return false;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;

  const now = new Date();

  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

function getCreatedAt(item) {
  return item?.created_at || item?.createdAt || null;
}

function getLastActiveAt(item) {
  return item?.last_active_at || item?.lastActiveAt || null;
}

function getEventName(event) {
  return event?.event_name || event?.eventName || "Unknown event";
}

function getEventData(event) {
  return event?.event_data || event?.eventData || {};
}

function getUserName(user) {
  return user?.name || user?.full_name || user?.fullName || "—";
}

function getUserEmail(user) {
  return user?.email || user?.user_email || user?.userEmail || "—";
}

function getUserPlan(user) {
  return (user?.plan || "trial").toLowerCase();
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

  const loadAdminData = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg("");

    if (!isSupabaseEnabled) {
      setUsers([]);
      setEvents([]);
      setErrorMsg("Supabase is not configured, so admin analytics cannot load.");
      setIsLoading(false);
      return;
    }

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
  }, []);

  useEffect(() => {
    loadAdminData();
  }, [loadAdminData]);

  const stats = useMemo(() => {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const totalUsers = users.length;
    const newUsersToday = users.filter((item) => isToday(getCreatedAt(item))).length;
    const activeToday = users.filter((item) => isToday(getLastActiveAt(item))).length;

    const inactive7Days = users.filter((item) => {
      const lastActiveAt = getLastActiveAt(item);
      if (!lastActiveAt) return true;

      const date = new Date(lastActiveAt);
      if (Number.isNaN(date.getTime())) return true;

      return date < sevenDaysAgo;
    }).length;

    const trialUsers = users.filter((item) => getUserPlan(item) === "trial").length;
    const starterUsers = users.filter((item) => getUserPlan(item) === "starter").length;
    const proUsers = users.filter((item) => getUserPlan(item) === "pro").length;
    const premiumUsers = users.filter((item) => getUserPlan(item) === "premium").length;
    const agencyUsers = users.filter((item) => getUserPlan(item) === "agency").length;

    const paidPlanUsers = users.filter((item) => PAID_PLANS.includes(getUserPlan(item))).length;
    const confirmedPaidUsers = users.filter((item) => item.billing_status === "paid").length;
    const adminUsers = users.filter((item) => item.role === "admin").length;

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
      paidPlanUsers,
      confirmedPaidUsers,
      adminUsers,
    };
  }, [users]);

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-foreground/20 border-t-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Admin Dashboard</p>
          <h1 className="text-3xl font-bold tracking-tight">GigVorx Analytics</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Signed in as {user?.email || "admin user"}
          </p>
        </div>

        <button
          type="button"
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
          title="Trial Users"
          value={stats.trialUsers}
          description="Users in 7-day trial"
          icon={Crown}
        />
        <StatCard
          title="Paid Plan Users"
          value={stats.paidPlanUsers}
          description="Starter, Pro, Premium, or Agency"
          icon={CreditCard}
        />
        <StatCard
          title="Confirmed Paid"
          value={stats.confirmedPaidUsers}
          description="Users marked billing_status paid"
          icon={CreditCard}
        />
        <StatCard
          title="Admin Users"
          value={stats.adminUsers}
          description="Users with admin access"
          icon={ShieldCheck}
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
              {users.slice(0, 20).map((item) => (
                <tr key={item.id || item.email} className="border-b last:border-0">
                  <td className="p-4">{getUserName(item)}</td>
                  <td className="p-4">{getUserEmail(item)}</td>
                  <td className="p-4 capitalize">{getUserPlan(item)}</td>
                  <td className="p-4 capitalize">{item.role || "user"}</td>
                  <td className="p-4">
                    <span className="rounded-full border px-2 py-1 text-xs">
                      {item.plan_status || item.billing_status || "trial"}
                    </span>
                  </td>
                  <td className="p-4">{formatDate(getCreatedAt(item))}</td>
                  <td className="p-4">{formatDate(getLastActiveAt(item))}</td>
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
                <tr key={event.id || `${getEventName(event)}-${event.created_at}`} className="border-b last:border-0">
                  <td className="p-4 font-medium">{getEventName(event)}</td>
                  <td className="p-4 text-muted-foreground">{event.user_id || event.userId || "—"}</td>
                  <td className="p-4 text-muted-foreground">
                    <pre className="max-w-[360px] overflow-x-auto whitespace-pre-wrap text-xs">
                      {JSON.stringify(getEventData(event), null, 2)}
                    </pre>
                  </td>
                  <td className="p-4">{formatDate(getCreatedAt(event))}</td>
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