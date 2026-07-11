"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useEffect } from "react";
import { signInPassword, signUpPassword, signOut, useStaff } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export default function ConsolePage() {
  const { session, staff, loading } = useStaff();
  const [newReports, setNewReports] = useState<number | null>(null);
  useEffect(() => {
    if (!session) return;
    supabase.from("access_public_reports")
      .select("id", { count: "exact", head: true }).eq("status", "new")
      .then(({ count }) => setNewReports(count ?? 0));
  }, [session]);

  if (loading) {
    return (
      <Shell>
        <p role="status" className="text-moss">Checking your session…</p>
      </Shell>
    );
  }

  if (!session) return <SignIn />;

  if (!staff) {
    return (
      <Shell>
        <h1 className="font-display text-3xl font-bold text-pine">Not on the team roster</h1>
        <p className="mt-4 max-w-prose">
          You&rsquo;re signed in as <strong>{session.user.email}</strong>, but this
          address isn&rsquo;t on the Accessibility in Real Time staff list. If you&rsquo;re part
          of the Agents of Change team, ask Erica to add you.
        </p>
        <button
          onClick={() => signOut()}
          className="mt-6 rounded-lg border-2 border-fern px-5 py-2.5 font-semibold text-fern hover:bg-fern/10"
        >
          Sign out
        </button>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="font-display text-3xl font-bold text-pine">Team console</h1>
        <p className="text-sm text-moss">
          {staff.displayName || staff.email} · {staff.role}
          <button onClick={() => signOut()} className="ml-3 font-semibold text-fern underline underline-offset-4">
            Sign out
          </button>
        </p>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <Link
          href="/console/submit"
          className="rounded-xl border border-moss/30 bg-paper p-6 hover:border-fern"
        >
          <h2 className="font-display text-xl font-semibold text-pine">Report a barrier</h2>
          <p className="mt-2 text-moss">
            Document something you found in the field — photos first, a few
            questions, done. Your draft saves as you go.
          </p>
        </Link>
        <Link
          href="/console/community"
          className="rounded-xl border border-moss/30 bg-paper p-6 hover:border-fern"
        >
          <h2 className="font-display text-xl font-semibold text-pine">
            Community reports
            {newReports !== null && newReports > 0 && (
              <span className="ml-2 rounded-full bg-s_awaiting px-2.5 py-0.5 text-sm text-white">{newReports} new</span>
            )}
          </h2>
          <p className="mt-2 text-moss">
            Barriers flagged by the public. Take one up, or mark it handled.
          </p>
        </Link>
        <Link
          href="/console/record"
          className="rounded-xl border border-moss/30 bg-paper p-6 hover:border-fern"
        >
          <h2 className="font-display text-xl font-semibold text-pine">The record</h2>
          <p className="mt-2 text-moss">
            Every barrier, draft and published. Edit details, place pins,
            manage photos and the paper trail{staff.role !== "contributor" ? ", and publish" : ""}.
          </p>
        </Link>
        <Link
          href="/console/queue"
          className="rounded-xl border border-moss/30 bg-paper p-6 hover:border-fern"
        >
          <h2 className="font-display text-xl font-semibold text-pine">
            Review queue {staff.role === "contributor" && <span className="text-sm font-normal text-moss">(your submissions)</span>}
          </h2>
          <p className="mt-2 text-moss">
            {staff.role === "contributor"
              ? "See where your reports are in review."
              : "Review new reports, request info, and merge them into the public record."}
          </p>
        </Link>
        {staff.role !== "contributor" && (
          <Link href="/console/import" className="rounded-xl border border-moss/30 bg-paper p-6 hover:border-fern">
            <h2 className="font-display text-xl font-semibold text-pine">Import barriers</h2>
            <p className="mt-2 text-moss">Bulk-upload barriers you&rsquo;ve already collected from a spreadsheet (CSV).</p>
          </Link>
        )}
        {staff.role === "admin" && (
          <Link href="/console/team" className="rounded-xl border border-moss/30 bg-paper p-6 hover:border-fern">
            <h2 className="font-display text-xl font-semibold text-pine">Team</h2>
            <p className="mt-2 text-moss">Add team members with any email, set roles, remove access.</p>
          </Link>
        )}
      </div>
    </Shell>
  );
}

function SignIn() {
  const [mode, setMode] = useState<"login" | "setup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (mode === "setup") {
      if (password.length < 8) { setError("Pick a password of at least 8 characters."); return; }
      if (password !== confirm) { setError("The passwords don't match."); return; }
    }
    setBusy(true);
    const { error } =
      mode === "login"
        ? await signInPassword(email, password)
        : await signUpPassword(email, password);
    setBusy(false);
    if (error) {
      if (mode === "login" && /invalid/i.test(error.message)) {
        setError("Wrong email or password. First time here? Use \u201cCreate my password\u201d below.");
      } else if (mode === "setup" && /already registered/i.test(error.message)) {
        setError("That email already has a password — log in above, or ask Erica or Andrew to help reset it.");
      } else setError(error.message);
    }
    // success: useStaff picks up the session; the roster decides access.
  }

  return (
    <main id="main" className="flex min-h-[70vh] items-center justify-center px-5 py-16">
      <div className="w-full max-w-md rounded-xl border border-moss/20 bg-paper p-8 shadow-lg">
        <h1 className="text-center font-display text-2xl font-bold text-fern">
          {mode === "login" ? "ART Team Login" : "Create Your Password"}
        </h1>
        <p className="mt-2 text-center text-sm text-moss">
          {mode === "login"
            ? "This area is for the SPARC Accessibility in Real Time team."
            : "First time here? If Erica or Andrew added your email to the team, set a password and you're in."}
        </p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="email" className="block font-bold">Email</label>
            <input id="email" type="email" required autoComplete="email" value={email}
              onChange={(e) => setEmail(e.target.value)} placeholder="Enter your email"
              className="mt-1.5 w-full rounded-lg border border-moss/40 px-4 py-3" />
          </div>
          <div>
            <label htmlFor="password" className="block font-bold">Password</label>
            <input id="password" type="password" required value={password}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === "login" ? "Enter your password" : "At least 8 characters"}
              className="mt-1.5 w-full rounded-lg border border-moss/40 px-4 py-3" />
          </div>
          {mode === "setup" && (
            <div>
              <label htmlFor="confirm" className="block font-bold">Confirm password</label>
              <input id="confirm" type="password" required value={confirm} autoComplete="new-password"
                onChange={(e) => setConfirm(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-moss/40 px-4 py-3" />
            </div>
          )}
          {error && <p role="alert" className="rounded-lg bg-s_documented/10 p-3 text-sm font-semibold text-s_documented">{error}</p>}
          <button type="submit" disabled={busy}
            className="w-full rounded-lg bg-fern px-6 py-3 font-bold text-white hover:bg-pine disabled:opacity-60">
            {busy ? "One moment…" : mode === "login" ? "Log In" : "Create password & log in"}
          </button>
        </form>
        <p className="mt-5 text-center text-sm">
          {mode === "login" ? (
            <button type="button" onClick={() => { setMode("setup"); setError(null); }}
              className="font-semibold text-fern underline underline-offset-4">
              First time? Create my password
            </button>
          ) : (
            <button type="button" onClick={() => { setMode("login"); setError(null); }}
              className="font-semibold text-fern underline underline-offset-4">
              Back to log in
            </button>
          )}
        </p>
        <p className="mt-3 text-center text-xs text-moss">
          Any email works — work or personal — as long as it&rsquo;s on the team list.
          Forgot your password? Ask Erica or Andrew.
        </p>
      </div>
    </main>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main id="main" className="mx-auto max-w-5xl px-5 py-12">
      <p className="mb-8">
        <Link href="/" className="text-sm font-semibold text-fern underline underline-offset-4">
          ← Accessibility in Real Time
        </Link>
      </p>
      {children}
    </main>
  );
}
