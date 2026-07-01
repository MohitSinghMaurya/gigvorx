import { useCallback, useEffect, useState } from "react";

import { useAuth } from "@/lib/AuthContext";
import { readList, uid, writeList } from "@/lib/storage";
import { isSupabaseEnabled, supabase } from "@/lib/supabase";

const KEY_TO_DB = {
  clientName: "client_name",
  clientEmail: "client_email",
  clientPhone: "client_phone",
  clientAddress: "client_address",
  clientGst: "client_gst",
  clientGST: "client_gst",

  projectTitle: "project_title",
  invoiceNumber: "invoice_number",
  issueDate: "issue_date",
  dueDate: "due_date",

  taxRate: "tax_rate",
  taxAmt: "tax_amount",
  taxAmount: "tax_amount",
  discountAmt: "discount_amount",
  discountAmount: "discount_amount",

  paidAt: "paid_at",
  createdAt: "created_at",
  updatedAt: "updated_at",

  upiId: "upi_id",
  qrImage: "qr_image",
  paymentType: "payment_type",
  bankName: "bank_name",
  bankAccount: "bank_account",
  bankIfsc: "bank_ifsc",

  businessName: "business_name",
  businessEmail: "business_email",
  businessPhone: "business_phone",
  businessAddress: "business_address",
  businessGst: "business_gst",

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

const DB_TO_KEY = {
  client_name: "clientName",
  client_email: "clientEmail",
  client_phone: "clientPhone",
  client_address: "clientAddress",
  client_gst: "clientGst",

  project_title: "projectTitle",
  invoice_number: "invoiceNumber",
  issue_date: "issueDate",
  due_date: "dueDate",

  tax_rate: "taxRate",
  tax_amount: "taxAmount",
  discount_amount: "discountAmount",

  paid_at: "paidAt",
  created_at: "createdAt",
  updated_at: "updatedAt",

  upi_id: "upiId",
  qr_image: "qrImage",
  payment_type: "paymentType",
  bank_name: "bankName",
  bank_account: "bankAccount",
  bank_ifsc: "bankIfsc",

  business_name: "businessName",
  business_email: "businessEmail",
  business_phone: "businessPhone",
  business_address: "businessAddress",
  business_gst: "businessGst",

  client_id: "clientId",
  lead_source: "leadSource",
  follow_up_date: "followUpDate",
  last_contacted_at: "lastContactedAt",
  lead_notes: "leadNotes",
  estimated_value: "estimatedValue",
  is_lead: "isLead",

  share_token: "shareToken",
  share_enabled: "shareEnabled",
};

const TABLE_BY_KEY = {
  clients: "clients",
  leads: "clients",
  briefs: "briefs",
  invoices: "invoices",
};

function toDb(object) {
  const output = {};

  for (const [key, value] of Object.entries(object || {})) {
    if (value === undefined) continue;
    output[KEY_TO_DB[key] || key] = value;
  }

  return output;
}

function fromDb(object) {
  if (!object) return object;

  const output = {};

  for (const [key, value] of Object.entries(object)) {
    output[DB_TO_KEY[key] || key] = value;
  }

  return output;
}

function applyCollectionFilters(query, key) {
  if (key === "leads") {
    return query.eq("is_lead", true);
  }

  if (key === "clients") {
    return query.or("is_lead.is.null,is_lead.eq.false");
  }

  return query;
}

export function useCollection(key) {
  const { user } = useAuth();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(Boolean(user));
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
      if (isSupabaseEnabled && table) {
        let query = supabase
          .from(table)
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", {
            ascending: false,
          });

        query = applyCollectionFilters(query, key);

        const { data, error: fetchError } = await query;

        if (fetchError) throw fetchError;

        setItems((data || []).map(fromDb));
        return;
      }

      setItems(readList(user.id, key));
    } catch (err) {
      console.error("useCollection fetch error", key, err);

      try {
        setItems(readList(user.id, key));
      } catch {
        setItems([]);
        setError(err.message || "Failed to load");
      }
    } finally {
      setLoading(false);
    }
  }, [user?.id, key, table]);

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
      if (key === "clients" && optimistic.isLead === undefined) {
        optimistic.isLead = false;
      }

      if (isSupabaseEnabled && table) {
        try {
          const { id: ignoredId, ...rest } = optimistic;

          const payload = {
            ...toDb(rest),
            user_id: user.id,
          };

          const { data: row, error: createError } = await supabase
            .from(table)
            .insert(payload)
            .select()
            .single();

          if (createError) throw createError;

          const inserted = fromDb(row);
          setItems((prev) => [inserted, ...prev]);
          return inserted;
        } catch (err) {
          console.error("create supabase error", err);
        }
      }

      const next = [optimistic, ...items];
      writeList(user.id, key, next);
      setItems(next);

      return optimistic;
    },
    [items, key, table, user?.id]
  );

  const update = useCallback(
    async (id, patch) => {
      if (!user?.id) return null;

      const now = new Date().toISOString();

      const next = items.map((item) =>
        item.id === id
          ? {
              ...item,
              ...patch,
              updatedAt: now,
            }
          : item
      );

      setItems(next);

      if (isSupabaseEnabled && table) {
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

          return next.find((item) => item.id === id) || null;
        } catch (err) {
          console.error("update supabase error", err);
        }
      }

      writeList(user.id, key, next);
      return next.find((item) => item.id === id) || null;
    },
    [items, key, table, user?.id]
  );

  const remove = useCallback(
    async (id) => {
      if (!user?.id) return;

      const next = items.filter((item) => item.id !== id);
      setItems(next);

      if (isSupabaseEnabled && table) {
        try {
          const { error: deleteError } = await supabase
            .from(table)
            .delete()
            .eq("id", id)
            .eq("user_id", user.id);

          if (deleteError) throw deleteError;

          return;
        } catch (err) {
          console.error("delete supabase error", err);
        }
      }

      writeList(user.id, key, next);
    },
    [items, key, table, user?.id]
  );

  const get = useCallback(
    (id) => items.find((item) => item.id === id),
    [items]
  );

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
    const nextNumber = (list.length + 1).toString().padStart(3, "0");

    return `INV-${nextNumber}`;
  }, [user?.id]);
}