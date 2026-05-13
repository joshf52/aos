import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { config as kit } from "@/kit.config";

export const runtime = "nodejs";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  const { input } = (await req.json().catch(() => ({}))) as { input?: string };
  if (typeof input !== "string" || input.trim().length === 0) {
    return NextResponse.json({ error: "Empty input." }, { status: 400 });
  }
  if (input.length > 6000) {
    return NextResponse.json({ error: "Input too long." }, { status: 400 });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "Server not configured." }, { status: 503 });
  }

  const prompt = kit.workflow.promptTemplate.replace("{input}", input);

  try {
    const msg = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1500,
      system: kit.workflow.systemPrompt,
      messages: [{ role: "user", content: prompt }],
    });
    const text = msg.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();
    return NextResponse.json({ output: text });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Upstream error.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
