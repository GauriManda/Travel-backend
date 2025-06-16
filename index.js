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

dotenv.config();

const app = express();

console.log("🚀 Server starting with MongoDB and CORS fix v4.3");

// MongoDB connection with optimization for serverless
let isConnected = false;

const connectDB = async () => {
  if (isConnected) {
    console.log("MongoDB already connected");
    return;
  }

  try {
    // Set mongoose options for serverless
    mongoose.set("bufferCommands", false);

    const conn = await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    isConnected = conn.connections[0].readyState === 1;
    console.log("MongoDB connected successfully");
  } catch (error) {
    console.error("MongoDB connection error:", error);
    throw error;
  }
};

// Middleware to ensure DB connection
const ensureDBConnection = async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    console.error("DB connection middleware error:", error);
    res.status(500).json({
      success: false,
      message: "Database connection failed",
      error: error.message,
    });
  }
};

// CORS - Dynamic origin handling for Vercel deployments
app.use((req, res, next) => {
  console.log(`🌐 Request from: ${req.headers.origin} to ${req.url}`);

  const origin = req.headers.origin;
  console.log(`🔍 Checking origin: ${origin}`);

  // Define allowed origins
  const allowedOrigins = [
    // Local development
    "http://localhost:5173",
    "http://localhost:3000",
    "http://localhost:8000",
    // Production domains
    process.env.FRONTEND_URL,
    process.env.CLIENT_URL,
  ];

  // Regex patterns for dynamic Vercel deployments
  const allowedPatterns = [
    /^https:\/\/travel-frontend.*\.vercel\.app$/, // Any travel-frontend deployment
    /^http:\/\/localhost:\d+$/, // Any localhost port
  ];

  let isAllowed = false;

  // Check exact matches
  if (allowedOrigins.includes(origin)) {
    isAllowed = true;
    console.log(`✅ Exact match: ${origin} allowed`);
  }

  // Check pattern matches
  if (!isAllowed && origin) {
    for (const pattern of allowedPatterns) {
      if (pattern.test(origin)) {
        isAllowed = true;
        console.log(`✅ Pattern match: ${origin} allowed by ${pattern}`);
        break;
      }
    }
  }

  if (isAllowed) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  } else {
    console.log(`❌ Origin ${origin} not allowed`);
    // Debug logging
    console.log(`Debug info:`, {
      origin,
      exactMatches: allowedOrigins.filter((o) => o === origin),
      patternTests: allowedPatterns.map((p) => ({
        pattern: p.toString(),
        matches: p.test(origin || ""),
      })),
    });
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
    console.log("✈️ Handling OPTIONS preflight request");
    return res.status(200).end();
  }

  next();
});

app.use("/uploads", express.static("uploads"));
app.use(express.json({ limit: "10mb" }));
app.use(cookieParser());

// Apply DB connection middleware to all API routes
app.use("/api", ensureDBConnection);

// Register Routes (these will now have DB connection ensured)
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/users", usersRouter);
app.use("/api/v1/tours", toursRouter);
app.use("/api/v1/reviews", reviewsRouter);
app.use("/api/v1/bookings", bookingRouter);
app.use("/api/v1/payment", paymentRoutes);

// Health check (with DB status)
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

// Root route
app.get("/", (req, res) => {
  res.json({
    message: "Travel Backend API",
    status: "Running",
    version: "4.3.0",
    cors: "Fixed MongoDB connection options",
    mongodb: "Optimized for serverless",
  });
});

// Error middleware
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

// 404
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

// For local development
if (process.env.NODE_ENV !== "production") {
  const PORT = process.env.PORT || 8000;
  app.listen(PORT, async () => {
    await connectDB();
    console.log(`Server running on port ${PORT}`);
  });
}

// Export for Vercel
export default app;
