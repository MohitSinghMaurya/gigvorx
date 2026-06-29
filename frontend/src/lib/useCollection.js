// frontend/src/lib/useCollection.js
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { readList, writeList, uid } from "@/lib/storage";
import { supabase, isSupabaseEnabled } from "@/lib/supabase";

const KEY_TO_DB = {
  clientName: "client_name", clientEmail: "client_email", clientAddress: "client_address",
  invoiceNumber: "invoice_number", issueDate: "issue_date", dueDate: "due_date",
  taxRate: "tax_rate", taxAmt: "tax_amt", discountAmt: "discount_amt",
  paidAt: "paid_at", createdAt: "created_at", updatedAt: "updated_at",
  upiId: "upi_id", qrImage: "qr_image", clientId: "client_id",
  leadSource: "lead_source", followUpDate: "follow_up_date",
  lastContactedAt: "last_contacted_at", leadNotes: "lead_notes",
  estimatedValue: "estimated_value", isLead: "is_lead",
};
const DB_TO_KEY = Object.fromEntries(
  Object.entries(KEY_TO_DB).map(([k, v]) => [v, k])
);

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

// leads and clients both use the "clients" table
// leads = rows where is_lead is true
// clients = rows where is_lead is false or null
const TABLE_BY_KEY = {
  clients: "clients",
  briefs: "briefs",
  invoices: "invoices",
  leads: "clients",
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
    setError(null);

    try {
      if (isSupabaseEnabled && table) {
        let query = supabase
          .from(table)
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        // Filter leads: only rows with is_lead = true
        if (key === "leads") {
          query = query.eq("is_lead", true);
        }

        // Filter clients: only rows where is_lead is false or not set
        if (key === "clients") {
          query = query.or("is_lead.is.null,is_lead.eq.false");
        }

        const { data, error: e } = await query;

        if (e) throw e;

        setItems((data || []).map(fromDb));
      } else {
        // localStorage fallback
        const all = readList(user.id, key);
        setItems(all);
      }
    } catch (e) {
      console.error("useCollection fetch error", key, e);
      // Try localStorage fallback before showing error
      try {
        const fallback = readList(user.id, key);
        setItems(fallback);
        // Only show error if fallback is also empty
        if (fallback.length === 0) {
          setError(null); // show empty state, not error
        }
      } catch {
        setItems([]);
        setError(e.message || "Failed to load");
      }
    } finally {
      setLoading(false);
    }
  }, [user, key, table]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const create = useCallback(async (data) => {
    if (!user) return null;
    const optimistic = {
      id: uid(),
      createdAt: new Date().toISOString(),
      ...data,
    };

    if (isSupabaseEnabled && table) {
      try {
        const { id: _ignored, ...rest } = optimistic;
        const payload = { ...toDb(rest), user_id: user.id };
        const { data: row, error: e } = await supabase
          .from(table)
          .insert(payload)
          .select()
          .single();
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
    const next = items.map((i) =>
      i.id === id
        ? { ...i, ...patch, updatedAt: new Date().toISOString() }
        : i
    );
    setItems(next);

    if (isSupabaseEnabled && table) {
      try {
        const payload = toDb({
          ...patch,
          updatedAt: new Date().toISOString(),
        });
        const { error: e } = await supabase
          .from(table)
          .update(payload)
          .eq("id", id)
          .eq("user_id", user.id);
        if (e) throw e;
        return next.find((i) => i.id === id);
      } catch (e) {
        console.error("update supabase error", e);
      }
    }

    writeList(user.id, key, next);
    return next.find((i) => i.id === id);
  }, [items, key, table, user]);

  const remove = useCallback(async (id) => {
    if (!user) return;
    const next = items.filter((i) => i.id !== id);
    setItems(next);

    if (isSupabaseEnabled && table) {
      try {
        const { error: e } = await supabase
          .from(table)
          .delete()
          .eq("id", id)
          .eq("user_id", user.id);
        if (e) throw e;
        return;
      } catch (e) {
        console.error("delete supabase error", e);
      }
    }

    writeList(user.id, key, next);
  }, [items, key, table, user]);

  const get = useCallback((id) => items.find((i) => i.id === id), [items]);

  return {
    items,
    loading,
    error,
    create,
    update,
    remove,
    get,
    refresh: fetchAll,
  };
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