import Redis from "ioredis";

// console.log("👉 FINAL REDIS_URL:", process.env.REDIS_URL);
const redisClient = new Redis(process.env.REDIS_URL, {
  tls: {
    rejectUnauthorized: false, // 🔥 important for Upstash
  },
  maxRetriesPerRequest: null,
});

redisClient.on("connect", () => {
  console.log("✅ Redis Connected (Upstash)");
});

redisClient.on("error", (err) => {
  console.error("❌ Redis Error:", err.message);
});

export default redisClient;