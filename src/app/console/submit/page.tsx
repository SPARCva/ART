"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { uploadSubmissionPhoto } from "@/lib/images";
import { useStaff } from "@/lib/auth";

/**
 * Field submission flow — built for a phone on a sidewalk.
 * One question per step, big targets, camera-first, autosaves locally on
 * every change so nothing is lost if the browser reloads. Photos upload
 * immediately (queued), and every photo requires a description before
 * the report can be sent — same standard as the public site.
 */

type Photo = { src: string; alt: string; uploading?: boolean };
type Draft = {
  id: string;
  photos: Photo[];
  barrier: string;
  place: string;
  party: string;
};

const STEPS = ["Photos", "The barrier", "Where", "Who's responsible", "Review"] as const;
const DRAFT_KEY = "sta-submission-draft";

function blankDraft(): Draft {
  return { id: crypto.randomUUID(), photos: [], barrier: "", place: "", party: "" };
}

export default function SubmitPage() {
  const { session, staff, loading } = useStaff();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [step, setStep] = useState(0);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  // restore or create the local draft
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      setDraft(raw ? (JSON.parse(raw) as Draft) : blankDraft());
    } catch {
      setDraft(blankDraft());
    }
  }, []);

  // autosave on every change
  useEffect(() => {
    if (draft) localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  }, [draft]);

  // move focus to the step heading on step change (screen-reader orientation)
  useEffect(() => {
    headingRef.current?.focus();
  }, [step]);

  if (loading || !draft) {
    return <Shell><p role="status" className="text-moss">Loading…</p></Shell>;
  }
  if (!session || !staff) {
    return (
      <Shell>
        <p>
          You need to <Link href="/console" className="font-semibold text-fern underline underline-offset-4">sign in</Link>{" "}
          to report a barrier.
        </p>
      </Shell>
    );
  }

  const photosReady =
    draft.photos.length > 0 &&
    draft.photos.every((p) => p.alt.trim() !== "" && !p.uploading);

  const stepValid = [
    photosReady,
    draft.barrier.trim().length > 0,
    draft.place.trim().length > 0,
    true, // party is optional — the team may not know yet
    true,
  ][step];

  async function addFiles(files: FileList | null) {
    if (!files || !draft) return;
    setError(null);
    for (const file of Array.from(files)) {
      const idx = draft.photos.length;
      setDraft((d) =>
        d ? { ...d, photos: [...d.photos, { src: "", alt: "", uploading: true }] } : d
      );
      try {
        const url = await uploadSubmissionPhoto(supabase, draft.id, file);
        setDraft((d) => {
          if (!d) return d;
          const photos = [...d.photos];
          photos[idx] = { ...photos[idx], src: url, uploading: false };
          return { ...d, photos };
        });
      } catch (e) {
        setDraft((d) => {
          if (!d) return d;
          return { ...d, photos: d.photos.filter((_, i) => i !== idx) };
        });
        setError("A photo didn't upload — check your connection and try again.");
      }
    }
  }

  async function send() {
    if (!draft || !session?.user?.email) return;
    setSending(true);
    setError(null);
    const { error: se } = await supabase.from("access_submissions").insert({
      id: draft.id,
      created_by: session.user.email,
      barrier_desc: draft.barrier.trim(),
      place_desc: draft.place.trim(),
      party_guess: draft.party.trim() || null,
    });
    if (se) {
      setSending(false);
      setError(`Couldn't send the report: ${se.message}`);
      return;
    }
    const { error: pe } = await supabase.from("access_submission_photos").insert(
      draft.photos.map((p, i) => ({
        submission_id: draft.id,
        src: p.src,
        alt: p.alt.trim(),
        sort: i,
      }))
    );
    setSending(false);
    if (pe) {
      setError(`Report saved, but photos failed to attach: ${pe.message}`);
      return;
    }
    localStorage.removeItem(DRAFT_KEY);
    setDone(true);
  }

  if (done) {
    return (
      <Shell>
        <h1 className="font-display text-3xl font-bold text-pine">Report sent</h1>
        <p className="mt-4 max-w-prose">
          Thank you — it&rsquo;s in the review queue. You&rsquo;ll get an email when it&rsquo;s
          reviewed, and you can check its status any time.
        </p>
        <div className="mt-6 flex gap-4">
          <button
            onClick={() => { setDraft(blankDraft()); setStep(0); setDone(false); }}
            className="rounded-lg bg-fern px-6 py-3 font-semibold text-white hover:bg-pine"
          >
            Report another barrier
          </button>
          <Link href="/console/queue" className="rounded-lg border-2 border-fern px-6 py-3 font-semibold text-fern hover:bg-fern/10">
            See my reports
          </Link>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <nav aria-label="Progress" className="mb-6">
        <ol className="flex flex-wrap gap-2 text-sm">
          {STEPS.map((s, i) => (
            <li
              key={s}
              aria-current={i === step ? "step" : undefined}
              className={
                i === step
                  ? "rounded-full bg-pine px-3 py-1 font-semibold text-white"
                  : i < step
                    ? "rounded-full bg-fern/15 px-3 py-1 text-pine"
                    : "rounded-full border border-moss/40 px-3 py-1 text-moss"
              }
            >
              {i + 1}. {s}
            </li>
          ))}
        </ol>
      </nav>

      <h1 ref={headingRef} tabIndex={-1} className="font-display text-3xl font-bold text-pine outline-none">
        {STEPS[step]}
      </h1>

      {error && (
        <p role="alert" className="mt-4 rounded-lg bg-s_documented/10 p-3 font-semibold text-s_documented">
          {error}
        </p>
      )}

      <div className="mt-6 max-w-prose">
        {step === 0 && (
          <>
            <p>Take or choose photos of the barrier. Each photo needs a short
              description so everyone can know what it shows.</p>
            <label className="mt-5 block cursor-pointer rounded-xl border-2 border-dashed border-moss/50 bg-paper p-8 text-center hover:border-fern">
              <span className="font-display text-lg font-semibold text-fern">+ Add photos</span>
              <span className="mt-1 block text-sm text-moss">Camera or photo library</span>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                multiple
                className="sr-only"
                onChange={(e) => addFiles(e.target.files)}
              />
            </label>
            <ul className="mt-5 space-y-4">
              {draft.photos.map((p, i) => (
                <li key={i} className="rounded-xl border border-moss/30 bg-paper p-4">
                  <div className="flex items-start gap-4">
                    {p.uploading ? (
                      <div role="status" className="flex h-20 w-20 items-center justify-center rounded-lg bg-mist text-xs text-moss">
                        Uploading…
                      </div>
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.src} alt="" className="h-20 w-20 rounded-lg object-cover" />
                    )}
                    <div className="flex-1">
                      <label htmlFor={`alt-${i}`} className="block font-bold">
                        What does this photo show? <span aria-hidden="true" className="text-s_documented">*</span>
                      </label>
                      <input
                        id={`alt-${i}`}
                        value={p.alt}
                        required
                        onChange={(e) =>
                          setDraft((d) => {
                            if (!d) return d;
                            const photos = [...d.photos];
                            photos[i] = { ...photos[i], alt: e.target.value };
                            return { ...d, photos };
                          })
                        }
                        placeholder="e.g., Step at the main entrance with no ramp"
                        className="mt-1 w-full rounded-lg border border-moss/50 px-3 py-2.5"
                      />
                    </div>
                    <button
                      type="button"
                      aria-label={`Remove photo ${i + 1}`}
                      onClick={() =>
                        setDraft((d) =>
                          d ? { ...d, photos: d.photos.filter((_, j) => j !== i) } : d
                        )
                      }
                      className="rounded-lg border border-moss/40 px-3 py-2 font-bold text-moss hover:border-s_documented hover:text-s_documented"
                    >
                      ✕
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}

        {step === 1 && (
          <>
            <label htmlFor="barrier" className="block font-bold">
              What makes this place hard or impossible to use?
            </label>
            <p className="mt-1 text-sm text-moss">
              Say it the way you&rsquo;d tell a friend. Dictation works great here.
            </p>
            <textarea
              id="barrier"
              rows={6}
              value={draft.barrier}
              onChange={(e) => setDraft((d) => (d ? { ...d, barrier: e.target.value } : d))}
              className="mt-3 w-full rounded-lg border border-moss/50 bg-paper px-4 py-3"
            />
          </>
        )}

        {step === 2 && (
          <>
            <label htmlFor="place" className="block font-bold">
              Where is it?
            </label>
            <p className="mt-1 text-sm text-moss">
              A business name, address, or landmark — enough for the team to find it.
            </p>
            <input
              id="place"
              value={draft.place}
              onChange={(e) => setDraft((d) => (d ? { ...d, place: e.target.value } : d))}
              placeholder="e.g., Fountain Square, near the pavilion steps"
              className="mt-3 w-full rounded-lg border border-moss/50 bg-paper px-4 py-3"
            />
          </>
        )}

        {step === 3 && (
          <>
            <label htmlFor="party" className="block font-bold">
              Who&rsquo;s responsible, if you know?
            </label>
            <p className="mt-1 text-sm text-moss">
              A business, property manager, or agency. It&rsquo;s okay to leave this
              blank — the review team can figure it out.
            </p>
            <input
              id="party"
              value={draft.party}
              onChange={(e) => setDraft((d) => (d ? { ...d, party: e.target.value } : d))}
              placeholder="e.g., Reston Town Center Management"
              className="mt-3 w-full rounded-lg border border-moss/50 bg-paper px-4 py-3"
            />
          </>
        )}

        {step === 4 && (
          <dl className="space-y-4 rounded-xl border border-moss/30 bg-paper p-5">
            <div>
              <dt className="font-bold">Photos</dt>
              <dd className="text-moss">{draft.photos.length} photo{draft.photos.length === 1 ? "" : "s"}, all described</dd>
            </div>
            <div>
              <dt className="font-bold">The barrier</dt>
              <dd>{draft.barrier}</dd>
            </div>
            <div>
              <dt className="font-bold">Where</dt>
              <dd>{draft.place}</dd>
            </div>
            <div>
              <dt className="font-bold">Who&rsquo;s responsible</dt>
              <dd>{draft.party || <span className="text-moss">Not sure yet</span>}</dd>
            </div>
          </dl>
        )}
      </div>

      <div className="mt-8 flex gap-4">
        {step > 0 && (
          <button
            type="button"
            onClick={() => setStep((s) => s - 1)}
            className="rounded-lg border-2 border-fern px-6 py-3 font-semibold text-fern hover:bg-fern/10"
          >
            Back
          </button>
        )}
        {step < STEPS.length - 1 ? (
          <button
            type="button"
            disabled={!stepValid}
            onClick={() => setStep((s) => s + 1)}
            className="rounded-lg bg-fern px-6 py-3 font-semibold text-white hover:bg-pine disabled:opacity-50"
          >
            Continue
          </button>
        ) : (
          <button
            type="button"
            disabled={sending}
            onClick={send}
            className="rounded-lg bg-fern px-6 py-3 font-semibold text-white hover:bg-pine disabled:opacity-60"
          >
            {sending ? "Sending…" : "Send report"}
          </button>
        )}
      </div>
      <p className="mt-4 text-sm text-moss" role="status">
        Your draft saves on this device automatically.
      </p>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main id="main" className="mx-auto max-w-5xl px-5 py-10">
      <p className="mb-6">
        <Link href="/console" className="text-sm font-semibold text-fern underline underline-offset-4">
          ← Team console
        </Link>
      </p>
      {children}
    </main>
  );
}
