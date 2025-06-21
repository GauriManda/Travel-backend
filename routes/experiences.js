import express from "express";
import multer from "multer";
import path from "path";
import {
  getAllExperiences,
  getExperienceById,
  createExperience,
  updateExperience,
  deleteExperience,
  toggleLikeExperience,
  getPopularExperiences,
  getRecentExperiences,
  getSearchSuggestions,
  getExperiencesByCategory,
  getExperiencesByDestination,
  getExperienceStats,
} from "../controllers/experienceController.js";

import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Set up Multer storage with Cloudinary
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "experiences",
    allowed_formats: ["jpg", "jpeg", "png", "webp", "gif"],
    transformation: [{ width: 800, height: 600, crop: "limit" }],
  },
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB per file
    files: 10,
  },
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error("Only image files (JPEG, JPG, PNG, GIF, WEBP) are allowed"));
    }
  },
});

const router = express.Router();

// Middleware for logging requests
const logRequest = (req, res, next) => {
  console.log(
    `🌐 ${req.method} ${req.originalUrl} - ${new Date().toISOString()}`
  );
  if (Object.keys(req.query).length > 0) {
    console.log(`🔍 Query:`, req.query);
  }
  next();
};

// Multer error handling middleware
const handleMulterError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        message: "File size too large. Maximum size is 5MB per file.",
      });
    }
    if (error.code === "LIMIT_FILE_COUNT") {
      return res.status(400).json({
        success: false,
        message: "Too many files. Maximum 10 files allowed.",
      });
    }
    return res.status(400).json({
      success: false,
      message: `Upload error: ${error.message}`,
    });
  }
  if (error.message.includes("Only image files")) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
  next(error);
};

router.use(logRequest);

// ================== ROUTES ==================

// Specific routes first
router.get("/stats", getExperienceStats);
router.get("/search/suggestions", getSearchSuggestions);
router.get("/featured/popular", getPopularExperiences);
router.get("/featured/recent", getRecentExperiences);
router.get("/category/:category", getExperiencesByCategory);
router.get("/destination/:destination", getExperiencesByDestination);

// General routes
router.get("/", getAllExperiences);
router.post(
  "/",
  upload.array("images", 10),
  handleMulterError,
  createExperience
);

// Parameterized routes
router.get("/:id", getExperienceById);
router.put(
  "/:id",
  upload.array("images", 10),
  handleMulterError,
  updateExperience
);
router.delete("/:id", deleteExperience);
router.post("/:id/like", toggleLikeExperience);

// Fallback for undefined routes
router.use((req, res) => {
  console.log(`❌ 404 - Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`,
  });
});

// General error handler
router.use((error, req, res, next) => {
  console.error("❌ Experience routes error:", error);
  res.status(500).json({
    success: false,
    message: "Internal server error in experience routes",
    ...(process.env.NODE_ENV === "development" && {
      error: error.message,
      stack: error.stack,
    }),
  });
});

export default router;
