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
      required: [true, "Title is required"],
    },
    destination: {
      type: String,
      required: [true, "Destination is required"],
    },
    description: {
      type: String,
      required: [true, "Description is required"],
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

// Pre-save middleware to ensure author has default values
experienceSchema.pre("save", function (next) {
  if (!this.author) {
    this.author = {};
  }
  if (!this.author.name) {
    this.author.name = "Anonymous User";
  }
  if (!this.author.avatar) {
    this.author.avatar = "/api/placeholder/32/32";
  }
  next();
});

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
