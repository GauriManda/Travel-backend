import express from "express";
import path from "path";
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
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));
console.log(
  "🚀 Server initializing with optimized MongoDB connection for Vercel"
);

let cached = global.mongoose;
if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

const connectDB = async () => {
  if (cached.conn) {
    console.log("✅ Using cached MongoDB connection");
    return cached.conn;
  }

  if (cached.promise) {
    console.log("⏳ Waiting for existing MongoDB connection promise");
    cached.conn = await cached.promise;
    return cached.conn;
  }

  try {
    console.log("🔄 Creating new MongoDB connection");
    const opts = {
      bufferCommands: false,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      family: 4,
      maxIdleTimeMS: 30000,
      heartbeatFrequencyMS: 10000,
    };
    mongoose.set("strictQuery", true);
    mongoose.set("bufferCommands", false);

    cached.promise = mongoose.connect(process.env.MONGO_URI, opts);
    cached.conn = await cached.promise;

    console.log("✅ New MongoDB connection established");

    cached.conn.connection.on("connected", () => {
      console.log("✅ Mongoose connected to MongoDB");
    });
    cached.conn.connection.on("error", (err) => {
      console.error("❌ Mongoose connection error:", err);
      cached.conn = null;
      cached.promise = null;
    });
    cached.conn.connection.on("disconnected", () => {
      console.log("⚠️ Mongoose disconnected");
      cached.conn = null;
      cached.promise = null;
    });

    return cached.conn;
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error);
    cached.conn = null;
    cached.promise = null;
    throw error;
  }
};

const ensureDBConnection = async (req, res, next) => {
  try {
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

app.use("/uploads", express.static("uploads"));
app.use(express.json({ limit: "10mb" }));
app.use(cookieParser());
app.use("/api", ensureDBConnection);

app.use("/api/v1/auth", authRouter);
app.use("/api/v1/users", usersRouter);
app.use("/api/v1/tours", toursRouter);
app.use("/api/v1/reviews", reviewsRouter);
app.use("/api/v1/bookings", bookingRouter);
app.use("/api/v1/payment", paymentRoutes);
app.use("/api/v1/experiences", experiencesRouter);

app.get("/api/v1/health", async (req, res) => {
  try {
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

app.get("/", (req, res) => {
  res.json({
    message: "Travel Backend API",
    status: "Running",
    version: "4.4.0",
    deployment: "Vercel-optimized",
    mongodb: "Serverless connection pooling enabled",
  });
});

app.use((err, req, res, next) => {
  console.error("❌ Global error handler:", err);
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

app.use((err, req, res, next) => {
  console.error("❌ Final global error handler triggered:", err);
  if (res.headersSent) {
    return next(err);
  }
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal server error",
    error:
      process.env.NODE_ENV === "development"
        ? err.stack
        : "Something went wrong",
  });
});

app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

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

export default app;

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
