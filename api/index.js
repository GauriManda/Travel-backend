import express from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import cors from "cors";
import cookieParser from "cookie-parser";

// Comment out route imports temporarily to debug
// import toursRouter from "./routes/tours.js";
// import usersRouter from "./routes/users.js";
// import authRouter from "./routes/auth.js";
// import reviewsRouter from "./routes/reviews.js";
// import bookingRouter from "./routes/bookings.js";
// import paymentRoutes from "./routes/payment.js";

dotenv.config();

const app = express();

// Database Connection with better error handling
let cachedConnection = null;

const connectDB = async () => {
  if (cachedConnection) {
    console.log("Using cached MongoDB connection");
    return cachedConnection;
  }

  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI environment variable is not defined");
    }

    const connection = await mongoose.connect(process.env.MONGO_URI, {
      bufferCommands: false,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });

    cachedConnection = connection;
    console.log("MongoDB Connected Successfully");
    return connection;
  } catch (error) {
    console.error("MongoDB Connection Failed:", error.message);
    cachedConnection = null;
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
      "https://travel-backend-9hrb4ffzg-gauri-mandas-projects.vercel.app",
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

// Temporary simple routes for testing (replace the commented imports)
app.get("/api/v1/auth/test", (req, res) => {
  res.json({
    message: "Auth route working",
    timestamp: new Date().toISOString(),
  });
});

app.get("/api/v1/tours/test", (req, res) => {
  res.json({
    message: "Tours route working",
    timestamp: new Date().toISOString(),
  });
});

// Register Routes (commented out for debugging)
// app.use("/api/v1/auth", authRouter);
// app.use("/api/v1/users", usersRouter);
// app.use("/api/v1/tours", toursRouter);
// app.use("/api/v1/reviews", reviewsRouter);
// app.use("/api/v1/bookings", bookingRouter);
// app.use("/api/v1/payment", paymentRoutes);

// Health check endpoint
app.get("/api/v1/health", async (req, res) => {
  let dbStatus = "Disconnected";

  try {
    if (cachedConnection && mongoose.connection.readyState === 1) {
      dbStatus = "Connected";
    }
  } catch (error) {
    console.error("Health check DB error:", error);
  }

  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
    version: "1.0.0",
    mongodb: dbStatus,
    nodeVersion: process.version,
  });
});

// Root endpoint
app.get("/", (req, res) => {
  res.json({
    message: "Travel Backend API - Debug Version",
    status: "Running",
    timestamp: new Date().toISOString(),
    endpoints: {
      health: "/api/v1/health",
      authTest: "/api/v1/auth/test",
      toursTest: "/api/v1/tours/test",
    },
    environment: {
      nodeEnv: process.env.NODE_ENV,
      hasMongoUri: !!process.env.MONGO_URI,
      clientUrl: process.env.CLIENT_URL,
    },
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Express Error:", err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Something went wrong!",
    error:
      process.env.NODE_ENV === "development"
        ? err.stack
        : "Internal Server Error",
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

// Vercel serverless function handler with better error handling
export default async (req, res) => {
  try {
    console.log("Handler invoked:", req.method, req.url);

    // Connect to database
    await connectDB();

    // Handle the request
    return app(req, res);
  } catch (error) {
    console.error("Handler error:", error);

    // Make sure we return a proper response
    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        message: "Server initialization failed",
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }
};
