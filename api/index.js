import express from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import cors from "cors";
import cookieParser from "cookie-parser";

// Load environment variables first
dotenv.config();

const app = express();

// Database Connection
mongoose.set("strictQuery", false);

let isConnected = false;

const connectDB = async () => {
  if (isConnected && mongoose.connection.readyState === 1) {
    return;
  }

  try {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGO_URI, {
        bufferCommands: false,
        maxPoolSize: 1,
      });
    }
    isConnected = true;
    console.log("MongoDB Connected");
  } catch (error) {
    console.error("MongoDB Connection Failed:", error.message);
    isConnected = false;
    throw error;
  }
};

// Middleware
app.use(express.json({ limit: "10mb" }));
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  })
);
app.use(cookieParser());

// Database connection middleware
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    console.error("Database connection error:", error);
    res.status(500).json({
      success: false,
      message: "Database connection failed",
    });
  }
});

// Import and register routes with individual error handling
const registerRoutes = async () => {
  try {
    const { default: authRouter } = await import("./api/routes/auth.js");
    app.use("/api/v1/auth", authRouter);
    console.log("Auth routes registered");
  } catch (error) {
    console.error("Failed to load auth routes:", error.message);
  }

  try {
    const { default: usersRouter } = await import("./api/routes/users.js");
    app.use("/api/v1/users", usersRouter);
    console.log("Users routes registered");
  } catch (error) {
    console.error("Failed to load users routes:", error.message);
  }

  try {
    const { default: toursRouter } = await import("./api/routes/tours.js");
    app.use("/api/v1/tours", toursRouter);
    console.log("Tours routes registered");
  } catch (error) {
    console.error("Failed to load tours routes:", error.message);
    console.error("Stack:", error.stack);
  }

  try {
    const { default: reviewsRouter } = await import("./api/routes/reviews.js");
    app.use("/api/v1/reviews", reviewsRouter);
    console.log("Reviews routes registered");
  } catch (error) {
    console.error("Failed to load reviews routes:", error.message);
  }

  try {
    const { default: bookingRouter } = await import("./api/routes/bookings.js");
    app.use("/api/v1/bookings", bookingRouter);
    console.log("Bookings routes registered");
  } catch (error) {
    console.error("Failed to load bookings routes:", error.message);
  }

  try {
    const { default: paymentRoutes } = await import("./api/routes/payment.js");
    app.use("/api/v1/payment", paymentRoutes);
    console.log("Payment routes registered");
  } catch (error) {
    console.error("Failed to load payment routes:", error.message);
  }
};

// Register routes
registerRoutes();

// Health check endpoint
app.get("/api/v1/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
    version: "1.0.0",
    database: isConnected ? "connected" : "disconnected",
  });
});

// Root endpoint
app.get("/", (req, res) => {
  res.json({
    message: "Travel Backend API",
    status: "Running",
    endpoints: {
      health: "/api/v1/health",
      auth: "/api/v1/auth",
      users: "/api/v1/users",
      tours: "/api/v1/tours",
      reviews: "/api/v1/reviews",
      bookings: "/api/v1/bookings",
      payment: "/api/v1/payment",
    },
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Error:", err.message);
  console.error("Stack:", err.stack);
  res.status(500).json({
    success: false,
    message: "Something went wrong!",
    error:
      process.env.NODE_ENV === "development"
        ? err.message
        : "Internal server error",
  });
});

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

export default app;
