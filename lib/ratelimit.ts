import { createClient } from "redis";

const TTL_SECONDS = 60 * 60;

let client: ReturnType<typeof createClient> | null = null;

function getClient() {
  if (!client && process.env.REDIS_URL) {
    client = createClient({ url: process.env.REDIS_URL });
    client.on("error", () => undefined);
    client.connect().catch(() => {
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
