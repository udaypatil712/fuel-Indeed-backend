import redisClient from "../config/redis.js";

export const rateLimiter = (limit, windowSec) => {
  return async (req, res, next) => {
    if (req.method === "OPTIONS") return next();

    try {
      const key = `rate:${req.ip}`;

      const requests = await redisClient.incr(key);

      // ✅ Set expiry ONLY when key is new
      if (requests === 1) {
        await redisClient.expire(key, windowSec);
      }

      // ✅ Get remaining time
      const ttl = await redisClient.ttl(key);

      if (requests > limit) {
        return res.status(429).json({
          success: false,
          message: `Too many requests. Try again after ${ttl} seconds`,
          retryAfter: ttl, // 👈 IMPORTANT
        });
      }

      next();
    } catch (err) {
      console.log("Rate limiter error:", err);
      next();
    }
  };
};