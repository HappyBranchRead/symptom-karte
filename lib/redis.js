export function redisConfig(env = process.env) {
 const families = ['UPSTASH_REDIS_REST_', 'KV_REST_API_'];
 const pair = prefix => {
  for (const family of families) {
   const url = env[prefix + family + 'URL'];
   const token = env[prefix + family + 'TOKEN'];
   if (url && token) return {url, token};
  }
 };
 // Prefer explicit standard names. Never combine different databases' credentials.
 const standard = pair('');
 if (standard) return standard;
 const prefixes = new Set();
 for (const name of Object.keys(env)) {
  for (const family of families) {
   const suffix = family + 'URL';
   if (name.endsWith('_' + suffix)) prefixes.add(name.slice(0, -suffix.length));
  }
 }
 const candidates = [...prefixes].map(pair).filter(Boolean);
 if (candidates.length === 1) return candidates[0];
 throw new Error(candidates.length ? 'Multiple Redis REST connections; set standard environment variable names' : 'Redis REST URL and TOKEN pair is missing');
}

export async function redisClient() {
 const config = redisConfig();
 const { Redis } = await import('@upstash/redis');
 return new Redis({...config, automaticDeserialization:false});
}
