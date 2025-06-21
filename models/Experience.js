import mongoose from "mongoose";

const itineraryDaySchema = new mongoose.Schema({
  day: {
    type: Number,
    required: true,
  },
  activities: {
    type: String,
    required: true,
  },
  accommodation: String,
  meals: String,
  notes: String,
});

const experienceSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    destination: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      maxlength: 2000,
    },
    duration: {
      type: Number,
      required: true,
      min: 1,
    },
    groupSize: {
      type: Number,
      required: true,
      min: 1,
    },
    budgetRange: {
      type: String,
      enum: ["budget", "mid-range", "luxury"],
      required: true,
    },
    categories: [
      {
        type: String,
        enum: [
          "adventure",
          "cultural",
          "nature",
          "food",
          "photography",
          "solo-travel",
          "family",
          "romantic",
          "budget",
          "luxury",
        ],
      },
    ],
    itinerary: [itineraryDaySchema],
    tips: {
      type: String,
      maxlength: 1000,
    },
    bestTimeToVisit: String,
    transportation: {
      type: String,
      maxlength: 500,
    },
    totalCost: {
      type: Number,
      min: 0,
    },
    images: [
      {
        type: String, // URLs to images
      },
    ],
    author: {
      name: {
        type: String,
        required: true,
      },
      avatar: String,
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    },
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    likes: {
      type: Number,
      default: 0,
    },
    likedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    views: {
      type: Number,
      default: 0,
    },
    isPublished: {
      type: Boolean,
      default: true,
    },
    tags: [String],
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        default: [0, 0],
      },
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
experienceSchema.index({ location: "2dsphere" });
experienceSchema.index({
  title: "text",
  destination: "text",
  description: "text",
  tags: "text",
});

// Methods
experienceSchema.methods.isLikedByUser = function (userId) {
  return this.likedBy.includes(userId);
};

experienceSchema.statics.getPopular = function (limit = 10) {
  return this.find({ isPublished: true })
    .sort({ likes: -1, views: -1 })
    .limit(limit);
};

experienceSchema.statics.getRecent = function (limit = 10) {
  return this.find({ isPublished: true }).sort({ createdAt: -1 }).limit(limit);
};

const Experience = mongoose.model("Experience", experienceSchema);
export default Experience;
