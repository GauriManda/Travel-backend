import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    tourId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tour",
      required: [true, "Review must belong to a tour"],
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Review must belong to a user"],
    },
    username: {
      type: String,
      required: [true, "Review must have a username"],
    },
    reviewText: {
      type: String,
      required: [true, "Please provide review text"],
      trim: true,
    },
    rating: {
      type: Number,
      required: [true, "Please provide a rating"],
      min: [1, "Rating must be at least 1"],
      max: [5, "Rating cannot exceed 5"],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Index for faster querying
reviewSchema.index({ tourId: 1, userId: 1 }, { unique: true });

const Review = mongoose.model("Review", reviewSchema);

export default Review;
