"use client";

import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";

export type StaffRole = "contributor" | "editor" | "admin";

export interface Staff {
  email: string;
  role: StaffRole;
  displayName: string | null;
}

/** Session + staff role for the signed-in user (null role = not staff). */
export function useStaff() {
  const [session, setSession] = useState<Session | null>(null);
  const [staff, setStaff] = useState<Staff | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!session?.user?.email) {
        setStaff(null);
        setLoading(false);
        return;
      }
      const { data } = await supabase
        .from("access_staff")
        .select("email, role, display_name")
        .eq("email", session.user.email)
        .maybeSingle();
      if (!cancelled) {
        setStaff(
          data
            ? { email: data.email, role: data.role, displayName: data.display_name }
            : null
        );
        setLoading(false);
      }
    }
    setLoading(true);
    load();
    return () => {
      cancelled = true;
    };
  }, [session]);

  return { session, staff, loading };
}

export async function sendMagicLink(email: string) {
  const redirect =
    typeof window !== "undefined"
      ? `${window.location.origin}/ART/console`
      : undefined;
  return supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: redirect },
  });
}

export async function verifyCode(email: string, code: string) {
  return supabase.auth.verifyOtp({ email, token: code.trim(), type: "email" });
}

export async function signOut() {
  await supabase.auth.signOut();
}
