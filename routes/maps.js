import express from "express";
import Tour from "../models/Tour.js"; // Adjust path as needed

const router = express.Router();

// Get all tours with location data for maps
router.get("/tours-locations", async (req, res) => {
  try {
    const tours = await Tour.find(
      {
        lat: { $exists: true, $ne: null },
        lng: { $exists: true, $ne: null },
      },
      {
        title: 1,
        lat: 1,
        lng: 1,
        price: 1,
        maxGroupSize: 1,
        desc: 1,
        photo: 1,
        city: 1,
        address: 1,
        distance: 1,
        featured: 1,
      }
    ).populate("reviews");

    const formattedTours = tours.map((tour) => {
      // Calculate average rating from reviews
      const avgRating =
        tour.reviews.length > 0
          ? tour.reviews.reduce(
              (sum, review) => sum + (review.rating || 0),
              0
            ) / tour.reviews.length
          : 4.5;

      return {
        id: tour._id,
        title: tour.title,
        position: {
          lat: parseFloat(tour.lat),
          lng: parseFloat(tour.lng),
        },
        price: `₹${tour.price}`,
        rating: Math.round(avgRating * 10) / 10,
        duration: `${tour.distance} km`,
        maxGroupSize: tour.maxGroupSize,
        description: tour.desc,
        image: tour.photo,
        city: tour.city,
        address: tour.address,
        featured: tour.featured,
        reviewCount: tour.reviews.length,
      };
    });

    res.status(200).json({
      success: true,
      count: formattedTours.length,
      data: formattedTours,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching tour locations",
      error: error.message,
    });
  }
});

// Geocode address to get coordinates
router.post("/geocode", async (req, res) => {
  try {
    const { address } = req.body;

    if (!address) {
      return res.status(400).json({
        success: false,
        message: "Address is required",
      });
    }

    // You can integrate with Google Geocoding API here
    // For now, returning a mock response
    const mockCoordinates = {
      lat: 21.1458 + (Math.random() - 0.5) * 0.1,
      lng: 79.0882 + (Math.random() - 0.5) * 0.1,
    };

    res.status(200).json({
      success: true,
      data: {
        address,
        coordinates: mockCoordinates,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error geocoding address",
      error: error.message,
    });
  }
});

// Get nearby tours based on coordinates
router.get("/nearby-tours", async (req, res) => {
  try {
    const { lat, lng, radius = 50 } = req.query; // radius in km

    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        message: "Latitude and longitude are required",
      });
    }

    // Using MongoDB's geospatial query (if you have geospatial index)
    // For now, using a simple distance calculation
    const tours = await Tour.find({
      lat: { $exists: true, $ne: null },
      lng: { $exists: true, $ne: null },
    }).populate("reviews");

    const nearbyTours = tours
      .filter((tour) => {
        const distance = calculateDistance(
          parseFloat(lat),
          parseFloat(lng),
          parseFloat(tour.lat),
          parseFloat(tour.lng)
        );
        return distance <= radius;
      })
      .map((tour) => {
        const avgRating =
          tour.reviews.length > 0
            ? tour.reviews.reduce(
                (sum, review) => sum + (review.rating || 0),
                0
              ) / tour.reviews.length
            : 4.5;

        return {
          id: tour._id,
          title: tour.title,
          position: {
            lat: parseFloat(tour.lat),
            lng: parseFloat(tour.lng),
          },
          price: `₹${tour.price}`,
          rating: Math.round(avgRating * 10) / 10,
          distance: `${tour.distance} km`,
          maxGroupSize: tour.maxGroupSize,
          description: tour.desc,
          image: tour.photo,
          city: tour.city,
          address: tour.address,
          featured: tour.featured,
          reviewCount: tour.reviews.length,
        };
      });

    res.status(200).json({
      success: true,
      count: nearbyTours.length,
      data: nearbyTours,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error finding nearby tours",
      error: error.message,
    });
  }
});

// Helper function to calculate distance between two coordinates
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the Earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) *
      Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d;
}

function deg2rad(deg) {
  return deg * (Math.PI / 180);
}

export default router;
