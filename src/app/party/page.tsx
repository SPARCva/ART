"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { StatusBadge } from "@/components/StatusBadge";

type Party = { id: string; name: string; org_type: string | null };
type Row = { id: string; label: string; status: string; summary: string | null; created_at: string };

function PartyInner() {
  const id = useSearchParams().get("id");
  const [party, setParty] = useState<Party | null | undefined>(undefined);
  const [list, setList] = useState<Row[]>([]);

  useEffect(() => {
    if (!id) { setParty(null); return; }
    supabase.from("access_parties").select("id, name, org_type").eq("id", id).maybeSingle()
      .then(({ data }) => setParty((data as Party) ?? null));
    supabase.from("access_locations").select("id, label, status, summary, created_at")
      .eq("party_id", id).eq("published", true).order("created_at")
      .then(({ data }) => setList((data as Row[]) ?? []));
  }, [id]);

  if (party === undefined) return <p role="status" className="text-moss">Loading…</p>;
  if (party === null)
    return (
      <p className="max-w-prose">
        This party isn&rsquo;t on the public record.{" "}
        <Link href="/map" className="font-semibold text-fern underline underline-offset-4">Back to the record</Link>.
      </p>
    );

  const open = list.filter((b) => b.status !== "resolved").length;
  const first = list[0]?.created_at;

  return (
    <>
      <p className="font-mono text-sm uppercase tracking-widest text-moss">Responsible party</p>
      <h1 className="mt-2 font-display text-4xl font-bold text-pine">{party.name}</h1>
      {party.org_type && <p className="mt-1 text-moss">{party.org_type}</p>}
      <p className="mt-4 max-w-prose text-lg">
        {list.length} documented barrier{list.length === 1 ? "" : "s"}
        {open > 0 && <> · <strong>{open} still open</strong></>}
        {first && <> · on the record since {new Date(first).toLocaleDateString("en-US", { month: "long", year: "numeric" })}</>}
      </p>
      <ul className="mt-8 space-y-4">
        {list.map((b) => (
          <li key={b.id} className="rounded-xl border border-moss/30 bg-paper p-5">
            <div className="flex flex-wrap items-center gap-3">
              <StatusBadge status={b.status} />
              <h2 className="font-display text-xl font-semibold text-pine">
                <Link href={`/barrier?id=${b.id}`} className="hover:underline">{b.label}</Link>
              </h2>
            </div>
            {b.summary && <p className="mt-2 line-clamp-2 max-w-prose">{b.summary}</p>}
          </li>
        ))}
      </ul>
    </>
  );
}

export default function PartyPage() {
  return (
    <main id="main" className="mx-auto max-w-5xl px-5 py-12">
      <p className="mb-6">
        <Link href="/map" className="text-sm font-semibold text-fern underline underline-offset-4">← The record</Link>
      </p>
      <Suspense fallback={<p role="status" className="text-moss">Loading…</p>}>
        <PartyInner />
      </Suspense>
    </main>
  );
}
