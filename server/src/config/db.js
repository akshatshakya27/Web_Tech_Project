const mongoose = require("mongoose");

const connectDB = async (mongoUri) => {
  if (!mongoUri) {
    throw new Error("MONGODB_URI is missing. Add it to your .env file.");
  }

  await mongoose.connect(mongoUri);
  console.log("MongoDB connected successfully");
};

module.exports = connectDB;
