import { streamText } from "ai";
import { DEFAULT_CHAT_MODEL } from "@/lib/ai/models";
import { fetchDocsContent } from "@/lib/ai/docs";
import { regularPrompt } from "@/lib/ai/prompts";
import { getLanguageModel } from "@/lib/ai/providers";

export const maxDuration = 30;

const ALLOWED_ORIGINS = [
  "https://www.devdocify.com",
  "https://devdocify.com",
];

function corsHeaders(origin: string | null): Record<string, string> {
  const allowed =
    (origin && ALLOWED_ORIGINS.includes(origin)) ||
    origin?.startsWith("http://localhost");
  return {
    "Access-Control-Allow-Origin": allowed
      ? (origin ?? ALLOWED_ORIGINS[0])
      : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

export async function OPTIONS(request: Request) {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(request.headers.get("origin")),
  });
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  const headers = corsHeaders(origin);

  let messages: { role: string; content: string }[];
  try {
    const body = await request.json();
    messages = body.messages;
    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response("Bad request", { status: 400, headers });
    }
  } catch {
    return new Response("Bad request", { status: 400, headers });
  }

  const docsContent = await fetchDocsContent();
  const docsSection = docsContent
    ? `\n\n## DevDocify Documentation\n\n${docsContent}`
    : "";
  const system = `${regularPrompt}${docsSection}`;

  const result = streamText({
    model: getLanguageModel(DEFAULT_CHAT_MODEL),
    system,
    messages: messages as any,
  });

  const textResponse = result.toTextStreamResponse();
  const responseHeaders = new Headers(textResponse.headers);
  for (const [k, v] of Object.entries(headers)) {
    responseHeaders.set(k, v);
  }
  return new Response(textResponse.body, {
    status: textResponse.status,
    headers: responseHeaders,
  });
}
