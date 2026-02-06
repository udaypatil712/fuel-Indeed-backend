// Models
import adminModel from "../models/adminModel.js";
import paymentModel from "../models/paymentModel.js";
import authModel from "../models/authModel.js";
import fuelStationModel from "../models/fuelStationModel.js";
import mongoose from "mongoose";
// Utils
import sendEmail from "../utils/sendEmail.js";

export const completeProfile = async (req, res) => {
  try {
    const { petrolQuantity, diselQuantity, petrolRate, dieselRate } = req.body;

    if (
      petrolQuantity == null ||
      diselQuantity == null ||
      petrolRate == null ||
      dieselRate == null
    ) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // 1️⃣ Save admin fuel data
    await adminModel.create({
      userId: req.user.id,
      petrolRate,
      dieselRate,
      quantity: {
        petrol: petrolQuantity,
        disel: diselQuantity,
      },
    });

    // 2️⃣ Update user profile in DB ✅
    await authModel.findByIdAndUpdate(
      req.user.id,
      { isProfileCompleted: true },
      { new: true },
    );

    res.status(201).json({
      success: true,
      message: "Profile completed successfully",
    });
  } catch (error) {
    // console.error("Complete profile error:", error);

    res.status(500).json({
      message: "Server error",
    });
  }
};

export const updateStock = async (req, res) => {
  try {
    const { petrolQty, dieselQty, petrolRate, dieselRate } = req.body;

    if (
      petrolQty === undefined ||
      dieselQty === undefined ||
      petrolRate === undefined ||
      dieselRate === undefined
    ) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const admin = await adminModel.findOneAndUpdate(
      {}, // assuming only one admin document
      {
        $inc: {
          "quantity.petrol": Number(petrolQty), // ✅ ADD to old stock
          "quantity.disel": Number(dieselQty), // ✅ ADD to old stock
        },
        $set: {
          petrolRate: Number(petrolRate), // ✅ Update rate
          dieselRate: Number(dieselRate), // ✅ Update rate
        },
      },
      { new: true },
    );

    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    res.json({
      message: "Stock updated successfully",
      admin,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const adminDetails = async (req, res) => {
  try {
    const adminDetails = await adminModel.find();

    if (!adminDetails || adminDetails.length === 0) {
      return res.status(404).json({ message: "Admin not found" });
    }

    res.status(200).json(adminDetails);
  } catch (error) {
    // console.error("ADMIN DETAILS ERROR:", error);
    res.status(500).json({ message: "Something went wrong" });
  }
};

export const requestedStation = async (req, res) => {
  try {
    const stationId = req.params.id;
    // let emailId = req.user.email;

    if (req.user.role !== "fuelStation") {
      return res
        .status(403)
        .json({ message: "Only fuel station can send request" });
    }

    //  Find MAIN ADMIN (assuming only one admin exists)
    const admin = await adminModel.findOne();

    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    //  Prevent duplicate request
    const alreadyRequested = admin.stationDetails.some(
      (s) => s.fuelStation.toString() === stationId,
    );

    if (alreadyRequested) {
      return res.status(400).json({ message: "Already requested" });
    }

    // ✅ Push station id into admin
    admin.stationDetails.push({ fuelStation: stationId });

    await admin.save();

    res.status(200).json({ message: "Request sent to admin successfully" });
  } catch (error) {
    // console.error(error);
    res.status(500).json({ message: "Something went wrong" });
  }
};

export const requestedStationShow = async (req, res) => {
  try {
    const admin = await adminModel
      .findOne({ userId: req.user.id })
      .populate("stationDetails.fuelStation");

    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }
    // console.log(JSON.stringify(admin.stationDetails, null, 2));

    // ❗ Filter ONLY FOR RESPONSE — DO NOT SAVE
    const filteredStations = admin.stationDetails.filter((s) => {
      return s.fuelStation !== null;
    });
    // console.log("line 164", filteredStations);
    res.json(filteredStations);
  } catch (err) {
    //  console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

export const paymentStation = async (req, res) => {
  try {
    const stationId = req.params.id;

    const station = await fuelStationModel.findById(stationId);

    if (!station) {
      return res.json({ message: "station is not found" });
    }
    // console.log(station.ownerId.toString());
    const stationOwnerId = station.ownerId.toString();

    const stationOwener = await authModel.findById(stationOwnerId);

    // console.log(stationOwener.email);

    //console.log("line 188", station);
    res.json({
      station: station,
      ownerEmail: stationOwener.email,
    });
  } catch (error) {
    return res.json({ message: error.message });
  }
};

export const paymentRequest = async (req, res) => {
  try {
    const adminId = req.params.id;

    const {
      stationId,
      // updatedQuantityOfPetrol,
      // updatedQuantityOfDiesel,
      stationOwnerEmail,
      petrolQty,
      dieselQty,
      petrolRate,
      dieselRate,
      totalAmount,
    } = req.body;

    // console.log(
    //   "line 214",
    //   stationId,
    //   // updatedQuantityOfPetrol,
    //   // updatedQuantityOfDiesel,
    //   stationOwnerEmail,
    //   petrolQty,
    //   dieselQty,
    //   petrolRate,
    //   dieselRate,
    //   totalAmount,
    // );

    const checkFuelAdmin = await adminModel.findById(adminId);

    if (
      checkFuelAdmin.quantity.petrol < petrolQty ||
      checkFuelAdmin.quantity.disel < dieselQty
    ) {
      return res.status(404).json({ message: "Fuel is not Available" });
    }

    // ================= VALIDATION =================
    if (!stationId || !stationOwnerEmail || !totalAmount) {
      return res.status(400).json({
        message: "Missing required fields",
      });
    }

    // ================= UPDATE ADMIN =================
    const admin = await adminModel.findByIdAndUpdate(
      adminId,
      {
        // $set: {
        //   "quantity.petrol": updatedQuantityOfPetrol,
        //   "quantity.disel": updatedQuantityOfDiesel, // keep schema spelling
        // },

        // Remove station in same query
        $pull: {
          stationDetails: {
            fuelStation: new mongoose.Types.ObjectId(stationId),
          },
        },
      },
      { new: true },
    );

    if (!admin) {
      return res.status(404).json({
        message: "Admin not found",
      });
    }

    // ================= CREATE PAYMENT =================
    const payment = await paymentModel.create({
      stationId,
      ownerId: adminId,
      petrolQty,
      dieselQty,
      amount: totalAmount,
      status: "pending",
    });

    // ================= EMAIL LINK =================
    const approveLink = `https://fuel-indeed-backend.onrender.com/admin/approve-payment/${payment._id}`;

    // ================= SEND EMAIL =================
    await sendEmail(
      stationOwnerEmail,
      "Fuel Purchase Approval - Fuel Indeed",
      `
      <h2>⛽ Fuel Purchase Approval Required</h2>

      <p><b>Petrol:</b> ${petrolQty} L @ ₹${petrolRate}</p>
      <p><b>Diesel:</b> ${dieselQty} L @ ₹${dieselRate}</p>

      <h3>Total Amount: ₹${totalAmount}</h3>

      <br/>

      <a href="${approveLink}"
         style="
           padding:12px 20px;
           background:#22c55e;
           color:white;
           text-decoration:none;
           border-radius:6px;
           font-weight:bold;
           display:inline-block;
         ">
        ✅ Approve Payment
      </a>

      <p>If you did not request this, ignore this email.</p>
      `,
    );

    // ================= RESPONSE =================
    return res.status(200).json({
      success: true,
      quantity: admin.quantity,
      paymentId: payment._id,
      message: "Payment request sent successfully",
    });
  } catch (error) {
    //  console.error("Payment Request Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

export const paymentApproval = async (req, res) => {
  try {
    const { paymentId } = req.params;

    //console.log("Payment ID:", paymentId);

    // ================= FIND PAYMENT =================
    const payment = await paymentModel.findById(paymentId);

    if (!payment) {
      return res.send("<h1>Invalid payment link ❌</h1>");
    }

    if (payment.status === "approved") {
      return res.send("<h1>Payment already approved ✅</h1>");
    }

    // ================= UPDATE PAYMENT =================
    payment.status = "approved";
    payment.approvedAt = new Date();
    await payment.save();

    // ================= FIND ADMIN =================
    const admin = await adminModel.findById(payment.ownerId);

    if (!admin) {
      return res.send("<h1>Admin not found ❌</h1>");
    }

    // ================= UPDATE QUANTITY =================
    admin.quantity.petrol -= payment.petrolQty;
    admin.quantity.disel -= payment.dieselQty;

    await admin.save();

    // ================= FIND STATION =================
    const station = await fuelStationModel.findById(payment.stationId);

    if (!station) {
      return res.send("<h1>Station not found ❌</h1>");
    }

    station.status = "approved";
    await station.save();

    // ================= SUCCESS =================
    return res.send(`
      <h1>✅ Payment Approved Successfully</h1>
      <p>You can close this window.</p>
    `);
  } catch (err) {
    // console.error("Payment Approval Error:", err);

    return res.send("<h1>Something went wrong ❌</h1>");
  }
};

export const adminLogout = (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    path: "/",
  });

  res.json({ message: `${req.user.role} your successfully logout` });
};
