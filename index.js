import express from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import cors from "cors";
import cookieParser from "cookie-parser";
import toursRouter from "./routes/tours.js";
import usersRouter from "./routes/users.js";
import authRouter from "./routes/auth.js";
import reviewsRouter from "./routes/reviews.js";
import bookingRouter from "./routes/bookings.js";
import paymentRoutes from "./routes/payment.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;

// Database Connection
mongoose.set("strictQuery", false);

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB Connected");
  } catch (error) {
    console.error("MongoDB Connection Failed:", error.message);
    process.exit(1);
  }
};

app.use("/uploads", express.static("uploads"));

// Event Listeners for DB
mongoose.connection.on("connected", () => console.log("MongoDB Connected"));
mongoose.connection.on("error", (err) => console.error("DB Error:", err));
mongoose.connection.on("disconnected", () =>
  console.log("⚠️ MongoDB Disconnected")
);

// Middleware
app.use(express.json({ limit: "10mb" })); // Increased limit for gear data
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  })
);
app.use(cookieParser());

//  Register Routes
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

// Start Server Only After DB Connects
connectDB().then(() => {
  app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
    console.log(`API available at http://localhost:${port}/api/v1`);
  });
});
