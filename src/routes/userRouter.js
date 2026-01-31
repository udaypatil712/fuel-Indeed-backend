import express from "express";

// Import Models
import User from "../models/userModel.js";
import Auth from "../models/authModel.js";
import authModel from "../models/authModel.js";
import fuelStationModel from "../models/fuelStationModel.js";
import userModel from "../models/userModel.js";
import bookingModel from "../models/fuelBookingModel.js";

const router = express.Router();
// Import Middleware
import authMiddleware from "../middlewares/authMiddleware.js";

router.get("/profile", authMiddleware, async (req, res) => {
  // console.log(req.user);
  res.json({
    id: req.user.id,
    name: req.user.name,
    role: req.user.role,
    isProfileCompleted: req.user.isProfileCompleted,
  });
});

router.post("/complete-profile", authMiddleware, async (req, res) => {
  try {
    const { city, contact, address, pincode } = req.body;
    const userId = req.user.id;

    // 1️⃣ prevent duplicate profile
    const exists = await User.findOne({ userId });
    if (exists) {
      return res.status(400).json({ message: "Profile already completed" });
    }

    // 2️⃣ create profile linked to account
    await User.create({
      userId,
      city,
      contact,
      address,
      pincode,
    });

    // 3️⃣ mark profile completed
    await Auth.findByIdAndUpdate(userId, {
      isProfileCompleted: true,
    });

    res.json({ message: "User profile completed" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/showNearByStation", authMiddleware, async (req, res) => {
  try {
    const { lat, lng } = req.query;

    if (!lat || !lng) {
      return res.status(404).json({ message: "Location required" });
    }
    const stations = await fuelStationModel.aggregate([
      {
        $geoNear: {
          near: {
            type: "Point",
            coordinates: [parseFloat(lng), parseFloat(lat)],
          },
          distanceField: "distance", //in meters
          // maxDistance: 5000, // 5km
          spherical: true,
          query: { status: "approved" },
        },
      },
    ]);

    res.json(stations);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/searchStationByUser", authMiddleware, async (req, res) => {
  const { search = "", lat, lng } = req.query;

  const filterStations = await fuelStationModel.aggregate([
    {
      $geoNear: {
        near: {
          type: "Point",
          coordinates: [parseFloat(lng), parseFloat(lat)],
        },
        distanceField: "distance", //in meters
        // maxDistance: 5000, // 5km
        spherical: true,
        query: {
          stationName: { $regex: search, $options: "i" },
          status: "approved",
        },
      },
    },
    {
      $sort: {
        stationName: 1,
        distance: 1,
      },
    },
  ]);

  res.json(filterStations);
});

router.get("/bookingFuel/:id", authMiddleware, async (req, res) => {
  try {
    const stationId = req.params.id;
    // console.log(stationId);
    const station = await fuelStationModel.findById(stationId);

    if (!station) {
      return res.json({ messsge: "station is not Found" });
    }
    // console.log(station);
    res.json(station);
  } catch (error) {
    res.json({ messsge: error.message });
  }
});

router.post("/bookingFuel/:id", authMiddleware, async (req, res) => {
  try {
    const authUserId = req.user.id; // from JWT
    const stationId = req.params.id;
    const { litres, fuelType, lat, lng } = req.body; // user location

    // 1. Get user profile
    const userProfile = await userModel.findOne({ userId: authUserId });
    if (!userProfile) {
      return res.status(404).json({ message: "User profile not found" });
    }

    // 2. Get station
    const station = await fuelStationModel.findById(stationId);
    if (!station) {
      return res.status(404).json({ message: "Station not found" });
    }

    // 3. Validations
    if (!litres || litres <= 0) {
      return res.status(400).json({ message: "Invalid litres" });
    }

    if (litres > 10) {
      return res.status(400).json({ message: "Max 10 litres allowed" });
    }

    let rate, availableQty;

    if (fuelType === "petrol") {
      rate = station.petrolRate;
      availableQty = station.petrolQty;
    } else if (fuelType === "diesel") {
      rate = station.dieselRate;
      availableQty = station.dieselQty;
    } else {
      return res.status(400).json({ message: "Invalid fuel type" });
    }

    if (litres > availableQty) {
      return res.status(400).json({ message: "Not enough fuel in station" });
    }

    // 4. Calculate total
    const total = litres * rate;

    // 5. Reduce stock
    if (fuelType === "petrol") station.petrolQty -= litres;
    else station.dieselQty -= litres;

    station.notificationsCount += 1;
    await station.save();
    // console.log(station.stationName);

    // 6. Create booking

    const booking = await bookingModel.create({
      userId: authUserId, // Auth collection ID
      profileId: userProfile._id, // User profile ID
      stationId: station._id,

      fuelType,
      litres,
      rate,
      total,
      //user location
      deliveryLocation: {
        lat,
        lng,
        address: userProfile.address,
      },
    });

    // 7. Response
    res.json({
      success: true,
      message: "Booking confirmed",
      booking,
      stationName: station.stationName,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/logout", authMiddleware, async (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    path: "/",
  });

  res.json({ message: `${req.user.role} your successfully logout` });
});

export default router;
