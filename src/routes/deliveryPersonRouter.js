import express from "express";

// Models
import DeliveryPerson from "../models/deliveryModel.js";
import Auth from "../models/authModel.js";
import fuelStationModel from "../models/fuelStationModel.js";
import adminModel from "../models/adminModel.js";

// Middleware
import authMiddleware from "../middlewares/authMiddleware.js";

// Config
import upload from "../../config/multer-config.js";

const router = express.Router();

router.post(
  "/completeProfile",
  authMiddleware,
  upload.single("image"),
  async (req, res) => {
    try {
      const { city, contact, address, pincode, lat, lng } = req.body;

      console.log(city, contact, address, pincode, lat, lng);
      const delivery = await DeliveryPerson.create({
        deliveryPersonId: req.user.id,
        deliveryPersonName: req.user.name,
        city,
        contact,
        address,
        pincode,
        image: {
          data: req.file.buffer,
          contentType: req.file.mimetype,
        },
        location: {
          type: "Point",
          coordinates: [parseFloat(lng), parseFloat(lat)],
        },
      });

      await Auth.findByIdAndUpdate(req.user.id, {
        isProfileCompleted: true,
        // deliveryPersonId: delivery._id, // optional but useful
      });

      res.json({ success: true, message: "Profile completed successfully" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Server error" });
    }
  },
);

router.patch(
  "/updateProfile",
  authMiddleware,
  upload.single("image"),
  async (req, res) => {
    try {
      const { city, contact, address, pincode } = req.body;

      const updateData = {
        city,
        contact,
        address,
        pincode,
      };

      // ✅ Only update image if new image uploaded
      if (req.file) {
        updateData.image = {
          data: req.file.buffer,
          contentType: req.file.mimetype,
        };
      }

      const delivery = await DeliveryPerson.findOneAndUpdate(
        { deliveryPersonId: req.user.id }, // 🔥 IMPORTANT
        updateData,
        { new: true },
      );

      if (!delivery) {
        return res.status(404).json({
          success: false,
          message: "Delivery profile not found",
        });
      }

      res.json({
        success: true,
        message: "Profile updated successfully",
        delivery,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Server error" });
    }
  },
);

router.get("/myProfile", authMiddleware, async (req, res) => {
  try {
    // const deliveryPersonName = req.query.deliveryPersonName;
    // console.log(deliveryPersonName);
    const profile = await DeliveryPerson.findOne({
      deliveryPersonId: req.user.id,
    });

    if (!profile) {
      return res.status(404).json({ message: "Profile not found" });
    }

    res.json(profile);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/image/:id", authMiddleware, async (req, res) => {
  const personId = req.params.id;
  // console.log(personId);
  const deliveryData = await DeliveryPerson.findById(personId);
  if (!deliveryData || !deliveryData.image?.data) {
    return res.send("Image not Found");
  }
  res.set("Content-Type", deliveryData.image.contentType);
  res.send(deliveryData.image?.data);
});

// router.post("/approvalRequest/:id", authMiddleware, async (req, res) => {
//   const deliveryId = req.params.id;
//   // console.log(deliveryId);

//   const admin = await adminModel.findOne();

//   if (!admin) {
//     return res.json({ message: "admin is not found" });
//   }

//   const alreadyRequested = admin.deliveryPersons.some(
//     (person) => person.deliveryPersonId.toString() === deliveryId,
//   );

//   if (alreadyRequested) {
//     return res.json({ message: "already Requested.." });
//   }
//   admin.deliveryPersons.push({ deliveryPersonId: deliveryId });
//   await admin.save();
//   res.json({ message: "Request send successfully" });
//   // console.log("successfully done");
// });

router.get("/logout", authMiddleware, async (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    path: "/",
  });

  res.json({ message: `${req.user.role} your successfully logout` });
});

export default router;
