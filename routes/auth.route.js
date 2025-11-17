import express from "express";
import jwt from "jsonwebtoken";
import { UserModel } from "../models/user.js"; // fixed casing to match file
import { auth } from "../middleware/auth.middleware.js"; // fixed path typo
import multer from "multer";
import bcrypt from "bcrypt";
import { transporter } from "../nodemailer.js";
import path from "path";
import fs from "fs";

export const router = express.Router();

function signToken(id) {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
}

/* ==========================
   USER DP UPLOAD
========================== */
const Storage = multer.diskStorage({
  destination: function (_req, _file, cb) {
    const dest = path.join(process.cwd(), "Images", "DP");
    fs.mkdirSync(dest, { recursive: true });
    cb(null, dest);
  },
  filename: function (_req, file, cb) {
    const ext = path.extname(file.originalname) || ".png";
    cb(null, `userprofile-${Date.now()}${ext}`);
  },
});
const uploadDP = multer({ storage: Storage });

/* ==========================
   USER ROUTES
========================== */

// Check if user exists
router.get("/UserExistOrNot/:email", async (req, res) => {
  try {
    const data = await UserModel.find({ email: req.params.email });
    return res.send(data);
  } catch (e) {
    return res.status(500).send({ success: false, message: e.message });
  }
});

// Get all users
router.get("/GetAllUser", async (_req, res) => {
  try {
    const data = await UserModel.find();
    return res.send(data);
  } catch (error) {
    return res.status(500).send({ success: false, message: error.message });
  }
});

// Register
router.post("/register", async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ success: false, message: "Missing fields" });

    const DP = `https://avatar.iran.liara.run/username?username=${encodeURIComponent(name)}`;
    const user = await UserModel.create({ name, email, phone, password, DP });
    const token = signToken(user._id);
    res.status(201).send({
      ok: true,
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
      },
    });
  } catch (e) {
    console.log(e);
    res.status(500).send({ success: false, message: "Server error" });
  }
});

// Update DP (store relative path so frontend can use /Images/DP/...)
router.post("/update_user_dp/:id", uploadDP.single("DP"), async (req, res) => {
  try {
    if (!req.file?.filename) {
      return res.status(400).send({ success: false, message: "No file uploaded" });
    }
    const dpRelPath = path.posix.join("Images", "DP", req.file.filename);
    await UserModel.updateOne({ _id: req.params.id }, { $set: { DP: dpRelPath } });
    return res.send({ success: true, DP: dpRelPath });
  } catch (error) {
    console.log(error);
    return res.status(500).send({ success: false, message: error.message });
  }
});

// Update user
router.post("/update_user/:id", async (req, res) => {
  try {
    const { name, email, phone, address } = req.body;
    const data = await UserModel.updateOne(
      { _id: req.params.id },
      { $set: { name, email, phone, address } }
    );
    return res.send({ success: true, msg: data });
  } catch (error) {
    console.log(error);
    return res.status(500).send({ success: false, msg: error.message });
  }
});

// Login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.send({ success: false, message: "Missing email or password" });

    const user = await UserModel.findOne({ email }).select("+password");
    if (!user || !(await user.comparePassword(password))) {
      return res.send({ success: false, message: "Invalid credentials" });
    }
    const token = signToken(user._id);

    res.send({
      success: true,
      ok: true,
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        dp: user.DP,
        IsAdmin: user.IsAdmin,
        DP: user.DP,
        address: user.address,
      },
    });

    // Optional email (consider disabling in dev)
    try {
      const emailHtml = `
        <div>
          <h1>🎮 RapsPowerPlay</h1>
          <p>Welcome ${user.name}! You have logged in successfully.</p>
        </div>
      `;
      await transporter.sendMail({
        from: process.env.SMTP_FROM || "no-reply@raps.com",
        to: user.email,
        subject: "Login Successful - RapsPowerPlay",
        html: emailHtml,
      });
    } catch (e) {
      console.log("Mail send error:", e.message);
    }
  } catch (e) {
    res.send({ success: false, message: "Server error" });
  }
});

// Forgot password - send OTP
router.post("/SendForgotPassEmail/:email", async (req, res) => {
  try {
    const email = req.params.email;
    if (!email) return res.send({ success: false, msg: "Please Provide email" });

    const user = await UserModel.findOne({ email });
    if (!user) return res.send({ success: false, msg: "User not found" });

    const otp = String(Math.floor(100000 + Math.random() * 900000));
    await transporter.sendMail({
      from: process.env.SMTP_FROM || "no-reply@raps.com",
      to: user.email,
      subject: "Reset Password OTP",
      text: `OTP for Reset your Password is ${otp} [This OTP will be active only for 5 minutes]`,
    });

    const Data = await UserModel.updateOne(
      { email },
      { $set: { resetotp: otp, resetOtpExpiresAt: Date.now() + 5 * 60 * 1000 } }
    );

    res.send({ success: true, msg: Data });
  } catch (error) {
    return res.send({ success: false, msg: error.message });
  }
});

// Reset password
router.post(`/ResetUserPass`, async (req, res) => {
  try {
    const { email, NewPassword, ConfirmPass, otp } = req.body;
    const user = await UserModel.findOne({ email }).select("+password +resetotp +resetOtpExpiresAt");
    if (!user) return res.send({ success: false, message: "User Not Found" });

    if (!user.resetotp || user.resetotp !== otp) {
      return res.send({ success: false, message: "Invalid otp" });
    }
    if (user.resetOtpExpiresAt < Date.now()) {
      return res.send({ success: false, message: "OTP is expired" });
    }
    if (NewPassword !== ConfirmPass) {
      return res.send({ success: false, message: "Confirm password does not match" });
    }

    const NewHashPass = bcrypt.hashSync(NewPassword, 10);
    await UserModel.updateOne(
      { email },
      { $set: { password: NewHashPass, resetotp: "", resetOtpExpiresAt: 0 } }
    );

    return res.send({ success: true, message: "Password reset Successfully" });
  } catch (error) {
    return res.send({ success: false, msg: error.message });
  }
});

// Current user
router.get("/me", auth, async (req, res) => {
  const user = await UserModel.findById(req.user.id).select("name email phone createdAt DP IsAdmin address");
  res.json({ ok: true, user });
});

/* ==========================
   NOTE: Booking routes live in backend/index.js under /api/*
   We removed duplicate /user/api/bookings here to avoid confusion.
========================== */