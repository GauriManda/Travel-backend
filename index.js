import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import mongoose from "mongoose";
import toursRouter from "./routes/tours.js";
import usersRouter from "./routes/users.js";
import authRouter from "./routes/auth.js";
import reviewsRouter from "./routes/reviews.js";
import bookingRouter from "./routes/bookings.js";
import paymentRoutes from "./routes/payment.js";
import experiencesRouter from "./routes/experiences.js";

dotenv.config();

const app = express();

console.log("🚀 Server initializing with MongoDB and CORS fix (Vercel-ready)");

// =========================================
// MongoDB Connection (serverless-friendly)
// =========================================
let isConnected = false;

const connectDB = async () => {
  if (isConnected) {
    console.log("✅ MongoDB already connected");
    return;
  }

  try {
    mongoose.set("bufferCommands", false);

    const conn = await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    isConnected = conn.connections[0].readyState === 1;
    console.log("✅ MongoDB connected successfully");
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
    throw error;
  }
};

// Middleware to ensure DB connection
const ensureDBConnection = async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Database connection failed",
      error: error.message,
    });
  }
};

// =========================================
// CORS Handling
// =========================================
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowedOrigins = [
    "http://localhost:5173",
    "http://localhost:4000",
    "http://localhost:8000",
    process.env.FRONTEND_URL,
    process.env.CLIENT_URL,
    "https://travel-frontend-ckdh.vercel.app", // ✅ Updated to match your actual frontend URL
    "https://travel-frontend-q5ce.vercel.app", // ✅ explicitly allowed
  ];

  const allowedPatterns = [
    /^https:\/\/travel-frontend.*\.vercel\.app$/,
    /^http:\/\/localhost:\d+$/,
  ];

  let isAllowed =
    (origin && allowedOrigins.includes(origin)) ||
    allowedPatterns.some((pattern) => pattern.test(origin));

  if (isAllowed && origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  } else {
    res.setHeader("Access-Control-Allow-Origin", "*");
  }

  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, PATCH, OPTIONS"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  next();
});

// =========================================
// Global Middleware
// =========================================
app.use("/uploads", express.static("uploads"));
app.use(express.json({ limit: "10mb" }));
app.use(cookieParser());
app.use("/api", ensureDBConnection);

// =========================================
// API Routes
// =========================================
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/users", usersRouter);
app.use("/api/v1/tours", toursRouter);
app.use("/api/v1/reviews", reviewsRouter);
app.use("/api/v1/bookings", bookingRouter);
app.use("/api/v1/payment", paymentRoutes);
app.use("/api/v1/experiences", experiencesRouter);

// =========================================
// Health Check
// =========================================
app.get("/api/v1/health", async (req, res) => {
  try {
    await connectDB();
    res.json({
      status: "OK",
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || "development",
      version: "4.3.0",
      database:
        mongoose.connection.readyState === 1 ? "Connected" : "Disconnected",
    });
  } catch (error) {
    res.status(500).json({
      status: "ERROR",
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || "development",
      version: "4.3.0",
      database: "Connection failed",
      error: error.message,
    });
  }
});

// Root Route
app.get("/", (req, res) => {
  res.json({
    message: "Travel Backend API",
    status: "Running",
    version: "4.3.0",
    deployment: "Vercel-compatible",
    mongodb: "Optimized for serverless",
  });
});

// =========================================
// Error Handling
// =========================================
app.use((err, req, res, next) => {
  console.error("Global error handler:", err.stack);
  res.status(500).json({
    success: false,
    message: "Something went wrong!",
    error:
      process.env.NODE_ENV === "development"
        ? err.message
        : "Internal server error",
  });
});

// 404 Route
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

// =========================================
// Vercel Export (NO app.listen())
// =========================================
export default app;

// =========================================
// Local Development (Optional)
// =========================================
if (process.env.NODE_ENV !== "production") {
  const PORT = process.env.PORT || 4000;
  app.listen(PORT, async () => {
    await connectDB();
    console.log(`✅ Local server running at http://localhost:${PORT}`);
  });
}
