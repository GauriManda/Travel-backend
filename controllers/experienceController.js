import mongoose from "mongoose";
import Experience from "../models/Experience.js";

// Get all experiences with filtering and sorting
export const getAllExperiences = async (req, res) => {
  try {
    console.log("📋 GET /experiences - Query params:", req.query);

    const {
      page = 1,
      limit = 12,
      category,
      budgetRange,
      destination,
      search,
      sortBy = "newest",
    } = req.query;

    // Build filter object
    const filter = { isPublished: true };

    if (category && category !== "all") {
      filter.categories = { $in: [category] };
    }

    if (budgetRange && budgetRange !== "all") {
      filter.budgetRange = budgetRange;
    }

    if (destination) {
      filter.destination = { $regex: destination, $options: "i" };
    }

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { destination: { $regex: search, $options: "i" } },
      ];
    }

    // Build sort object
    let sort = {};
    switch (sortBy) {
      case "newest":
        sort = { createdAt: -1 };
        break;
      case "oldest":
        sort = { createdAt: 1 };
        break;
      case "popular":
        sort = { likes: -1, views: -1 };
        break;
      case "rating":
        sort = { rating: -1 };
        break;
      default:
        sort = { createdAt: -1 };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    console.log(`📄 Fetching page ${page}, limit ${limit}, skip ${skip}`);

    const experiences = await Experience.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .select("-likedBy");

    const total = await Experience.countDocuments(filter);

    console.log(`✅ Found ${experiences.length} experiences, total: ${total}`);

    res.json({
      success: true,
      experiences,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalExperiences: total,
        hasNext: skip + experiences.length < total,
        hasPrev: parseInt(page) > 1,
      },
    });
  } catch (error) {
    console.error("❌ Error fetching experiences:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching experiences",
      error: error.message,
    });
  }
};

// Get single experience by ID
export const getExperienceById = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`📋 GET /experiences/${id}`);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid experience ID",
      });
    }

    const experience = await Experience.findById(id);

    if (!experience) {
      return res.status(404).json({
        success: false,
        message: "Experience not found",
      });
    }

    // Increment view count
    experience.views = (experience.views || 0) + 1;
    await experience.save();

    console.log(`✅ Found experience: ${experience.title}`);

    res.json({
      success: true,
      experience,
    });
  } catch (error) {
    console.error("❌ Error fetching experience:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching experience",
      error: error.message,
    });
  }
};

// Create new experience
export const createExperience = async (req, res) => {
  try {
    console.log("🚀 POST /experiences - Creating new experience");
    console.log("📁 Files:", req.files?.length || 0);
    console.log("📋 Body keys:", Object.keys(req.body));

    const experienceData = { ...req.body };

    // Handle uploaded images
    if (req.files && req.files.length > 0) {
      experienceData.images = req.files.map(
        (file) => `/uploads/experiences/${file.filename}`
      );
      console.log(`📷 Added ${req.files.length} images`);
    }

    // Parse JSON fields if they're strings
    if (typeof experienceData.itinerary === "string") {
      try {
        experienceData.itinerary = JSON.parse(experienceData.itinerary);
      } catch (e) {
        console.error("❌ Error parsing itinerary:", e);
        return res.status(400).json({
          success: false,
          message: "Invalid itinerary format",
        });
      }
    }

    if (typeof experienceData.categories === "string") {
      try {
        experienceData.categories = JSON.parse(experienceData.categories);
      } catch (e) {
        console.error("❌ Error parsing categories:", e);
        return res.status(400).json({
          success: false,
          message: "Invalid categories format",
        });
      }
    }

    // Set default author if not provided
    if (!experienceData.author) {
      experienceData.author = {
        name: "Anonymous User",
        avatar: "/api/placeholder/32/32",
      };
    }

    // Set defaults
    experienceData.likes = 0;
    experienceData.views = 0;
    experienceData.likedBy = [];
    experienceData.isPublished = true;

    console.log("📝 Final data:", {
      title: experienceData.title,
      destination: experienceData.destination,
      duration: experienceData.duration,
      categories: experienceData.categories,
      images: experienceData.images?.length || 0,
    });

    const experience = new Experience(experienceData);
    await experience.save();

    console.log(`✅ Experience created with ID: ${experience._id}`);

    res.status(201).json({
      success: true,
      message: "Experience created successfully",
      experience,
    });
  } catch (error) {
    console.error("❌ Error creating experience:", error);

    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors,
      });
    }

    res.status(400).json({
      success: false,
      message: "Error creating experience",
      error: error.message,
    });
  }
};

// Like/unlike experience
export const toggleLikeExperience = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.body.userId || "anonymous";

    console.log(`❤️  POST /experiences/${id}/like - User: ${userId}`);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid experience ID",
      });
    }

    const experience = await Experience.findById(id);

    if (!experience) {
      return res.status(404).json({
        success: false,
        message: "Experience not found",
      });
    }

    if (!experience.likedBy) {
      experience.likedBy = [];
    }

    const isLiked = experience.likedBy.includes(userId);

    if (isLiked) {
      experience.likedBy.pull(userId);
      experience.likes = Math.max(0, (experience.likes || 0) - 1);
    } else {
      experience.likedBy.push(userId);
      experience.likes = (experience.likes || 0) + 1;
    }

    await experience.save();

    console.log(
      `✅ Experience ${isLiked ? "unliked" : "liked"}, total likes: ${
        experience.likes
      }`
    );

    res.json({
      success: true,
      message: isLiked ? "Experience unliked" : "Experience liked",
      likes: experience.likes,
      isLiked: !isLiked,
    });
  } catch (error) {
    console.error("❌ Error toggling like:", error);
    res.status(500).json({
      success: false,
      message: "Error toggling like",
      error: error.message,
    });
  }
};

// Get popular experiences
export const getPopularExperiences = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 6;
    console.log(`🌟 GET /experiences/featured/popular - limit: ${limit}`);

    const experiences = await Experience.find({ isPublished: true })
      .sort({ likes: -1, views: -1 })
      .limit(limit)
      .select("-likedBy");

    console.log(`✅ Found ${experiences.length} popular experiences`);

    res.json({
      success: true,
      experiences,
    });
  } catch (error) {
    console.error("❌ Error fetching popular experiences:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching popular experiences",
      error: error.message,
    });
  }
};

// Get recent experiences
export const getRecentExperiences = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 6;
    console.log(`🕒 GET /experiences/featured/recent - limit: ${limit}`);

    const experiences = await Experience.find({ isPublished: true })
      .sort({ createdAt: -1 })
      .limit(limit)
      .select("-likedBy");

    console.log(`✅ Found ${experiences.length} recent experiences`);

    res.json({
      success: true,
      experiences,
    });
  } catch (error) {
    console.error("❌ Error fetching recent experiences:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching recent experiences",
      error: error.message,
    });
  }
};

// Placeholder functions for routes that need implementation
export const updateExperience = async (req, res) => {
  res.json({
    success: false,
    message: "Update experience endpoint - implement as needed",
  });
};

export const deleteExperience = async (req, res) => {
  res.json({
    success: false,
    message: "Delete experience endpoint - implement as needed",
  });
};

export const getSearchSuggestions = async (req, res) => {
  res.json({
    success: true,
    suggestions: [],
    message: "Search suggestions endpoint - implement as needed",
  });
};

export const getExperiencesByCategory = async (req, res) => {
  res.json({
    success: true,
    experiences: [],
    message: "Category experiences endpoint - implement as needed",
  });
};

export const getExperiencesByDestination = async (req, res) => {
  res.json({
    success: true,
    experiences: [],
    message: "Destination experiences endpoint - implement as needed",
  });
};

export const getExperienceStats = async (req, res) => {
  res.json({
    success: true,
    stats: {},
    message: "Experience stats endpoint - implement as needed",
  });
};
