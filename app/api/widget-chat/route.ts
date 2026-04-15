import { streamText } from "ai";
import { fetchDocsContent } from "@/lib/ai/docs";
import { DEFAULT_CHAT_MODEL } from "@/lib/ai/models";
import { regularPrompt } from "@/lib/ai/prompts";
import { getLanguageModel } from "@/lib/ai/providers";

export const maxDuration = 30;
const MODEL_CHUNK_TIMEOUT_MS = 10_000;

const ALLOWED_ORIGINS = ["https://www.devdocify.com", "https://devdocify.com"];
const VERCEL_PREVIEW_ORIGIN_REGEX =
  /^https:\/\/doc-platform(?:-[a-z0-9-]+)?\.vercel\.app$/i;

function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  if (origin.startsWith("http://localhost")) return true;
  return VERCEL_PREVIEW_ORIGIN_REGEX.test(origin);
}

function corsHeaders(origin: string | null): Record<string, string> {
  const allowed = isAllowedOrigin(origin);
  return {
    "Access-Control-Allow-Origin": allowed
      ? (origin ?? ALLOWED_ORIGINS[0])
      : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

export function OPTIONS(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && !isAllowedOrigin(origin)) {
    return new Response("Forbidden", { status: 403 });
  }
  return new Response(null, {
    status: 204,
    headers: corsHeaders(origin),
  });
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && !isAllowedOrigin(origin)) {
    return new Response("Forbidden", { status: 403 });
  }
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

  try {
    const result = streamText({
      model: getLanguageModel(DEFAULT_CHAT_MODEL),
      system,
      messages: messages as any,
      maxRetries: 0,
      abortSignal: request.signal,
      timeout: {
        chunkMs: MODEL_CHUNK_TIMEOUT_MS,
      },
    });

    const textResponse = result.toTextStreamResponse();
    const responseHeaders = new Headers(textResponse.headers);
    for (const [k, v] of Object.entries(headers)) {
      responseHeaders.set(k, v);
    }
    responseHeaders.set("X-Accel-Buffering", "no");
    return new Response(textResponse.body, {
      status: textResponse.status,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error("widget-chat failed:", error);
    return new Response("Sorry, the AI assistant is temporarily unavailable.", {
      status: 503,
      headers,
    });
  }
}
