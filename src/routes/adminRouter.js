import express from "express";
// import bcrypt from "bcrypt"; // (if needed later)

const router = express.Router();

// Middleware
import authMiddleware from "../middlewares/authMiddleware.js";

// Controllers
import {
  completeProfile,
  updateStock,
  adminDetails,
  requestedStation,
  requestedStationShow,
  paymentStation,
  paymentRequest,
  paymentApproval,
  adminLogout,
} from "../controllers/adminController.js";

// Models
import adminModel from "../models/adminModel.js";
import deliveryModel from "../models/deliveryModel.js";

// Utils

// const { adminToken } = require("../utils/generateToken");

router.get("/", (req, res) => {
  res.send("hii");
});

router.post("/complete-details", authMiddleware, completeProfile);

router.post("/update-stock", authMiddleware, updateStock);

router.get("/adminDetails", authMiddleware, adminDetails);

router.post("/station/:id", authMiddleware, requestedStation);

router.get("/requestedStation", authMiddleware, requestedStationShow);

router.get("/payment/:id", authMiddleware, paymentStation);

router.patch("/updateQuantity/:id", authMiddleware, paymentRequest);

router.get("/approve-payment/:paymentId", paymentApproval);

router.post("/approvalRequest/:id", authMiddleware, async (req, res) => {
  try {
    const deliveryId = req.params.id;

    const admin = await adminModel.findOne(); // ✅ FIX

    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    const alreadyRequested = admin.deliveryPersons.some(
      (person) => person.deliveryPersonId.toString() === deliveryId,
    );

    if (alreadyRequested) {
      return res.status(400).json({ message: "Already requested" });
    }

    admin.deliveryPersons.push({ deliveryPersonId: deliveryId });
    await admin.save();

    res.json({ message: "Request sent successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/showRequestedDelivery", authMiddleware, async (req, res) => {
  try {
    // console.log(req.user.id);
    const admin = await adminModel
      .findOne({ userId: req.user.id })
      .populate("deliveryPersons.deliveryPersonId");

    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    // console.log(admin);
    // console.log(admin.deliveryPersons.)
    const filterDeliveryPersons = admin.deliveryPersons.filter((person) => {
      return (
        person.deliveryPersonId !== null &&
        person.deliveryPersonId.isVerified === false
      );
    });

   // console.log(filterDeliveryPersons);
    res.json(filterDeliveryPersons); // ✅ SEND RESPONSE
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/approve-delivery/:id", authMiddleware, async (req, res) => {
  try {
    const personId = req.params.id;
    const deliveryPerson = await deliveryModel.findById(personId);

    if (!deliveryPerson) {
      return res.status(404).json({ message: "Delivery person not found" });
    }

    // You can also update status in DB here if you want:
    deliveryPerson.isVerified = true;
    await deliveryPerson.save();

    const message = `Congratulations ${deliveryPerson.deliveryPersonName}!  Your delivery account has been approved. Welcome to Fuel Indeed `;

    const whatsappLink = `https://wa.me/91${deliveryPerson.contact}?text=${encodeURIComponent(
      message,
    )}`;

    res.json({
      success: true,
      whatsappLink,
    });
  } catch (err) {
   // console.error(err);
    res.status(500).json({ message: "Something went wrong" });
  }
});

router.post("/reject-delivery/:id", authMiddleware, async (req, res) => {
  try {
    const personId = req.params.id;
    const deliveryPerson = await deliveryModel.findById(personId);

    const message = `Hello ${deliveryPerson.deliveryPersonName}, ❌ your delivery application was rejected. Please contact support for more info.`;

    const whatsappLink = `https://wa.me/91${deliveryPerson.contact}?text=${encodeURIComponent(
      message,
    )}`;

    res.json({
      success: true,
      whatsappLink,
    });
  } catch (err) {
    res.status(500).json({ message: "Something went wrong" });
  }
});

router.get("/logout", authMiddleware, adminLogout);

export default router;
