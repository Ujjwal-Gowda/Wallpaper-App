import { Router } from "express";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { Image } from "../models/image.js";
import { User } from "../models/user.js";
import { requireAuth } from "../middleware/requireAuth.js";
import mongoose from "mongoose";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"), false);
    }
  },
});

const router = Router();

function uploadToCloudinary(fileBuffer, options = {}) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
    stream.end(fileBuffer);
  });
}

router.get("/", async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search = "" } = req.query;

    const q = search
      ? {
          $or: [
            { Title: new RegExp(search, "i") },
            { tags: new RegExp(search, "i") },
          ],
        }
      : {};

    const items = await Image.find(q)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Image.countDocuments(q);

    res.json({ items, total });
  } catch (e) {
    next(e);
  }
});

// user uploads
router.get("/my-uploads", requireAuth, async (req, res, next) => {
  try {
    const images = await Image.find({ owner: req.user.id }).sort({
      createdAt: -1,
    });
    res.json({ items: images });
  } catch (e) {
    console.error("Error fetching user uploads:", e);
    next(e);
  }
});

router.get("/recommendations", async (req, res, next) => {
  try {
    // 12 random images from DB
    const count = await Image.countDocuments();
    const random = Math.floor(Math.random() * Math.max(0, count - 12));
    const items = await Image.find().skip(random).limit(12);
    res.json({ items });
  } catch (e) {
    next(e);
  }
});

// POST /images → upload file
router.post("/", requireAuth, upload.single("file"), async (req, res, next) => {
  try {
    console.log("Upload request received");
    if (!req.file) {
      console.log("No file in request");
      return res.status(400).json({ message: "No file provided" });
    }

    const { title = "", tags = "" } = req.body;
    console.log("Uploading to Cloudinary...", { title, tags });

    let result;
    try {
      result = await uploadToCloudinary(req.file.buffer, {
        folder: "wallpaper_app",
      });
      console.log("Cloudinary upload successful:", result.secure_url);
    } catch (cloudinaryError) {
      console.error("Cloudinary upload failed:", cloudinaryError);
      return res.status(500).json({
        message: "Cloudinary upload failed",
        error: cloudinaryError.message,
      });
    }

    const img = await Image.create({
      owner: req.user.id,
      url: result.secure_url,
      publicID: result.public_id,
      Title: title,
      tags: tags
        ? tags
            .split(",")
            .map((s) => s.trim())
            .filter((t) => t !== "")
        : [],
    });

    console.log("Image record created in DB:", img._id);
    res.status(201).json(img);
  } catch (e) {
    console.error("Detailed upload error:", e);
    res
      .status(500)
      .json({ message: e.message || "Internal server error during upload" });
  }
});

//  get user's favorite images (internal only)
router.get("/favorites", requireAuth, async (req, res, next) => {
  try {
    console.log("Getting favorites for user ID:", req.user.id);

    if (!mongoose.Types.ObjectId.isValid(req.user.id)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const user = await User.findById(req.user.id).populate("favorites");

    if (!user) {
      console.log("User not found with ID:", req.user.id);
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ items: user.favorites || [] });
  } catch (e) {
    console.error("Error in favorites route:", e);
    next(e);
  }
});

// GET /images/external/:externalId/is-favorite → check if external image is favorited
router.get(
  "/external/:externalId/is-favorite",
  requireAuth,
  async (req, res, next) => {
    try {
      console.log("Checking favorite status for:", req.params.externalId);
      console.log("User ID:", req.user.id);

      // Validate user ID format
      if (!mongoose.Types.ObjectId.isValid(req.user.id)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      const user = await User.findById(req.user.id);

      if (!user) {
        console.log("User not found with ID:", req.user.id);
        return res.status(404).json({ message: "User not found" });
      }

      // Handle case where externalFavorites might not exist yet
      const externalFavorites = user.externalFavorites || [];
      const isFavorite = externalFavorites.some(
        (fav) => fav.externalId === req.params.externalId,
      );

      console.log("External favorites count:", externalFavorites.length);
      console.log("Is favorite:", isFavorite);
      res.json({ isFavorite });
    } catch (e) {
      console.error("Error in is-favorite route:", e);
      next(e);
    }
  },
);

// POST /images/external-favorite → add external image to favorites
router.post("/external-favorite", requireAuth, async (req, res, next) => {
  try {
    console.log("Adding external favorite:", req.body);
    console.log("User ID:", req.user.id);

    // Validate user ID format
    if (!mongoose.Types.ObjectId.isValid(req.user.id)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const { externalId, url, thumb, author, title = "" } = req.body;

    if (!externalId || !url) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Check if user exists
    const existingUser = await User.findById(req.user.id);
    if (!existingUser) {
      return res.status(404).json({ message: "User not found" });
    }

    const favoriteData = {
      externalId,
      url,
      thumb,
      author,
      title: title || `Image by ${author}`,
      source: "unsplash",
      dateAdded: new Date(),
    };

    console.log("Favorite data:", favoriteData);

    // Initialize externalFavorites array if it doesn't exist
    const updateQuery = existingUser.externalFavorites
      ? { $addToSet: { externalFavorites: favoriteData } }
      : { $set: { externalFavorites: [favoriteData] } };

    const updatedUser = await User.findByIdAndUpdate(req.user.id, updateQuery, {
      new: true,
    });

    console.log(
      "Updated user external favorites:",
      updatedUser?.externalFavorites,
    );
    res.json({ ok: true });
  } catch (e) {
    console.error("Error in external-favorite route:", e);
    next(e);
  }
});

// DELETE /images/external/:externalId/favorite → remove external favorite
router.delete(
  "/external/:externalId/favorite",
  requireAuth,
  async (req, res, next) => {
    try {
      console.log("Removing external favorite:", req.params.externalId);
      console.log("User ID:", req.user.id);

      // Validate user ID format
      if (!mongoose.Types.ObjectId.isValid(req.user.id)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const updatedUser = await User.findByIdAndUpdate(
        req.user.id,
        { $pull: { externalFavorites: { externalId: req.params.externalId } } },
        { new: true },
      );

      console.log(
        "Updated user external favorites:",
        updatedUser?.externalFavorites,
      );
      res.json({ ok: true });
    } catch (e) {
      console.error("Error in remove external favorite route:", e);
      next(e);
    }
  },
);

// GET /images/all-favorites → get both internal and external favorites
router.get("/all-favorites", requireAuth, async (req, res, next) => {
  try {
    console.log("Fetching all favorites for user:", req.user.id);

    // Validate user ID format
    if (!mongoose.Types.ObjectId.isValid(req.user.id)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const user = await User.findById(req.user.id).populate("favorites");

    if (!user) {
      console.log("User not found with ID:", req.user.id);
      return res.status(404).json({ message: "User not found" });
    }

    console.log("User found:", !!user);
    console.log("Internal favorites count:", user?.favorites?.length || 0);
    console.log(
      "External favorites count:",
      user?.externalFavorites?.length || 0,
    );

    // Internal favorites (from database)
    const internalFavorites = (user.favorites || []).map((fav) => ({
      ...fav.toJSON(),
      type: "internal",
    }));

    // External favorites (from user.externalFavorites)
    const externalFavorites = (user.externalFavorites || []).map((fav) => ({
      id: fav.externalId,
      url: fav.url,
      thumb: fav.thumb,
      author: fav.author,
      Title: fav.title,
      type: "external",
      dateAdded: fav.dateAdded,
    }));

    const allFavorites = [...internalFavorites, ...externalFavorites];

    res.json({ items: allFavorites });
  } catch (e) {
    console.error("Error in all-favorites route:", e);
    next(e);
  }
});

// DELETE /images/:id → delete (owner) - for internal images
router.delete("/:id", requireAuth, async (req, res, next) => {
  try {
    const img = await Image.findById(req.params.id);
    if (!img) return res.status(404).json({ message: "Not found" });
    if (String(img.owner) !== req.user.id)
      return res.status(403).json({ message: "Not yours" });

    await cloudinary.uploader.destroy(img.publicID);
    await img.deleteOne();
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

// POST /images/:id/favorite → add internal image to favorites
router.post("/:id/favorite", requireAuth, async (req, res, next) => {
  try {
    // Validate user ID format
    if (!mongoose.Types.ObjectId.isValid(req.user.id)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    await User.findByIdAndUpdate(
      req.user.id,
      { $addToSet: { favorites: req.params.id } },
      { new: true },
    );
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

// DELETE /images/:id/favorite → remove internal image from favorites
router.delete("/:id/favorite", requireAuth, async (req, res, next) => {
  try {
    // Validate user ID format
    if (!mongoose.Types.ObjectId.isValid(req.user.id)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    await User.findByIdAndUpdate(
      req.user.id,
      { $pull: { favorites: req.params.id } },
      { new: true },
    );
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

export default router;

