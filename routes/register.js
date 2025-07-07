const express = require("express");
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const User = require("../models/User");
const router = express.Router();

let tempOtp = ""; // Store OTP temporarily (in-memory or use a more permanent solution like Redis)

// Set up Nodemailer transporter to send emails
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL,
    pass: process.env.EMAIL_PASSWORD,
  },
});

// Route to handle user registration and send OTP
router.post("/register", async (req, res) => {
  const { fullname, email, password, confirm_password } = req.body;

  // Password validation
  if (password !== confirm_password) {
    return res.status(400).json({ error: "Passwords do not match." });
  }

  // Check if email already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(400).json({ error: "Email already in use." });
  }

  // Generate OTP (4-digit)
  const otp = Math.floor(1000 + Math.random() * 9000);
  tempOtp = otp;

  // Prepare the email options
  const mailOptions = {
    from: process.env.EMAIL,
    to: email,
    subject: "Email Verification - JobFinder",
    text: `Your OTP is: ${otp}`,
  };

  try {
    // Send OTP email using Nodemailer
    await transporter.sendMail(mailOptions);
    return res.status(200).json({ message: "OTP sent to email." });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Error sending OTP." });
  }
});

// Route to verify OTP
router.post("/verify-otp", (req, res) => {
  const { otp } = req.body;

  // Check if OTP matches
  if (otp !== tempOtp.toString()) {
    return res.status(400).json({ error: "Invalid OTP." });
  }

  // OTP verified successfully
  return res.status(200).json({ message: "OTP verified successfully." });
});

// Route to complete registration after OTP is verified
router.post("/complete-registration", async (req, res) => {
  const { fullname, email, password } = req.body;

  // Check if email is already in use
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(400).json({ error: "Email already in use." });
  }

  // Hash the password before saving it
  const hashedPassword = await bcrypt.hash(password, 10);

  // Create the new user
  const newUser = new User({
    fullname,
    email,
    password: hashedPassword,
    isEmailVerified: true, // Email is verified after OTP
  });

  try {
    await newUser.save();
    return res.status(201).json({ message: "Registration successful!" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Error registering user." });
  }
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: "Invalid credentials" });
    if (!user.isEmailVerified) return res.status(403).json({ error: "Please verify your email before logging in" });
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: "Invalid credentials" });

    const responseData = {
      message: "Login successful!",
      fullName: user.fullname,
      userId: user._id
    };
    console.log('Sending response:', responseData); // Debug log
    res.json(responseData);
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: "Server error" });
  }
});
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password'); // Exclude password
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.status(200).json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user data' });
  }
});
module.exports = router;
