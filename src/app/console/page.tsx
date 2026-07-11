"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useEffect } from "react";
import { sendMagicLink, signOut, useStaff, verifyCode } from "@/lib/auth";
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
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function sendIt(e?: FormEvent) {
    e?.preventDefault();
    setBusy(true); setError(null);
    const { error } = await sendMagicLink(email.trim().toLowerCase());
    setBusy(false);
    if (error) setError(error.message);
    else setSent(true);
  }

  async function checkCode(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    const { error } = await verifyCode(email.trim().toLowerCase(), code);
    setBusy(false);
    if (error) setError("That code didn't work — check for typos, or send a fresh one (codes expire after a few minutes).");
    // success: useStaff picks up the session automatically
  }

  return (
    <Shell>
      <h1 className="font-display text-3xl font-bold text-pine">Team sign-in</h1>
      <p className="mt-2 max-w-prose">
        No password. Enter your email and we&rsquo;ll send you a <strong>6-digit
        code</strong> — type it here and you&rsquo;re in. The email also has a
        sign-in link if you&rsquo;d rather tap that.
      </p>

      {!sent ? (
        <form onSubmit={sendIt} className="mt-6 max-w-sm">
          <label htmlFor="email" className="block font-bold">Your email</label>
          <p className="mt-1 text-sm text-moss">The one Erica added to the team — work or personal.</p>
          <input id="email" type="email" required autoComplete="email" value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-2 w-full rounded-lg border border-moss/50 bg-paper px-4 py-3" />
          {error && <p role="alert" className="mt-3 font-semibold text-s_documented">Couldn&rsquo;t send it: {error}</p>}
          <button type="submit" disabled={busy}
            className="mt-4 rounded-lg bg-fern px-6 py-3 font-semibold text-white hover:bg-pine disabled:opacity-60">
            {busy ? "Sending…" : "Email me a code"}
          </button>
        </form>
      ) : (
        <form onSubmit={checkCode} className="mt-6 max-w-sm">
          <p role="status" className="rounded-lg bg-fern/10 p-4">
            Sent to <strong>{email}</strong>. Give it a minute and check spam
            if it&rsquo;s shy.
          </p>
          <label htmlFor="code" className="mt-5 block font-bold">The 6-digit code from the email</label>
          <input id="code" inputMode="numeric" autoComplete="one-time-code" maxLength={6}
            value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            className="mt-2 w-full rounded-lg border border-moss/50 bg-paper px-4 py-3 text-center font-mono text-2xl tracking-[0.5em]" />
          {error && <p role="alert" className="mt-3 font-semibold text-s_documented">{error}</p>}
          <div className="mt-4 flex flex-wrap gap-3">
            <button type="submit" disabled={busy || code.length !== 6}
              className="rounded-lg bg-fern px-6 py-3 font-semibold text-white hover:bg-pine disabled:opacity-50">
              {busy ? "Checking…" : "Sign in"}
            </button>
            <button type="button" disabled={busy} onClick={() => sendIt()}
              className="rounded-lg border-2 border-fern px-5 py-3 font-semibold text-fern hover:bg-fern/10 disabled:opacity-60">
              Send a fresh one
            </button>
          </div>
          <p className="mt-4 text-sm text-moss">
            Tapping the link in the email works too — it opens the console
            directly. The code is just the sure-fire way on any device.
          </p>
        </form>
      )}
    </Shell>
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
