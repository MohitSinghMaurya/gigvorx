import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { readGlobal, writeGlobal, uid } from "@/lib/storage";
import { supabase, isSupabaseEnabled } from "@/lib/supabase";

const AuthContext = createContext(null);

const VALID_PLANS = ["trial", "starter", "pro", "premium", "agency"];

const DEMO_USER = {
  id: "demo-user-1",
  name: "Demo User",
  email: "demo@gigvorx.com",
  password: "demo1234",
  plan: "trial",
  role: "user",
  planStatus: "trial",
  billingStatus: "free",
  subscriptionActive: false,
  earlyAccessStartedAt: null,
  lastActiveAt: null,
  createdAt: "2025-01-15T00:00:00.000Z",
  trialEndsAt: new Date(Date.now() + 7 * 86400000).toISOString(),
};

const ADMIN_USER = {
  id: "admin-user-1",
  name: "Admin",
  email: "admin@gigvorx.com",
  password: "admin1234",
  plan: "agency",
  role: "admin",
  planStatus: "early_access",
  billingStatus: "free_beta",
  subscriptionActive: true,
  earlyAccessStartedAt: new Date().toISOString(),
  lastActiveAt: null,
  createdAt: "2025-01-01T00:00:00.000Z",
  trialEndsAt: null,
};

function seedUsers() {
  const users = readGlobal("users", null);

  if (!users) {
    writeGlobal("users", [DEMO_USER, ADMIN_USER]);
  } else {
    let updated = [...users];

    if (!updated.find((u) => u.email === DEMO_USER.email)) {
      updated.push(DEMO_USER);
    }

    if (!updated.find((u) => u.email === ADMIN_USER.email)) {
      updated.push(ADMIN_USER);
    }

    if (updated.length !== users.length) {
      writeGlobal("users", updated);
    }
  }
}

function normalizePlan(plan) {
  if (!plan) return null;

  const cleanPlan = String(plan).toLowerCase().trim();

  if (!VALID_PLANS.includes(cleanPlan)) return null;
  if (cleanPlan === "trial") return null;

  return cleanPlan;
}

function getPendingEarlyAccessPlan() {
  const pendingPlan =
    localStorage.getItem("gigvorx_pending_plan") ||
    localStorage.getItem("gigvorx_early_access_plan");

  return normalizePlan(pendingPlan);
}

function saveEarlyAccessLocal(plan) {
  const cleanPlan = normalizePlan(plan);

  if (!cleanPlan) return;

  const now = new Date().toISOString();

  localStorage.setItem("gigvorx_early_access_plan", cleanPlan);
  localStorage.setItem("gigvorx_plan_status", "early_access");
  localStorage.setItem("gigvorx_billing_status", "free_beta");
  localStorage.setItem("gigvorx_subscription_active", "true");

  if (!localStorage.getItem("gigvorx_early_access_started_at")) {
    localStorage.setItem("gigvorx_early_access_started_at", now);
  }
}

function mapDbProfileToUser(data, authUser = null) {
  return {
    id: data.id,
    email: data.email || authUser?.email,
    name:
      data.name ||
      authUser?.user_metadata?.name ||
      authUser?.email?.split("@")[0] ||
      "User",
    plan: data.plan || "trial",
    role: data.role || "user",
    planStatus: data.plan_status || "trial",
    billingStatus: data.billing_status || "free",
    subscriptionActive: Boolean(data.subscription_active),
    earlyAccessStartedAt: data.early_access_started_at || null,
    lastActiveAt: data.last_active_at || null,
    trialEndsAt: data.trial_ends_at || null,
    createdAt: data.created_at || authUser?.created_at || new Date().toISOString(),
  };
}

async function saveProfileToSupabase(profile) {
  if (!supabase || !profile?.id) return { error: null };

  const now = new Date().toISOString();
  const isPaidOrEarlyAccess = profile.plan && profile.plan !== "trial";

  const profilePayload = {
    id: profile.id,
    email: profile.email,
    name: profile.name || profile.email?.split("@")[0] || "User",
    plan: profile.plan || "trial",
    role: profile.role || "user",
    trial_ends_at: isPaidOrEarlyAccess
      ? null
      : profile.trialEndsAt || profile.trial_ends_at || null,
    plan_status: isPaidOrEarlyAccess
      ? profile.planStatus || profile.plan_status || "early_access"
      : profile.planStatus || profile.plan_status || "trial",
    billing_status: isPaidOrEarlyAccess
      ? profile.billingStatus || profile.billing_status || "free_beta"
      : profile.billingStatus || profile.billing_status || "free",
    subscription_active: isPaidOrEarlyAccess
      ? true
      : Boolean(profile.subscriptionActive || profile.subscription_active),
    early_access_started_at: isPaidOrEarlyAccess
      ? profile.earlyAccessStartedAt ||
        profile.early_access_started_at ||
        now
      : profile.earlyAccessStartedAt ||
        profile.early_access_started_at ||
        null,
    last_active_at:
      profile.lastActiveAt || profile.last_active_at || null,
    updated_at: now,
  };

  return await supabase.from("users_profiles").upsert(profilePayload);
}

async function loadProfile(authUser) {
  if (!supabase || !authUser) return null;

  const { data, error } = await supabase
    .from("users_profiles")
    .select("*")
    .eq("id", authUser.id)
    .maybeSingle();

  if (error) {
    console.error("Failed to load user profile:", error);
  }

  const localEarlyAccessPlan = getPendingEarlyAccessPlan();

  if (data) {
    const dbProfile = mapDbProfileToUser(data, authUser);
    const finalPlan = localEarlyAccessPlan || dbProfile.plan || "trial";
    const isEarlyAccess = finalPlan !== "trial";

    const finalProfile = {
      ...dbProfile,
      plan: finalPlan,
      trialEndsAt: isEarlyAccess ? null : dbProfile.trialEndsAt,
      planStatus: isEarlyAccess ? "early_access" : dbProfile.planStatus || "trial",
      billingStatus: isEarlyAccess ? "free_beta" : dbProfile.billingStatus || "free",
      subscriptionActive: isEarlyAccess ? true : dbProfile.subscriptionActive,
      earlyAccessStartedAt: isEarlyAccess
        ? dbProfile.earlyAccessStartedAt || new Date().toISOString()
        : dbProfile.earlyAccessStartedAt,
    };

    if (localEarlyAccessPlan && localEarlyAccessPlan !== data.plan) {
      saveEarlyAccessLocal(localEarlyAccessPlan);
      await saveProfileToSupabase(finalProfile);
      localStorage.removeItem("gigvorx_pending_plan");
    }

    return finalProfile;
  }

  const newPlan = localEarlyAccessPlan || "trial";
  const isEarlyAccess = newPlan !== "trial";
  const now = new Date().toISOString();

  const newProfile = {
    id: authUser.id,
    email: authUser.email,
    name: authUser.user_metadata?.name || authUser.email?.split("@")[0] || "User",
    plan: newPlan,
    role: "user",
    planStatus: isEarlyAccess ? "early_access" : "trial",
    billingStatus: isEarlyAccess ? "free_beta" : "free",
    subscriptionActive: isEarlyAccess,
    earlyAccessStartedAt: isEarlyAccess ? now : null,
    lastActiveAt: null,
    trialEndsAt: isEarlyAccess
      ? null
      : new Date(Date.now() + 7 * 86400000).toISOString(),
    createdAt: authUser.created_at || now,
  };

  await saveProfileToSupabase(newProfile);

  if (localEarlyAccessPlan) {
    saveEarlyAccessLocal(localEarlyAccessPlan);
    localStorage.removeItem("gigvorx_pending_plan");
  }

  return newProfile;
}

async function trackUserActivity(userId, eventName = "app_opened", eventData = {}) {
  if (!supabase || !userId || !isSupabaseEnabled) return;

  const now = new Date().toISOString();

  try {
    await supabase
      .from("users_profiles")
      .update({
        last_active_at: now,
        updated_at: now,
      })
      .eq("id", userId);

    await supabase.from("analytics_events").insert({
      user_id: userId,
      event_name: eventName,
      event_data: eventData,
      created_at: now,
    });
  } catch (error) {
    console.error("Activity tracking failed:", error);
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user?.id || !isSupabaseEnabled) return;

    trackUserActivity(user.id, "app_opened", {
      page: window.location.pathname,
    });

    const interval = setInterval(() => {
      trackUserActivity(user.id, "user_active", {
        page: window.location.pathname,
      });
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [user?.id]);

  const activateEarlyAccessPlan = useCallback(
    async (planFromInput) => {
      const selectedPlan = normalizePlan(planFromInput);

      if (!selectedPlan) {
        throw new Error("Invalid plan selected.");
      }

      const now = new Date().toISOString();

      saveEarlyAccessLocal(selectedPlan);

      if (!user) {
        localStorage.setItem("gigvorx_pending_plan", selectedPlan);
        return null;
      }

      const updatedUser = {
        ...user,
        plan: selectedPlan,
        trialEndsAt: null,
        planStatus: "early_access",
        billingStatus: "free_beta",
        subscriptionActive: true,
        earlyAccessStartedAt: user.earlyAccessStartedAt || now,
      };

      if (isSupabaseEnabled) {
        const { error } = await saveProfileToSupabase(updatedUser);

        if (error) {
          console.error("Early access update failed:", error);
          throw new Error(error.message || "Failed to activate early access.");
        }

        await trackUserActivity(user.id, "early_access_activated", {
          plan: selectedPlan,
        });
      } else {
        const users = readGlobal("users", []);

        writeGlobal(
          "users",
          users.map((u) =>
            u.id === user.id
              ? {
                  ...u,
                  plan: selectedPlan,
                  trialEndsAt: null,
                  planStatus: "early_access",
                  billingStatus: "free_beta",
                  subscriptionActive: true,
                  earlyAccessStartedAt: u.earlyAccessStartedAt || now,
                }
              : u
          )
        );
      }

      setUser(updatedUser);
      localStorage.removeItem("gigvorx_pending_plan");

      return updatedUser;
    },
    [user]
  );

  const applyPendingEarlyAccessToProfile = useCallback(async (profile) => {
    if (!profile) return profile;

    const pendingPlan = getPendingEarlyAccessPlan();

    if (!pendingPlan) return profile;

    const now = new Date().toISOString();

    saveEarlyAccessLocal(pendingPlan);

    const updatedProfile = {
      ...profile,
      plan: pendingPlan,
      trialEndsAt: null,
      planStatus: "early_access",
      billingStatus: "free_beta",
      subscriptionActive: true,
      earlyAccessStartedAt: profile.earlyAccessStartedAt || now,
    };

    if (isSupabaseEnabled) {
      const { error } = await saveProfileToSupabase(updatedProfile);

      if (error) {
        console.error("Failed to save pending early access plan:", error);
      }

      await trackUserActivity(profile.id, "early_access_activated", {
        plan: pendingPlan,
        source: "pending_plan",
      });
    } else {
      const users = readGlobal("users", []);

      writeGlobal(
        "users",
        users.map((u) =>
          u.id === profile.id
            ? {
                ...u,
                plan: pendingPlan,
                trialEndsAt: null,
                planStatus: "early_access",
                billingStatus: "free_beta",
                subscriptionActive: true,
                earlyAccessStartedAt: u.earlyAccessStartedAt || now,
              }
            : u
        )
      );
    }

    localStorage.removeItem("gigvorx_pending_plan");

    return updatedProfile;
  }, []);

  useEffect(() => {
    let mounted = true;
    let authSubscription = null;

    seedUsers();

    async function init() {
      if (isSupabaseEnabled) {
        const { data } = await supabase.auth.getSession();

        if (mounted && data.session?.user) {
          const profile = await loadProfile(data.session.user);
          const finalProfile = await applyPendingEarlyAccessToProfile(profile);

          if (mounted) setUser(finalProfile);
        }

        const authListener = supabase.auth.onAuthStateChange(
          async (_event, session) => {
            if (!mounted) return;

            if (session?.user) {
              const profile = await loadProfile(session.user);
              const finalProfile = await applyPendingEarlyAccessToProfile(profile);

              if (mounted) setUser(finalProfile);
            } else {
              setUser(null);
            }
          }
        );

        authSubscription = authListener?.data?.subscription;
      } else {
        const sessionId = localStorage.getItem("gv_session");

        if (sessionId) {
          const users = readGlobal("users", []);
          const u = users.find((x) => x.id === sessionId);

          if (u) {
            const { password, ...safe } = u;
            const finalProfile = await applyPendingEarlyAccessToProfile(safe);

            if (mounted) setUser(finalProfile);
          }
        }
      }

      if (mounted) setIsLoading(false);
    }

    init().finally(() => {
      if (mounted) setIsLoading(false);
    });

    return () => {
      mounted = false;
      authSubscription?.unsubscribe?.();
    };
  }, [applyPendingEarlyAccessToProfile]);

  const login = useCallback(
    async (email, password) => {
      if (isSupabaseEnabled) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          const msg = error.message?.toLowerCase() || "";

          if (
            msg.includes("invalid login") ||
            msg.includes("invalid_credentials") ||
            msg.includes("body stream")
          ) {
            throw new Error("Invalid email or password.");
          }

          throw new Error(error.message || "Sign in failed");
        }

        const profile = await loadProfile(data.user);
        const finalProfile = await applyPendingEarlyAccessToProfile(profile);

        setUser(finalProfile);

        await trackUserActivity(finalProfile.id, "login", {
          email: finalProfile.email,
        });

        return finalProfile;
      }

      const users = readGlobal("users", []);

      const u = users.find(
        (x) =>
          x.email.toLowerCase() === email.toLowerCase() &&
          x.password === password
      );

      if (!u) throw new Error("Invalid email or password");

      localStorage.setItem("gv_session", u.id);

      const { password: _, ...safe } = u;
      const finalProfile = await applyPendingEarlyAccessToProfile(safe);

      setUser(finalProfile);
      return finalProfile;
    },
    [applyPendingEarlyAccessToProfile]
  );

  const signup = useCallback(
    async (name, email, password) => {
      if (isSupabaseEnabled) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              name,
            },
          },
        });

        if (error) throw new Error(error.message);

        if (data.session?.user) {
          const profile = await loadProfile(data.session.user);
          const finalProfile = await applyPendingEarlyAccessToProfile(profile);

          setUser(finalProfile);

          await trackUserActivity(finalProfile.id, "signup", {
            email: finalProfile.email,
          });

          return finalProfile;
        }

        throw new Error("Check your inbox to confirm your email, then log in.");
      }

      const users = readGlobal("users", []);

      if (users.find((x) => x.email.toLowerCase() === email.toLowerCase())) {
        throw new Error("An account with this email already exists");
      }

      const pendingPlan = getPendingEarlyAccessPlan();
      const now = new Date().toISOString();

      const newUser = {
        id: uid(),
        name,
        email,
        password,
        plan: pendingPlan || "trial",
        role: "user",
        planStatus: pendingPlan ? "early_access" : "trial",
        billingStatus: pendingPlan ? "free_beta" : "free",
        subscriptionActive: Boolean(pendingPlan),
        earlyAccessStartedAt: pendingPlan ? now : null,
        lastActiveAt: now,
        createdAt: now,
        trialEndsAt: pendingPlan
          ? null
          : new Date(Date.now() + 7 * 86400000).toISOString(),
      };

      writeGlobal("users", [...users, newUser]);
      localStorage.setItem("gv_session", newUser.id);

      if (pendingPlan) {
        saveEarlyAccessLocal(pendingPlan);
        localStorage.removeItem("gigvorx_pending_plan");
      }

      const { password: _, ...safe } = newUser;

      setUser(safe);
      return safe;
    },
    [applyPendingEarlyAccessToProfile]
  );

  const logout = useCallback(async () => {
    if (user?.id && isSupabaseEnabled) {
      await trackUserActivity(user.id, "logout", {
        page: window.location.pathname,
      });
    }

    if (isSupabaseEnabled) {
      await supabase.auth.signOut();
    }

    localStorage.removeItem("gv_session");
    setUser(null);
  }, [user?.id]);

  const updateUser = useCallback(
    async (updates) => {
      if (!user) return null;

      const updatedUser = {
        ...user,
        ...updates,
      };

      if (updates.plan && updates.plan !== "trial") {
        const now = new Date().toISOString();

        updatedUser.trialEndsAt = null;
        updatedUser.planStatus = updates.planStatus || "early_access";
        updatedUser.billingStatus = updates.billingStatus || "free_beta";
        updatedUser.subscriptionActive = true;
        updatedUser.earlyAccessStartedAt =
          user.earlyAccessStartedAt || now;

        saveEarlyAccessLocal(updates.plan);
      }

      if (isSupabaseEnabled) {
        const { error } = await saveProfileToSupabase(updatedUser);

        if (error) {
          console.error("Failed to update user:", error);
          throw new Error(error.message || "Failed to update user.");
        }

        await trackUserActivity(user.id, "profile_updated", {
          fields: Object.keys(updates),
        });
      } else {
        const users = readGlobal("users", []);

        writeGlobal(
          "users",
          users.map((u) =>
            u.id === user.id
              ? {
                  ...u,
                  ...updates,
                }
              : u
          )
        );
      }

      setUser(updatedUser);
      return updatedUser;
    },
    [user]
  );

  const upgradePlan = useCallback(
    async (plan) => {
      return activateEarlyAccessPlan(plan);
    },
    [activateEarlyAccessPlan]
  );

  const trackEvent = useCallback(
    async (eventName, eventData = {}) => {
      if (!user?.id) return;

      await trackUserActivity(user.id, eventName, eventData);
    },
    [user?.id]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        signup,
        logout,
        updateUser,
        upgradePlan,
        activateEarlyAccessPlan,
        trackEvent,
        supabaseEnabled: isSupabaseEnabled,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);

  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return ctx;
}