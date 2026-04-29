import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export const sendNotificationEmail = async (to, imageName, senderName) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.log("Email credentials not set, skipping email notification.");
    return;
  }

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to,
    subject: `New message on your wallpaper: ${imageName}`,
    text: `Hi! ${senderName} just messaged on your uploaded wallpaper "${imageName}". Check it out in the WallpaperApp!`,
    html: `<p>Hi!</p><p><strong>${senderName}</strong> just messaged on your uploaded wallpaper "<strong>${imageName}</strong>".</p><p>Check it out in the WallpaperApp!</p>`,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Notification email sent to ${to}`);
  } catch (error) {
    console.error("Error sending notification email:", error);
  }
};
