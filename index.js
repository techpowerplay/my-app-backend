// backend/index.js

import express from "express";
import cors from "cors";
import { google } from "googleapis";
import dotenv from "dotenv";
import { BookingModel } from "./models/booking.js";
import { router } from "./routes/auth.route.js";
import { DBconnect } from "./config/DBconnect.js";
import multer from "multer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;

// ---------------------------
// Resolve __dirname in ESM
// ---------------------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---------------------------
// Ensure folder structure
// ---------------------------
const UPLOAD_ROOT = path.join(__dirname, "Images");
const AADHAAR_DIR = path.join(UPLOAD_ROOT, "Aadhaar");
const DP_DIR = path.join(UPLOAD_ROOT, "DP");

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

ensureDir(UPLOAD_ROOT);
ensureDir(AADHAAR_DIR);
ensureDir(DP_DIR);

// ---------------------------
// CORS CONFIG (FIXED)
// ---------------------------
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://127.0.0.1:5173",
      // Your LIVE frontend
      "https://rapspowerplay.com",
      "https://www.rapspowerplay.com",

      // Your backend URL on Render
      "https://my-app-backend-2rt2.onrender.com"
    ],
    credentials: true,
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    allowedHeaders: "Content-Type,Authorization",
  })
);

// Preflight fix
app.options("*", cors());

// Body parser
app.use(express.json());

// Static assets
app.use("/Images", express.static(UPLOAD_ROOT));
app.use("/assets", express.static(path.join(__dirname, "assets")));

// ---------------------------
// GOOGLE SHEETS CONFIG
// ---------------------------
const auth = new google.auth.GoogleAuth({
  keyFile: "creds.json",
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

const SPREADSHEET_ID = "1xw-X1_Jn2lHsxcA26x_vx4LxvxmjrfP_YC5JGkcV76s";
const SHEET_NAME = "Raps_Enquiries";

async function appendToSheet(data) {
  const client = await auth.getClient();
  const sheets = google.sheets({ version: "v4", auth: client });

  const headerRange = `${SHEET_NAME}!A1:L1`;
  const headerRow = [
    [
      "First Name",
      "Last Name",
      "Email",
      "Phone",
      "Rental Duration",
      "Delivery Date",
      "Membership Status",
      "Interest In Membership",
      "Location",
      "How Heard",
      "Additional Comments",
      "Timestamp",
    ],
  ];

  const existing = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: headerRange,
  });

  // Add header row if empty
  if (!existing.data.values || existing.data.values.length === 0) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: headerRange,
      valueInputOption: "USER_ENTERED",
      resource: { values: headerRow },
    });
  }

  // Append data row
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A1`,
    valueInputOption: "USER_ENTERED",
    resource: {
      values: [
        [
          data.firstName,
          data.lastName,
          data.email,
          data.phone,
          data.rentalDuration,
          data.deliveryDate,
          data.membershipStatus,
          data.interestInMembership,
          data.location,
          data.howHeard,
          data.additionalComments || "",
          new Date().toLocaleString("en-IN"),
        ],
      ],
    },
  });
}

// ---------------------------
// Enquiry Endpoint
// ---------------------------
app.post("/enquiry", async (req, res) => {
  try {
    await appendToSheet(req.body);
    console.log("✅ Enquiry saved:", req.body.email);
    res.json({ success: true });
  } catch (err) {
    console.error("❌ Sheets Error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ---------------------------
// Health Check
// ---------------------------
app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

// ---------------------------
// PRICING TABLES
// ---------------------------
const HOURLY_STANDARD = {
  1: { 1: 150, 2: 280, 3: 400, 4: 500, 5: 600, 6: 700 },
  2: { 1: 200, 2: 370, 3: 520, 4: 650, 5: 780, 6: 900 },
  3: { 1: 250, 2: 460, 3: 640, 4: 800, 5: 960, 6: 1100 },
  4: { 1: 300, 2: 550, 3: 750, 4: 950, 5: 1140, 6: 1300 },
};

const HOURLY_MEMBER = {
  1: { 1: 120, 2: 225, 3: 320, 4: 400, 5: 480, 6: 560 },
  2: { 1: 160, 2: 295, 3: 415, 4: 520, 5: 620, 6: 720 },
  3: { 1: 200, 2: 370, 3: 510, 4: 640, 5: 770, 6: 880 },
  4: { 1: 240, 2: 440, 3: 600, 4: 760, 5: 910, 6: 1040 },
};

const DAILY_STANDARD = {
  1: { 1: 950, 2: 1490, 3: 1920, 4: 2250, 5: 2480, 6: 2700, 7: 2750 },
  2: { 1: 1100, 2: 1650, 3: 2090, 4: 2420, 5: 2640, 6: 2860, 7: 2970 },
  3: { 1: 1370, 2: 1920, 3: 2360, 4: 2690, 5: 2910, 6: 3130, 7: 3300 },
  4: { 1: 1650, 2: 2300, 3: 2950, 4: 3080, 5: 3300, 6: 3520, 7: 3740 },
};

const DAILY_MEMBER = {
  1: { 1: 849, 2: 1339, 3: 1739, 4: 2049, 5: 2249, 6: 2449, 7: 2499 },
  2: { 1: 999, 2: 1599, 3: 1899, 4: 2199, 5: 2399, 6: 2599, 7: 2699 },
  3: { 1: 1269, 2: 1379, 3: 2159, 4: 2549, 5: 2649, 6: 2829, 7: 2999 },
  4: { 1: 1499, 2: 2099, 3: 2499, 4: 2799, 5: 2999, 6: 3199, 7: 3399 },
};

function computeServerTotal(controllers, duration, rentalPeriod, isMember) {
  const table =
    rentalPeriod === "hourly"
      ? isMember
        ? HOURLY_MEMBER
        : HOURLY_STANDARD
      : isMember
      ? DAILY_MEMBER
      : DAILY_STANDARD;

  return table?.[controllers]?.[duration] || 0;
}

function genBookingCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "RP-";
  for (let i = 0; i < 6; i++)
    s += alphabet[Math.floor(Math.random() * alphabet.length)];
  return s;
}

// ---------------------------
// MULTER STORAGE
// ---------------------------
const storage = multer.diskStorage({
  destination: function (_req, _file, cb) {
    cb(null, AADHAAR_DIR);
  },
  filename: function (_req, file, cb) {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname || "");
    cb(null, `${file.fieldname}-${unique}${ext}`);
  },
});

const upload = multer({ storage });

// ---------------------------
// BOOKING ENDPOINT
// ---------------------------
app.post(
  "/api/bookings",
  upload.fields([
    { name: "AdharImg", maxCount: 1 },
    { name: "PersonWithAdharImg", maxCount: 1 },
  ]),
  async (req, res, next) => {
    try {
      let {
        selectedConsole,
        selectedGames,
        planType,
        rentalPeriod,
        controllers,
        duration,
        isMember,
        startAt,
        endAt,
        contactInfo,
        tz = "Asia/Kolkata",
        BookingAdmin,
        startTime,
        endTime,
      } = req.body;

      const period = rentalPeriod || planType;

      let parsedGames = [];
      let parsedContact = null;

      try {
        if (selectedGames) parsedGames = JSON.parse(selectedGames);
      } catch {}

      try {
        if (contactInfo) parsedContact = JSON.parse(contactInfo);
      } catch {}

      const controllersNum = parseInt(controllers, 10);
      const durationNum = parseInt(duration, 10);
      const isMemberBool =
        isMember === "true" || isMember === true || isMember === "1";

      if (
        !selectedConsole ||
        !period ||
        !startAt ||
        !endAt ||
        !parsedContact
      ) {
        return res
          .status(400)
          .json({ ok: false, message: "Missing required fields." });
      }

      if (!["ps5", "ps4"].includes(selectedConsole)) {
        return res.status(400).json({ ok: false, message: "Invalid console." });
      }

      if (!["hourly", "daily"].includes(period)) {
        return res
          .status(400)
          .json({ ok: false, message: "Invalid rental period." });
      }

      if (!controllersNum || controllersNum < 1 || controllersNum > 4) {
        return res
          .status(400)
          .json({ ok: false, message: "Invalid controllers (1-4)." });
      }

      if (!durationNum || durationNum < 1) {
        return res
          .status(400)
          .json({ ok: false, message: "Invalid duration." });
      }

      if (new Date(endAt) <= new Date(startAt)) {
        return res
          .status(400)
          .json({ ok: false, message: "End must be after start." });
      }

      if (parsedGames.length > 5) {
        return res
          .status(400)
          .json({ ok: false, message: "Max 5 games allowed." });
      }

      const total = computeServerTotal(
        controllersNum,
        durationNum,
        period,
        isMemberBool
      );

      if (!total)
        return res
          .status(400)
          .json({ ok: false, message: "Invalid pricing selection." });

      const AdharImg = req.files?.AdharImg?.[0]?.filename || null;
      const PersonWithAdharImg =
        req.files?.PersonWithAdharImg?.[0]?.filename || null;

      const booking = await BookingModel.create({
        bookingCode: genBookingCode(),
        BookingAdmin: BookingAdmin || null,
        selectedConsole,
        selectedGames: parsedGames,
        rentalPeriod: period,
        controllers: controllersNum,
        duration: durationNum,
        isMember: isMemberBool,
        startAt: new Date(startAt),
        endAt: new Date(endAt),
        startTime,
        endTime,
        contactInfo: parsedContact,
        total,
        tz,
        AdharImg,
        PersonWithAdharImg,
      });

      return res.status(201).json({ ok: true, booking });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------
// ADMIN ROUTES
// ---------------------------
app.post("/api/UpdateStatus/:id", async (req, res) => {
  try {
    const { status } = req.body;
    const data = await BookingModel.updateOne(
      { _id: req.params.id },
      { $set: { status } }
    );
    return res.send(data);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

app.get("/api/GetAllBookings", async (_req, res) => {
  try {
    const data = await BookingModel.find();
    return res.send(data);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

app.get("/api/GetBookingById/:id", async (req, res) => {
  try {
    const data = await BookingModel.findById(req.params.id);
    if (!data) return res.status(404).json({ message: "Not found" });
    return res.send(data);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

app.get("/api/bookings/:id", async (req, res, next) => {
  try {
    const b = await BookingModel.find({ BookingAdmin: req.params.id });
    if (!b) return res.status(404).json({ message: "Not found" });
    const data = b.filter((_item, index) => index === 0);
    res.json({ ok: true, booking: data });
  } catch (err) {
    err.status = 400;
    next(err);
  }
});

// ---------------------------
// USER AUTH ROUTES (important)
// ---------------------------
app.use("/user", router);

// ---------------------------
// 404 HANDLER
// ---------------------------
app.use((req, res) => {
  res.status(404).json({ message: "Not found", path: req.originalUrl });
});

// ---------------------------
// ERROR HANDLER
// ---------------------------
app.use((err, _req, res, _next) => {
  if (err instanceof SyntaxError && "body" in err) {
    return res.status(400).json({ message: "Invalid JSON body" });
  }
  console.error(err);
  res.status(err.status || 500).json({ message: err.message || "Server error" });
});

// ---------------------------
// START SERVER
// ---------------------------
async function startServer() {
  try {
    await DBconnect();
    console.log("✅ MongoDB connected");
  } catch (err) {
    console.error("❌ DB connection failed:", err.message);
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
}

startServer();
