import express from "express";
import crypto from "crypto";
const router = express.Router();

// Middleware
import authMiddleware from "../middlewares/authMiddleware.js";

// Config
import upload from "../../config/multer-config.js";

// Controllers
import {
  allStations,
  completeProfile,
  stationImage,
  updateStation,
  deleteStation,
  searchStation,
  stationLogout,
} from "../controllers/fuelStationController.js";

// Models
import bookingModel from "../models/fuelBookingModel.js";
import authModel from "../models/authModel.js";
import deliveryModel from "../models/deliveryModel.js";
import userModel from "../models/userModel.js";
import fuelStationModel from "../models/fuelStationModel.js";
import speedFuelBookingModel from "../models/speedFuelBookingModel.js";

// Utils
import { getRazorpayInstance } from "../utils/razorpay.js";

// (Optional) If you really need mongoose Query
import { Query } from "mongoose";

router.get("/allStations", authMiddleware, allStations);

router.post(
  "/complete-profile",
  authMiddleware,
  upload.single("image"),
  completeProfile,
);

router.get("/image/:id", authMiddleware, stationImage);

router.patch(
  "/updateDetails/:id",
  authMiddleware,
  upload.single("image"),
  updateStation,
);

router.delete("/deleteStation/:stationId", authMiddleware, deleteStation);

router.get("/searchStation", authMiddleware, searchStation);

router.get("/assignDelivery/:id", authMiddleware, async (req, res) => {
  try {
    const stationId = req.params.id;

    // ✅ Get all bookings of this station
    const bookings = await bookingModel.find({
      stationId,
      status: "confirmed",
    });

    // ✅ Convert each booking to UI-friendly object
    const result = await Promise.all(
      bookings.map(async (booking) => {
        const user = await authModel.findById(booking.userId);

        return {
          bookingId: booking._id,
          userName: user?.name || "Unknown",
          fuelType: booking.fuelType,
          fuelQty: booking.litres,
          totalAmount: booking.total,
          lat: booking.deliveryLocation.lat,
          lng: booking.deliveryLocation.lng,
          address: booking.deliveryLocation.address,
          status: booking.status,
        };
      }),
    );

    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
});

router.get(
  "/assignToDeliveryPerson/:bookingId",
  authMiddleware,
  async (req, res) => {
    try {
      const { bookingId } = req.params;

      // 1️⃣ Get the booking
      const booking = await bookingModel.findById(bookingId);

      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }

      // 2️⃣ Get the station
      const station = await fuelStationModel.findById(booking.stationId);

      if (!station) {
        return res.status(404).json({ message: "Station not found" });
      }

      // 3️⃣ Station coordinates
      const [lng, lat] = station.location.coordinates;

      // 4️⃣ Find nearby delivery persons
      const nearbyDelivery = await deliveryModel.aggregate([
        {
          $geoNear: {
            near: {
              type: "Point",
              coordinates: [lng, lat],
            },
            distanceField: "distance",
            spherical: true,
            query: { status: "available", isVerified: true },
          },
        },
        { $sort: { distance: 1 } },
      ]);

      // 5️⃣ User location from booking
      const userLat = booking.deliveryLocation.lat;
      const userLng = booking.deliveryLocation.lng;

      // 6️⃣ Send response
      res.json({
        nearbyDelivery,
        stationLat: lat,
        stationLng: lng,
        userLat,
        userLng,
        bookingId: booking._id,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  },
);

router.post("/assignOrder/:personId", authMiddleware, async (req, res) => {
  try {
    const { personId } = req.params;
    const { bookingId } = req.body;

    // 1️⃣ Get booking
    const booking = await bookingModel.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    // 2️⃣ Get related data
    const userData = await authModel.findById(booking.userId);
    const profileData = await userModel.findById(booking.profileId);
    const station = await fuelStationModel.findById(booking.stationId);
    const deliveryPerson = await deliveryModel.findById(personId);

    if (!deliveryPerson) {
      return res.status(404).json({ message: "Delivery person not found" });
    }

    // 3️⃣ Assign booking to delivery person ✅
    booking.deliveryId = personId;
    booking.status = "out_for_delivery";
    await booking.save();

    // 4️⃣ Update delivery person status
    deliveryPerson.status = "busy";
    await deliveryPerson.save();

    // 5️⃣ Decrease notification count
    if (station.notificationsCount > 0) {
      station.notificationsCount -= 1;
      await station.save();
    }

    // 6️⃣ Create map links
    const stationLat = station.location.coordinates[1];
    const stationLng = station.location.coordinates[0];
    const userLat = booking.deliveryLocation.lat;
    const userLng = booking.deliveryLocation.lng;

    const stationMapLink = `https://www.google.com/maps?q=${stationLat},${stationLng}`;
    const userMapLink = `https://www.google.com/maps?q=${userLat},${userLng}`;

    //  WhatsApp message
    const message = `
 *New Fuel Delivery Assigned*

 *Station Details*
Name: ${station.stationName}
Contact: ${station.contact}
Location: ${stationMapLink}

 *Order Details*
Fuel Type: ${booking.fuelType}
Quantity: ${booking.litres} Litres
 Amount to Collect: ₹${booking.total}

 *Customer Details*
Name: ${userData.name}
Contact: ${profileData.contact}
Location: ${userMapLink}

 *Instructions*
Please collect fuel from station and deliver it to the customer.
Collect ₹${booking.total} from the customer after delivery.

 Drive safe!
`.trim();

    const phone = deliveryPerson.contact; // must include country code
    const whatsappLink = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

    // 8️⃣ Send response
    res.json({
      success: true,
      whatsappLink,
      bookingId: booking._id,
      deliveryPersonId: deliveryPerson._id,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/showDeliveryPersons", authMiddleware, async (req, res) => {
  try {
    const deliveryPersons = await deliveryModel.find({ isVerified: true });

    res.json(deliveryPersons);
  } catch (error) {
    res.json({ message: error.message });
  }
});

router.get("/showPayment", authMiddleware, async (req, res) => {
  const {
    userId,
    name,
    phone,
    address,
    fuelType,
    quantity,
    latitude,
    longitude,
  } = req.query;

  console.log(name, phone, address, fuelType, quantity, latitude, longitude);

  //this will give me from that particular customer near by station
  const station = await fuelStationModel.aggregate([
    {
      $geoNear: {
        near: {
          type: "Point",
          coordinates: [parseFloat(longitude), parseFloat(latitude)], // 👈 USER CURRENT LOCATION
        },
        distanceField: "distance", // 👈 auto calculated
        spherical: true,
        query: { status: "approved" }, // fuelStation status
      },
    },
    {
      $sort: {
        // stationName: 1,
        // address: 1,
        distance: 1, // 👈 only distance
      },
    },
  ]);

  const stations = await fuelStationModel.find({ status: "approved" });
  const finalResult = [];

  for (const station of stations) {
    const nearbyDelivery = await deliveryModel.aggregate([
      {
        $geoNear: {
          near: station.location, // ✅ literal value now
          distanceField: "distance",
          spherical: true,
          // maxDistance: 5000,
          query: { status: "available" },
        },
      },
      { $sort: { distance: 1 } },
      { $limit: 5 },
    ]);

    finalResult.push({
      ...station.toObject(),
      nearbyDeliveryPersons: nearbyDelivery,
    });
  }

  let arr = [];

  for (let i = 0; i < station.length; i++) {
    for (let j = 0; j < finalResult.length; j++) {
      if (station[i]._id.toString() === finalResult[j]._id.toString()) {
        // 🚫 Skip if no AVAILABLE delivery person
        if (
          !finalResult[j].nearbyDeliveryPersons ||
          finalResult[j].nearbyDeliveryPersons.length === 0
        ) {
          continue;
        }

        const nearestDeliveryPerson = finalResult[j].nearbyDeliveryPersons[0];

        let distanceFromCustomerToStation = (
          station[i].distance / 1000
        ).toFixed(2);

        let distanceFromStationToDelivery = (
          nearestDeliveryPerson.distance / 1000
        ).toFixed(2);

        let sum =
          Number(distanceFromCustomerToStation) +
          Number(distanceFromStationToDelivery);

        arr.push({
          sum,
          stationId: finalResult[j]._id.toString(),
          deliveryId: nearestDeliveryPerson._id.toString(), // ✅ guaranteed AVAILABLE
        });
      }
    }
  }
  if (arr.length === 0) {
    return res.status(404).json({
      message: "No available delivery persons found near any station",
    });
  }
  arr.sort((a, b) => a.sum - b.sum);
  console.log(arr);
  let minDistance = arr[0];
  console.log(minDistance);

  const nearBystation = await fuelStationModel.findById(minDistance.stationId);

  let totalAmount = 0;
  let fuelRate = 0;
  if (fuelType.trim() === "petrol") {
    totalAmount = (nearBystation.petrolRate + 20) * quantity;
    fuelRate = nearBystation.petrolRate;
    // nearBystation.petrolQty -= quantity;
  } else {
    totalAmount = (nearBystation.dieselRate + 20) * quantity;
    fuelRate = nearBystation.dieselRate;
    // nearBystation.dieselQty -= quantity;
  }

  // totalAmount = totalAmount + Math.floor(fuelRate * 0.2);
  let speedCharges = Math.floor(fuelRate * 0.2);
  // await nearBystation.save();

  const resultObj = {
    userId,
    stationId: minDistance.stationId,
    deliveryId: minDistance.deliveryId,
    fuelType,
    fuelRate,
    quantity,
    speedCharges,
    totalAmount,
  };

  // console.log(nearBystation.petrolQty);

  res.json(resultObj);
});

router.post("/showQRCode", authMiddleware, async (req, res) => {
  const {
    userId,
    userName,
    fuelQty,
    stationId,
    deliveryId,
    fuelRate,
    fuelType,
    totalAmount,
    // paymentMethod,
    latitude,
    longitude,
  } = req.body; // user location

  // console.log(
  //   userId,
  //   userName,
  //   fuelQty,
  //   stationId,
  //   deliveryId,
  //   fuelRate,
  //   fuelType,
  //   totalAmount,
  //   paymentMethod,
  //   latitude,
  //   longitude,
  // );

  const speedDeliveryBooking = await speedFuelBookingModel.create({
    userId,
    userName,
    fuelQty,
    stationId,
    deliveryId,
    fuelRate,
    fuelType,
    totalAmount,
    paymentStatus: "pending",
    payment: "online",
    latitude,
    longitude,
  });
  const razorpay = getRazorpayInstance();
  const paymentLink = await razorpay.paymentLink.create({
    amount: totalAmount * 100, // paise
    currency: "INR",
    description: "Fuel Indeed Speed Delivery",
    customer: {
      name: userName,
      contact: "9552515170",
    },
    notify: {
      sms: false,
      email: false,
    },
    callback_url:
      "https://fuel-indeed-backend.onrender.com/fuelStation/razorpay-webhook",
    callback_method: "get",
  });

  speedDeliveryBooking.razorpayPaymentLinkId = paymentLink.id;
  await speedDeliveryBooking.save();

  res.json({
    success: true,
    paymentUrl: paymentLink.short_url, // 👈 FOR QR
    bookingId: speedDeliveryBooking._id,
  });
});

router.post("/razorpay-webhook", async (req, res) => {
  console.log("🔥 WEBHOOK HIT");

  try {
    const event = req.body.event;
    console.log("EVENT:", event);

    // Only handle payment_link.paid
    if (event !== "payment_link.paid") {
      return res.json({ status: "ignored" });
    }

    const paymentLinkId = req.body?.payload?.payment_link?.entity?.id;

    if (!paymentLinkId) {
      console.log("❌ Missing paymentLinkId");
      return res.status(400).json({ error: "Invalid payload" });
    }

    console.log("PaymentLinkId:", paymentLinkId);

    // Find booking
    const booking = await speedFuelBookingModel.findOne({
      razorpayPaymentLinkId: paymentLinkId,
    });

    if (!booking) {
      console.log("⚠️ BOOKING NOT FOUND");
      return res.json({ status: "ok" });
    }

    // Idempotency
    if (booking.paymentStatus === "paid") {
      console.log("ℹ️ Already processed");
      return res.json({ status: "already processed" });
    }

    // ==========================
    // Signature Verification
    // ==========================

    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!secret) {
      console.error("❌ Missing RAZORPAY_WEBHOOK_SECRET");
      return res.status(500).send("Server config error");
    }

    const razorpaySignature = req.headers["x-razorpay-signature"];

    const generatedSignature = crypto
      .createHmac("sha256", secret)
      .update(req.rawBody)
      .digest("hex");

    if (generatedSignature !== razorpaySignature) {
      console.log("❌ SIGNATURE MISMATCH");
      return res.status(400).send("Invalid signature");
    }

    console.log("✅ SIGNATURE VERIFIED");

    // ==========================
    // Update Booking
    // ==========================

    booking.paymentStatus = "paid";
    booking.status = "processing";
    await booking.save();

    // Update fuel stock
    const fuelStation = await fuelStationModel.findById(booking.stationId);

    if (fuelStation) {
      if (booking.fuelType.toLowerCase() === "petrol") {
        fuelStation.petrolQty -= booking.fuelQty;
      } else if (booking.fuelType.toLowerCase() === "diesel") {
        fuelStation.dieselQty -= booking.fuelQty;
      }

      fuelStation.speedDeliveryCount += 1;
      await fuelStation.save();
    }

    // Assign delivery
    const deliveryPerson = await deliveryModel.findById(booking.deliveryId);

    if (deliveryPerson) {
      deliveryPerson.status = "busy";
      await deliveryPerson.save();
    }

    booking.status = "out_for_delivery";
    await booking.save();

    console.log("✅ PAYMENT VERIFIED & DELIVERY ASSIGNED");

    res.json({ status: "success" });
  } catch (err) {
    console.error("❌ WEBHOOK ERROR:", err);
    res.status(500).json({ error: "Webhook processing failed" });
  }
});

router.post("/fastDelivery", authMiddleware, async (req, res) => {
  const {
    userId,
    userName,
    fuelQty,
    stationId,
    deliveryId,
    fuelRate,
    fuelType,
    totalAmount,
    latitude,
    longitude,
  } = req.body; // user location

  console.log(
    userId,
    userName,
    fuelQty,
    stationId,
    deliveryId,
    fuelRate,
    fuelType,
    totalAmount,
    latitude,
    longitude,
  );

  const deliveryStation = await fuelStationModel.findById(stationId);

  if (!deliveryStation) {
    return res.status(404).json({ message: "fuel station is not found" });
  }

  if (fuelType.trim().toLowerCase() === "petrol") {
    console.log("petrol");
    deliveryStation.petrolQty -= fuelQty;
  } else if (fuelType.trim().toLowerCase() === "diesel") {
    console.log("diesel");
    deliveryStation.dieselQty -= fuelQty;
  }

  deliveryStation.speedDeliveryCount += 1;

  await deliveryStation.save();
  console.log(deliveryStation.dieselQty);

  const deliveryPerson = await deliveryModel.findById(deliveryId);

  deliveryPerson.status = "busy";
  await deliveryPerson.save();
  // console.log(deliveryPerson);

  const speedDeliveryBooking = await speedFuelBookingModel.create({
    userId,
    userName,
    fuelQty,
    stationId,
    deliveryId,
    fuelRate,
    fuelType,
    totalAmount,
    paymentStatus: "paid",
    payment: "offline",
    latitude,
    longitude,
  });
  res.json({ success: true, message: "Your Order Successfully Confirmed" });
});

router.get("/assignSpeedOrder/:stationId", authMiddleware, async (req, res) => {
  try {
    const { stationId } = req.params;

    // console.log("Station ID:", stationId);

    // ✅ Get ALL speed bookings of this station
    const speedFuelBookings = await speedFuelBookingModel.find({
      stationId: stationId,
      status: "confirmed",
    });

    if (speedFuelBookings.length === 0) {
      return res.json({
        message: "No speed delivery bookings for this station",
        bookings: [],
      });
    }

    console.log(speedFuelBookings.length);
    // console.log(speedFuelBookings);
    res.json({
      success: true,
      count: speedFuelBookings.length,
      bookings: speedFuelBookings,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

router.post(
  "/assignSpeedOrderToDeliveryPerson/:bookingId",
  authMiddleware,
  async (req, res) => {
    try {
      const { bookingId } = req.params;

      // 1️⃣ Get speed booking
      const bookingSpeed = await speedFuelBookingModel.findById(bookingId);

      if (!bookingSpeed) {
        return res.status(404).json({ message: "Booking not found" });
      }

      // 2️⃣ Get station
      const station = await fuelStationModel.findById(
        bookingSpeed.stationId.toString(),
      );

      if (!station) {
        return res.status(404).json({ message: "Station not found" });
      }

      // 3️⃣ Get delivery person
      const deliveryPerson = await deliveryModel.findById(
        bookingSpeed.deliveryId.toString(),
      );

      if (!deliveryPerson) {
        return res.status(404).json({ message: "Delivery person not found" });
      }

      // 4️⃣ Coordinates
      const stationLng = station.location.coordinates[0];
      const stationLat = station.location.coordinates[1];

      const userLat = bookingSpeed.latitude;
      const userLng = bookingSpeed.longitude;

      // 5️⃣ Google Maps links
      const stationMapLink = `https://www.google.com/maps?q=${stationLat},${stationLng}`;
      const userMapLink = `https://www.google.com/maps?q=${userLat},${userLng}`;

      // 6️⃣ WhatsApp message
      const message = `
 *NEW SPEED FUEL DELIVERY ASSIGNED* 

━━━━━━━━━━━━━━━━━━━━
 *STATION DETAILS*
━━━━━━━━━━━━━━━━━━━━
Name: ${station.stationName}
Contact: ${station.contact}
 Location: ${stationMapLink}

━━━━━━━━━━━━━━━━━━━━
 *ORDER DETAILS*
━━━━━━━━━━━━━━━━━━━━
Fuel Type: ${bookingSpeed.fuelType}
Quantity: ${bookingSpeed.fuelQty} Litres
 Total Bill: ₹${bookingSpeed.totalAmount}

━━━━━━━━━━━━━━━━━━━━
 *CUSTOMER DETAILS*
━━━━━━━━━━━━━━━━━━━━
Name: ${bookingSpeed.userName}
 Location: ${userMapLink}

━━━━━━━━━━━━━━━━━━━━
 *INSTRUCTIONS*
━━━━━━━━━━━━━━━━━━━━
1 Go to station and collect fuel  
2 Deliver to customer location  
3 Collect ₹${bookingSpeed.totalAmount} from customer  
4 Confirm delivery after completion  

 *Drive safe & thank you!*
`.trim();

      // 7️⃣ WhatsApp link
      const phone = deliveryPerson.contact; // must include country code e.g. 91xxxxxxxxxx

      const whatsappLink = `https://wa.me/${phone}?text=${encodeURIComponent(
        message,
      )}`;

      // 8️⃣ Update statuses (optional but recommended)

      station.speedDeliveryCount -= 1;
      await station.save();

      bookingSpeed.status = "out_for_delivery";
      await bookingSpeed.save();

      deliveryPerson.status = "busy";
      await deliveryPerson.save();

      // 9️⃣ Send response
      res.json({
        success: true,
        whatsappLink,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  },
);

router.get("/logout", authMiddleware, stationLogout);

export default router;
