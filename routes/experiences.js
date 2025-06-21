import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
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

const router = express.Router();

// Ensure uploads directory exists
const uploadsDir = "uploads/experiences/";
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log(`📁 Created uploads directory: ${uploadsDir}`);
}

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const fileExtension = path.extname(file.originalname).toLowerCase();
    const fileName = `${file.fieldname}-${uniqueSuffix}${fileExtension}`;
    console.log(`📷 Uploading file: ${fileName}`);
    cb(null, fileName);
  },
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit per file
    files: 10, // Maximum 10 files
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

// Request logging middleware
const logRequest = (req, res, next) => {
  console.log(
    `🌐 ${req.method} ${req.originalUrl} - ${new Date().toISOString()}`
  );
  if (Object.keys(req.query).length > 0) {
    console.log(`🔍 Query:`, req.query);
  }
  next();
};

// Apply logging to all routes
router.use(logRequest);

// =====================================================
// ROUTE DEFINITIONS (Order matters!)
// =====================================================

// SPECIFIC ROUTES FIRST (must come before parameterized routes)
router.get("/stats", getExperienceStats);
router.get("/search/suggestions", getSearchSuggestions);
router.get("/featured/popular", getPopularExperiences);
router.get("/featured/recent", getRecentExperiences);
router.get("/category/:category", getExperiencesByCategory);
router.get("/destination/:destination", getExperiencesByDestination);

// GENERAL ROUTES
router.get("/", getAllExperiences);
router.post(
  "/",
  upload.array("images", 10),
  handleMulterError,
  createExperience
);

// PARAMETERIZED ROUTES LAST
router.get("/:id", getExperienceById);
router.put(
  "/:id",
  upload.array("images", 10),
  handleMulterError,
  updateExperience
);
router.delete("/:id", deleteExperience);
router.post("/:id/like", toggleLikeExperience);

// Error handling
router.use((req, res) => {
  console.log(`❌ 404 - Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`,
  });
});

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
