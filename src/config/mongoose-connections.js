const mongoose = require("mongoose");
const config = require("config");

const MONGO_URL = `${config.get("MONGODB_URI")}/FuelIndeed`;

mongoose
  .connect(MONGO_URL)
  .then(() => {
    // console.log("✅ MongoDB connected");
  })
  .catch((err) => {
    // console.error("❌ MongoDB error:", err);
  });

module.exports = mongoose.connection;
