const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  firebaseUid: { type: String, required: true, unique: true },
  name: String,
  phone: String,
  gender: String,
  address: String,
  email: String,
  profilePhoto: String,
  profileComplete: { type: Boolean, default: false },
});

module.exports = mongoose.model("User", UserSchema);
