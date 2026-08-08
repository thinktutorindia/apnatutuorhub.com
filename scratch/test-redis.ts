import "dotenv/config";
import { isRedisConfigured } from "../lib/queue";
import Redis from "ioredis";

async function verifyRedis() {
  console.log("==================================================");
  console.log("      UPSTASH REDIS CONNECTION VERIFICATION");
  console.log("==================================================");

  console.log("[1] Checking isRedisConfigured()...");
  const configured = isRedisConfigured();
  console.log("    isRedisConfigured() =", configured);

  if (!configured) {
    console.error("ERROR: REDIS_URL is not set!");
    process.exit(1);
  }

  const url = process.env.REDIS_URL!;
  console.log("[2] Connecting to Upstash Redis endpoint...");
  
  const redis = new Redis(url, { maxRetriesPerRequest: 3, connectTimeout: 5000 });

  try {
    const pingRes = await redis.ping();
    console.log("    PING Response =", pingRes);

    await redis.set("test_key", "ApnaTutorHub Upstash Redis Verified!");
    const val = await redis.get("test_key");
    console.log("    GET test_key =", val);

    await redis.del("test_key");
    console.log("    SUCCESS: Upstash Redis connection & operations verified!");
  } catch (err: unknown) {
    const e = err as Error;
    console.error("    Connection failed:", e.message);
  } finally {
    redis.disconnect();
  }

  console.log("==================================================");
}

verifyRedis().catch(console.error);
