import redisClient from "../config/redis.js";

export const rateLimiter = (limit, windowSec) => {
  return async (req, res, next) => {
    // 🔥 allow preflight
    if (req.method === "OPTIONS") return next();

    try {
      const key = `rate:${req.ip}`;

      const requests = await redisClient.incr(key);

      if (requests === 1) {
        await redisClient.expire(key, windowSec);
      }

      if (requests > limit) {
        return res.status(429).json({
          success: false,
          message: "Too many requests",
        });
      }

      next();
    } catch (err) {
      next();
    }
  };
};