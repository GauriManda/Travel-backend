import express from "express";
import {
  verifyAdmin,
  verifyUser,
  verifyBookingUser,
} from "../utils/verifyToken.js";
import {
  createBooking,
  getAllBooking,
  getBooking,
  getUserBookings,
  getUserProfile,
} from "../controllers/bookingController.js";

const router = express.Router();

// Use the new middleware for booking creation
router.post("/", verifyBookingUser, createBooking);

// Keep existing middleware for other routes
router.get("/:id", verifyUser, getBooking);
router.get("/", verifyAdmin, getAllBooking);
router.get("/user/:id", verifyUser, getUserBookings);
router.get("/profile/:id", verifyUser, getUserProfile);

export default router;
