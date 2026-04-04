const LLMS_TXT_URL = "https://www.devdocify.com/llms.txt";
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

let cache: { content: string; fetchedAt: number } | null = null;

export async function fetchDocsContent(): Promise<string | undefined> {
  const now = Date.now();
  if (cache && now - cache.fetchedAt < CACHE_TTL) {
    return cache.content;
  }
  try {
    const res = await fetch(LLMS_TXT_URL, { next: { revalidate: 3600 } });
    if (!res.ok) return undefined;
    const content = await res.text();
    cache = { content, fetchedAt: now };
    return content;
  } catch {
    return undefined;
  }
}
