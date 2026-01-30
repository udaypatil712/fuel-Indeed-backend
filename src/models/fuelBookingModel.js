const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
  {
    // 🔐 Login account id (Auth collection)
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Auth",
      required: true,
    },

    // 👤 User profile id (User collection)
    profileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // ⛽ Fuel station
    stationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FuelStation",
      required: true,
    },

    fuelType: {
      type: String,
      enum: ["petrol", "diesel"],
      required: true,
    },

    litres: {
      type: Number,
      min: 1,
      required: true,
    },

    rate: {
      type: Number,
      required: true,
    },

    total: {
      type: Number,
      required: true,
    },
    //user location
    deliveryLocation: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
      address: { type: String, required: true },
    },

    status: {
      type: String,
      enum: [
        "confirmed",
        "processing",
        "out_for_delivery",
        "delivered",
        "cancelled",
      ],
      default: "confirmed",
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Booking", bookingSchema);
