import express from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import cors from "cors";
import cookieParser from "cookie-parser";

// Import routes - Updated paths for Vercel deployment
import toursRouter from "./routes/tours.js";
import usersRouter from "./routes/users.js";
import authRouter from "./routes/auth.js";
import reviewsRouter from "./routes/reviews.js";
import bookingRouter from "./routes/bookings.js";
import paymentRoutes from "./routes/payment.js";

dotenv.config();

const app = express();

// Database Connection
mongoose.set("strictQuery", false);

let isConnected = false;

const connectDB = async () => {
  if (isConnected) {
    console.log("Using existing MongoDB connection");
    return;
  }

  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI environment variable is not defined");
    }

    await mongoose.connect(process.env.MONGO_URI, {
      bufferCommands: false, // Disable mongoose buffering for serverless
    });
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
app.use(express.urlencoded({ extended: true }));

app.use(
  cors({
    origin: [
      process.env.CLIENT_URL || "http://localhost:5173",
      "http://localhost:4000",
      "http://localhost:5174",
      "https://travel-backend-9hrb4ffzg-gauri-mandas-projects.vercel.app", // Update with your actual frontend domain
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Cookie"],
  })
);

app.use(cookieParser());

// Add request logging for debugging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path} - ${new Date().toISOString()}`);
  next();
});

// Register Routes
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/users", usersRouter);
app.use("/api/v1/tours", toursRouter);
app.use("/api/v1/reviews", reviewsRouter);
app.use("/api/v1/bookings", bookingRouter);
app.use("/api/v1/payment", paymentRoutes);

// Health check endpoint
app.get("/api/v1/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
    version: "1.0.0",
    mongodb: isConnected ? "Connected" : "Disconnected",
  });
});

// Root endpoint
app.get("/", (req, res) => {
  res.json({
    message: "Travel Backend API",
    status: "Running",
    timestamp: new Date().toISOString(),
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
  console.error("Error:", err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Something went wrong!",
    error: process.env.NODE_ENV === "development" ? err.stack : {},
    timestamp: new Date().toISOString(),
  });
});

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`,
    timestamp: new Date().toISOString(),
  });
});

// Vercel serverless function handler
export default async (req, res) => {
  try {
    await connectDB();
    return app(req, res);
  } catch (error) {
    console.error("Handler error:", error);
    return res.status(500).json({
      success: false,
      message: "Server initialization failed",
      error: error.message,
    });
  }
};
