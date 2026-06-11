import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { readGlobal, writeGlobal, uid } from "@/lib/storage";
import { supabase, isSupabaseEnabled } from "@/lib/supabase";

const AuthContext = createContext(null);

const DEMO_USER = {
  id: "demo-user-1", name: "Demo User", email: "demo@gigvorx.com", password: "demo1234",
  plan: "trial", role: "user",
  createdAt: "2025-01-15T00:00:00.000Z",
  trialEndsAt: new Date(Date.now() + 7 * 86400000).toISOString(),
};
const ADMIN_USER = {
  id: "admin-user-1", name: "Admin", email: "admin@gigvorx.com", password: "admin1234",
  plan: "agency", role: "admin",
  createdAt: "2025-01-01T00:00:00.000Z",
  trialEndsAt: null,
};

function seedUsers() {
  const users = readGlobal("users", null);
  if (!users) {
    writeGlobal("users", [DEMO_USER, ADMIN_USER]);
  } else {
    let updated = [...users];
    if (!updated.find((u) => u.email === DEMO_USER.email)) updated.push(DEMO_USER);
    if (!updated.find((u) => u.email === ADMIN_USER.email)) updated.push(ADMIN_USER);
    if (updated.length !== users.length) writeGlobal("users", updated);
  }
}

async function loadProfile(authUser) {
  if (!supabase || !authUser) return null;
  const { data } = await supabase.from("users_profiles").select("*").eq("id", authUser.id).maybeSingle();
  if (data) {
    return {
      id: data.id, email: data.email, name: data.name,
      plan: data.plan, role: data.role,
      trialEndsAt: data.trial_ends_at, createdAt: data.created_at,
    };
  }
  // No profile row yet — trigger should create one, but safe fallback
  return { id: authUser.id, email: authUser.email, name: authUser.user_metadata?.name || authUser.email.split("@")[0], plan: "trial", role: "user", trialEndsAt: new Date(Date.now() + 7 * 86400000).toISOString(), createdAt: authUser.created_at };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // ---------- bootstrap session ----------
  useEffect(() => {
    let mounted = true;
    seedUsers();

    async function init() {
      if (isSupabaseEnabled) {
        const { data } = await supabase.auth.getSession();
        if (mounted && data.session?.user) {
          const profile = await loadProfile(data.session.user);
          setUser(profile);
        }
        // listen for changes
        supabase.auth.onAuthStateChange(async (_event, session) => {
          if (!mounted) return;
          if (session?.user) {
            const profile = await loadProfile(session.user);
            setUser(profile);
          } else {
            setUser(null);
          }
        });
      } else {
        // localStorage fallback
        const sessionId = localStorage.getItem("gv_session");
        if (sessionId) {
          const users = readGlobal("users", []);
          const u = users.find((x) => x.id === sessionId);
          if (u) { const { password, ...safe } = u; setUser(safe); }
        }
      }
      if (mounted) setIsLoading(false);
    }
    init();
    return () => { mounted = false; };
  }, []);

  // ---------- login ----------
  const login = useCallback(async (email, password) => {
    if (isSupabaseEnabled) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw new Error(error.message);
      const profile = await loadProfile(data.user);
      setUser(profile);
      return profile;
    }
    // fallback
    const users = readGlobal("users", []);
    const u = users.find((x) => x.email.toLowerCase() === email.toLowerCase() && x.password === password);
    if (!u) throw new Error("Invalid email or password");
    localStorage.setItem("gv_session", u.id);
    const { password: _, ...safe } = u; setUser(safe); return safe;
  }, []);

  // ---------- signup ----------
  const signup = useCallback(async (name, email, password) => {
    if (isSupabaseEnabled) {
      const { data, error } = await supabase.auth.signUp({
        email, password,
        options: { data: { name } },
      });
      if (error) throw new Error(error.message);
      // Profile is auto-created via DB trigger. Sometimes session is null if email confirmation is on.
      if (data.session?.user) {
        const profile = await loadProfile(data.session.user);
        setUser(profile);
        return profile;
      }
      throw new Error("Check your inbox to confirm your email, then log in.");
    }
    const users = readGlobal("users", []);
    if (users.find((x) => x.email.toLowerCase() === email.toLowerCase())) {
      throw new Error("An account with this email already exists");
    }
    const newUser = {
      id: uid(), name, email, password, plan: "trial", role: "user",
      createdAt: new Date().toISOString(),
      trialEndsAt: new Date(Date.now() + 7 * 86400000).toISOString(),
    };
    writeGlobal("users", [...users, newUser]);
    localStorage.setItem("gv_session", newUser.id);
    const { password: _, ...safe } = newUser; setUser(safe); return safe;
  }, []);

  // ---------- logout ----------
  const logout = useCallback(async () => {
    if (isSupabaseEnabled) await supabase.auth.signOut();
    localStorage.removeItem("gv_session");
    setUser(null);
  }, []);

  // ---------- update ----------
  const updateUser = useCallback(async (updates) => {
    if (!user) return;
    if (isSupabaseEnabled) {
      const dbPatch = {};
      if (updates.name !== undefined) dbPatch.name = updates.name;
      if (updates.email !== undefined) dbPatch.email = updates.email;
      if (updates.plan !== undefined) dbPatch.plan = updates.plan;
      if (updates.trialEndsAt !== undefined) dbPatch.trial_ends_at = updates.trialEndsAt;
      dbPatch.updated_at = new Date().toISOString();
      await supabase.from("users_profiles").update(dbPatch).eq("id", user.id);
    } else {
      const users = readGlobal("users", []);
      writeGlobal("users", users.map((u) => u.id === user.id ? { ...u, ...updates } : u));
    }
    setUser({ ...user, ...updates });
  }, [user]);

  const upgradePlan = useCallback((plan) => updateUser({ plan, trialEndsAt: null }), [updateUser]);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, signup, logout, updateUser, upgradePlan, supabaseEnabled: isSupabaseEnabled }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
