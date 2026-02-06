import express from "express";
import bcrypt from "bcrypt";

// Models
import Auth from "../models/authModel.js";

// Utils
import { generateToken } from "../utils/generateToken.js";

// Middleware
import authMiddleware from "../middlewares/authMiddleware.js";

const router = express.Router();

/* BASIC REGISTER */
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // ✅ Email regex
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

    if (!emailRegex.test(email)) {
      return res
        .status(400)
        .json({ message: "Please enter a valid email address" });
    }

    // ✅ Password regex
    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        message:
          "Password 8+ characters with uppercase, lowercase, number & special symbo",
      });
    }

    const exists = await Auth.findOne({ email });
    if (exists) {
      return res.status(400).json({ message: "Email already exists" });
    }

    if (role === "admin") {
      const isExist = await Auth.findOne({ role: "admin" });
      if (isExist) {
        return res
          .status(400)
          .json({ message: "Admin already has an account" });
      }
    }

    const hash = await bcrypt.hash(password, 10);

    await Auth.create({
      name,
      email,
      password: hash,
      role,
    });

    res.status(201).json({ message: "Basic registration done" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

/* LOGIN */
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  const auth = await Auth.findOne({ email });
  if (!auth) return res.status(404).json({ message: "User not found" });

  // ✅ Email regex
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  if (!emailRegex.test(email)) {
    return res
      .status(400)
      .json({ message: "Please enter a valid email address" });
  }

  // ✅ Password regex
  // const passwordRegex =
  //   /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

  // if (!passwordRegex.test(password)) {
  //   return res.status(400).json({
  //     message:
  //       "Password 8+ characters with uppercase, lowercase, number & special symbo",
  //   });
  // }

  const match = await bcrypt.compare(password, auth.password);
  if (!match) return res.status(401).json({ message: "Wrong password" });

  const token = generateToken(auth);
  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production", // 👈 true on live server
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    path: "/",
  });

  // let redirectTo = "";

  // if (!auth.isProfileCompleted) {
  //   redirectTo = `/complete-profile/${auth.role}`;
  // } else {
  //   redirectTo = `/${auth.role}/dashboard`;
  // }
 // console.log("Login success");
  res.json({
    // message: "Login success",
    // redirectTo,
    role: auth.role,
  });
});
router.get("/me", authMiddleware, (req, res) => {
  res.json({ user: req.user });
});

export default router;
