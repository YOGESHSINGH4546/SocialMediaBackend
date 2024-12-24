const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");
const admin = require("firebase-admin");
const User = require("./models/User");
const upload = require("./middleware/upload");

// Load environment variables
dotenv.config();

// Initialize Firebase Admin SDK
const serviceAccount = require("./firebase-service-account.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
const path = require("path");

// Serve static files from the "uploads" directory
app.use("/uploads", express.static(path.join(__dirname, "uploads")));


// MongoDB Connection
mongoose
  .connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Middleware to Validate Firebase Token

const authenticate = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1]; // Extract the token
  if (!token) return res.status(401).json({ message: "Unauthorized" });

  try {
    const decodedToken = await admin.auth().verifyIdToken(token); // Verify token
    req.user = decodedToken; // Attach decoded token to request
    next();
  } catch (error) {
    res.status(401).json({ message: "Invalid token", error: error.message });
  }
};

module.exports = authenticate;


// Routes
// Add or Update Profile Details
app.put("/api/profile", authenticate, upload.single("profilePhoto"), async (req, res) => {
  const { name, phone, gender, address } = req.body;

  try {
    let user = await User.findOne({ firebaseUid: req.user.uid });
    if (!user) {
      // Create a new user record
      user = new User({ firebaseUid: req.user.uid, name, phone, gender, address, profileComplete: true, profilePhoto: req.file ? req.file.path : undefined});
    } else {
      // Update the existing user record
      user.name = name;
      user.phone = phone;
      user.gender = gender;
      user.address = address;
      user.profileComplete = true;
      if (req.file) {
        user.profilePhoto = req.file.path;
      }
    }
    await user.save();
    res.status(200).json({ message: "Profile updated successfully", user });
  } catch (err) {
    res.status(500).json({ message: "Error updating profile", error: err.message });
  }
});



app.post("/api/profile", authenticate, async (req, res) => {
  const { firebaseUid, email, profileComplete } = req.body;

  try {
    // Check if the user already exists in MongoDB
    let user = await User.findOne({ firebaseUid });
    if (!user) {
      user = new User({
        firebaseUid,
        email,
        profileComplete: profileComplete || false,
      });
      await user.save();
    }

    res.status(200).json({ message: "Profile saved successfully", user });
  } catch (err) {
    res.status(500).json({ message: "Error saving profile", error: err.message });
  }
});




// Fetch Profile Details
app.get("/api/profile", authenticate, async (req, res) => {
  try {
    const user = await User.findOne({ firebaseUid: req.user.uid });
    if (!user) return res.status(404).json({ message: "User not found" });

    res.status(200).json(user);
  } catch (err) {
    res.status(500).json({ message: "Error fetching profile", error: err.message });
  }
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
