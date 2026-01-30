const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    stationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FuelStation",
      required: true,
    },

    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    petrolQty: Number,
    dieselQty: Number,

    amount: {
      type: Number,
      required: true,
    },

    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },

    approvedAt: Date, // when owner approves
  },
  {
    timestamps: true, // ✅ createdAt & updatedAt auto added
  }
);

module.exports = mongoose.model("Payment", paymentSchema);
