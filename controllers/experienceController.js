import mongoose from "mongoose";
import Experience from "../models/Experience.js";

// Utility: safely parse JSON fields
const safeParseJSON = (value, fieldName, res) => {
  try {
    return typeof value === "string" ? JSON.parse(value) : value;
  } catch (e) {
    console.error(`❌ Invalid JSON for ${fieldName}:`, e.message);
    res.status(400).json({
      success: false,
      message: `Invalid format for ${fieldName}`,
    });
    return null;
  }
};

// ========================== GET All ==========================
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

    const filter = { isPublished: true };

    if (category && category !== "all") filter.categories = { $in: [category] };
    if (budgetRange && budgetRange !== "all") filter.budgetRange = budgetRange;
    if (destination)
      filter.destination = { $regex: destination, $options: "i" };
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { destination: { $regex: search, $options: "i" } },
      ];
    }

    const sortMap = {
      newest: { createdAt: -1 },
      oldest: { createdAt: 1 },
      popular: { likes: -1, views: -1 },
      rating: { rating: -1 },
    };

    const sort = sortMap[sortBy] || { createdAt: -1 };
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const experiences = await Experience.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .select("-likedBy");

    const total = await Experience.countDocuments(filter);

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

// ========================== GET by ID ==========================
export const getExperienceById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid experience ID" });
    }

    const experience = await Experience.findById(id);
    if (!experience) {
      return res
        .status(404)
        .json({ success: false, message: "Experience not found" });
    }

    experience.views = (experience.views || 0) + 1;
    await experience.save();

    res.json({ success: true, experience });
  } catch (error) {
    console.error("❌ Error fetching experience:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching experience",
      error: error.message,
    });
  }
};

// ========================== CREATE ==========================
export const createExperience = async (req, res) => {
  try {
    console.log("📥 Incoming experience submission...");
    console.log("📝 Form fields:", req.body);
    console.log(
      "🖼 Uploaded files:",
      req.files?.map((f) => f.originalname) || []
    );

    const {
      title,
      destination,
      description,
      duration,
      groupSize,
      budgetRange,
      categories,
      itinerary,
      tips,
      bestTimeToVisit,
      transportation,
      totalCost,
    } = req.body;

    if (!title || !destination || !description || !budgetRange) {
      return res.status(400).json({
        success: false,
        message:
          "Title, destination, description, and budget range are required.",
      });
    }

    const allowedBudget = ["budget", "mid-range", "luxury"];
    if (!allowedBudget.includes(budgetRange)) {
      return res.status(400).json({
        success: false,
        message: "Invalid budget range provided.",
      });
    }

    // ✅ Safely parse JSON fields
    let parsedCategories = safeParseJSON(categories, "categories", res);
    if (!parsedCategories) return;

    let parsedItinerary = safeParseJSON(itinerary, "itinerary", res);
    if (!parsedItinerary) return;

    const validItinerary = parsedItinerary.filter(
      (day) => day.activities && day.activities.trim()
    );

    if (validItinerary.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one itinerary day with activities is required.",
      });
    }

    // ✅ Process image paths
    const uploadedImages = Array.isArray(req.files)
      ? req.files.map((file) => file.path)
      : [];

    if (uploadedImages.length === 0) {
      console.warn("⚠️ No images received in req.files");
    }

    const newExperience = new Experience({
      title: title.trim(),
      destination: destination.trim(),
      description: description.trim(),
      duration: parseInt(duration) || 1,
      groupSize: parseInt(groupSize) || 1,
      budgetRange,
      categories: parsedCategories,
      itinerary: validItinerary,
      tips: tips?.trim(),
      bestTimeToVisit: bestTimeToVisit?.trim(),
      transportation: transportation?.trim(),
      totalCost: parseFloat(totalCost) || undefined,

      images:
        req.files?.map((file) => {
          return `${req.protocol}://${req.get("host")}/uploads/${
            file.filename
          }`;
        }) || [],
    });

    const saved = await newExperience.save();

    console.log("✅ Experience created:", saved._id);
    res.status(201).json({
      success: true,
      experience: saved,
    });
  } catch (error) {
    console.error("❌ Error in createExperience:", error.message);
    res.status(500).json({
      success: false,
      message: "Something went wrong while creating experience.",
      error: error.message,
      stack: error.stack,
    });
  }
};

// ========================== POPULAR ==========================
export const getPopularExperiences = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 6;
    const experiences = await Experience.find({ isPublished: true })
      .sort({ likes: -1, views: -1 })
      .limit(limit)
      .select("-likedBy");

    res.json({ success: true, experiences });
  } catch (error) {
    console.error("❌ Error fetching popular experiences:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching popular experiences",
      error: error.message,
    });
  }
};

// ========================== RECENT ==========================
export const getRecentExperiences = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 6;
    const experiences = await Experience.find({ isPublished: true })
      .sort({ createdAt: -1 })
      .limit(limit)
      .select("-likedBy");

    res.json({ success: true, experiences });
  } catch (error) {
    console.error("❌ Error fetching recent experiences:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching recent experiences",
      error: error.message,
    });
  }
};

// ========================== PLACEHOLDERS ==========================
export const updateExperience = async (req, res) => {
  res.status(501).json({
    success: false,
    message: "Update experience endpoint - not implemented yet",
  });
};

export const deleteExperience = async (req, res) => {
  res.status(501).json({
    success: false,
    message: "Delete experience endpoint - not implemented yet",
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
