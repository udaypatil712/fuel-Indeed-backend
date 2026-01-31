import dotenv from "dotenv";

// Load env from project root (Backend/.env)
dotenv.config({
  path: new URL("../.env", import.meta.url).pathname,
});

// Debug (TEMP)

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

// App
const app = express();

// ======================
// Middleware
// ======================
app.use(
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(
  cors({
    origin: [
      "https://fuel-indeed-frontend.vercel.app", // your Vercel frontend
      "https://fuel-indeed-frontend.vercel.app/", // with slash
      "http://localhost:5175", // local dev
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

// Handle preflight requests
app.options("*", cors());

// ======================
// Database
// ======================
connectDB().catch((err) => console.error("MongoDB init error ❌", err));

// ======================
// Routes
// ======================
app.use("/admin", adminRouter);
app.use("/auth", authRouter);
app.use("/user", userRouter);
app.use("/fuelStation", fuelStationRouter);
app.use("/deliveryPerson", deliveryRouter);

// ======================
// Test Route
// ======================
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Fuel Indeed Backend Running 🚀",
  });
});

// ======================
// 404 Handler
// ======================
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "API route not found",
  });
});

// ======================
// Server
// ======================
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
