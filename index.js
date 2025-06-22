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

console.log(
  "🚀 Server initializing with optimized MongoDB connection for Vercel"
);

// =========================================
// Optimized MongoDB Connection for Vercel
// =========================================
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

const connectDB = async () => {
  // Return existing connection if available
  if (cached.conn) {
    console.log("✅ Using cached MongoDB connection");
    return cached.conn;
  }

  // Return existing promise if connection is in progress
  if (cached.promise) {
    console.log("⏳ Waiting for existing MongoDB connection promise");
    cached.conn = await cached.promise;
    return cached.conn;
  }

  try {
    console.log("🔄 Creating new MongoDB connection");

    // Fixed connection options - removed deprecated options
    const opts = {
      bufferCommands: false, // Disable mongoose buffering
      maxPoolSize: 10, // Maintain up to 10 socket connections
      serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
      family: 4, // Use IPv4, skip trying IPv6
      // Additional serverless optimizations
      maxIdleTimeMS: 30000, // Close connections after 30 seconds of inactivity
      heartbeatFrequencyMS: 10000, // Send heartbeat every 10 seconds
    };

    // Set mongoose settings for serverless
    mongoose.set("strictQuery", true);
    mongoose.set("bufferCommands", false);

    // Create connection promise
    cached.promise = mongoose.connect(process.env.MONGO_URI, opts);

    // Wait for connection
    cached.conn = await cached.promise;

    console.log("✅ New MongoDB connection established");

    // Handle connection events
    cached.conn.connection.on("connected", () => {
      console.log("✅ Mongoose connected to MongoDB");
    });

    cached.conn.connection.on("error", (err) => {
      console.error("❌ Mongoose connection error:", err);
      // Reset cache on error
      cached.conn = null;
      cached.promise = null;
    });

    cached.conn.connection.on("disconnected", () => {
      console.log("⚠️ Mongoose disconnected");
      // Reset cache on disconnect
      cached.conn = null;
      cached.promise = null;
    });

    return cached.conn;
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error);
    // Reset cache on error
    cached.conn = null;
    cached.promise = null;
    throw error;
  }
};

// Middleware to ensure DB connection with timeout
const ensureDBConnection = async (req, res, next) => {
  try {
    // Set a timeout for database connection
    const connectionTimeout = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Database connection timeout")), 8000);
    });

    await Promise.race([connectDB(), connectionTimeout]);
    next();
  } catch (error) {
    console.error("❌ Database connection middleware error:", error);
    res.status(500).json({
      success: false,
      message: "Database connection failed",
      error: error.message,
    });
  }
};

// =========================================
// CORS Handling (Optimized)
// =========================================
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:4000",
  "http://localhost:8000",
  process.env.FRONTEND_URL,
  process.env.CLIENT_URL,
  "https://travel-frontend-ckdh.vercel.app",
  "https://travel-frontend-q5ce.vercel.app",
];

const allowedPatterns = [
  /^https:\/\/travel-frontend.*\.vercel\.app$/,
  /^http:\/\/localhost:\d+$/,
];

app.use((req, res, next) => {
  const origin = req.headers.origin;

  let isAllowed = false;
  if (origin) {
    isAllowed =
      allowedOrigins.includes(origin) ||
      allowedPatterns.some((pattern) => pattern.test(origin));
  }

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

// Apply DB connection middleware only to API routes
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
// Health Check (Optimized)
// =========================================
app.get("/api/v1/health", async (req, res) => {
  try {
    // Quick health check without heavy DB operations
    const start = Date.now();
    await connectDB();
    const connectionTime = Date.now() - start;

    res.json({
      status: "OK",
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || "development",
      version: "4.4.0",
      database:
        mongoose.connection.readyState === 1 ? "Connected" : "Disconnected",
      connectionTime: `${connectionTime}ms`,
      uptime: process.uptime(),
    });
  } catch (error) {
    console.error("❌ Health check failed:", error);
    res.status(500).json({
      status: "ERROR",
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || "development",
      version: "4.4.0",
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
    version: "4.4.0",
    deployment: "Vercel-optimized",
    mongodb: "Serverless connection pooling enabled",
  });
});

// =========================================
// Error Handling
// =========================================
app.use((err, req, res, next) => {
  console.error("❌ Global error handler:", err);

  // Handle specific MongoDB errors
  if (err.name === "MongoNetworkError") {
    return res.status(503).json({
      success: false,
      message: "Database temporarily unavailable",
      error: "Connection timeout",
    });
  }

  if (err.name === "MongoTimeoutError") {
    return res.status(503).json({
      success: false,
      message: "Database operation timeout",
      error: "Query timeout",
    });
  }

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
// Graceful Shutdown (for local development)
// =========================================
process.on("SIGINT", async () => {
  console.log("🛑 Received SIGINT, shutting down gracefully...");
  try {
    if (cached.conn) {
      await cached.conn.connection.close();
      console.log("✅ MongoDB connection closed");
    }
  } catch (error) {
    console.error("❌ Error during shutdown:", error);
  }
  process.exit(0);
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
    console.log(`✅ Local server running at http://localhost:${PORT}`);
    try {
      await connectDB();
      console.log("✅ Database connected successfully");
    } catch (error) {
      console.error("❌ Database connection failed:", error);
    }
  });
}
