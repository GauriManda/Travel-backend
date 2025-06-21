import express from "express";
import {
  register,
  login,
  getMe,
  logout,
} from "../controllers/authController.js";
import { verifyToken, optionalAuth } from "../utils/verifyToken.js";

const router = express.Router();

// Add request logging middleware for debugging
router.use((req, res, next) => {
  console.log(`🔐 Auth Route: ${req.method} ${req.path}`);
  console.log(`🔐 Headers:`, {
    authorization: req.headers.authorization ? "Present" : "Missing",
    "content-type": req.headers["content-type"],
    origin: req.headers.origin,
  });
  next();
});

// Public routes
router.post("/register", register);
router.post("/login", login);

// Protected routes
router.get("/me", verifyToken, getMe);
router.post("/logout", verifyToken, logout);

// Verify token route (useful for frontend to check if token is still valid)
router.get("/verify", verifyToken, (req, res) => {
  res.json({
    success: true,
    message: "Token is valid",
    user: {
      id: req.user.id,
      username: req.user.username,
      email: req.user.email,
      role: req.user.role,
    },
  });
});

// Optional auth route (for experiences that can work with or without auth)
router.get("/status", optionalAuth, (req, res) => {
  res.json({
    success: true,
    isAuthenticated: !!req.user,
    user: req.user
      ? {
          id: req.user.id,
          username: req.user.username,
          role: req.user.role,
        }
      : null,
  });
});

export default router;
