// const fuelStationModel = require("../models/fuelStationModel");
import fuelStationModel from "../models/fuelStationModel.js";

export const allStations = async (req, res) => {
  //   console.log("🔥 /allStations route hit");
  // console.log("Logged-in user ID:", req.user.id);
  try {
    const stations = await fuelStationModel.find({
      ownerId: req.user.id,
    });

    // console.log(" Stations fetched:", stations);
    res.json(stations);
  } catch (err) {
    // console.error("❌ Route error:", err);
    res.status(500).json({ message: err.message });
  }
};

export const completeProfile = async (req, res) => {
  try {
    if (req.user.role !== "fuelStation") {
      return res.status(403).json({ message: "Access denied" });
    }

    const ownerId = req.user.id;

    const { lat, lng } = req.body;

    if (!lat || !lng) {
      return res.status(400).json({ message: "Station location is required" });
    }

    // console.log("LAT:", lat, "LNG:", lng);

    const stationData = {
      ownerId,
      ...req.body,
      status: "pending",
      location: {
        type: "Point",
        coordinates: [parseFloat(lng), parseFloat(lat)], //CORRECT ORDER
      },
    };

    if (req.file) {
      stationData.image = {
        data: req.file.buffer,
        contentType: req.file.mimetype,
      };
    }

    const station = await fuelStationModel.create(stationData);

    res.status(201).json({
      message: "Fuel station submitted for approval",
      station,
    });
  } catch (error) {
    console.error("STATION CREATE ERROR:", error);
    res.status(500).json({ message: error.message });
  }
};

export const stationImage = async (req, res) => {
  try {
    let station = await fuelStationModel.findById(req.params.id);

    if (!station || !station.image?.data) {
      return res.send("Image not Found");
    }

    res.set("Content-Type", station.image.contentType);
    res.send(station.image.data);
  } catch (error) {
    res.json(error.message);
  }
};

export const updateStation = async (req, res) => {
  try {
    const { id } = req.params;

    // console.log("REQ FILE:", req.file); // 🔥 DEBUG

    const station = await fuelStationModel.findById(id);
    if (!station) {
      return res.status(404).json({ message: "Fuel station not found" });
    }

    if (String(station.ownerId) !== String(req.user.id)) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    const updateData = {};

    const fields = [
      "stationName",
      "contact",
      "city",
      "area",
      "pincode",
      "address",
      "openTime",
      "closeTime",
      "petrolQty",
      "petrolRate",
      "dieselQty",
      "dieselRate",
    ];

    fields.forEach((field) => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });

    const { lat, lng } = req.body;

    if (!lat || !lng) {
      return res.status(400).json({ message: "Station location is required" });
    }

    updateData.location = {
      type: "Point",
      coordinates: [parseFloat(lng), parseFloat(lat)],
    };

    // 🔥 FORCE IMAGE UPDATE
    if (req.file && req.file.buffer) {
      updateData.image = {
        data: Buffer.from(req.file.buffer),
        contentType: req.file.mimetype,
      };
    }

    // console.log("FINAL UPDATE DATA:", updateData);

    const updatedStation = await fuelStationModel.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true },
    );

    res.status(200).json({
      message: "Fuel station updated successfully",
      station: updatedStation,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

export const deleteStation = async (req, res) => {
  try {
    // console.log("DELETE ROUTE HIT:", req.params.stationId);
    // console.log("USER:", req.user);

    if (!req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    if (req.user.role !== "fuelStation") {
      return res.status(403).json({ message: "Access denied" });
    }

    const { stationId } = req.params;

    const deletedStation = await fuelStationModel.findOneAndDelete({
      _id: stationId,
    });

    if (!deletedStation) {
      return res.status(404).json({ message: "Fuel station not found" });
    }

    res.status(200).json({
      message: "Fuel station deleted successfully",
      station: deletedStation,
    });
  } catch (error) {
    console.error("DELETE ERROR:", error);
    res.status(500).json({ message: error.message });
  }
};

export const searchStation = async (req, res) => {
  const search = req.query.search || "";

  let filterStation = await fuelStationModel
    .find({
      ownerId: req.user.id,
      stationName: { $regex: search, $options: "i" },
    })
    .sort({ stationName: 1 });

  res.json(filterStation);
};

export const stationLogout = async (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    path: "/",
  });

  res.json({ message: `${req.user.role} your successfully logout` });
};
