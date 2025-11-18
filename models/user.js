// models/User.js

import mongoose from "mongoose";
import bcrypt from "bcrypt";
import validator from "validator";

const UserSchema = new mongoose.Schema(
  {
    /* ============================
           BASIC PROFILE FIELDS
    ============================ */
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 60,
    },

    DP: {
      type: String,
      default: "", // will be set during registration
    },

    IsAdmin: {
      type: Boolean,
      default: false,
    },

    address: {
      type: String,
      trim: true,
      default: "",
    },

    /* ============================
           PASSWORD RESET
    ============================ */
    resetotp: {
      type: String,
      default: "",
    },

    resetOtpExpiresAt: {
      type: Number, // timestamp in ms
      default: 0,
    },

    /* ============================
           LOGIN FIELDS
    ============================ */
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      validate: [validator.isEmail, "Invalid email format"],
    },

    phone: {
      type: String,
      trim: true,
      default: "",
      validate: {
        validator: function (v) {
          if (!v) return true; // allow empty
          return /^[0-9]{10}$/.test(v); // must be valid 10-digit Indian number
        },
        message: "Invalid phone number",
      },
    },

    password: {
      type: String,
      required: true,
      minlength: 6,
      select: false, // VERY IMPORTANT: prevents leaking hashed passwords
    },
  },
  { timestamps: true }
);

/* ============================
      HASH PASSWORD ON SAVE
============================ */
UserSchema.pre("save", async function (next) {
  // If password is not updated, skip hashing
  if (!this.isModified("password")) return next();

  // Hash password
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

/* ============================
      PASSWORD COMPARISON
============================ */
UserSchema.methods.comparePassword = function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

/* ============================
      EXPORT MODEL
============================ */
export const UserModel = mongoose.model("User", UserSchema);
