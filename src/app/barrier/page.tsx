"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { StatusBadge } from "@/components/StatusBadge";

type Barrier = {
  id: string; label: string; status: string; summary: string | null; created_at: string;
  access_parties: { name: string; org_type: string | null } | { name: string; org_type: string | null }[] | null;
  access_photos: { src: string; alt: string; caption: string | null; sort: number }[] | null;
  access_events: { when_label: string; occurred_on: string | null; dir: string; txt: string; sort: number }[] | null;
};

function BarrierInner() {
  const id = useSearchParams().get("id");
  const [counts, setCounts] = useState({ still: 0, gone: 0 });
  const [voted, setVoted] = useState(false);
  async function loadCounts(locId: string) {
    const { data } = await supabase.from("access_barrier_checks").select("verdict").eq("location_id", locId);
    const list = (data as { verdict: string }[]) ?? [];
    setCounts({ still: list.filter(v => v.verdict === "still_there").length, gone: list.filter(v => v.verdict === "gone").length });
  }
  async function vote(verdict: "still_there" | "gone") {
    if (!id || voted) return;
    setVoted(true);
    try { localStorage.setItem(`art-check-loc-${id}`, verdict); } catch {}
    await supabase.from("access_barrier_checks").insert({ location_id: id, verdict });
    loadCounts(id);
  }
  const [b, setB] = useState<Barrier | null | undefined>(undefined);

  useEffect(() => {
    if (!id) { setB(null); return; }
    try { if (localStorage.getItem(`art-check-loc-${id}`)) setVoted(true); } catch {}
    loadCounts(id);
    supabase
      .from("access_locations")
      .select("id, label, status, summary, created_at, access_parties(name, org_type), access_photos(src, alt, caption, sort), access_events(when_label, occurred_on, dir, txt, sort)")
      .eq("id", id)
      .eq("published", true)
      .maybeSingle()
      .then(({ data }) => setB((data as Barrier) ?? null));
  }, [id]);

  if (b === undefined) return <p role="status" className="text-moss">Loading…</p>;
  if (b === null)
    return (
      <p className="max-w-prose">
        This entry isn&rsquo;t on the public record.{" "}
        <Link href="/map" className="font-semibold text-fern underline underline-offset-4">Back to the record</Link>.
      </p>
    );

  const photos = (b.access_photos ?? []).slice().sort((x, y) => x.sort - y.sort);
  const events = (b.access_events ?? []).slice().sort((x, y) => x.sort - y.sort);
  const party = Array.isArray(b.access_parties) ? b.access_parties[0] : b.access_parties;
  const firstContact = events.find((e) => /sent|letter|contact/i.test(e.dir))?.occurred_on;
  const daysWaiting =
    firstContact && b.status !== "resolved"
      ? Math.floor((Date.now() - new Date(firstContact).getTime()) / 86400000)
      : null;

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <StatusBadge status={b.status} />
        {daysWaiting !== null && (
          <span className="font-mono text-sm text-moss">{daysWaiting} day{daysWaiting === 1 ? "" : "s"} since first contact</span>
        )}
      </div>
      <h1 className="mt-3 font-display text-4xl font-bold text-pine">{b.label}</h1>
      {party?.name && (
        <p className="mt-2 text-moss">
          Responsible party: <strong className="text-ink">{party.name}</strong>
          {party.org_type ? ` (${party.org_type})` : ""}
        </p>
      )}
      {b.summary && <p className="mt-5 max-w-prose text-lg leading-relaxed">{b.summary}</p>}

      {photos.length > 0 && (
        <section aria-labelledby="photos-h" className="mt-10">
          <h2 id="photos-h" className="font-display text-2xl font-semibold text-pine">What it looks like</h2>
          <ul className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {photos.map((p, i) => (
              <li key={i}>
                <figure className="rounded-xl border border-moss/30 bg-paper p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.src} alt={p.alt} className="aspect-[4/3] w-full rounded-lg object-cover" />
                  {p.caption && <figcaption className="p-2 text-sm text-moss">{p.caption}</figcaption>}
                </figure>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="trail-h" className="mt-12 max-w-prose">
        <h2 id="trail-h" className="font-display text-2xl font-semibold text-pine">The paper trail</h2>
        {events.length === 0 ? (
          <p className="mt-3 text-moss">Steps will appear here as the team takes them.</p>
        ) : (
          <ol className="ledger mt-6 space-y-7">
            {events.map((e, i) => (
              <li key={i}>
                <p className="font-mono text-xs uppercase tracking-wider text-moss">{e.when_label}</p>
                <h3 className="mt-0.5 font-bold">{e.dir}</h3>
                <p className="mt-1 whitespace-pre-wrap">{e.txt}</p>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section aria-label="Is this barrier still there?" className="mt-10 max-w-prose rounded-xl border border-moss/30 bg-paper p-5">
        <h2 className="font-display text-lg font-semibold text-pine">Been there recently? Tell us if it&rsquo;s still there.</h2>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button type="button" disabled={voted} onClick={() => vote("still_there")}
            className="rounded-full border-2 border-s_awaiting px-4 py-1.5 text-sm font-semibold text-s_awaiting hover:bg-s_awaiting/10 disabled:opacity-60">
            Yes, still there ({counts.still})
          </button>
          <button type="button" disabled={voted} onClick={() => vote("gone")}
            className="rounded-full border-2 border-s_resolved px-4 py-1.5 text-sm font-semibold text-s_resolved hover:bg-s_resolved/10 disabled:opacity-60">
            No, it&rsquo;s gone ({counts.gone})
          </button>
          {voted && <span className="text-sm text-moss">Thanks — counted.</span>}
        </div>
      </section>

      <aside className="mt-14 max-w-prose rounded-xl border border-moss/30 bg-paper p-6">
        <h2 className="font-display text-xl font-semibold text-pine">Found something like this where you live?</h2>
        <p className="mt-2">You don&rsquo;t have to be part of the team to speak up. We&rsquo;ll help you write the letter.</p>
        <Link href="/report" className="mt-4 inline-block rounded-lg bg-fern px-5 py-2.5 font-semibold text-white hover:bg-pine">
          Report a barrier in your community
        </Link>
      </aside>
    </>
  );
}

export default function BarrierPage() {
  return (
    <main id="main" className="mx-auto max-w-5xl px-5 py-12">
      <p className="mb-6">
        <Link href="/map" className="text-sm font-semibold text-fern underline underline-offset-4">← The record</Link>
      </p>
      <Suspense fallback={<p role="status" className="text-moss">Loading…</p>}>
        <BarrierInner />
      </Suspense>
    </main>
  );
}
