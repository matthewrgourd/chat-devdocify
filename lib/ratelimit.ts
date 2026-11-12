import { createClient } from "redis";

const TTL_SECONDS = 60 * 60;
// A cold instance waits this long for its first connection, so its first
// request is counted too. After that, an unreachable Redis is skipped at once.
const CONNECT_WAIT_MS = 1000;

let client: ReturnType<typeof createClient> | null = null;
let connecting: Promise<unknown> | null = null;

function getClient() {
  if (!client && process.env.REDIS_URL) {
    client = createClient({ url: process.env.REDIS_URL });
    client.on("error", () => undefined);
    connecting = client.connect().catch(() => {
      client = null;
    });
  }
  return client;
}

/**
 * Counts this request against the IP's hourly budget and reports whether it
 * is over. Without Redis (REDIS_URL unset or unreachable) or outside
 * production there is nothing to count against, so it never limits.
 */
export async function isOverIpRateLimit(
  ip: string | undefined,
  { prefix, max }: { prefix: string; max: number }
): Promise<boolean> {
  if (process.env.NODE_ENV !== "production" || !ip) {
    return false;
  }

  const redis = getClient();
  if (redis && !redis.isReady && connecting) {
    const pending = connecting;
    connecting = null;
    await Promise.race([
      pending,
      new Promise((resolve) => setTimeout(resolve, CONNECT_WAIT_MS)),
    ]);
  }
  if (!redis?.isReady) {
    return false;
  }

  try {
    const key = `${prefix}:${ip}`;
    const [count] = await redis
      .multi()
      .incr(key)
      .expire(key, TTL_SECONDS, "NX")
      .exec();
    return typeof count === "number" && count > max;
  } catch {
    return false;
  }
}
