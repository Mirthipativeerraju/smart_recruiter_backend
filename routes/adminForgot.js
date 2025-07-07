const express = require("express");
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const Admin = require("../models/organization"); // Replace with your Admin model
const router = express.Router();

let tempOtp = ""; // Temporarily store OTP (Consider Redis or a DB for production)

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL,
    pass: process.env.EMAIL_PASSWORD,
  },
});

// Endpoint to check if the admin email exists and send OTP
router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;

  try {
    // Check if the email exists in the Admin collection
    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(404).json({ error: "Admin email not found" });
    }

    // Generate OTP
    const otp = Math.floor(1000 + Math.random() * 9000);
    tempOtp = otp; // Store OTP temporarily (use a more secure method in production)

    // Send OTP to the provided email address
    const mailOptions = {
      from: process.env.EMAIL,
      to: email,
      subject: "Admin Password Reset OTP",
      text: `Your OTP to reset your admin password is: ${otp}`,
    };

    await transporter.sendMail(mailOptions);
    return res.status(200).json({ message: "OTP sent to your email" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Error sending OTP" });
  }
});

// Endpoint to verify OTP
router.post("/verify-otp", (req, res) => {
  const { otp } = req.body;

  if (otp !== tempOtp.toString()) {
    return res.status(400).json({ error: "Invalid OTP" });
  }

  // OTP verified successfully
  return res.status(200).json({ message: "OTP verified successfully" });
});

// Endpoint to update the admin password
router.post("/update-password", async (req, res) => {
  const { email, newPassword } = req.body;

  try {
    // Check if the email exists in the Admin collection
    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(404).json({ error: "Admin email not found" });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update the password in the database
    admin.password = hashedPassword;
    await admin.save();

    return res.status(200).json({ message: "Password updated successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Error updating password" });
  }
});

module.exports = router;