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

function getPendingEarlyAccessPlan() {
  const pendingPlan =
    localStorage.getItem("gigvorx_pending_plan") ||
    localStorage.getItem("gigvorx_early_access_plan");

  if (!pendingPlan) return null;

  const cleanPlan = pendingPlan.toLowerCase().trim();

  if (!VALID_PLANS.includes(cleanPlan)) return null;
  if (cleanPlan === "trial") return null;

  return cleanPlan;
}

function saveEarlyAccessLocal(plan) {
  localStorage.setItem("gigvorx_early_access_plan", plan);
  localStorage.setItem("gigvorx_plan_status", "early_access");
  localStorage.setItem("gigvorx_billing_status", "free_beta");
  localStorage.setItem("gigvorx_subscription_active", "true");

  if (!localStorage.getItem("gigvorx_early_access_started_at")) {
    localStorage.setItem(
      "gigvorx_early_access_started_at",
      new Date().toISOString()
    );
  }
}

async function loadProfile(authUser) {
  if (!supabase || !authUser) return null;

  const { data } = await supabase
    .from("users_profiles")
    .select("*")
    .eq("id", authUser.id)
    .maybeSingle();

  if (data) {
    return {
      id: data.id,
      email: data.email,
      name: data.name,
      plan: data.plan || "trial",
      role: data.role || "user",
      trialEndsAt: data.trial_ends_at,
      createdAt: data.created_at,
    };
  }

  return {
    id: authUser.id,
    email: authUser.email,
    name: authUser.user_metadata?.name || authUser.email.split("@")[0],
    plan: "trial",
    role: "user",
    trialEndsAt: new Date(Date.now() + 7 * 86400000).toISOString(),
    createdAt: authUser.created_at,
  };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const activateEarlyAccessPlan = useCallback(
    async (planFromInput) => {
      const selectedPlan = String(planFromInput || "")
        .toLowerCase()
        .trim();

      if (!VALID_PLANS.includes(selectedPlan) || selectedPlan === "trial") {
        throw new Error("Invalid plan selected.");
      }

      saveEarlyAccessLocal(selectedPlan);

      if (!user) {
        localStorage.setItem("gigvorx_pending_plan", selectedPlan);
        return null;
      }

      const updates = {
        plan: selectedPlan,
        trialEndsAt: null,
      };

      if (isSupabaseEnabled) {
        const dbPatch = {
          plan: selectedPlan,
          trial_ends_at: null,
          updated_at: new Date().toISOString(),
        };

        const { error } = await supabase
          .from("users_profiles")
          .update(dbPatch)
          .eq("id", user.id);

        if (error) {
          throw new Error(error.message || "Failed to activate early access.");
        }
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
                }
              : u
          )
        );
      }

      const updatedUser = {
        ...user,
        ...updates,
      };

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

    saveEarlyAccessLocal(pendingPlan);

    if (isSupabaseEnabled) {
      await supabase
        .from("users_profiles")
        .update({
          plan: pendingPlan,
          trial_ends_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", profile.id);
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
              }
            : u
        )
      );
    }

    localStorage.removeItem("gigvorx_pending_plan");

    return {
      ...profile,
      plan: pendingPlan,
      trialEndsAt: null,
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    seedUsers();

    async function init() {
      if (isSupabaseEnabled) {
        const { data } = await supabase.auth.getSession();

        if (mounted && data.session?.user) {
          const profile = await loadProfile(data.session.user);
          const finalProfile = await applyPendingEarlyAccessToProfile(profile);
          setUser(finalProfile);
        }

        supabase.auth.onAuthStateChange(async (_event, session) => {
          if (!mounted) return;

          if (session?.user) {
            const profile = await loadProfile(session.user);
            const finalProfile = await applyPendingEarlyAccessToProfile(profile);
            setUser(finalProfile);
          } else {
            setUser(null);
          }
        });
      } else {
        const sessionId = localStorage.getItem("gv_session");

        if (sessionId) {
          const users = readGlobal("users", []);
          const u = users.find((x) => x.id === sessionId);

          if (u) {
            const { password, ...safe } = u;
            const finalProfile = await applyPendingEarlyAccessToProfile(safe);
            setUser(finalProfile);
          }
        }
      }

      if (mounted) setIsLoading(false);
    }

    init();

    return () => {
      mounted = false;
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
          return finalProfile;
        }

        throw new Error("Check your inbox to confirm your email, then log in.");
      }

      const users = readGlobal("users", []);

      if (users.find((x) => x.email.toLowerCase() === email.toLowerCase())) {
        throw new Error("An account with this email already exists");
      }

      const pendingPlan = getPendingEarlyAccessPlan();

      const newUser = {
        id: uid(),
        name,
        email,
        password,
        plan: pendingPlan || "trial",
        role: "user",
        createdAt: new Date().toISOString(),
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
    if (isSupabaseEnabled) {
      await supabase.auth.signOut();
    }

    localStorage.removeItem("gv_session");
    setUser(null);
  }, []);

  const updateUser = useCallback(
    async (updates) => {
      if (!user) return null;

      if (isSupabaseEnabled) {
        const dbPatch = {};

        if (updates.name !== undefined) dbPatch.name = updates.name;
        if (updates.email !== undefined) dbPatch.email = updates.email;
        if (updates.plan !== undefined) dbPatch.plan = updates.plan;
        if (updates.trialEndsAt !== undefined) {
          dbPatch.trial_ends_at = updates.trialEndsAt;
        }

        dbPatch.updated_at = new Date().toISOString();

        const { error } = await supabase
          .from("users_profiles")
          .update(dbPatch)
          .eq("id", user.id);

        if (error) {
          throw new Error(error.message || "Failed to update user.");
        }
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

      const updatedUser = {
        ...user,
        ...updates,
      };

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