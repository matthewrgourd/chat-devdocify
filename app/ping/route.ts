// Uptime check. The old proxy.ts answered /ping before the chat app was removed.
export function GET() {
  return new Response("pong", { status: 200 });
}
