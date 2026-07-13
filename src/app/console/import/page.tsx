"use client";

import Link from "next/link";
import { useState } from "react";
import Papa from "papaparse";
import { supabase } from "@/lib/supabase";
import { useStaff } from "@/lib/auth";

/**
 * Import wizard: bring in barriers the team already collected.
 * 1. Upload a CSV (export any spreadsheet as CSV)
 * 2. Match your columns to our fields (auto-guessed)
 * 3. Preview, then import — everything arrives as DRAFTS to review & publish.
 */

const FIELDS = [
  ["label", "Barrier name *", true],
  ["summary", "Description", false],
  ["party", "Responsible party", false],
  ["status", "Status (documented / contacted / awaiting / resolved)", false],
  ["date", "Date documented", false],
  ["lat", "Latitude", false],
  ["lon", "Longitude", false],
  ["photos", "Photo links (image URLs, comma-separated)", false],
  ["photo_alt", "Photo description (for all photos in the row)", false],
] as const;
type FieldKey = (typeof FIELDS)[number][0];

/** Split a cell of one-or-more image URLs (comma / pipe / newline / space
 *  separated) into a clean list of http(s) links. */
function parsePhotoUrls(cell: string): string[] {
  return cell
    .split(/[\s,|]+/)
    .map((s) => s.trim())
    .filter((s) => /^https?:\/\/\S+/i.test(s));
}

const STATUS_MAP: Record<string, string> = {
  documented: "documented", new: "documented", open: "documented", identified: "documented",
  contacted: "contacted", "letter sent": "contacted", sent: "contacted",
  awaiting: "awaiting", "awaiting response": "awaiting", pending: "awaiting", waiting: "awaiting",
  resolved: "resolved", fixed: "resolved", closed: "resolved", done: "resolved",
};

function guessMapping(headers: string[]): Partial<Record<FieldKey, string>> {
  const m: Partial<Record<FieldKey, string>> = {};
  const find = (...needles: string[]) =>
    headers.find((h) => needles.some((n) => h.toLowerCase().includes(n)));
  m.label = find("name", "title", "barrier", "location", "label");
  m.summary = find("desc", "summary", "detail", "notes", "issue");
  m.party = find("party", "responsib", "owner", "business", "manager");
  m.status = find("status", "stage", "state");
  m.date = find("date", "documented", "found", "when");
  m.lat = find("lat");
  m.lon = find("lon", "lng", "long");
  m.photos = find("photo", "image", "picture", "img");
  m.photo_alt = find("alt", "caption");
  return m;
}

export default function ImportPage() {
  const { session, staff, loading } = useStaff();
  const [rows, setRows] = useState<Record<string, string>[] | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [map, setMap] = useState<Partial<Record<FieldKey, string>>>({});
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [result, setResult] = useState<{ ok: number; photos: number; failed: { row: number; why: string }[] } | null>(null);

  if (loading) return <Shell><p role="status" className="text-moss">Loading…</p></Shell>;
  if (!session || !staff)
    return <Shell><p><Link href="/console" className="font-semibold text-fern underline underline-offset-4">Sign in</Link> to import.</p></Shell>;
  if (staff.role === "contributor")
    return <Shell><p className="max-w-prose">Importing is for editors and admins — ask Erica if you need access.</p></Shell>;

  function onFile(f: File | null) {
    if (!f) return;
    setResult(null);
    Papa.parse<Record<string, string>>(f, {
      header: true,
      skipEmptyLines: "greedy",
      complete: (res) => {
        const hs = (res.meta.fields ?? []).filter(Boolean);
        setHeaders(hs);
        setRows(res.data);
        setMap(guessMapping(hs));
      },
    });
  }

  const val = (r: Record<string, string>, k: FieldKey) => (map[k] ? (r[map[k]!] ?? "").trim() : "");

  async function runImport() {
    if (!rows) return;
    setBusy(true);
    setResult(null);
    const failed: { row: number; why: string }[] = [];
    let ok = 0;
    let photoCount = 0;

    // party cache: match existing (case-insensitive) or create once
    const { data: existing } = await supabase.from("access_parties").select("id, name");
    const partyIds = new Map((existing ?? []).map((p) => [p.name.toLowerCase(), p.id]));

    for (let i = 0; i < rows.length; i++) {
      setProgress(`Importing ${i + 1} of ${rows.length}…`);
      const r = rows[i];
      const label = val(r, "label");
      if (!label) { failed.push({ row: i + 2, why: "No barrier name" }); continue; }

      let party_id: string | null = null;
      const partyName = val(r, "party");
      if (partyName) {
        const key = partyName.toLowerCase();
        if (partyIds.has(key)) party_id = partyIds.get(key)!;
        else {
          const { data: np, error } = await supabase.from("access_parties")
            .insert({ name: partyName }).select("id").single();
          if (!error && np) { party_id = np.id; partyIds.set(key, np.id); }
        }
      }

      const rawStatus = val(r, "status").toLowerCase();
      const status = STATUS_MAP[rawStatus] ?? "documented";
      const lat = parseFloat(val(r, "lat")); const lon = parseFloat(val(r, "lon"));

      const { data: loc, error } = await supabase.from("access_locations").insert({
        label,
        party: partyName || "To be determined",
        party_id,
        summary: val(r, "summary") || null,
        status,
        published: false,
        lat: Number.isFinite(lat) ? lat : null,
        lon: Number.isFinite(lon) ? lon : null,
        created_by: staff!.email,
      }).select("id").single();
      if (error || !loc) { failed.push({ row: i + 2, why: error?.message ?? "Insert failed" }); continue; }

      const dateStr = val(r, "date");
      const parsed = dateStr ? new Date(dateStr) : null;
      await supabase.from("access_events").insert({
        location_id: loc.id,
        when_label: parsed && !isNaN(+parsed)
          ? parsed.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
          : "Imported " + new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        occurred_on: parsed && !isNaN(+parsed) ? parsed.toISOString().slice(0, 10) : null,
        dir: "Documented",
        txt: val(r, "summary") || label,
        sort: 0,
      });

      // Photos arrive as image URLs in the CSV (one column, comma-separated).
      const urls = parsePhotoUrls(val(r, "photos"));
      if (urls.length) {
        const alt = val(r, "photo_alt") || `Photo of ${label}`;
        const { error: pe } = await supabase.from("access_photos").insert(
          urls.map((src, j) => ({ location_id: loc.id, src, alt, caption: null, sort: j })));
        if (pe) failed.push({ row: i + 2, why: `Barrier imported, but photos failed: ${pe.message}` });
        else photoCount += urls.length;
      }
      ok++;
    }
    setBusy(false);
    setProgress("");
    setResult({ ok, photos: photoCount, failed });
  }

  return (
    <Shell>
      <h1 className="font-display text-3xl font-bold text-pine">Import barriers</h1>
      <p className="mt-2 max-w-prose">
        Upload a CSV of the barriers you&rsquo;ve already collected (export your
        spreadsheet as CSV first). Everything imports as <strong>drafts</strong> —
        nothing goes public until it&rsquo;s reviewed and published.
      </p>
      <p className="mt-2 max-w-prose text-sm text-moss">
        To bring in <strong>photos</strong>, add a column of image links (URLs).
        Put several in one cell separated by commas, and add a description
        column so every photo has alt text.
      </p>

      <label className="mt-6 block max-w-prose cursor-pointer rounded-xl border-2 border-dashed border-moss/50 bg-paper p-8 text-center hover:border-fern">
        <span className="font-display text-lg font-semibold text-fern">Choose a CSV file</span>
        <input type="file" accept=".csv,text/csv" className="sr-only"
          onChange={(e) => onFile(e.target.files?.[0] ?? null)} />
      </label>

      {rows && (
        <>
          <section aria-labelledby="map-h" className="mt-8 max-w-prose">
            <h2 id="map-h" className="font-display text-xl font-semibold text-pine">
              Match your columns <span className="font-body text-sm font-normal text-moss">({rows.length} rows found — we guessed, check us)</span>
            </h2>
            <div className="mt-4 space-y-3">
              {FIELDS.map(([k, label]) => (
                <div key={k} className="flex flex-wrap items-center gap-3">
                  <label htmlFor={`f-${k}`} className="w-56 font-bold">{label}</label>
                  <select id={`f-${k}`} value={map[k] ?? ""}
                    onChange={(e) => setMap((m) => ({ ...m, [k]: e.target.value || undefined }))}
                    className="rounded-lg border border-moss/50 bg-paper px-3 py-2">
                    <option value="">— not in my file —</option>
                    {headers.map((h) => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </section>

          <section aria-labelledby="prev-h" className="mt-8">
            <h2 id="prev-h" className="font-display text-xl font-semibold text-pine">Preview (first 5)</h2>
            <div className="mt-3 overflow-x-auto rounded-xl border border-moss/30 bg-paper">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-moss/30 text-left">
                    {FIELDS.map(([k, label]) => <th key={k} className="px-3 py-2 font-bold">{label.replace(" *","")}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 5).map((r, i) => (
                    <tr key={i} className="border-b border-moss/10">
                      {FIELDS.map(([k]) => <td key={k} className="px-3 py-2">{val(r, k) || <span className="text-moss">—</span>}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <button type="button" disabled={busy || !map.label} onClick={runImport}
            className="mt-6 rounded-lg bg-fern px-6 py-3 font-semibold text-white hover:bg-pine disabled:opacity-50">
            {busy ? progress || "Importing…" : `Import ${rows.length} barriers as drafts`}
          </button>
          {!map.label && <p className="mt-2 text-sm font-semibold text-s_documented">Pick which column is the barrier name first.</p>}
        </>
      )}

      {result && (
        <section aria-labelledby="res-h" className="mt-8 max-w-prose rounded-xl border border-moss/30 bg-paper p-5" role="status">
          <h2 id="res-h" className="font-display text-xl font-semibold text-pine">
            Imported {result.ok} of {result.ok + result.failed.length}
            {result.photos > 0 && <> · {result.photos} photo{result.photos === 1 ? "" : "s"}</>}
          </h2>
          {result.failed.length > 0 && (
            <ul className="mt-3 space-y-1 text-sm">
              {result.failed.map((f, i) => (
                <li key={i} className="text-s_documented">Row {f.row}: {f.why}</li>
              ))}
            </ul>
          )}
          <p className="mt-3">
            They&rsquo;re drafts now — open <Link href="/console/record" className="font-semibold text-fern underline underline-offset-4">the record</Link> to
            place pins, add photos, and publish.
          </p>
        </section>
      )}
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
