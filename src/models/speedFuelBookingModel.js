import mongoose from "mongoose";


const speedBookingSchema = new mongoose.Schema(
  {
    // 🔐 User Auth ID
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Auth",
      required: true,
    },

    // 👤 User Name (for quick access, no populate needed)
    userName: {
      type: String,
      required: true,
      trim: true,
    },

    // ⛽ Fuel Station
    stationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FuelStation",
      required: true,
    },

    // 🚚 Delivery Boy ID
    deliveryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DeliveryPerson",
      required: true,
    },

    // ⛽ Fuel type
    fuelType: {
      type: String,
      enum: ["petrol", "diesel"],
      required: true,
    },

    // 📏 Quantity
    fuelQty: {
      type: Number,
      min: 1,
      required: true,
    },

    // 💰 Rate per litre
    fuelRate: {
      type: Number,
      required: true,
    },

    // 💵 Total amount
    totalAmount: {
      type: Number,
      required: true,
    },

    // 📍 User Location
    latitude: {
      type: Number,
      required: true,
    },

    longitude: {
      type: Number,
      required: true,
    },
    payment: {
      type: String,
      enum: ["online", "offline"],
      default: "offline",
    },
    // 📦 Status
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
    paymentStatus: {
      type: String,
      enum: ["pending", "paid"],
      default: "pending",
    },
    razorpayPaymentLinkId: String,
  },
  { timestamps: true },
);

export default mongoose.model("SpeedDelivery", speedBookingSchema);
