const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const authRoutes = require("./routes/authRoute");
const registerroute=require("./routes/register");
const forgot=require("./routes/Forgot");
const jobroute=require("./routes/JobRoute");
const candidateroute=require("./routes/CandidteRoute");
const profileRoutes=require("./routes/profileRoutes");
const templateRoutes = require('./routes/templateRoutes');
const adminfp = require('./routes/adminForgot');
const app = express();

// ✅ Middleware
// Middleware
app.use(express.json({ limit: '10mb' })); // Increase limit for JSON payloads
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(cors());
app.use('/uploads', express.static('uploads'));

// ✅ Connect to MongoDB (Replace with your MongoDB URL)
mongoose.connect("mongodb+srv://veerraju:veerraju@cluster0.b8c6k.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log("MongoDB Connected"))
  .catch(err => console.log("MongoDB Error:", err));

// ✅ Routes
app.use("/api/org", authRoutes);
app.use("/api/auth", registerroute);
app.use("/api/fp", forgot);
app.use("/api/jobs", jobroute);
app.use("/api/candidates",candidateroute);
app.use("/api/profiles",profileRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/admin/fp', adminfp);
// ✅ Start Server
const PORT = 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
