import mongoose from "mongoose";

const adminSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Auth",
      required: true,
    },
    stationDetails: [
      {
        fuelStation: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "FuelStation",
        },
      },
    ],
    deliveryPersons: [
      {
        deliveryPersonId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "DeliveryPerson",
        },
      },
    ],
    quantity: {
      petrol: {
        type: Number,
        required: true,
      },
      disel: {
        type: Number,
        required: true,
      },
    },

    petrolRate: Number,
    dieselRate: Number,
  },
  { timestamps: true },
);

export default mongoose.model("Admin", adminSchema);
