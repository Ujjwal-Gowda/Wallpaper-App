import { Router } from "express";
import axios from "axios";
import dotenv from "dotenv";
import { Image } from "../models/image.js";
dotenv.config();

const router = Router();

const UNSPLASH_KEY = process.env.UNSPLASH_ACCESS_KEY; 

const defaultImages = [
  { id: "local1", url: "ironman.jpeg", thumb: "ironman.jpeg", author: "Local", link: "#2" },
  { id: "local2", url: "skull.jpeg", thumb: "skull.jpeg", author: "Local", link: "#1" },
  { id: "local3", url: "watercat.jpeg", thumb: "watercat.jpeg", author: "Local", link: "#" },  
  { id: "local4", url: "ladybug.jpeg", thumb: "ladybug.jpeg", author: "Local", link: "#4" },
  { id: "local5", url: "blackcat.jpeg", thumb: "blackcat.jpeg", author: "Local", link: "#5" },
  { id: "local6", url: "architect.jpeg", thumb: "architect.jpeg", author: "Local", link: "#" },
  { id: "local7", url: "redcat.jpeg", thumb: "redcat.jpeg", author: "Local", link: "#" },
  { id: "local8", url: "japan.jpeg", thumb: "japan.jpeg", author: "Local", link: "#" },
  { id: "local9", url: "grass.jpeg", thumb: "grass.jpeg", author: "Local", link: "#" },
  { id: "local10", url: "lamp.jpeg", thumb: "lamp.jpeg", author: "Local", link: "#" },
  { id: "local11", url: "sheep.jpeg", thumb: "sheep.jpeg", author: "Local", link: "#" },  
  { id: "local12", url: "wallpaper.jpeg", thumb: "wallpaper.jpeg", author: "Local", link: "#" },
  { id: "local13", url: "yello.jpeg", thumb: "yello.jpeg", author: "Local", link: "#" },
  { id: "local14", url: "car.jpeg", thumb: "car.jpeg", author: "Local", link: "#" },
  { id: "local16", url: "zoro.jpeg", thumb: "zoro.jpeg", author: "Local", link: "#" },
  { id: "local17", url: "shep.jpeg", thumb: "shep.jpeg", author: "Local", link: "#" },
  { id: "local18", url: "momo.jpeg", thumb: "momo.jpeg", author: "Local", link: "#" },
  { id: "local19", url: "luffy.jpeg", thumb: "luffy.jpeg", author: "Local", link: "#" },
  { id: "local20", url: "dog.jpeg", thumb: "dog.jpeg", author: "Local", link: "#" },
  { id: "local21", url: "flower.jpeg", thumb: "flower.jpeg", author: "Local", link: "#" },
  { id: "local22", url: "fish.jpeg", thumb: "fish.jpeg", author: "Local", link: "#3" },
  { id: "local23", url: "spidy.jpeg", thumb: "spidy.jpeg", author: "Local", link: "#" },
  { id: "local24", url: "cherry.jpeg", thumb: "cherry.jpeg", author: "Local", link: "#" },
  { id: "local25", url: "window.jpeg", thumb: "window.jpeg", author: "Local", link: "#" },
  { id: "local26", url: "tree.jpeg", thumb: "tree.jpeg", author: "Local", link: "#" },
  { id: "local27", url: "rdr.jpeg", thumb: "rdr.jpeg", author: "Local", link: "#" },
  { id: "local28", url: "bug.jpeg", thumb: "bug.jpeg", author: "Local", link: "#" },
  { id: "local29", url: "op.jpeg", thumb: "op.jpeg", author: "Local", link: "#" },
];

router.get("/", async (req, res, next) => {
  try {
    const { query = "", page = 1, per_page = 25, useUnsplash = "true" } = req.query;
    const pageNum = parseInt(page);
    const perPageNum = parseInt(per_page);
    const shouldKeepUnsplash = useUnsplash === "true";

    // Use production URL for images when deployed
    const baseUrl = process.env.NODE_ENV === 'production' 
      ? "https://wallpaper-app-1-9rq5.onrender.com"  // Your backend URL
      : `${req.protocol}://${req.get("host")}`;

    // Update local images to use full URLs
    const localImages = defaultImages.map(img => ({
      ...img,
      url: `${baseUrl}/static-images/${img.url}`,
      thumb: `${baseUrl}/static-images/${img.url}`,
      type: "local"
    }));

    // Fetch user-uploaded images from database
    const dbImages = await Image.find(query ? {
      $or: [
        { Title: new RegExp(query, "i") },
        { tags: new RegExp(query, "i") }
      ]
    } : {}).sort({ createdAt: -1 }).populate("owner", "name");

    const formattedDbImages = dbImages.map(img => ({
      id: img._id.toString(),
      url: img.url,
      thumb: img.url,
      author: img.owner?.name || "User",
      description: img.Title,
      type: "local",
      tags: img.tags
    }));

    const allLocalImages = [...formattedDbImages, ...localImages];

    if (!query) {
      // Recommendation Logic: mix some random DB images with static ones
      // If no query, we can also optionally fetch from Unsplash editorial/curated if allowed
      let items = allLocalImages;
      let total_pages = Math.ceil(allLocalImages.length / perPageNum);

      if (shouldKeepUnsplash && UNSPLASH_KEY) {
        try {
          const r = await axios.get("https://api.unsplash.com/photos", {
            params: { page: pageNum, per_page: perPageNum },
            headers: { Authorization: `Client-ID ${UNSPLASH_KEY}` },
            timeout: 5000
          });
          const unsplashItems = r.data.map(x => ({
            id: x.id,
            url: x.urls.regular,
            thumb: x.urls.small || x.urls.thumb,
            author: x.user.name,
            type: "external",
            description: x.description || x.alt_description || "",
          }));
          items = [...formattedDbImages.slice(0, 5), ...unsplashItems];
          total_pages = 100; // Unsplash has many pages
        } catch (err) {
          console.error("Unsplash recommendation error:", err.message);
        }
      }

      const start = (pageNum - 1) * perPageNum;
      const end = start + perPageNum;
      const paginatedItems = items.slice(start, end);
      
      return res.json({ 
        items: paginatedItems,
        total_pages: total_pages
      });
    }

    // Search Unsplash if query provided and allowed
    if (!UNSPLASH_KEY || !shouldKeepUnsplash) {
      console.warn("UNSPLASH_ACCESS_KEY not configured or disabled, returning local images only");
      const filteredLocal = allLocalImages.filter(img => 
        (img.Title && img.Title.toLowerCase().includes(query.toLowerCase())) ||
        (img.tags && (Array.isArray(img.tags) ? img.tags.some(t => t.toLowerCase().includes(query.toLowerCase())) : img.tags.toLowerCase().includes(query.toLowerCase())))
      );
      const start = (pageNum - 1) * perPageNum;
      const end = start + perPageNum;
      return res.json({ 
        items: filteredLocal.slice(start, end),
        total_pages: Math.ceil(filteredLocal.length / perPageNum)
      });
    }
  } catch (e) {
    console.error("External route error:", e);
    next(e);
  }
});

// Get related images
router.get("/:id/related", async (req, res, next) => {
  try {
    const { id } = req.params;
    
    if (id.startsWith("local")) {
      // For local images, just return some other local images as "related"
      const relatedLocal = defaultImages
        .filter(img => img.id !== id)
        .sort(() => 0.5 - Math.random())
        .slice(0, 10)
        .map(img => {
          const baseUrl = process.env.NODE_ENV === 'production' 
            ? "https://wallpaper-app-1-9rq5.onrender.com"
            : `${req.protocol}://${req.get("host")}`;
          return {
            ...img,
            url: `${baseUrl}/static-images/${img.url}`,
            thumb: `${baseUrl}/static-images/${img.url}`,
            type: "local"
          };
        });
      return res.json({ items: relatedLocal });
    }

    if (!UNSPLASH_KEY) {
      return res.status(404).json({ message: "Unsplash key not configured" });
    }

    try {
      // Unsplash Related Photos API
      const r = await axios.get(`https://api.unsplash.com/photos/${id}/related`, {
        headers: { Authorization: `Client-ID ${UNSPLASH_KEY}` },
        timeout: 10000
      });

      const relatedItems = r.data.results.map(x => ({
        id: x.id,
        url: x.urls.regular,
        thumb: x.urls.small || x.urls.thumb,
        full: x.urls.full,
        author: x.user.name,
        authorLink: x.user.links.html,
        link: x.links.html,
        type: "external",
        description: x.description || x.alt_description || "",
      }));

      res.json({ items: relatedItems });
    } catch (unsplashError) {
      console.error("Unsplash Related API error:", unsplashError.message);
      res.status(500).json({ message: "Failed to fetch related images" });
    }
  } catch (e) {
    console.error("Related images route error:", e);
    next(e);
  }
});

// Get single image detail (if needed)
router.get("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    
    if (id.startsWith("local")) {
      const img = defaultImages.find(x => x.id === id);
      if (!img) return res.status(404).json({ message: "Image not found" });
      
      const baseUrl = process.env.NODE_ENV === 'production' 
        ? "https://wallpaper-app-1-9rq5.onrender.com"
        : `${req.protocol}://${req.get("host")}`;
        
      return res.json({
        ...img,
        url: `${baseUrl}/static-images/${img.url}`,
        thumb: `${baseUrl}/static-images/${img.url}`,
        type: "local"
      });
    }

    if (!UNSPLASH_KEY) {
      return res.status(404).json({ message: "Unsplash key not configured" });
    }

    const r = await axios.get(`https://api.unsplash.com/photos/${id}`, {
      headers: { Authorization: `Client-ID ${UNSPLASH_KEY}` },
      timeout: 10000
    });

    res.json({
      id: r.data.id,
      url: r.data.urls.regular,
      thumb: r.data.urls.small || r.data.urls.thumb,
      full: r.data.urls.full,
      author: r.data.user.name,
      authorLink: r.data.user.links.html,
      link: r.data.links.html,
      type: "external",
      description: r.data.description || r.data.alt_description || "",
      tags: r.data.tags?.map(t => t.title) || []
    });
  } catch (e) {
    console.error("Single image route error:", e);
    next(e);
  }
});

export default router;