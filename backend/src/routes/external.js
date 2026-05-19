import { Router } from "express";
import axios from "axios";
import dotenv from "dotenv";
import { Image } from "../models/image.js";
dotenv.config();

const router = Router();

const UNSPLASH_KEY = process.env.UNSPLASH_ACCESS_KEY;

function getBaseUrl(req) {
  return process.env.NODE_ENV === "production"
    ? "https://wallpaper-app-1-9rq5.onrender.com"
    : `${req.protocol}://${req.get("host")}`;
}

function mapDbImages(dbImages) {
  return dbImages.map((img) => ({
    id: img._id.toString(),
    url: img.url,
    thumb: img.url,
    author: img.owner?.name || "User",
    description: img.Title,
    Title: img.Title,
    type: "local", // We still call it local because it's in our DB, vs external Unsplash
    tags: img.tags || [],
  }));
}

router.get("/", async (req, res, next) => {
  try {
    const {
      query = "",
      page = 1,
      per_page = 25,
      useUnsplash = "true",
    } = req.query;
    const pageNum = parseInt(page);
    const perPageNum = parseInt(per_page);
    const shouldUseUnsplash = useUnsplash === "true";

    // User-uploaded (DB) images
    const dbFilter = query
      ? {
          $or: [
            { Title: new RegExp(query, "i") },
            { tags: new RegExp(query, "i") },
          ],
        }
      : {};

    const dbImages = await Image.find(dbFilter)
      .sort({ createdAt: -1 })
      .populate("owner", "name");

    const formattedDbImages = mapDbImages(dbImages);

    // No query: homepage recommendations
    if (!query) {
      let items = [...formattedDbImages];
      let total_pages = Math.ceil(items.length / perPageNum);

      if (shouldUseUnsplash && UNSPLASH_KEY) {
        try {
          const r = await axios.get("https://api.unsplash.com/photos", {
            params: {
              page: pageNum,
              per_page: perPageNum,
              order_by: "popular",
            },
            headers: { Authorization: `Client-ID ${UNSPLASH_KEY}` },
            timeout: 5000,
          });

          const unsplashItems = r.data.map((x) => ({
            id: x.id,
            url: x.urls.regular,
            thumb: x.urls.small || x.urls.thumb,
            author: x.user.name,
            type: "external",
            description: x.description || x.alt_description || "",
            tags: x.tags?.map((t) => t.title) || [],
          }));

          //  DB uploads first, then unsplash
          const dbSlice = formattedDbImages.slice(
            0,
            Math.min(5, formattedDbImages.length),
          );
          items = [...dbSlice, ...unsplashItems];
          total_pages = 100;
        } catch (err) {
          console.error("Unsplash fetch error:", err.message);
        }
      } else {
        const start = (pageNum - 1) * perPageNum;
        const end = start + perPageNum;
        items = items.slice(start, end);
      }

      return res.json({ items, total_pages });
    }

    // Query provided
    const allDbMatches = [...formattedDbImages];

    if (!UNSPLASH_KEY || !shouldUseUnsplash) {
      const start = (pageNum - 1) * perPageNum;
      const end = start + perPageNum;
      return res.json({
        items: allDbMatches.slice(start, end),
        total_pages: Math.ceil(allDbMatches.length / perPageNum),
      });
    }

    try {
      const r = await axios.get("https://api.unsplash.com/search/photos", {
        params: { query, page: pageNum, per_page: perPageNum },
        headers: { Authorization: `Client-ID ${UNSPLASH_KEY}` },
        timeout: 8000,
      });

      const unsplashItems = (r.data.results || []).map((x) => ({
        id: x.id,
        url: x.urls.regular,
        thumb: x.urls.small || x.urls.thumb,
        author: x.user.name,
        type: "external",
        description: x.description || x.alt_description || "",
        tags: x.tags?.map((t) => t.title) || [],
      }));

      // DB matches always come first in search results
      const combined = [
        ...formattedDbImages,
        ...unsplashItems,
      ];

      return res.json({
        items: combined,
        total_pages: r.data.total_pages || 1,
      });
    } catch (err) {
      console.error("Unsplash search error:", err.message);
      const start = (pageNum - 1) * perPageNum;
      const end = start + perPageNum;
      return res.json({
        items: allDbMatches.slice(start, end),
        total_pages: Math.ceil(allDbMatches.length / perPageNum),
      });
    }
  } catch (e) {
    console.error("External route error:", e);
    next(e);
  }
});

// Related images
router.get("/:id/related", async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if it's a DB image ID (MongoDB ObjectId length = 24)
    if (id.length === 24) {
      try {
        const dbImg = await Image.findById(id);
        if (dbImg) {
          // Find similar DB images by matching tags
          const related = await Image.find({
            _id: { $ne: dbImg._id },
            $or: [
              { tags: { $in: dbImg.tags } },
              { Title: new RegExp(dbImg.Title?.split(" ")[0] || "", "i") },
            ],
          })
            .limit(12)
            .populate("owner", "name");

          const formattedRelated = mapDbImages(related);
          return res.json({ items: formattedRelated });
        }
      } catch (e) {
        // Not a valid ObjectId, fall through
      }
    }

    if (!UNSPLASH_KEY) {
      return res.status(404).json({ message: "Unsplash key not configured" });
    }

    const r = await axios.get(`https://api.unsplash.com/photos/${id}/related`, {
      headers: { Authorization: `Client-ID ${UNSPLASH_KEY}` },
      timeout: 10000,
    });

    const relatedItems = r.data.results.map((x) => ({
      id: x.id,
      url: x.urls.regular,
      thumb: x.urls.small || x.urls.thumb,
      full: x.urls.full,
      author: x.user.name,
      type: "external",
      description: x.description || x.alt_description || "",
    }));

    res.json({ items: relatedItems });
  } catch (e) {
    console.error("Related images route error:", e);
    next(e);
  }
});

// Single image detail
router.get("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check DB
    if (id.length === 24) {
      try {
        const dbImg = await Image.findById(id).populate("owner", "name");
        if (dbImg) {
          return res.json({
            id: dbImg._id.toString(),
            url: dbImg.url,
            thumb: dbImg.url,
            author: dbImg.owner?.name || "User",
            description: dbImg.Title,
            Title: dbImg.Title,
            type: "local",
            tags: dbImg.tags || [],
          });
        }
      } catch (e) {
        return res.status(400).json({ message: "not valid ObjectId" });
      }
    }

    if (!UNSPLASH_KEY) {
      return res.status(404).json({ message: "Unsplash key not configured" });
    }

    const r = await axios.get(`https://api.unsplash.com/photos/${id}`, {
      headers: { Authorization: `Client-ID ${UNSPLASH_KEY}` },
      timeout: 10000,
    });

    res.json({
      id: r.data.id,
      url: r.data.urls.regular,
      thumb: r.data.urls.small || r.data.urls.thumb,
      full: r.data.urls.full,
      author: r.data.user.name,
      type: "external",
      description: r.data.description || r.data.alt_description || "",
      tags: r.data.tags?.map((t) => t.title) || [],
    });
  } catch (e) {
    console.error("Single image route error:", e);
    next(e);
  }
});

export default router;
