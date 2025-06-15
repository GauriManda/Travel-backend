import express from "express";
import {
  createTour,
  deleteTour,
  getAllTour,
  getFeaturedTour,
  getSingleTour,
  getTourBySearch,
  getTourContent,
  updateTour,
  getTourCount,
} from "../controllers/tourController.js";
import { verifyToken, verifyAdmin } from "../utils/verifyToken.js";

const router = express.Router();

// Public search routes (no authentication required)
router.get("/search/getTourBySearch", getTourBySearch);
router.get("/search/getFeaturedTours", getFeaturedTour); // REMOVED verifyToken - now public
router.get("/search/getTourContent", getTourContent);
router.get("/search/getTourCount", getTourCount);

// Get all tours (this should come before /:id) - consider if this should be public or protected
router.get("/", getAllTour);

// Public route for single tour details
router.get("/:id", getSingleTour);

// Admin routes (protected)
router.post("/", verifyAdmin, createTour);
router.put("/:id", verifyAdmin, updateTour);
router.delete("/:id", verifyAdmin, deleteTour);

export default router;
