import Anthropic from "@anthropic-ai/sdk";

const ALLOWED_ORIGINS = ["https://sparcsolutions.org", "https://stepstowardaccess.netlify.app"];
function cors(req: NextRequest) {
  const origin = req.headers.get("origin") ?? "";
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

export async function OPTIONS(req: NextRequest) {
  return new Response(null, { status: 204, headers: cors(req) });
}
import { NextRequest, NextResponse } from "next/server";

/**
 * "Help me say this" — drafts an advocacy letter from a visitor's
 * plain-language description. Runs server-side only; the visitor always
 * sees and edits the draft before anything leaves their device (mailto/copy).
 * Nothing the visitor types is stored.
 */
export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "Letter assist is not configured yet." }, { status: 503, headers: cors(req) });
  }

  const { barrier, place, party, tone } = await req.json();
  if (!barrier || typeof barrier !== "string" || barrier.length > 2000) {
    return NextResponse.json({ error: "Describe the barrier (up to 2000 characters)." }, { status: 400, headers: cors(req) });
  }

  const anthropic = new Anthropic();
  const msg = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 700,
    messages: [
      {
        role: "user",
        content: `Write a ${tone === "firm" ? "firm but professional" : "collaborative and constructive"} email (under 250 words) from a community member to ${party || "the party responsible"} about an accessibility barrier${place ? ` at ${place}` : ""}. Their description: "${barrier}". Reference the ADA's requirement for accessible public accommodations in plain terms. Ask for a specific remediation timeline. Do not invent facts beyond what they described. Return ONLY the email body, no subject line, no preamble.`,
      },
    ],
  });

  const text = msg.content.find((b) => b.type === "text");
  return NextResponse.json({ draft: text && "text" in text ? text.text : "" }, { headers: cors(req) });
}
