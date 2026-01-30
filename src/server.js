const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
require("dotenv").config();

// App
const app = express();

// ======================
// Middleware
// ======================

// Body parser
app.use(
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  }),
);
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// CORS (Allow Vercel Frontend)
app.use(
  cors({
    origin: [
      "https://fuel-indeed-frontend.vercel.app",
      "http://localhost:5175", // for local dev
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

// Preflight
// app.options("*", cors());

// ======================
// Database
// ======================
require("./config/mongoose-connections");

// ======================
// Routes
// ======================

const userRouter = require("./routes/userRouter");
const fuelStationRouter = require("./routes/fuelStationRouter");
const deliveryRouter = require("./routes/deliveryPersonRouter");
const authRouter = require("./routes/authRouter");
const adminRouter = require("./routes/adminRouter");

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
  console.log(`✅ Server running on port ${PORT}`);
});
