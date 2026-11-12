# chat-devdocify

The backend for the **Ask AI** panel on [devdocify.com](https://www.devdocify.com). It is one Next.js route handler deployed at `chat.devdocify.com`:

| Route | What it does |
|---|---|
| `POST /api/widget-chat` | Answers questions about DevDocify. Streams plain text. |
| `GET /ping` | Uptime check. Returns `pong`. |

Nothing else is served. This repo started as the Vercel AI Chatbot template; the full chat app was removed because nothing used it and it gave anyone free model access.

## How a request is handled

1. **Origin check.** Only `https://www.devdocify.com`, `https://devdocify.com`, `http://localhost:<port>`, and this team's `doc-platform-*` Vercel previews are allowed. Requests without an `Origin` header are rejected.
2. **Validation** (`lib/ai/widget.ts`). User and assistant turns only, at most 20 messages, 8,000 characters each, 24,000 in total, ending with a user turn.
3. **Rate limit** (`lib/ratelimit.ts`). 30 requests per IP per hour, counted in Redis.
4. **Model call.** The system prompt is the widget prompt plus `https://www.devdocify.com/llms.txt` (cached for an hour). Replies are capped at 1,024 tokens.

## Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `ANTHROPIC_API_KEY` | Yes | Model calls. |
| `REDIS_URL` or `KV_URL` | For the rate limit | Any Redis, such as Upstash from the Vercel Marketplace. Without it, requests are not limited. |

## Develop

```bash
pnpm install
pnpm dev      # http://localhost:3000
pnpm check    # Biome lint and format
pnpm test     # widget input validation tests
pnpm build
```

The docs site calls this endpoint from `src/components/AiPanel/index.tsx` in [doc-platform](https://github.com/matthewrgourd/doc-platform). Its history-trimming limits mirror the ones in `lib/ai/widget.ts`, so change both together.
