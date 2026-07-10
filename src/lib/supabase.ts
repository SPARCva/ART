import { createClient } from "@supabase/supabase-js";

// Publishable key — safe in the browser. Row Level Security protects the data:
// the public can only read published barriers; console access is allow-listed.
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://ldxpockcgcxvsrbyhcnt.supabase.co",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "sb_publishable_3tn2UadRVekIf5Pw6F5z-A_40ZbdvTm",
  { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }
);

export type BarrierStatus = "documented" | "contacted" | "awaiting" | "resolved";

export const STATUS_LABEL: Record<BarrierStatus, string> = {
  documented: "Documented",
  contacted: "Letter sent",
  awaiting: "Awaiting response",
  resolved: "Resolved",
};
