import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { readList, writeList, uid } from "@/lib/storage";

// Generic hook for a list resource (clients, briefs, invoices)
export function useCollection(key) {
  const { user } = useAuth();
  const [items, setItems] = useState([]);

  useEffect(() => {
    if (!user) return;
    setItems(readList(user.id, key));
  }, [user, key]);

  const persist = useCallback((next) => {
    if (!user) return;
    writeList(user.id, key, next);
    setItems(next);
  }, [user, key]);

  const create = useCallback((data) => {
    const item = { id: uid(), createdAt: new Date().toISOString(), ...data };
    persist([item, ...items]);
    return item;
  }, [items, persist]);

  const update = useCallback((id, patch) => {
    const next = items.map(i => i.id === id ? { ...i, ...patch, updatedAt: new Date().toISOString() } : i);
    persist(next);
    return next.find(i => i.id === id);
  }, [items, persist]);

  const remove = useCallback((id) => {
    persist(items.filter(i => i.id !== id));
  }, [items, persist]);

  const get = useCallback((id) => items.find(i => i.id === id), [items]);

  return { items, create, update, remove, get, setAll: persist };
}

export function useInvoiceNumber() {
  const { user } = useAuth();
  return useCallback(() => {
    if (!user) return "INV-001";
    const list = readList(user.id, "invoices");
    const next = (list.length + 1).toString().padStart(3, "0");
    return `INV-${next}`;
  }, [user]);
}
