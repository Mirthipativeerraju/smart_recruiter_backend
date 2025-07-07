const mongoose = require("mongoose");

const adminSchema = new mongoose.Schema({
  fullname: String,
  email: { type: String, unique: true },
  company_name: String,
  password: String,
  isVerified: { type: Boolean, default: false }, // New field for verification
  verificationToken: String, // Store the verification token
});

module.exports = mongoose.model("Admin", adminSchema);
