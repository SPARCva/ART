import { createClient } from "@supabase/supabase-js";
import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";

/** Files a community report: verifies the Cloudflare Turnstile token (when
 * configured), hashes the caller's IP with a server salt (raw IP never
 * stored), and calls the rate-limited database function. */
export async function POST(req: NextRequest) {
  const body = await req.json();

  // Bot check — enforced once TURNSTILE_SECRET_KEY is set in Netlify env.
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (secret) {
    const token = body.turnstileToken;
    if (!token) return NextResponse.json({ error: "Please complete the quick check below the form." }, { status: 400 });
    const v = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret, response: token }),
    }).then((r) => r.json());
    if (!v.success) return NextResponse.json({ error: "The bot check didn't pass — please try again." }, { status: 400 });
  }

  const ip =
    req.headers.get("x-nf-client-connection-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown";
  const salt = process.env.IP_HASH_SALT || secret || "art-default-salt";
  const ipHash = createHash("sha256").update(ip + salt).digest("hex").slice(0, 32);

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://ldxpockcgcxvsrbyhcnt.supabase.co",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "sb_publishable_3tn2UadRVekIf5Pw6F5z-A_40ZbdvTm",
    { auth: { persistSession: false } }
  );
  const { data, error } = await supabase.rpc("file_public_report", {
    p_barrier_type: body.barrier_type ?? null,
    p_barrier_desc: body.barrier_desc ?? "",
    p_place_desc: body.place_desc ?? null,
    p_lat: body.lat ?? null,
    p_lon: body.lon ?? null,
    p_party_guess: body.party_guess ?? null,
    p_reporter_name: body.reporter_name ?? null,
    p_reporter_email: body.reporter_email ?? null,
    p_photos: body.photos ?? [],
    p_ip_hash: ipHash,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ id: data });
}
