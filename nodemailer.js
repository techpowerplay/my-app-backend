import nodemailer from "nodemailer";

const host = process.env.SMTP_HOST || "smtp.gmail.com";
const port = Number(process.env.SMTP_PORT || 465);
const secure = port === 465; // true for 465, false for 587+

export const transporter = nodemailer.createTransport({
  host,
  port,
  secure,
  auth: {
    user: process.env.SMTP_USER, // e.g. your Gmail address or SMTP user
    pass: process.env.SMTP_PASS, // e.g. your Gmail App Password or SMTP password
  },
});

// Optional: quick sanity check (won't crash app)
transporter.verify().then(() => {
  console.log("📧 SMTP transporter ready");
}).catch((e) => {
  console.warn("⚠️ SMTP verify failed:", e.message);
});