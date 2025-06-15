import User from "../models/User.js";
import Review from "../models/Review.js";
import Tour from "../models/Tour.js";
export const createReview = async (req, res) => {
  const tourId = req.params.tourId;
  const { reviewText, rating } = req.body;

  // Use req.userId which is set by verifyToken middleware
  const userId = req.userId;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const newReview = new Review({
      tourId,
      userId,
      username: user.username,
      reviewText,
      rating: Number(rating),
    });

    const savedReview = await newReview.save();
    await updateTourAverageRating(tourId);

    res.status(201).json({
      success: true,
      data: savedReview,
    });
  } catch (err) {
    console.error("Review save error:", err);

    if (err.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "You've already reviewed this tour",
      });
    }

    if (err.name === "ValidationError") {
      const messages = Object.values(err.errors).map((val) => val.message);
      return res.status(400).json({
        success: false,
        message: messages.join(", "),
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to submit review",
    });
  }
};

export const getTourReviews = async (req, res) => {
  const tourId = req.params.tourId;

  try {
    const reviews = await Review.find({ tourId });

    res.status(200).json({
      success: true,
      count: reviews.length,
      data: reviews,
    });
  } catch (err) {
    console.error("Error fetching reviews:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch reviews",
    });
  }
};

// Helper function to update tour average rating
const updateTourAverageRating = async (tourId) => {
  try {
    const reviews = await Review.find({ tourId });

    if (reviews.length === 0) {
      // If no reviews, update tour with 0 rating
      await Tour.findByIdAndUpdate(tourId, {
        ratingsAverage: 0,
        ratingsQuantity: 0,
      });
      return;
    }

    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = (totalRating / reviews.length).toFixed(1);

    await Tour.findByIdAndUpdate(tourId, {
      ratingsAverage: averageRating,
      ratingsQuantity: reviews.length,
    });
  } catch (err) {
    console.error("Error updating tour rating:", err);
  }
};
