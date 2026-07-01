import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import { readGlobal, uid, writeGlobal } from "@/lib/storage";
import { isSupabaseEnabled, supabase } from "@/lib/supabase";

const AuthContext = createContext(null);

const VALID_PLANS = ["trial", "starter", "pro", "premium", "agency"];
const PAID_PLANS = ["starter", "pro", "premium", "agency"];
const TRIAL_DAYS = 7;
const TRIAL_MS = TRIAL_DAYS * 24 * 60 * 60 * 1000;

function createTrialEndDate() {
  return new Date(Date.now() + TRIAL_MS).toISOString();
}

function isValidPlan(plan) {
  return VALID_PLANS.includes(String(plan || "").toLowerCase());
}

function cleanPlan(plan) {
  const value = String(plan || "trial").toLowerCase().trim();
  return isValidPlan(value) ? value : "trial";
}

function isPaidPlan(plan) {
  return PAID_PLANS.includes(cleanPlan(plan));
}

function isPaidProfile(profile) {
  if (!profile) return false;
  if (profile.role === "admin") return true;

  const billingStatus = profile.billingStatus || profile.billing_status;
  const planStatus = profile.planStatus || profile.plan_status;

  return (
    isPaidPlan(profile.plan) &&
    (billingStatus === "paid" || planStatus === "active")
  );
}

function needsTrialStart(profile) {
  return (
    cleanPlan(profile?.plan) === "trial" &&
    !profile?.trialEndsAt &&
    !profile?.trial_ends_at
  );
}

function cleanupLegacyAccessKeys() {
  [
    "gigvorx_pending_plan",
    "gigvorx_early_access_plan",
    "gigvorx_plan_status",
    "gigvorx_billing_status",
    "gigvorx_subscription_active",
    "gigvorx_early_access_started_at",
  ].forEach((key) => localStorage.removeItem(key));
}

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
  lastActiveAt: null,
  createdAt: "2026-01-15T00:00:00.000Z",
  trialEndsAt: createTrialEndDate(),
  chosenNiches: null,
};

const ADMIN_USER = {
  id: "admin-user-1",
  name: "Admin",
  email: "admin@gigvorx.com",
  password: "admin1234",
  plan: "agency",
  role: "admin",
  planStatus: "active",
  billingStatus: "paid",
  subscriptionActive: true,
  lastActiveAt: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  trialEndsAt: null,
  chosenNiches: null,
};

function seedUsers() {
  const users = readGlobal("users", null);

  if (!users) {
    writeGlobal("users", [DEMO_USER, ADMIN_USER]);
    return;
  }

  let updated = [...users];

  if (!updated.find((item) => item.email === DEMO_USER.email)) {
    updated.push(DEMO_USER);
  }

  if (!updated.find((item) => item.email === ADMIN_USER.email)) {
    updated.push(ADMIN_USER);
  }

  updated = updated.map((item) => {
    if (item.email === "admin@gigvorx.com") {
      return {
        ...item,
        plan: "agency",
        role: "admin",
        planStatus: "active",
        billingStatus: "paid",
        subscriptionActive: true,
        trialEndsAt: null,
      };
    }

    if (item.planStatus === "early_access" || item.billingStatus === "free_beta") {
      return {
        ...item,
        plan: "trial",
        planStatus: "trial",
        billingStatus: "free",
        subscriptionActive: false,
        trialEndsAt: item.trialEndsAt || createTrialEndDate(),
      };
    }

    return item;
  });

  writeGlobal("users", updated);
}

function mapDbProfileToUser(data, authUser = null) {
  const mapped = {
    id: data.id,
    email: data.email || authUser?.email || "",
    name:
      data.name ||
      authUser?.user_metadata?.name ||
      authUser?.email?.split("@")[0] ||
      "User",
    plan: cleanPlan(data.plan),
    role: data.role || "user",
    planStatus: data.plan_status || "trial",
    billingStatus: data.billing_status || "free",
    subscriptionActive: Boolean(data.subscription_active),
    lastActiveAt: data.last_active_at || null,
    trialEndsAt: data.trial_ends_at || null,
    createdAt: data.created_at || authUser?.created_at || new Date().toISOString(),
    chosenNiches: data.chosen_niches || null,
  };

  if (mapped.role === "admin") {
    return {
      ...mapped,
      plan: isPaidPlan(mapped.plan) ? mapped.plan : "agency",
      planStatus: "active",
      billingStatus: "paid",
      subscriptionActive: true,
      trialEndsAt: null,
    };
  }

  if (
    mapped.planStatus === "early_access" ||
    mapped.billingStatus === "free_beta" ||
    (isPaidPlan(mapped.plan) && !isPaidProfile(mapped))
  ) {
    return {
      ...mapped,
      plan: "trial",
      planStatus: "trial",
      billingStatus: "free",
      subscriptionActive: false,
      trialEndsAt: mapped.trialEndsAt || createTrialEndDate(),
    };
  }

  if (isPaidProfile(mapped)) {
    return {
      ...mapped,
      planStatus: "active",
      billingStatus: "paid",
      subscriptionActive: true,
      trialEndsAt: null,
    };
  }

  return mapped;
}

async function saveProfileToSupabase(profile) {
  if (!isSupabaseEnabled || !supabase || !profile?.id) {
    return { error: null };
  }

  const now = new Date().toISOString();
  const plan = cleanPlan(profile.plan);
  const paid = profile.role === "admin" || isPaidProfile(profile);

  const payload = {
    id: profile.id,
    email: profile.email,
    name: profile.name || profile.email?.split("@")[0] || "User",
    plan: paid ? plan : "trial",
    role: profile.role || "user",
    trial_ends_at: paid
      ? null
      : profile.trialEndsAt || profile.trial_ends_at || createTrialEndDate(),
    plan_status: paid ? "active" : "trial",
    billing_status: paid ? "paid" : "free",
    subscription_active: paid,
    early_access_started_at: null,
    last_active_at: profile.lastActiveAt || profile.last_active_at || null,
    chosen_niches: profile.chosenNiches || profile.chosen_niches || null,
    updated_at: now,
  };

  return await supabase.from("users_profiles").upsert(payload);
}

async function ensureTrialStarted(profile) {
  if (!profile) return profile;
  if (!needsTrialStart(profile)) return profile;

  const updatedProfile = {
    ...profile,
    plan: "trial",
    planStatus: "trial",
    billingStatus: "free",
    subscriptionActive: false,
    trialEndsAt: createTrialEndDate(),
  };

  await saveProfileToSupabase(updatedProfile);
  return updatedProfile;
}

function ensureLocalTrialStarted(profile) {
  if (!profile) return profile;
  if (!needsTrialStart(profile)) return profile;

  const updatedProfile = {
    ...profile,
    plan: "trial",
    planStatus: "trial",
    billingStatus: "free",
    subscriptionActive: false,
    trialEndsAt: createTrialEndDate(),
  };

  const users = readGlobal("users", []);

  writeGlobal(
    "users",
    users.map((item) =>
      item.id === updatedProfile.id
        ? {
            ...item,
            plan: "trial",
            planStatus: "trial",
            billingStatus: "free",
            subscriptionActive: false,
            trialEndsAt: updatedProfile.trialEndsAt,
          }
        : item
    )
  );

  return updatedProfile;
}

async function loadProfile(authUser) {
  if (!isSupabaseEnabled || !supabase || !authUser) return null;

  const { data, error } = await supabase
    .from("users_profiles")
    .select("*")
    .eq("id", authUser.id)
    .maybeSingle();

  if (error) {
    console.error("Failed to load user profile:", error);
  }

  if (data) {
    const profile = mapDbProfileToUser(data, authUser);
    const finalProfile = await ensureTrialStarted(profile);
    await saveProfileToSupabase(finalProfile);
    return finalProfile;
  }

  const now = new Date().toISOString();

  const newProfile = {
    id: authUser.id,
    email: authUser.email,
    name: authUser.user_metadata?.name || authUser.email?.split("@")[0] || "User",
    plan: "trial",
    role: "user",
    planStatus: "trial",
    billingStatus: "free",
    subscriptionActive: false,
    lastActiveAt: null,
    trialEndsAt: createTrialEndDate(),
    createdAt: authUser.created_at || now,
    chosenNiches: null,
  };

  await saveProfileToSupabase(newProfile);
  return newProfile;
}

async function trackUserActivity(userId, eventName = "app_opened", eventData = {}) {
  if (!isSupabaseEnabled || !supabase || !userId) return;

  const now = new Date().toISOString();

  try {
    await supabase
      .from("users_profiles")
      .update({ last_active_at: now, updated_at: now })
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
  const [loading, setLoading] = useState(true);

  const requestPlanUpgrade = useCallback(
    async (planFromInput) => {
      const selectedPlan = cleanPlan(planFromInput);

      if (!isPaidPlan(selectedPlan)) {
        throw new Error("Invalid plan selected.");
      }

      localStorage.setItem("gigvorx_requested_plan", selectedPlan);

      if (user?.id) {
        await trackUserActivity(user.id, "upgrade_requested", {
          plan: selectedPlan,
          source: "pricing",
        });
      }

      return user;
    },
    [user]
  );

  useEffect(() => {
    if (!user?.id || !isSupabaseEnabled) return undefined;

    trackUserActivity(user.id, "app_opened", { page: window.location.pathname });

    const interval = setInterval(() => {
      trackUserActivity(user.id, "user_active", { page: window.location.pathname });
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [user?.id]);

  useEffect(() => {
    let mounted = true;
    let authSubscription = null;

    seedUsers();
    cleanupLegacyAccessKeys();

    async function init() {
      if (isSupabaseEnabled && supabase) {
        const { data } = await supabase.auth.getSession();

        if (mounted && data.session?.user) {
          const profile = await loadProfile(data.session.user);
          if (mounted) setUser(profile);
        }

        const authListener = supabase.auth.onAuthStateChange(async (_event, session) => {
          if (!mounted) return;

          if (session?.user) {
            const profile = await loadProfile(session.user);
            if (mounted) setUser(profile);
          } else {
            setUser(null);
          }
        });

        authSubscription = authListener?.data?.subscription;
      } else {
        const sessionId = localStorage.getItem("gv_session");

        if (sessionId) {
          const users = readGlobal("users", []);
          const localUser = users.find((item) => item.id === sessionId);

          if (localUser) {
            const { password, ...safeUser } = localUser;
            const trialProfile = ensureLocalTrialStarted(safeUser);
            if (mounted) setUser(trialProfile);
          }
        }
      }

      if (mounted) setLoading(false);
    }

    init().finally(() => {
      if (mounted) setLoading(false);
    });

    return () => {
      mounted = false;
      authSubscription?.unsubscribe?.();
    };
  }, []);

  const login = useCallback(async (email, password) => {
    cleanupLegacyAccessKeys();

    if (isSupabaseEnabled && supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        const message = error.message?.toLowerCase() || "";

        if (
          message.includes("invalid login") ||
          message.includes("invalid_credentials") ||
          message.includes("body stream")
        ) {
          throw new Error("Invalid email or password.");
        }

        throw new Error(error.message || "Sign in failed.");
      }

      const profile = await loadProfile(data.user);
      setUser(profile);

      await trackUserActivity(profile.id, "login", { email: profile.email });

      return profile;
    }

    const users = readGlobal("users", []);
    const localUser = users.find(
      (item) =>
        item.email.toLowerCase() === email.toLowerCase() && item.password === password
    );

    if (!localUser) {
      throw new Error("Invalid email or password.");
    }

    localStorage.setItem("gv_session", localUser.id);

    const { password: _password, ...safeUser } = localUser;
    const trialProfile = ensureLocalTrialStarted(safeUser);

    setUser(trialProfile);
    return trialProfile;
  }, []);

  const signup = useCallback(async (name, email, password) => {
    cleanupLegacyAccessKeys();

    if (isSupabaseEnabled && supabase) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name } },
      });

      if (error) throw new Error(error.message);

      if (data.session?.user) {
        const profile = await loadProfile(data.session.user);
        setUser(profile);

        await trackUserActivity(profile.id, "signup", { email: profile.email });

        return profile;
      }

      throw new Error("Check your inbox to confirm your email, then log in.");
    }

    const users = readGlobal("users", []);

    if (users.find((item) => item.email.toLowerCase() === email.toLowerCase())) {
      throw new Error("An account with this email already exists.");
    }

    const now = new Date().toISOString();

    const newUser = {
      id: uid(),
      name,
      email,
      password,
      plan: "trial",
      role: "user",
      planStatus: "trial",
      billingStatus: "free",
      subscriptionActive: false,
      lastActiveAt: now,
      createdAt: now,
      trialEndsAt: createTrialEndDate(),
      chosenNiches: null,
    };

    writeGlobal("users", [...users, newUser]);
    localStorage.setItem("gv_session", newUser.id);

    const { password: _password, ...safeUser } = newUser;
    setUser(safeUser);

    return safeUser;
  }, []);

  const logout = useCallback(async () => {
    if (user?.id && isSupabaseEnabled) {
      await trackUserActivity(user.id, "logout", { page: window.location.pathname });
    }

    if (isSupabaseEnabled && supabase) {
      await supabase.auth.signOut();
    }

    localStorage.removeItem("gv_session");
    setUser(null);
  }, [user?.id]);

  const updateUser = useCallback(
    async (updates) => {
      if (!user) return null;

      if (updates.plan && updates.plan !== user.plan && isPaidPlan(updates.plan)) {
        const explicitPaid =
          updates.billingStatus === "paid" ||
          updates.billing_status === "paid" ||
          updates.planStatus === "active" ||
          updates.plan_status === "active";

        if (!explicitPaid && user.role !== "admin") {
          await requestPlanUpgrade(updates.plan);
          return user;
        }
      }

      const updatedUser = {
        ...user,
        ...updates,
      };

      if (!isPaidProfile(updatedUser)) {
        updatedUser.plan = "trial";
        updatedUser.planStatus = "trial";
        updatedUser.billingStatus = "free";
        updatedUser.subscriptionActive = false;
        updatedUser.trialEndsAt = updatedUser.trialEndsAt || createTrialEndDate();
      } else {
        updatedUser.plan = cleanPlan(updatedUser.plan);
        updatedUser.planStatus = "active";
        updatedUser.billingStatus = "paid";
        updatedUser.subscriptionActive = true;
        updatedUser.trialEndsAt = null;
      }

      if (isSupabaseEnabled && supabase) {
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
          users.map((item) =>
            item.id === user.id ? { ...item, ...updatedUser } : item
          )
        );
      }

      setUser(updatedUser);
      return updatedUser;
    },
    [requestPlanUpgrade, user]
  );

  const trackEvent = useCallback(
    async (eventName, eventData = {}) => {
      if (!user?.id) return;
      await trackUserActivity(user.id, eventName, eventData);
    },
    [user?.id]
  );

  const saveChosenNiches = useCallback(
    async (niches) => {
      if (!user) return null;

      const updatedUser = { ...user, chosenNiches: niches };

      if (isSupabaseEnabled && supabase) {
        const { error } = await saveProfileToSupabase(updatedUser);

        if (error) {
          console.error("Failed to save chosen niches:", error);
          throw new Error(error.message || "Failed to save your niche selection.");
        }
      } else {
        const users = readGlobal("users", []);

        writeGlobal(
          "users",
          users.map((item) =>
            item.id === user.id ? { ...item, chosenNiches: niches } : item
          )
        );
      }

      setUser(updatedUser);
      return updatedUser;
    },
    [user]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        profile: user,
        loading,
        isLoading: loading,
        login,
        signup,
        logout,
        updateUser,
        upgradePlan: requestPlanUpgrade,
        activateEarlyAccessPlan: requestPlanUpgrade,
        trackEvent,
        saveChosenNiches,
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

export default AuthContext;