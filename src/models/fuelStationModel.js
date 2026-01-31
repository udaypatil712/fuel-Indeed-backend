import mongoose from "mongoose";


const fuelStationSchema = new mongoose.Schema(
  {
    ownerId: {
      // rename for clarity (recommended)
      type: mongoose.Schema.Types.ObjectId,
      ref: "Auth",
      required: true,
      // unique: true, // ✅ one profile per account
    },
    userId: {
      // rename for clarity (recommended)
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    image: { data: Buffer, contentType: String },
    stationName: String,
    openTime: { type: String, required: true },
    closeTime: { type: String, required: true },
    address: String,
    area: String,
    city: String,
    pincode: Number,

    petrolQty: { type: Number, default: 0, required: true },
    petrolRate: Number,
    dieselQty: { type: Number, default: 0, required: true },
    dieselRate: Number,

    notificationsCount: {
      type: Number,
      default: 0,
    },
    

    speedDeliveryCount: {
      type: Number,
      default: 0,
    },
    contact: { type: String, required: true },

    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
      },
    },

    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
  },
  { timestamps: true },
);
fuelStationSchema.index({ location: "2dsphere" });

export default mongoose.model("FuelStation", fuelStationSchema);
