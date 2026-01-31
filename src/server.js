import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

// Database
import { connectDB } from "./config/mongoose-connections.js";

// Routes
import userRouter from "./routes/userRouter.js";
import fuelStationRouter from "./routes/fuelStationRouter.js";
import deliveryRouter from "./routes/deliveryPersonRouter.js";
import authRouter from "./routes/authRouter.js";
import adminRouter from "./routes/adminRouter.js";

const app = express();

/* =========================
   CORS + PREFLIGHT (FIRST)
========================= */

// Manual CORS headers (fix for Render + Cloudflare)
app.use((req, res, next) => {
  const allowedOrigin = "https://fuel-indeed-frontend.vercel.app";

  res.header("Access-Control-Allow-Origin", allowedOrigin);
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.header("Access-Control-Allow-Credentials", "true");

  // Handle preflight
  if (req.method === "OPTIONS") {
    return res.sendStatus(200); // IMPORTANT
  }

  next();
});

// Enable CORS middleware
app.use(
  cors({
    origin: "https://fuel-indeed-frontend.vercel.app",
    credentials: true,
  }),
);

/* =========================
   BODY + COOKIE PARSER
========================= */

app.use(
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

/* =========================
   DATABASE
========================= */

connectDB().catch((err) => console.error("MongoDB init error ❌", err));

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
  res.status(200).json({
    success: true,
    message: "Fuel Indeed Backend Running 🚀",
  });
});

/* =========================
   404 HANDLER
========================= */

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "API route not found",
  });
});

/* =========================
   SERVER
========================= */

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
