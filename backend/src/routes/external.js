import { Router } from "express";
import axios from "axios";
import dotenv from "dotenv";
import { Image } from "../models/image.js";
dotenv.config();

const router = Router();

const UNSPLASH_KEY = process.env.UNSPLASH_ACCESS_KEY;

const defaultImages = [
  {
    id: "local1",
    url: "ironman.jpeg",
    thumb: "ironman.jpeg",
    author: "Local",
    title: "Iron Man",
    tags: ["marvel", "superhero", "ironman"],
  },
  {
    id: "local2",
    url: "skull.jpeg",
    thumb: "skull.jpeg",
    author: "Local",
    title: "Skull Art",
    tags: ["skull", "dark", "art"],
  },
  {
    id: "local3",
    url: "watercat.jpeg",
    thumb: "watercat.jpeg",
    author: "Local",
    title: "Water Cat",
    tags: ["cat", "water", "animal"],
  },
  {
    id: "local4",
    url: "ladybug.jpeg",
    thumb: "ladybug.jpeg",
    author: "Local",
    title: "Ladybug",
    tags: ["insect", "nature", "bug"],
  },
  {
    id: "local5",
    url: "blackcat.jpeg",
    thumb: "blackcat.jpeg",
    author: "Local",
    title: "Black Cat",
    tags: ["cat", "dark", "animal"],
  },
  {
    id: "local6",
    url: "architect.jpeg",
    thumb: "architect.jpeg",
    author: "Local",
    title: "Architecture",
    tags: ["building", "architecture", "city"],
  },
  {
    id: "local7",
    url: "redcat.jpeg",
    thumb: "redcat.jpeg",
    author: "Local",
    title: "Red Cat",
    tags: ["cat", "red", "animal"],
  },
  {
    id: "local8",
    url: "japan.jpeg",
    thumb: "japan.jpeg",
    author: "Local",
    title: "Japan",
    tags: ["japan", "travel", "culture"],
  },
  {
    id: "local9",
    url: "grass.jpeg",
    thumb: "grass.jpeg",
    author: "Local",
    title: "Grass Field",
    tags: ["nature", "green", "grass"],
  },
  {
    id: "local10",
    url: "lamp.jpeg",
    thumb: "lamp.jpeg",
    author: "Local",
    title: "Street Lamp",
    tags: ["lamp", "light", "street"],
  },
  {
    id: "local11",
    url: "sheep.jpeg",
    thumb: "sheep.jpeg",
    author: "Local",
    title: "Sheep",
    tags: ["animal", "sheep", "nature"],
  },
  {
    id: "local12",
    url: "wallpaper.jpeg",
    thumb: "wallpaper.jpeg",
    author: "Local",
    title: "Abstract Wallpaper",
    tags: ["abstract", "wallpaper"],
  },
  {
    id: "local13",
    url: "yello.jpeg",
    thumb: "yello.jpeg",
    author: "Local",
    title: "Yellow Tones",
    tags: ["yellow", "color", "abstract"],
  },
  {
    id: "local14",
    url: "car.jpeg",
    thumb: "car.jpeg",
    author: "Local",
    title: "Car",
    tags: ["car", "vehicle", "automotive"],
  },
  {
    id: "local16",
    url: "zoro.jpeg",
    thumb: "zoro.jpeg",
    author: "Local",
    title: "Zoro",
    tags: ["anime", "one piece", "zoro"],
  },
  {
    id: "local17",
    url: "shep.jpeg",
    thumb: "shep.jpeg",
    author: "Local",
    title: "Shepherd",
    tags: ["animal", "shepherd", "dog"],
  },
  {
    id: "local18",
    url: "momo.jpeg",
    thumb: "momo.jpeg",
    author: "Local",
    title: "Momo",
    tags: ["anime", "avatar", "momo"],
  },
  {
    id: "local19",
    url: "luffy.jpeg",
    thumb: "luffy.jpeg",
    author: "Local",
    title: "Luffy",
    tags: ["anime", "one piece", "luffy"],
  },
  {
    id: "local20",
    url: "dog.jpeg",
    thumb: "dog.jpeg",
    author: "Local",
    title: "Dog",
    tags: ["dog", "animal", "pet"],
  },
  {
    id: "local21",
    url: "flower.jpeg",
    thumb: "flower.jpeg",
    author: "Local",
    title: "Flower",
    tags: ["flower", "nature", "bloom"],
  },
  {
    id: "local22",
    url: "fish.jpeg",
    thumb: "fish.jpeg",
    author: "Local",
    title: "Fish",
    tags: ["fish", "ocean", "water"],
  },
  {
    id: "local23",
    url: "spidy.jpeg",
    thumb: "spidy.jpeg",
    author: "Local",
    title: "Spider-Man",
    tags: ["marvel", "superhero", "spiderman"],
  },
  {
    id: "local24",
    url: "cherry.jpeg",
    thumb: "cherry.jpeg",
    author: "Local",
    title: "Cherry Blossom",
    tags: ["cherry", "japan", "flower"],
  },
  {
    id: "local25",
    url: "window.jpeg",
    thumb: "window.jpeg",
    author: "Local",
    title: "Window View",
    tags: ["window", "architecture", "light"],
  },
  {
    id: "local26",
    url: "tree.jpeg",
    thumb: "tree.jpeg",
    author: "Local",
    title: "Tree",
    tags: ["tree", "nature", "forest"],
  },
  {
    id: "local27",
    url: "rdr.jpeg",
    thumb: "rdr.jpeg",
    author: "Local",
    title: "Red Dead Redemption",
    tags: ["game", "western", "rdr"],
  },
  {
    id: "local28",
    url: "bug.jpeg",
    thumb: "bug.jpeg",
    author: "Local",
    title: "Bug",
    tags: ["insect", "bug", "nature"],
  },
  {
    id: "local29",
    url: "op.jpeg",
    thumb: "op.jpeg",
    author: "Local",
    title: "One Piece",
    tags: ["anime", "one piece"],
  },
];

function getBaseUrl(req) {
  return process.env.NODE_ENV === "production"
    ? "https://wallpaper-app-1-9rq5.onrender.com"
    : `${req.protocol}://${req.get("host")}`;
}

function mapLocalImages(images, baseUrl) {
  return images.map((img) => ({
    ...img,
    url: `${baseUrl}/static-images/${img.url}`,
    thumb: `${baseUrl}/static-images/${img.url}`,
    type: "local",
  }));
}

function mapDbImages(dbImages) {
  return dbImages.map((img) => ({
    id: img._id.toString(),
    url: img.url,
    thumb: img.url,
    author: img.owner?.name || "User",
    description: img.Title,
    Title: img.Title,
    type: "local",
    tags: img.tags || [],
  }));
}

// Score a static image by how well its title/tags match a query
function scoreLocalMatch(img, q) {
  const lower = q.toLowerCase();
  const terms = lower.split(/\s+/);
  let score = 0;
  const titleLower = (img.title || "").toLowerCase();
  const tags = img.tags || [];

  for (const term of terms) {
    if (titleLower.includes(term)) score += 3;
    if (tags.some((t) => t.toLowerCase().includes(term))) score += 2;
  }
  return score;
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
    const baseUrl = getBaseUrl(req);

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

    // Static local images
    let filteredStatic = mapLocalImages(defaultImages, baseUrl);

    if (query) {
      // Score and sort static images by relevance
      filteredStatic = filteredStatic
        .map((img) => {
          const raw = defaultImages.find((d) => d.id === img.id);
          return { ...img, _score: raw ? scoreLocalMatch(raw, query) : 0 };
        })
        .filter((img) => img._score > 0)
        .sort((a, b) => b._score - a._score)
        .map(({ _score, ...img }) => img);
    }

    // No query: homepage recommendations
    if (!query) {
      let items = [...formattedDbImages, ...filteredStatic];
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
    const allLocalMatches = [...formattedDbImages, ...filteredStatic];

    if (!UNSPLASH_KEY || !shouldUseUnsplash) {
      const start = (pageNum - 1) * perPageNum;
      const end = start + perPageNum;
      return res.json({
        items: allLocalMatches.slice(start, end),
        total_pages: Math.ceil(allLocalMatches.length / perPageNum),
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

      // DB + local matches always come first in search results
      const combined = [
        ...formattedDbImages,
        ...filteredStatic,
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
        items: allLocalMatches.slice(start, end),
        total_pages: Math.ceil(allLocalMatches.length / perPageNum),
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
    const baseUrl = getBaseUrl(req);

    if (id.startsWith("local")) {
      const sourceImg = defaultImages.find((x) => x.id === id);
      const sourceTags = sourceImg?.tags || [];

      // Score other local images by tag overlap
      const scored = defaultImages
        .filter((img) => img.id !== id)
        .map((img) => {
          const overlap = img.tags.filter((t) => sourceTags.includes(t)).length;
          return { ...img, _score: overlap };
        })
        .sort((a, b) => b._score - a._score)
        .slice(0, 12)
        .map(({ _score, ...img }) => ({
          ...img,
          url: `${baseUrl}/static-images/${img.url}`,
          thumb: `${baseUrl}/static-images/${img.url}`,
          type: "local",
        }));

      return res.json({ items: scored });
    }

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

          // Also add some static local images as filler if not enough
          if (formattedRelated.length < 6) {
            const localFiller = mapLocalImages(
              defaultImages.slice(0, 6 - formattedRelated.length),
              baseUrl,
            );
            return res.json({ items: [...formattedRelated, ...localFiller] });
          }

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
    const baseUrl = getBaseUrl(req);

    if (id.startsWith("local")) {
      const img = defaultImages.find((x) => x.id === id);
      if (!img) return res.status(404).json({ message: "Image not found" });
      return res.json({
        ...img,
        url: `${baseUrl}/static-images/${img.url}`,
        thumb: `${baseUrl}/static-images/${img.url}`,
        type: "local",
      });
    }

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
        // Not a valid ObjectId
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
