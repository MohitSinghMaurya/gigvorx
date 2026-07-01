import { useCallback, useEffect, useState } from "react";

import { useAuth } from "@/lib/AuthContext";
import { isSupabaseEnabled, supabase } from "@/lib/supabase";
import { readList, uid, writeList } from "@/lib/storage";

const KEY_TO_DB = {
  clientName: "client_name",
  clientEmail: "client_email",
  clientPhone: "client_phone",
  clientAddress: "client_address",
  projectTitle: "project_title",
  invoiceNumber: "invoice_number",
  issueDate: "issue_date",
  dueDate: "due_date",
  taxRate: "tax_rate",
  taxAmt: "tax_amt",
  discountAmt: "discount_amt",
  paidAt: "paid_at",
  createdAt: "created_at",
  updatedAt: "updated_at",
  upiId: "upi_id",
  qrImage: "qr_image",
  clientId: "client_id",
  leadSource: "lead_source",
  followUpDate: "follow_up_date",
  lastContactedAt: "last_contacted_at",
  leadNotes: "lead_notes",
  estimatedValue: "estimated_value",
  isLead: "is_lead",
  shareToken: "share_token",
  shareEnabled: "share_enabled",
};

const DB_TO_KEY = Object.fromEntries(
  Object.entries(KEY_TO_DB).map(([key, value]) => [value, key])
);

const TABLE_BY_KEY = {
  clients: "clients",
  leads: "clients",
  briefs: "briefs",
  invoices: "invoices",
};

function toDb(obj) {
  const out = {};

  Object.entries(obj || {}).forEach(([key, value]) => {
    out[KEY_TO_DB[key] || key] = value;
  });

  return out;
}

function fromDb(obj) {
  if (!obj) return obj;

  const out = {};

  Object.entries(obj).forEach(([key, value]) => {
    out[DB_TO_KEY[key] || key] = value;
  });

  return out;
}

function isLeadItem(item) {
  return item?.isLead === true || item?.is_lead === true;
}

function filterLocalItems(key, list) {
  if (key === "leads") return list.filter((item) => isLeadItem(item));
  if (key === "clients") return list.filter((item) => !isLeadItem(item));
  return list;
}

export function useCollection(key) {
  const { user } = useAuth();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const table = TABLE_BY_KEY[key];

  const fetchAll = useCallback(async () => {
    if (!user?.id) {
      setItems([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (isSupabaseEnabled && supabase && table) {
        let query = supabase
          .from(table)
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (key === "leads") {
          query = query.eq("is_lead", true);
        }

        if (key === "clients") {
          query = query.or("is_lead.is.null,is_lead.eq.false");
        }

        const { data, error: queryError } = await query;

        if (queryError) throw queryError;

        setItems((data || []).map(fromDb));
        return;
      }

      const localItems = readList(user.id, key);
      setItems(filterLocalItems(key, localItems));
    } catch (caughtError) {
      console.error("useCollection fetch error:", key, caughtError);

      const fallback = readList(user.id, key);
      setItems(filterLocalItems(key, fallback));
      setError(fallback.length ? null : caughtError.message || "Failed to load data.");
    } finally {
      setLoading(false);
    }
  }, [key, table, user?.id]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const create = useCallback(
    async (data) => {
      if (!user?.id) return null;

      const now = new Date().toISOString();

      const optimistic = {
        id: uid(),
        createdAt: now,
        updatedAt: now,
        ...data,
      };

      if (key === "leads") optimistic.isLead = true;
      if (key === "clients" && optimistic.isLead === undefined) optimistic.isLead = false;

      if (isSupabaseEnabled && supabase && table) {
        try {
          const { id: _id, ...rest } = optimistic;
          const payload = {
            ...toDb(rest),
            user_id: user.id,
          };

          const { data: row, error: insertError } = await supabase
            .from(table)
            .insert(payload)
            .select()
            .single();

          if (insertError) throw insertError;

          const inserted = fromDb(row);
          setItems((previous) => [inserted, ...previous]);
          return inserted;
        } catch (caughtError) {
          console.error("create supabase error:", caughtError);
        }
      }

      const currentListKey = key === "leads" ? "clients" : key;
      const currentList = readList(user.id, currentListKey);
      const nextList = [optimistic, ...currentList];

      writeList(user.id, currentListKey, nextList);
      setItems((previous) => [optimistic, ...previous]);

      return optimistic;
    },
    [key, table, user?.id]
  );

  const update = useCallback(
    async (id, patch) => {
      if (!user?.id) return null;

      const now = new Date().toISOString();

      const nextItems = items.map((item) =>
        item.id === id ? { ...item, ...patch, updatedAt: now } : item
      );

      setItems(nextItems);

      if (isSupabaseEnabled && supabase && table) {
        try {
          const payload = toDb({
            ...patch,
            updatedAt: now,
          });

          const { error: updateError } = await supabase
            .from(table)
            .update(payload)
            .eq("id", id)
            .eq("user_id", user.id);

          if (updateError) throw updateError;

          return nextItems.find((item) => item.id === id) || null;
        } catch (caughtError) {
          console.error("update supabase error:", caughtError);
        }
      }

      const currentListKey = key === "leads" ? "clients" : key;
      const currentList = readList(user.id, currentListKey);
      const nextList = currentList.map((item) =>
        item.id === id ? { ...item, ...patch, updatedAt: now } : item
      );

      writeList(user.id, currentListKey, nextList);

      return nextItems.find((item) => item.id === id) || null;
    },
    [items, key, table, user?.id]
  );

  const remove = useCallback(
    async (id) => {
      if (!user?.id) return;

      const nextItems = items.filter((item) => item.id !== id);
      setItems(nextItems);

      if (isSupabaseEnabled && supabase && table) {
        try {
          const { error: deleteError } = await supabase
            .from(table)
            .delete()
            .eq("id", id)
            .eq("user_id", user.id);

          if (deleteError) throw deleteError;

          return;
        } catch (caughtError) {
          console.error("delete supabase error:", caughtError);
        }
      }

      const currentListKey = key === "leads" ? "clients" : key;
      const currentList = readList(user.id, currentListKey);
      const nextList = currentList.filter((item) => item.id !== id);

      writeList(user.id, currentListKey, nextList);
    },
    [items, key, table, user?.id]
  );

  const get = useCallback((id) => items.find((item) => item.id === id), [items]);

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
    if (!user?.id) return "INV-001";

    const list = readList(user.id, "invoices");
    const next = (list.length + 1).toString().padStart(3, "0");

    return `INV-${next}`;
  }, [user?.id]);
}

export default useCollection;