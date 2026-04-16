// 🔥 MUST BE FIRST
import "./config/env.js";

import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

// Database
import { connectDB } from "./config/mongoose-connections.js";

// Redis
import "./config/redis.js";

// Routes
import userRouter from "./routes/userRouter.js";
import fuelStationRouter from "./routes/fuelStationRouter.js";
import deliveryRouter from "./routes/deliveryPersonRouter.js";
import authRouter from "./routes/authRouter.js";
import adminRouter from "./routes/adminRouter.js";

// Middleware
import { rateLimiter } from "./middlewares/rateLimiter.js";

const app = express();

/* =========================
   CORS CONFIG
========================= */

const allowedOrigins = [
  "http://localhost:5175",
  "https://fuel-indeed-frontend.vercel.app",
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  }),
);

app.options("*", cors());

/* =========================
   BODY + COOKIES
========================= */

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());


/* ✅ ADD HERE (logging middleware) */
app.use((req, res, next) => {
  res.on("finish", () => {
    console.log(req.method, req.url, res.statusCode);
  });
  next();
});


/* =========================
   RATE LIMIT
========================= */

if (process.env.NODE_ENV === "production") {
  app.use(rateLimiter(200, 60));
  app.use("/auth/login", rateLimiter(10, 60));
} else {
  console.log("Rate limiter disabled for testing 🚀");
}
/* =========================
   STATIC FILES
========================= */

app.use("/uploads", express.static("uploads", { maxAge: "7d" }));

/* =========================
   DATABASE
========================= */

connectDB()
  .then(() => console.log("MongoDB Connected ✅"))
  .catch((err) => console.error("MongoDB Error ❌", err));

/* =========================
   ROUTES
========================= */

app.use("/admin", adminRouter);
app.use("/auth", authRouter);
app.use("/user", userRouter);
app.use("/fuelStation", fuelStationRouter);
app.use("/deliveryPerson", deliveryRouter);

/* =========================
   TEST ROUTE
========================= */

app.get("/", (req, res) => {
  res.json({
    message: "Fuel Indeed Backend Running 🚀",
    worker: process.pid, // still useful for PM2
  });
});

/* =========================
   404
========================= */

app.use((req, res) => {
  res.status(404).json({ message: "API route not found" });
});

/* =========================
   SERVER
========================= */

const PORT = process.env.PORT || 3002;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} 🚀`);
});