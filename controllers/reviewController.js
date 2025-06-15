import Review from "../models/Review.js";
import Tour from "../models/Tour.js";
import mongoose from "mongoose";

// Create a new review
export const createReview = async (req, res) => {
  try {
    const { tourId } = req.params;
    const { reviewText, rating } = req.body;
    const userId = req.user.id; // From verifyToken middleware
    const username = req.user.username; // From verifyToken middleware

    // Validate required fields
    if (!reviewText || !rating) {
      return res.status(400).json({
        success: false,
        message: "Please provide both review text and rating",
      });
    }

    // Validate rating range
    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: "Rating must be between 1 and 5",
      });
    }

    // Check if tour exists
    const tour = await Tour.findById(tourId);
    if (!tour) {
      return res.status(404).json({
        success: false,
        message: "Tour not found",
      });
    }

    // Check if user already reviewed this tour
    const existingReview = await Review.findOne({ tourId, userId });
    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: "You have already reviewed this tour",
      });
    }

    // Create new review
    const newReview = new Review({
      tourId,
      userId,
      username,
      reviewText: reviewText.trim(),
      rating: Number(rating),
    });

    const savedReview = await newReview.save();

    // Populate user and tour details for response
    await savedReview.populate([
      { path: "userId", select: "username email" },
      { path: "tourId", select: "title" },
    ]);

    res.status(201).json({
      success: true,
      message: "Review created successfully",
      data: savedReview,
    });
  } catch (error) {
    // Handle duplicate key error (unique index violation)
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "You have already reviewed this tour",
      });
    }

    // Handle validation errors
    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors,
      });
    }

    console.error("Error creating review:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Get all reviews for a specific tour
export const getTourReviews = async (req, res) => {
  try {
    const { tourId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Check if tour exists
    const tour = await Tour.findById(tourId);
    if (!tour) {
      return res.status(404).json({
        success: false,
        message: "Tour not found",
      });
    }

    // Get reviews with pagination
    const reviews = await Review.find({ tourId })
      .populate("userId", "username email avatar")
      .sort({ createdAt: -1 }) // Most recent first
      .skip(skip)
      .limit(limit);

    // Get total count for pagination
    const totalReviews = await Review.countDocuments({ tourId });

    // Calculate average rating
    const ratingStats = await Review.aggregate([
      { $match: { tourId: new mongoose.Types.ObjectId(tourId) } },
      {
        $group: {
          _id: null,
          averageRating: { $avg: "$rating" },
          totalReviews: { $sum: 1 },
          ratingDistribution: {
            $push: "$rating",
          },
        },
      },
    ]);

    // Calculate rating distribution
    let ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    if (ratingStats.length > 0) {
      ratingStats[0].ratingDistribution.forEach((rating) => {
        ratingDistribution[rating]++;
      });
    }

    const averageRating =
      ratingStats.length > 0
        ? Math.round(ratingStats[0].averageRating * 10) / 10
        : 0;

    res.status(200).json({
      success: true,
      data: {
        reviews,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalReviews / limit),
          totalReviews,
          hasNextPage: page * limit < totalReviews,
          hasPrevPage: page > 1,
        },
        statistics: {
          averageRating,
          totalReviews,
          ratingDistribution,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching tour reviews:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
