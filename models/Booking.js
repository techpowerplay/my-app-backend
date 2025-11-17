// server/models/Booking.js
import mongoose from "mongoose";

const BookingSchema = new mongoose.Schema(
  {
    bookingCode: { type: String, index: true },

    // Who made the booking
    BookingAdmin: {
      type: mongoose.Types.ObjectId,
      ref: "User",
    },

    // Selections
    selectedConsole: { type: String, required: true, enum: ["ps5", "ps4"] },
    selectedGames: {
      type: [String],
      default: [],
      validate: {
        validator: (v) => v.length <= 5,
        message: "You can select at most 5 games.",
      },
    },

    // Plan
    rentalPeriod: { type: String, required: true, enum: ["hourly", "daily"] },
    controllers: { type: Number, required: true, min: 1, max: 4 },
    duration: { type: Number, required: true, min: 1 },
    isMember: { type: Boolean, default: false },

    // Human-readable times (12h strings) and ISO schedule
    startTime: { type: String },
    endTime: { type: String },
    startAt: { type: Date, required: true },
    endAt: { type: Date, required: true },

    // Contact
    contactInfo: {
      name: { type: String, required: true },
      email: { type: String, required: true },
      phone: { type: String, required: true },
      address: { type: String, required: true },
    },

    // Images
    AdharImg: { type: String },
    PersonWithAdharImg: { type: String },

    // Pricing snapshot
    total: { type: Number, required: true, min: 0 },

    // Meta
    status: { type: String, default: "pending", enum: ["pending", "confirmed", "cancelled"] },
    tz: { type: String, default: "Asia/Kolkata" },
  },
  { timestamps: true }
);

export const BookingModel = mongoose.model("Booking", BookingSchema);