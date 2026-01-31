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

// Create app AFTER imports
const app = express();

/* =========================
   GLOBAL OPTIONS (FIRST)
========================= */

app.options("/*", (req, res) => {
  res.setHeader(
    "Access-Control-Allow-Origin",
    "https://fuel-indeed-frontend.vercel.app",
  );
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Credentials", "true");

  return res.sendStatus(200);
});

/* =========================
   CORS
========================= */

app.use(
  cors({
    origin: "https://fuel-indeed-frontend.vercel.app",
    credentials: true,
  }),
);

/* =========================
   BODY + COOKIES
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
   TEST
========================= */

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Fuel Indeed Backend Running 🚀",
  });
});

/* =========================
   404
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
