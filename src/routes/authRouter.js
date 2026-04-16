import express from "express";
import bcrypt from "bcrypt";

// Models
import Auth from "../models/authModel.js";

// Utils
import { generateToken } from "../utils/generateToken.js";

// Middleware
import authMiddleware from "../middlewares/authMiddleware.js";

const router = express.Router();

/* =========================
   REGISTER ROUTE
========================= */
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    /* 🔹 Validate required fields */
    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: "All fields are required" });
    }

    /* 🔹 Validate email */
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        message: "Please enter a valid email address",
      });
    }

    /* 🔹 Validate password */
    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        message:
          "Password must be 8+ characters with uppercase, lowercase, number & special symbol",
      });
    }

    /* 🔹 Check existing user */
    const existingUser = await Auth.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already exists" });
    }

    /* 🔹 Allow only one admin */
    if (role === "admin") {
      const existingAdmin = await Auth.findOne({ role: "admin" });
      if (existingAdmin) {
        return res.status(400).json({
          message: "Admin account already exists",
        });
      }
    }

    /* 🔹 Hash password */
    const hashedPassword = await bcrypt.hash(password, 10);

    /* 🔹 Create user */
    await Auth.create({
      name,
      email,
      password: hashedPassword,
      role,
    });

    return res.status(201).json({
      message: "Registration successful",
    });

  } catch (error) {
    console.error("Register Error:", error);
    return res.status(500).json({
      message: "Server error during registration",
    });
  }
});


/* =========================
   LOGIN ROUTE
========================= */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    /* 🔹 Validate required fields */
    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    /* 🔹 Validate email format */
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        message: "Please enter a valid email address",
      });
    }

    /* 🔹 Check user */
    const user = await Auth.findOne({ email });
    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    /* 🔹 Password check (UNCHANGED as you asked ✅) */
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({
        message: "Wrong password",
      });
    }

    /* 🔹 Generate token */
    const token = generateToken(user);

    /* 🔹 Set cookie */
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      path: "/",
    });

    /* 🔹 Send response */
    return res.status(200).json({
      message: "Login successful",
      role: user.role,
    });

  } catch (error) {
    console.error("Login Error:", error);
    return res.status(500).json({
      message: "Server error during login",
    });
  }
});


/* =========================
   GET CURRENT USER
========================= */
router.get("/me", authMiddleware, (req, res) => {
  try {
    return res.status(200).json({
      user: req.user,
    });
  } catch (error) {
    console.error("Get User Error:", error);
    return res.status(500).json({
      message: "Failed to fetch user",
    });
  }
});


export default router;