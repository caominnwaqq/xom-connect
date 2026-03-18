type RateLimitOptions = {
  windowMs: number;
  max: number;
};

type Bucket = {
  hits: number[];
};

const buckets = new Map<string, Bucket>();

function prune(hits: number[], cutoff: number) {
  while (hits.length > 0 && hits[0]! < cutoff) hits.shift();
}

export function checkRateLimit(key: string, options: RateLimitOptions) {
  const now = Date.now();
  const cutoff = now - options.windowMs;

  const bucket = buckets.get(key) ?? { hits: [] };
  prune(bucket.hits, cutoff);

  const limited = bucket.hits.length >= options.max;
  const remaining = Math.max(0, options.max - bucket.hits.length);
  const resetAt = bucket.hits.length > 0 ? bucket.hits[0]! + options.windowMs : now + options.windowMs;

  if (!limited) {
    bucket.hits.push(now);
    buckets.set(key, bucket);
  }

  return {
    limited,
    remaining: limited ? 0 : remaining - 1,
    resetAt,
  };
}

