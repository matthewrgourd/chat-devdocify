<a href="https://chat.devdocify.com">
  <img alt="Chatbot" src="app/(chat)/opengraph-image.png">
  <h1 align="center">chat.devdocify.com</h1>
</a>

<p align="center">
    An AI chatbot built with Next.js, the Vercel AI SDK, and Claude. Part of the <a href="https://www.devdocify.com">DevDocify</a> portfolio.
</p>

<p align="center">
  <a href="https://chat.devdocify.com"><strong>Live demo</strong></a> ·
  <a href="#features"><strong>Features</strong></a> ·
  <a href="#model-providers"><strong>Model providers</strong></a> ·
  <a href="#running-locally"><strong>Running locally</strong></a>
</p>
<br/>

## Features

- [Next.js](https://nextjs.org) App Router
  - Advanced routing for seamless navigation and performance
  - React Server Components (RSCs) and Server Actions for server-side rendering and increased performance
- [AI SDK](https://ai-sdk.dev/docs/introduction)
  - Unified API for generating text, structured objects, and tool calls with LLMs
  - Hooks for building dynamic chat and generative user interfaces
- [shadcn/ui](https://ui.shadcn.com)
  - Styling with [Tailwind CSS](https://tailwindcss.com)
  - Component primitives from [Radix UI](https://radix-ui.com) for accessibility and flexibility
- Data persistence
  - [Neon Serverless Postgres](https://vercel.com/marketplace/neon) for saving chat history and user data
  - [Vercel Blob](https://vercel.com/storage/blob) for efficient file storage
- [Auth.js](https://authjs.dev)
  - Simple and secure authentication

## Model providers

Models are configured in `lib/ai/models.ts`. This deployment uses [Anthropic](https://anthropic.com) directly via `@ai-sdk/anthropic`:

| Model | ID | Use |
|---|---|---|
| Claude Sonnet | `claude-sonnet-4-6` | Default chat model |
| Claude Opus | `claude-opus-4-6` | Complex tasks |
| Claude Haiku | `claude-haiku-4-5-20251001` | Title generation, fast tasks |

## Running locally

### Prerequisites

- Node.js 20+
- [pnpm](https://pnpm.io)
- [Vercel CLI](https://vercel.com/docs/cli): `npm i -g vercel`

### Setup

1. Clone the repo and install dependencies:

```bash
git clone https://github.com/matthewrgourd/chat-devdocify.git
cd chat-devdocify
pnpm install
```

2. Link to the Vercel project and pull environment variables:

```bash
vercel link
vercel env pull
```

This creates a `.env.local` file with all required variables including `AUTH_SECRET`, `ANTHROPIC_API_KEY`, and `POSTGRES_URL`.

3. Run database migrations:

```bash
pnpm db:migrate
```

4. Start the dev server:

```bash
pnpm dev
```

The app runs at [localhost:3000](http://localhost:3000).

### Required environment variables

| Variable | Description |
|---|---|
| `AUTH_SECRET` | Random secret for Auth.js session signing |
| `ANTHROPIC_API_KEY` | API key from [console.anthropic.com](https://console.anthropic.com) |
| `POSTGRES_URL` | Neon Postgres connection string (auto-added by Vercel) |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob token (auto-added by Vercel) |

> Never commit `.env.local` -- it's in `.gitignore`.
