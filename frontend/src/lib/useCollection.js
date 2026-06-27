import { useCallback, useEffect, useState } from "react";
import { useAuth } from " @/lib/AuthContext";
import { readList, writeList, uid } from "@/lib/storage";
import { supabase, isSupabaseEnabled } from "@/lib/supabase";

// Map between camelCase frontend ↔ snake_case DB column names (subset; extra fields pass through).
const KEY_TO_DB = {
  clientName: "client_name", clientEmail: "client_email", clientAddress: "client_address",
  invoiceNumber: "invoice_number", issueDate: "issue_date", dueDate: "due_date",
  taxRate: "tax_rate", taxAmt: "tax_amt", discountAmt: "discount_amt",
  paidAt: "paid_at", createdAt: "created_at", updatedAt: "updated_at",
  upiId: "upi_id", qrImage: "qr_image", clientId: "client_id",
  leadSource: "lead_source", followUpDate: "follow_up_date",
  lastContactedAt: "last_contacted_at", leadNotes: "lead_notes", estimatedValue: "estimated_value",
  isLead: "is_lead",
};
const DB_TO_KEY = Object.fromEntries(Object.entries(KEY_TO_DB).map(([k, v]) => [v, k]));

function toDb(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj || {})) {
    out[KEY_TO_DB[k] || k] = v;
  }
  return out;
}
function fromDb(obj) {
  if (!obj) return obj;
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    out[DB_TO_KEY[k] || k] = v;
  }
  return out;
}

const TABLE_BY_KEY = {
  clients: "clients",
  briefs: "briefs",
  invoices: "invoices",
};

export function useCollection(key) {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const table = TABLE_BY_KEY[key];

  const fetchAll = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      if (isSupabaseEnabled && table) {
        const { data, error: e } = await supabase.from(table).select("*").eq("user_id", user.id).order("created_at", { ascending: false });
        if (e) throw e;
        setItems(data.map(fromDb));
      } else {
        setItems(readList(user.id, key));
      }
      setError(null);
    } catch (e) {
      console.error("useCollection fetch error", e);
      setError(e.message || "Failed to load");
      setItems(readList(user.id, key));
    } finally {
      setLoading(false);
    }
  }, [user, key, table]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const create = useCallback(async (data) => {
    if (!user) return null;
    const optimistic = { id: uid(), createdAt: new Date().toISOString(), ...data };

    if (isSupabaseEnabled && table) {
      try {
        const { id: _ignored, ...rest } = optimistic;
        const payload = { ...toDb(rest), user_id: user.id };
        const { data: row, error: e } = await supabase.from(table).insert(payload).select().single();
        if (e) throw e;
        const inserted = fromDb(row);
        setItems((p) => [inserted, ...p]);
        return inserted;
      } catch (e) {
        console.error("create supabase error", e);
      }
    }
    const next = [optimistic, ...items];
    writeList(user.id, key, next);
    setItems(next);
    return optimistic;
  }, [items, key, table, user]);

  const update = useCallback(async (id, patch) => {
    if (!user) return null;
    const next = items.map(i => i.id === id ? { ...i, ...patch, updatedAt: new Date().toISOString() } : i);
    setItems(next);
    if (isSupabaseEnabled && table) {
      try {
        const payload = toDb({ ...patch, updatedAt: new Date().toISOString() });
        const { error: e } = await supabase.from(table).update(payload).eq("id", id).eq("user_id", user.id);
        if (e) throw e;
        return next.find(i => i.id === id);
      } catch (e) { console.error("update supabase error", e); }
    }
    writeList(user.id, key, next);
    return next.find(i => i.id === id);
  }, [items, key, table, user]);

  const remove = useCallback(async (id) => {
    if (!user) return;
    const next = items.filter(i => i.id !== id);
    setItems(next);
    if (isSupabaseEnabled && table) {
      try {
        const { error: e } = await supabase.from(table).delete().eq("id", id).eq("user_id", user.id);
        if (e) throw e;
        return;
      } catch (e) { console.error("delete supabase error", e); }
    }
    writeList(user.id, key, next);
  }, [items, key, table, user]);

  const get = useCallback((id) => items.find(i => i.id === id), [items]);

  return { items, loading, error, create, update, remove, get, refresh: fetchAll };
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
