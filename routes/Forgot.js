const express = require("express");
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const User = require("../models/User");
const router = express.Router();

let tempOtp = ""; // Temporarily store OTP for validation (Consider using a more permanent solution)

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL,
    pass: process.env.EMAIL_PASSWORD,
  },
});

// Endpoint to check if the email exists and send OTP
router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;

  try {
    // Check if the email exists in the database
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: "Email not found in the database" });
    }

    // Generate OTP
    const otp = Math.floor(1000 + Math.random() * 9000);
    tempOtp = otp; // Store OTP temporarily for verification

    // Send OTP to the provided email address
    const mailOptions = {
      from: process.env.EMAIL,
      to: email,
      subject: "Password Reset OTP",
      text: `Your OTP to reset your password is: ${otp}`,
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
  
  // Endpoint to update the password in the database
  router.post("/update-password", async (req, res) => {
    const { email, newPassword } = req.body;
  
    try {
      // Check if the email exists
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(404).json({ error: "Email not found in the database" });
      }
  
      // Hash the new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);
  
      // Update the password in the database
      user.password = hashedPassword;
      await user.save();
  
      return res.status(200).json({ message: "Password updated successfully" });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Error updating password" });
    }
  });
  
module.exports = router;
