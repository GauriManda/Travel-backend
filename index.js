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

// CORS - Dynamic origin handling with fallback for undefined origins
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowedOrigins = [
    "http://localhost:5173",
    "http://localhost:4000",
    "http://localhost:8000",
    process.env.FRONTEND_URL,
    process.env.CLIENT_URL,
  ];
  const allowedPatterns = [
    /^https:\/\/travel-frontend.*\.vercel\.app$/,
    /^http:\/\/localhost:\d+$/,
  ];

  let isAllowed = false;

  if (origin && allowedOrigins.includes(origin)) {
    isAllowed = true;
  }

  if (!isAllowed && origin) {
    isAllowed = allowedPatterns.some((pattern) => pattern.test(origin));
  }

  if (isAllowed && origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  } else {
    // Fallback for undefined origins (e.g., SSR tools or no origin header)
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
app.use("/api/v1/experiences", experiencesRouter);

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

// Force server to start - remove problematic conditional logic
const PORT = process.env.PORT || 4000;

console.log(`🔍 Debug info:`);
console.log(`NODE_ENV: "${process.env.NODE_ENV}"`);
console.log(`PORT: ${PORT}`);
console.log(`Attempting to start server...`);

try {
  const server = app.listen(PORT, "0.0.0.0", async () => {
    try {
      await connectDB();
      console.log(`✅ Server successfully running on port ${PORT}`);
      console.log(`🌐 Local: http://localhost:${PORT}`);
      console.log(`🌐 Network: http://0.0.0.0:${PORT}`);
    } catch (dbError) {
      console.error("❌ Database connection failed:", dbError);
    }
  });

  server.on("error", (error) => {
    console.error("❌ Server error:", error);
    if (error.code === "EADDRINUSE") {
      console.log(`Port ${PORT} is already in use. Trying port ${PORT + 1}...`);
      // You could implement port incrementing logic here
    }
  });

  server.on("listening", () => {
    const addr = server.address();
    console.log(
      `🎯 Server is actually listening on ${addr.address}:${addr.port}`
    );
  });
} catch (error) {
  console.error("❌ Failed to create server:", error);
}

// Export for Vercel
export default app;
