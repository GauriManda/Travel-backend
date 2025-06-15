import Booking from "../models/Booking.js";
import User from "../models/User.js"; // Added missing User model import

//create new booking
export const createBooking = async (req, res) => {
  const newBooking = new Booking(req.body);
  try {
    const savedBooking = await newBooking.save();
    res.status(200).json({
      success: true,
      message: "Your tour is booked!",
      data: savedBooking,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

//get single booking
export const getBooking = async (req, res) => {
  const id = req.params.id;

  try {
    const book = await Booking.findById(id);
    if (!book) {
      return res
        .status(404)
        .json({ success: false, message: "Booking not found" });
    }
    res.status(200).json({ success: true, message: "Successful", data: book });
  } catch (error) {
    res.status(404).json({ success: false, message: "Not found" });
  }
};

//get All booking
export const getAllBooking = async (req, res) => {
  try {
    const books = await Booking.find();
    res.status(200).json({ success: true, message: "Successful", data: books });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const getUserBookings = async (req, res) => {
  const userId = req.params.id;

  try {
    const bookings = await Booking.find({ userId: userId });
    res.status(200).json({
      success: true,
      message: "Successful",
      data: bookings,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const getUserProfile = async (req, res) => {
  const userId = req.params.id;

  try {
    const user = await User.findById(userId).select("-password");
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "User profile retrieved successfully",
      data: user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
