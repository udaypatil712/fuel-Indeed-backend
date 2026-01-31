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
   CORS CONFIG
========================= */

// Allowed frontend URLs
const allowedOrigins = [
  "http://localhost:5175", // Local Vite  
  "http://localhost:3000", // Local React (if used)
  "https://fuel-indeed-frontend.vercel.app", // Production
];

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow Postman / server-to-server
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS: " + origin));
      }
    },
    credentials: true, // 👈 REQUIRED for cookies
  }),
);

/* =========================
   BODY + COOKIES
========================= */

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

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
  console.log(`Server running on port ${PORT} 🚀`);
});
