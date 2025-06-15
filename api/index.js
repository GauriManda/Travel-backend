import express from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import cors from "cors";
import cookieParser from "cookie-parser";

// Import routes (adjust paths as needed)
import toursRouter from "../routes/tours.js";
import usersRouter from "../routes/users.js";
import authRouter from "../routes/auth.js";
import reviewsRouter from "../routes/reviews.js";
import bookingRouter from "../routes/bookings.js";
import paymentRoutes from "../routes/payment.js";

dotenv.config();

const app = express();

// Database Connection
mongoose.set("strictQuery", false);

let isConnected = false;

const connectDB = async () => {
  if (isConnected) {
    return;
  }

  try {
    await mongoose.connect(process.env.MONGO_URI);
    isConnected = true;
    console.log("MongoDB Connected");
  } catch (error) {
    console.error("MongoDB Connection Failed:", error.message);
    throw error;
  }
};

// Middleware
app.use(express.json({ limit: "10mb" }));
app.use(
  cors({
    origin: [
      process.env.CLIENT_URL || "http://localhost:5173",
      "http://localhost:4000",
      "http://localhost:5174",
      "https://your-frontend-domain.vercel.app", // Add your actual frontend domain
    ],
    credentials: true,
  })
);
app.use(cookieParser());

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
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: "Something went wrong!",
    error: process.env.NODE_ENV === "development" ? err.message : {},
  });
});

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

// Vercel serverless function handler
export default async (req, res) => {
  await connectDB();
  return app(req, res);
};
