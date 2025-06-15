import Tour from "../models/Tour.js";
import mongoose from "mongoose";

// Create a new tour
export const createTour = async (req, res) => {
  const newTour = new Tour(req.body);
  try {
    const savedTour = await newTour.save();

    res.status(200).json({
      success: true,
      message: "Successfully created!",
      data: savedTour,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to create tour",
      error: error.message,
    });
  }
};

// update tour
export const updateTour = async (req, res) => {
  const id = req.params.id;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid Tour ID format" });
  }
  try {
    const updateTour = await Tour.findByIdAndUpdate(
      id,
      {
        $set: req.body,
      },
      { new: true }
    );
    res.status(200).json({
      success: true,
      message: "Successfully updated!",
      data: updateTour,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update tour",
      error: error.message,
    });
  }
};

// delete tour
export const deleteTour = async (req, res) => {
  const id = req.params.id;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid Tour ID format" });
  }
  try {
    const deleteTour = await Tour.findByIdAndDelete(id);
    res.status(200).json({
      success: true,
      message: "Successfully deleted!",
      data: deleteTour,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to delete tour",
      error: error.message,
    });
  }
};

// getSingle tour
export const getSingleTour = async (req, res) => {
  const id = req.params.id;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid Tour ID format" });
  }
  try {
    const tour = await Tour.findById(id).populate("reviews");
    if (!tour) {
      return res
        .status(404)
        .json({ success: false, message: "Tour not found" });
    }
    res.status(200).json({
      success: true,
      message: "Successfully found!",
      data: tour,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// getAll tour
export const getAllTour = async (req, res) => {
  // for pagination
  const page = parseInt(req.query.page) || 0;
  try {
    const tours = await Tour.find({})
      .populate("reviews")
      .skip(page * 9)
      .limit(9);

    res.status(200).json({
      success: true,
      count: tours.length,
      message: "Successful",
      data: tours,
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      message: "Not Found",
    });
  }
};

// get tour by search
export const getTourBySearch = async (req, res) => {
  const city = new RegExp(req.query.city, "i");
  const distance = parseInt(req.query.distance);
  const maxPeople = parseInt(req.query.maxPeople);

  try {
    // get means greater than equal
    const tours = await Tour.find({
      city,
      distance: { $gte: distance },
      maxGroupSize: { $gte: maxPeople },
    }).populate("reviews");

    res.status(200).json({
      success: true,
      message: "Successful",
      data: tours,
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      message: "Not Found",
    });
  }
};

//get featured tour
export const getFeaturedTour = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 9; // Ensure limit is correctly read
    const tours = await Tour.find({ featured: true }).limit(limit);
    res.status(200).json({ success: true, message: "Successful", data: tours });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// get tour content
export const getTourContent = async (req, res) => {
  try {
    const tourCount = await Tour.estimatedDocumentCount();
    res.status(200).json({
      success: true,
      message: "Successful",
      data: tourCount,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch",
    });
  }
};
export const getTourCount = async (req, res) => {
  try {
    const tourCount = await Tour.countDocuments();
    res.status(200).json({
      success: true,
      message: "Successful",
      count: tourCount,
      data: [], // or whatever data you want to return
    });
  } catch (err) {
    res.status(404).json({
      success: false,
      message: "Failed to get tour count",
    });
  }
};
