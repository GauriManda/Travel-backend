import express from "express";
import {
  createReview,
  getTourReviews,
} from "../../controllers/reviewController.js";
import { verifyToken } from "../utils/verifyToken.js";

const router = express.Router();

// Apply verifyToken middleware to protected routes
router.post("/tour/:tourId", verifyToken, createReview);
router.get("/tour/:tourId", getTourReviews);

export default router;
