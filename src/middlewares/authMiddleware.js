import jwt from "jsonwebtoken";
import Auth from "../models/authModel.js";

export default async (req, res, next) => {
  // console.log("🟡 Auth middleware hit");

  // console.log("🟡 req.headers.cookie:", req.headers.cookie);
  // console.log("🟡 req.cookies:", req.cookies);

  const token = req.cookies?.token;
  // console.log("🟡 token:", token);

  if (!token) {
    // console.log("❌ Token missing → blocking request");
    return res.status(401).json({ message: "Login required" });
  }
  // console.log(token);
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // console.log("🟢 decoded token:", decoded);

    const user = await Auth.findById(decoded.id).select("-password");
    // console.log("🟢 user from DB:", user);

    req.user = {
      id: user._id,
      role: user.role,
      name: user.name,
      email: user.email,
      isProfileCompleted: user.isProfileCompleted,
    };

    // console.log("  req.user set:", req.user);
    next();
  } catch (err) {
    // console.log("  JWT error:", err.message);
    return res.status(401).json({ message: "Invalid token" });
  }
};
