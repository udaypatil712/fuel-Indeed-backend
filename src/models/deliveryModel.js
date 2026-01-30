const mongoose = require("mongoose");

const deliveryPersonSchema = new mongoose.Schema(
  {
    deliveryPersonId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Auth",
      required: true,
    },
    deliveryPersonName: String,
    image: { data: Buffer, contentType: String },
    city: String,
    contact: String,
    address: String,
    pincode: Number,
    isVerified: {
      type: Boolean,
      default: false,
    },
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
      enum: ["available", "assigned", "out_for_delivery", "offline", "busy"],
      default: "available",
    },
  },
  { timestamps: true },
);
deliveryPersonSchema.index({ location: "2dsphere" });

module.exports = mongoose.model("DeliveryPerson", deliveryPersonSchema);
