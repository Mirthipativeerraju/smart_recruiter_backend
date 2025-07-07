const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const Organization = require("../models/organization");
require("dotenv").config();

const router = express.Router();

// Email transporter setup
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL,
    pass: process.env.EMAIL_PASSWORD,
  },
});

// ✅ Organization Registration (With Styled Email)
router.post("/register", async (req, res) => {
  const { fullname, email, company_name, password, confirm_password } = req.body;

  if (password !== confirm_password) {
    return res.status(400).json({ error: "Passwords do not match" });
  }

  try {
    let organization = await Organization.findOne({ email });
    if (organization) return res.status(400).json({ error: "Organization already exists" });

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate email verification token (expires in 1 hour)
    const verificationToken = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: "1h" });

    // Save organization with the verification token
    organization = new Organization({
      fullname,
      email,
      company_name,
      password: hashedPassword,
      verificationToken, // Store the token temporarily
    });

    await organization.save();

    // Generate verification link
    const verificationLink = `http://localhost:5000/api/org/verify/${verificationToken}`;

    // ✉️ Styled Email Format
    const mailOptions = {
      from: `"Company Support" <${process.env.EMAIL}>`,
      to: email,
      subject: "Verify Your Email - Complete Your Registration",
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2 style="color: #4CAF50;">Welcome to Our Platform, ${fullname}!</h2>
          <p>Thank you for registering with us. Please verify your email by clicking the button below:</p>
          <a href="${verificationLink}" style="display: inline-block; padding: 10px 20px; margin: 20px 0; font-size: 16px; color: #fff; background-color: #4CAF50; text-decoration: none; border-radius: 5px;">Verify Email</a>
          <p>If you did not sign up, you can ignore this email.</p>
          <hr>
          <p style="font-size: 12px; color: #888;">Company Name | Support Team</p>
        </div>
      `,
    };

    // Send verification email
    await transporter.sendMail(mailOptions);

    res.status(201).json({ message: "Organization registered. Check your email for verification." });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// ✅ Email Verification Route (Now Shows "Login Now" Button)
router.get("/verify/:token", async (req, res) => {
  try {
    const { token } = req.params;
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const organization = await Organization.findOne({ email: decoded.email });
    if (!organization || organization.isVerified) {
      return res.send(`
        <div style="font-family: Arial, sans-serif; text-align: center; padding: 20px;">
          <h2 style="color: red;">Invalid or Already Verified</h2>
          <p>Your email is already verified or the verification link is invalid.</p>
          <a href="http://localhost:3000/recruiter" style="display: inline-block; padding: 10px 20px; margin: 20px 0; font-size: 16px; color: #fff; background-color: #008CBA; text-decoration: none; border-radius: 5px;">Login Now</a>
        </div>
      `);
    }

    // Mark organization as verified and remove the verification token
    organization.isVerified = true;
    organization.verificationToken = null;
    await organization.save();

    // Show success message with "Login Now" button
    res.send(`
      <div style="font-family: Arial, sans-serif; text-align: center; padding: 20px;">
        <h2 style="color: #4CAF50;">Your Email is Verified! 🎉</h2>
        <p>Thank you for verifying your email. You can now log in to your account.</p>
        <a href="http://localhost:3000/recruiter" style="display: inline-block; padding: 10px 20px; margin: 20px 0; font-size: 16px; color: #fff; background-color: #008CBA; text-decoration: none; border-radius: 5px;">Login Now</a>
      </div>
    `);
  } catch (err) {
    res.send(`
      <div style="font-family: Arial, sans-serif; text-align: center; padding: 20px;">
        <h2 style="color: red;">Invalid or Expired Token</h2>
        <p>The verification link is invalid or has expired.</p>
      </div>
    `);
  }
});

// ✅ Modified Login Route (No JWT, Just Validation)
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const organization = await Organization.findOne({ email });
    if (!organization) return res.status(400).json({ error: "Invalid credentials" });
    if (!organization.isVerified) return res.status(403).json({ error: "Please verify your email before logging in" });
    const isMatch = await bcrypt.compare(password, organization.password);
    if (!isMatch) return res.status(400).json({ error: "Invalid credentials" });

    const responseData = {
      message: "Login successful!",
      fullName: organization.fullname,
      userId: organization._id,
    };
    console.log("Sending response:", responseData); // Debug log
    res.json(responseData);
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Server error" });
  }
});
module.exports = router;
