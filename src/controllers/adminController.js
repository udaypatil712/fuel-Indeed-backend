const adminModel = require("../models/adminModel");
const sendEmail = require("../utils/sendEmail");
const paymentModel = require("../models/paymentModel");
const authModel = require("../models/authModel");
const fuelStationModel = require("../models/fuelStationModel");

module.exports.completeProfile = async (req, res) => {
  // console.log("Complete profile hit");
  //   console.log(req.user.name);
  try {
    const { petrolQuantity, diselQuantity, petrolRate, dieselRate } = req.body;

    if (
      petrolQuantity === undefined ||
      diselQuantity === undefined ||
      petrolRate === undefined ||
      dieselRate === undefined
    ) {
      return res.status(400).json({ message: "All fields are required" });
    }

    await adminModel.create({
      userId: req.user.id,
      petrolRate,
      dieselRate,
      quantity: {
        petrol: petrolQuantity,
        disel: diselQuantity,
      },
    });

    req.user.isProfileCompleted = true;
    // console.log(req.user);

    res.status(201).json({
      message: "Profile completed",
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports.updateStock = async (req, res) => {
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

module.exports.adminDetails = async (req, res) => {
  try {
    const adminDetails = await adminModel.find();

    if (!adminDetails || adminDetails.length === 0) {
      return res.status(404).json({ message: "Admin not found" });
    }

    res.status(200).json(adminDetails);
  } catch (error) {
    console.error("ADMIN DETAILS ERROR:", error);
    res.status(500).json({ message: "Something went wrong" });
  }
};

module.exports.requestedStation = async (req, res) => {
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

module.exports.requestedStationShow = async (req, res) => {
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
      return s.fuelStation !== null && s.fuelStation.status === "pending";
    });
    // console.log(filteredStations);
    res.json(filteredStations);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports.paymentStation = async (req, res) => {
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

    // console.log(station);
    res.json({
      station: station,
      ownerEmail: stationOwener.email,
    });
  } catch (error) {
    return res.json({ message: error.message });
  }
};

module.exports.paymentRequest = async (req, res) => {
  console.log(req.user.email);
  try {
    const adminId = req.params.id;
    const {
      stationId,
      updatedQuantityOfPetrol,
      updatedQuantityOfDiesel,
      stationOwnerEmail,
      petrolQty,
      dieselQty,
      petrolRate,
      dieselRate,
      totalAmount,
    } = req.body;

    // console.log(
    //   stationId,
    //   updatedQuantityOfPetrol,
    //   updatedQuantityOfDiesel,
    //   stationOwnerEmail,
    //   petrolQty,
    //   dieselQty,
    //   petrolRate,
    //   dieselRate,
    //   totalAmount
    // );

    if (
      !stationOwnerEmail ||
      updatedQuantityOfPetrol === undefined ||
      updatedQuantityOfDiesel === undefined
    ) {
      return res.status(400).json({ message: "Both quantities are required" });
    }

    const admin = await adminModel.findByIdAndUpdate(
      adminId,
      {
        $set: {
          "quantity.petrol": updatedQuantityOfPetrol,
          "quantity.disel": updatedQuantityOfDiesel, // keep spelling as per your schema
        },
      },
      { new: true },
    );
    // console.log(admin);
    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    const payment = await paymentModel.create({
      stationId,
      ownerId: adminId,
      petrolQty,
      dieselQty,
      amount: totalAmount,
      status: "pending",
    });

    const approveLink = `http://localhost:3002/admin/approve-payment/${payment._id}`;
    console.log("hiiii");
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

    // admin.stationDetails = admin.stationDetails.filter(
    //   (station) => station.fuelStation.toString() !== stationId
    // );

    // await admin.save();
    // console.log("byee");
    res.json(admin.quantity);
  } catch (error) {
    res.json({ message: error.message });
  }
};

module.exports.paymentApproval = async (req, res) => {
  try {
    const paymentId = req.params.paymentId;
    // console.log(paymentId);
    const payment = await paymentModel.findById(paymentId);

    if (!payment) {
      return res.send("<h1>Invalid payment link ❌</h1>");
    }

    if (payment.status === "approved") {
      return res.send("<h1>Payment already approved ✅</h1>");
    }
    // console.log(payment);
    payment.status = "approved";
    payment.approvedAt = new Date();
    await payment.save();

    const stationId = payment.stationId.toString();

    const station = await fuelStationModel.findById(stationId);

    station.status = "approved";
    await station.save();

    res.send(`
      <h1>✅ Payment Approved Successfully</h1>
      <p>You can close this window.</p>
    `);
  } catch (err) {
    res.send("<h1>Something went wrong</h1>");
  }
};

module.exports.adminLogout = (req, res) => {
  res.clearCookie("token", { httpOnly: true, sameSite: "lax" });
  res.json({ message: `${req.user.role} your successfully logout` });
};
