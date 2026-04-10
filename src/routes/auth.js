const express = require("express");
const { body, validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");
const Manager = require("../models/Manager");
const auth = require("../middleware/auth");

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    message: "Inshuro zageragejwe zarenze urugero, ongera nyuma yiminota 15",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

function signAuthToken(manager) {
  return jwt.sign({ id: manager._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES || "30d",
  });
}

function userPayload(manager) {
  return {
    id: manager._id,
    fullName: manager.fullName,
    email: manager.email,
    salonName: manager.salonName,
    address: manager.address || "",
    phone: manager.phone,
    photoUrl: manager.photoUrl || "",
    role: manager.role,
    createdByAdmin: Boolean(manager.createdByAdmin),
    lastLoginAt: manager.lastLoginAt || null,
  };
}

router.post(
  "/login",
  authLimiter,
  [
    body("email").isEmail().normalizeEmail().withMessage("Imeli ntabwo yemewe"),
    body("password").notEmpty().withMessage("Ijambo ryibanga rigomba kuzuzwa"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ errors: errors.array() });

    const { email, password } = req.body;
    try {
      const manager = await Manager.findOne({ email });
      if (!manager) {
        return res.status(404).json({
          message:
            "Account not found. Please contact Barber Management System admin.",
        });
      }

      if (manager.role !== "admin" && !manager.createdByAdmin) {
        return res.status(403).json({
          message:
            "This account cannot sign in. Only users created by an admin can log in.",
        });
      }

      const ok = await bcrypt.compare(password, manager.passwordHash);
      if (!ok) return res.status(401).json({ message: "Ibyinjijwe si byo" });

      manager.lastLoginAt = new Date();
      await manager.save();

      const token = signAuthToken(manager);
      return res.json({ token, user: userPayload(manager) });
    } catch (error) {
      console.error("Login error:", error);
      return res.status(500).json({ message: "Habaye ikibazo kuri server" });
    }
  },
);

router.get("/session", auth, async (req, res) => {
  try {
    const manager = await Manager.findById(req.managerId).select(
      "-passwordHash",
    );
    if (!manager)
      return res.status(401).json({ message: "Session is invalid" });
    return res.json({ user: userPayload(manager) });
  } catch (error) {
    console.error("Session check error:", error);
    return res.status(500).json({ message: "Habaye ikibazo kuri server" });
  }
});

router.patch(
  "/profile",
  auth,
  [
    body("fullName")
      .optional()
      .trim()
      .isLength({ min: 2 })
      .withMessage("Full name is required"),
    body("email")
      .optional()
      .isEmail()
      .normalizeEmail()
      .withMessage("Valid email is required"),
    body("phone").optional().trim().notEmpty().withMessage("Phone is required"),
    body("salonName")
      .optional()
      .trim()
      .isLength({ min: 2 })
      .withMessage("Salon name is required"),
    body("address").optional().trim(),
    body("photoUrl").optional().isString(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ errors: errors.array() });

    try {
      const manager = await Manager.findById(req.managerId);
      if (!manager) return res.status(404).json({ message: "User not found" });

      const { fullName, email, phone, salonName, address, photoUrl } = req.body;

      if (email && email !== manager.email) {
        const existing = await Manager.findOne({
          email,
          _id: { $ne: manager._id },
        });
        if (existing) {
          return res
            .status(409)
            .json({ message: "Another user already uses this email" });
        }
        manager.email = email;
      }

      if (typeof fullName === "string") manager.fullName = fullName;
      if (typeof phone === "string") manager.phone = phone;
      if (typeof salonName === "string") manager.salonName = salonName;
      if (typeof address === "string") manager.address = address;
      if (typeof photoUrl === "string") manager.photoUrl = photoUrl;

      await manager.save();

      return res.json({
        message: "Profile updated successfully",
        user: userPayload(manager),
      });
    } catch (error) {
      console.error("Profile update error:", error);
      return res.status(500).json({ message: "Habaye ikibazo kuri server" });
    }
  },
);

router.post(
  "/change-password",
  auth,
  [
    body("currentPassword").notEmpty().withMessage("Current password required"),
    body("newPassword")
      .isLength({ min: 8 })
      .withMessage("New password must be 8+ chars"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ errors: errors.array() });

    const { currentPassword, newPassword } = req.body;
    try {
      const manager = await Manager.findById(req.managerId);
      if (!manager) return res.status(404).json({ message: "User not found" });

      const isValid = await bcrypt.compare(
        currentPassword,
        manager.passwordHash,
      );
      if (!isValid)
        return res.status(401).json({ message: "Current password incorrect" });

      const newHash = await bcrypt.hash(newPassword, 10);
      manager.passwordHash = newHash;
      manager.defaultPassword = newPassword;
      manager.passwordUpdatedAt = new Date();
      await manager.save();

      // Notify Admin
      try {
        const adminUser = await Manager.findOne({ role: "admin" });
        if (adminUser) {
          const Message = require("../models/Message");
          await Message.create({
            sender: manager._id,
            receiver: adminUser._id,
            content: `Notification: Manager ${manager.fullName || manager.salonName || manager.email} has changed their password securely.`,
          });
        }
      } catch (notifErr) {
        console.error("Failed to notify admin:", notifErr);
      }

      res.json({ message: "Password updated successfully" });
    } catch (error) {
      console.error("Password change error:", error);
      res.status(500).json({ message: "Server error" });
    }
  },
);

module.exports = router;
