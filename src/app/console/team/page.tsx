"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useStaff } from "@/lib/auth";

type Member = { email: string; role: "contributor" | "editor" | "admin"; display_name: string | null };
const ROLES = [
  ["contributor", "Contributor — submits and tracks their own reports"],
  ["editor", "Editor — reviews, edits, publishes everything"],
  ["admin", "Admin — editor plus manages this team list"],
] as const;

export default function TeamPage() {
  const { session, staff, loading } = useStaff();
  const [members, setMembers] = useState<Member[] | null>(null);
  const [email, setEmail] = useState(""); const [name, setName] = useState("");
  const [role, setRole] = useState<Member["role"]>("contributor");
  const [busy, setBusy] = useState(false); const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    const { data } = await supabase.from("access_staff")
      .select("email, role, display_name").order("role").order("email");
    setMembers((data as Member[]) ?? []);
  }
  useEffect(() => { if (session) load(); }, [session]);

  if (loading) return <Shell><p role="status" className="text-moss">Loading…</p></Shell>;
  if (!session || !staff)
    return <Shell><p><Link href="/console" className="font-semibold text-fern underline underline-offset-4">Sign in</Link> to manage the team.</p></Shell>;
  if (staff.role !== "admin")
    return <Shell><p className="max-w-prose">Only admins can manage the team list. Ask Erica to add or change members.</p></Shell>;

  async function add() {
    const e = email.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) { setErr("That doesn't look like an email address."); return; }
    setBusy(true); setErr(null); setMsg(null);
    const { error } = await supabase.from("access_staff")
      .upsert({ email: e, role, display_name: name.trim() || null });
    setBusy(false);
    if (error) { setErr(error.message); return; }
    setMsg(`${e} added as ${role}. They can sign in right away with a magic link — work or personal email both work.`);
    setEmail(""); setName(""); load();
  }
  async function setMemberRole(m: Member, r: Member["role"]) {
    setBusy(true);
    await supabase.from("access_staff").update({ role: r }).eq("email", m.email);
    setBusy(false); load();
  }
  async function remove(m: Member) {
    if (m.email === staff!.email) { setErr("You can't remove yourself."); return; }
    if (!confirm(`Remove ${m.email} from the team? They immediately lose console access.`)) return;
    setBusy(true);
    await supabase.from("access_staff").delete().eq("email", m.email);
    setBusy(false); load();
  }

  return (
    <Shell>
      <h1 className="font-display text-3xl font-bold text-pine">Team</h1>
      <p className="mt-2 max-w-prose">
        Everyone here can sign in to the console with a magic link — any
        email works, work or personal. Access ends the moment they&rsquo;re removed.
      </p>

      <section aria-labelledby="add-h" className="mt-8 max-w-prose rounded-xl border border-moss/30 bg-paper p-5">
        <h2 id="add-h" className="font-display text-xl font-semibold text-pine">Add a team member</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="temail" className="block font-bold">Email</label>
            <input id="temail" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              className="mt-2 w-full rounded-lg border border-moss/50 px-4 py-3" />
          </div>
          <div>
            <label htmlFor="tname" className="block font-bold">Name <span className="font-normal text-moss">(optional)</span></label>
            <input id="tname" value={name} onChange={(e) => setName(e.target.value)}
              className="mt-2 w-full rounded-lg border border-moss/50 px-4 py-3" />
          </div>
        </div>
        <fieldset className="mt-4">
          <legend className="font-bold">Role</legend>
          <div className="mt-2 space-y-2">
            {ROLES.map(([v, l]) => (
              <label key={v} className="flex cursor-pointer items-start gap-2">
                <input type="radio" name="role" className="mt-1.5" checked={role === v} onChange={() => setRole(v)} />
                <span>{l}</span>
              </label>
            ))}
          </div>
        </fieldset>
        {err && <p role="alert" className="mt-3 rounded-lg bg-s_documented/10 p-3 font-semibold text-s_documented">{err}</p>}
        {msg && <p role="status" className="mt-3 rounded-lg bg-fern/10 p-3">{msg}</p>}
        <button type="button" disabled={busy} onClick={add}
          className="mt-4 rounded-lg bg-fern px-6 py-3 font-semibold text-white hover:bg-pine disabled:opacity-60">
          {busy ? "Working…" : "Add to the team"}
        </button>
      </section>

      <section aria-labelledby="roster-h" className="mt-10">
        <h2 id="roster-h" className="font-display text-xl font-semibold text-pine">Current team</h2>
        {members === null ? (
          <p role="status" className="mt-3 text-moss">Loading…</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {members.map((m) => (
              <li key={m.email} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-moss/30 bg-paper p-4">
                <div>
                  <p className="font-bold">{m.display_name || m.email}</p>
                  {m.display_name && <p className="text-sm text-moss">{m.email}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <label className="sr-only" htmlFor={`role-${m.email}`}>Role for {m.email}</label>
                  <select id={`role-${m.email}`} value={m.role} disabled={busy || m.email === staff!.email}
                    onChange={(e) => setMemberRole(m, e.target.value as Member["role"])}
                    className="rounded-lg border border-moss/50 bg-paper px-3 py-2 text-sm">
                    <option value="contributor">Contributor</option>
                    <option value="editor">Editor</option>
                    <option value="admin">Admin</option>
                  </select>
                  <button type="button" disabled={busy || m.email === staff!.email} onClick={() => remove(m)}
                    className="rounded-lg border border-moss/50 px-3 py-2 text-sm font-semibold text-moss hover:border-s_documented hover:text-s_documented disabled:opacity-40">
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main id="main" className="mx-auto max-w-5xl px-5 py-10">
      <p className="mb-6"><Link href="/console" className="text-sm font-semibold text-fern underline underline-offset-4">← Team console</Link></p>
      {children}
    </main>
  );
}
