import { anthropic } from "@ai-sdk/anthropic";
import { ipAddress } from "@vercel/functions";
import { streamText } from "ai";
import { fetchDocsContent } from "@/lib/ai/docs";
import {
  parseWidgetMessages,
  WIDGET_MAX_OUTPUT_TOKENS,
  WIDGET_MODEL,
  WIDGET_REQUESTS_PER_HOUR,
  widgetPrompt,
} from "@/lib/ai/widget";
import { isOverIpRateLimit } from "@/lib/ratelimit";

export const maxDuration = 30;
const MODEL_CHUNK_TIMEOUT_MS = 10_000;

const ALLOWED_ORIGINS = ["https://www.devdocify.com", "https://devdocify.com"];
// startsWith("http://localhost") would also accept http://localhost.evil.com.
const LOCALHOST_ORIGIN_REGEX = /^http:\/\/localhost(?::\d+)?$/;
// Previews of the docs site only. Any Vercel account can create a project named
// doc-platform-*, so the team scope suffix is required.
const VERCEL_PREVIEW_ORIGIN_REGEX =
  /^https:\/\/doc-platform-[a-z0-9-]+-matthewrgourds-projects\.vercel\.app$/i;

function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) {
    return false;
  }
  if (ALLOWED_ORIGINS.includes(origin)) {
    return true;
  }
  if (LOCALHOST_ORIGIN_REGEX.test(origin)) {
    return true;
  }
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
  // Browsers always send Origin on this cross-site POST. A missing one means a
  // script, which this endpoint is not for.
  const origin = request.headers.get("origin");
  if (!isAllowedOrigin(origin)) {
    return new Response("Forbidden", { status: 403 });
  }
  const headers = corsHeaders(origin);

  let messages: ReturnType<typeof parseWidgetMessages>;
  try {
    messages = parseWidgetMessages(await request.json());
  } catch {
    messages = null;
  }
  if (!messages) {
    return new Response("Bad request", { status: 400, headers });
  }

  if (
    await isOverIpRateLimit(ipAddress(request), {
      prefix: "widget-rate-limit",
      max: WIDGET_REQUESTS_PER_HOUR,
    })
  ) {
    return new Response(
      "You've reached the question limit for now. Please try again in an hour.",
      { status: 429, headers }
    );
  }

  const docsContent = await fetchDocsContent();
  const docsSection = docsContent
    ? `\n\n## DevDocify Documentation\n\n${docsContent}`
    : "";
  const system = `${widgetPrompt}${docsSection}`;

  try {
    const result = streamText({
      model: anthropic(WIDGET_MODEL),
      system,
      messages,
      maxOutputTokens: WIDGET_MAX_OUTPUT_TOKENS,
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
