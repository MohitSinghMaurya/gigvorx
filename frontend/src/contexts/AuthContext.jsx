import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { readGlobal, writeGlobal, uid } from "@/lib/storage";

const AuthContext = createContext(null);

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
    // Ensure demo + admin always exist
    let updated = [...users];
    if (!updated.find((u) => u.email === DEMO_USER.email)) updated.push(DEMO_USER);
    if (!updated.find((u) => u.email === ADMIN_USER.email)) updated.push(ADMIN_USER);
    if (updated.length !== users.length) writeGlobal("users", updated);
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    seedUsers();
    try {
      const sessionId = localStorage.getItem("gv_session");
      if (sessionId) {
        const users = readGlobal("users", []);
        const u = users.find((x) => x.id === sessionId);
        if (u) {
          const { password, ...safe } = u;
          setUser(safe);
        }
      }
    } catch {}
    setIsLoading(false);
  }, []);

  const login = useCallback(async (email, password) => {
    const users = readGlobal("users", []);
    const u = users.find(
      (x) => x.email.toLowerCase() === email.toLowerCase() && x.password === password
    );
    if (!u) throw new Error("Invalid email or password");
    localStorage.setItem("gv_session", u.id);
    const { password: _, ...safe } = u;
    setUser(safe);
    return safe;
  }, []);

  const signup = useCallback(async (name, email, password) => {
    const users = readGlobal("users", []);
    if (users.find((x) => x.email.toLowerCase() === email.toLowerCase())) {
      throw new Error("An account with this email already exists");
    }
    const newUser = {
      id: uid(),
      name,
      email,
      password,
      plan: "trial",
      role: "user",
      createdAt: new Date().toISOString(),
      trialEndsAt: new Date(Date.now() + 7 * 86400000).toISOString(),
    };
    writeGlobal("users", [...users, newUser]);
    localStorage.setItem("gv_session", newUser.id);
    const { password: _, ...safe } = newUser;
    setUser(safe);
    return safe;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("gv_session");
    setUser(null);
  }, []);

  const updateUser = useCallback((updates) => {
    if (!user) return;
    const users = readGlobal("users", []);
    const updated = users.map((u) =>
      u.id === user.id ? { ...u, ...updates } : u
    );
    writeGlobal("users", updated);
    setUser({ ...user, ...updates });
  }, [user]);

  const upgradePlan = useCallback((plan) => {
    updateUser({ plan, trialEndsAt: null });
  }, [updateUser]);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, signup, logout, updateUser, upgradePlan }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
