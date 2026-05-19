import { useEffect, useState, useRef, useCallback } from "react";
import Masonry from "react-masonry-css";
import {
  Heart,
  Search,
  Loader2,
  Bell,
  X,
  CheckCircle,
  Info,
  AlertTriangle,
} from "lucide-react";
import axios from "axios";
import { API_ENDPOINTS } from "../config/api.js";
import ImageModal from "./ImageModal.jsx";
import { useSearch } from "../context/SearchContext.jsx";
import { useTheme } from "../context/ThemeContext.jsx";

// ─── Global Notification System ───────────────────────────────────────────────
let globalNotifyFn = null;

export function notify(msg, type = "info") {
  if (globalNotifyFn) globalNotifyFn(msg, type);
}

function NotificationToast({ notifications, onRemove }) {
  return (
    <div className="fixed top-4 right-4 z-[10001] flex flex-col gap-2 pointer-events-none">
      {notifications.map((n) => (
        <div
          key={n.id}
          className="flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl text-sm font-medium max-w-xs pointer-events-auto"
          style={{
            animation: "slideInRight 0.3s cubic-bezier(.22,.68,0,1.2)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(255,255,255,0.12)",
            background:
              n.type === "success"
                ? "linear-gradient(135deg,#22c55e,#16a34a)"
                : n.type === "error"
                  ? "linear-gradient(135deg,#ef4444,#dc2626)"
                  : n.type === "warning"
                    ? "linear-gradient(135deg,#f59e0b,#d97706)"
                    : "linear-gradient(135deg,#3b82f6,#1d4ed8)",
            color: "#fff",
          }}
        >
          {n.type === "success" && (
            <CheckCircle size={16} className="shrink-0" />
          )}
          {n.type === "error" && <X size={16} className="shrink-0" />}
          {n.type === "warning" && (
            <AlertTriangle size={16} className="shrink-0" />
          )}
          {n.type === "info" && <Info size={16} className="shrink-0" />}
          <span className="flex-1">{n.msg}</span>
          <button
            onClick={() => onRemove(n.id)}
            className="opacity-60 hover:opacity-100 transition-opacity ml-1"
          >
            <X size={14} />
          </button>
        </div>
      ))}
      <style>{`
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(60px) scale(0.95); }
          to   { opacity: 1; transform: translateX(0) scale(1); }
        }
      `}</style>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function MasonryGrid() {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const { query, setQuery, searchText, setSearchText } = useSearch();
  const { theme } = useTheme();
  const [favoriteIds, setFavoriteIds] = useState(new Set());
  const [isMobile, setIsMobile] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [selectedImage, setSelectedImage] = useState(null);
  const [useUnsplash, setUseUnsplash] = useState(true);
  const [notifications, setNotifications] = useState([]);

  // Register global notify
  useEffect(() => {
    globalNotifyFn = (msg, type) => {
      const id = Date.now() + Math.random();
      setNotifications((prev) => [...prev, { id, msg, type }]);
      setTimeout(() => {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
      }, 4000);
    };
    return () => {
      globalNotifyFn = null;
    };
  }, []);

  const removeNotification = (id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const observer = useRef();
  const lastImageRef = useCallback(
    (node) => {
      if (loading || loadingMore) return;
      if (observer.current) observer.current.disconnect();
      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore) {
          setPage((prevPage) => prevPage + 1);
        }
      });
      if (node) observer.current.observe(node);
    },
    [loading, loadingMore, hasMore],
  );

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(
        window.innerWidth <= 768 ||
          /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
            navigator.userAgent,
          ),
      );
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    setImages([]);
    setPage(1);
    setHasMore(true);
  }, [query]);

  useEffect(() => {
    fetchImages(query, page);
  }, [query, page, useUnsplash]);

  // Fetch all favorites once on mount if logged in
  useEffect(() => {
    const fetchAllFavorites = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;
      try {
        const res = await axios.get(API_ENDPOINTS.ALL_FAVORITES, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const ids = new Set(res.data.items.map((fav) => fav.id || fav._id));
        setFavoriteIds(ids);
      } catch (err) {
        console.error("Error fetching all favorites:", err);
      }
    };
    fetchAllFavorites();
  }, []);

  async function fetchImages(q, p) {
    try {
      if (p === 1) setLoading(true);
      else setLoadingMore(true);

      const res = await fetch(
        `${API_ENDPOINTS.EXTERNAL_IMAGES}?query=${encodeURIComponent(q)}&page=${p}&per_page=20&useUnsplash=${useUnsplash}`,
      );

      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

      const data = await res.json();
      const newItems = data.items || [];

      if (newItems.length === 0) setHasMore(false);

      setImages((prev) => {
        if (p === 1) return newItems;
        const seen = new Set(prev.map((img) => img.id));
        const filteredNew = newItems.filter((img) => !seen.has(img.id));
        return [...prev, ...filteredNew];
      });

    } catch (err) {
      console.error("Error fetching images:", err);
      if (p === 1) setImages([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }

  const toggleFavorite = async (img) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        globalNotifyFn?.("Please login to add favorites", "warning");
        return;
      }

      const isFavorite = favoriteIds.has(img.id);

      if (isFavorite) {
        // Optimistic update
        setFavoriteIds((prev) => {
          const next = new Set(prev);
          next.delete(img.id);
          return next;
        });

        await axios.delete(API_ENDPOINTS.EXTERNAL_FAVORITE_REMOVE(img.id), {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 10000,
        });
        globalNotifyFn?.("Removed from favorites", "info");
      } else {
        // Optimistic update
        setFavoriteIds((prev) => {
          const next = new Set(prev);
          next.add(img.id);
          return next;
        });

        await axios.post(
          API_ENDPOINTS.EXTERNAL_FAVORITE,
          {
            externalId: img.id,
            url: img.url,
            thumb: img.thumb,
            author: img.author,
            title: img.description || img.Title || `Image by ${img.author}`,
          },
          { headers: { Authorization: `Bearer ${token}` }, timeout: 10000 },
        );
        globalNotifyFn?.("Added to favorites!", "success");
      }
    } catch (err) {
      console.error("Error toggling favorite:", err);
      globalNotifyFn?.("Failed to update favorites", "error");
      // Revert optimistic update? For simplicity, we'll just log. 
      // In a real app, we'd fetch favorites again or revert.
    }
  };

  const breakpointColumnsObj = { default: 4, 1100: 3, 700: 2, 500: 1 };

  const handleSearch = (e) => {
    if (e) e.preventDefault();
    setQuery(searchText);
  };

  const isDark =
    theme === "dark" ||
    theme === "synthwave" ||
    theme === "night" ||
    theme === "dracula" ||
    theme === "halloween" ||
    theme === "forest" ||
    theme === "black" ||
    theme === "luxury" ||
    theme === "coffee" ||
    theme === "business";

  return (
    <div className="p-4 ml-20 bg-base-100 min-h-screen">
      {/* Global notifications */}
      <NotificationToast
        notifications={notifications}
        onRemove={removeNotification}
      />

      {/* Search Bar */}
      <div className="flex flex-col items-center mb-12 mt-6">
        <form onSubmit={handleSearch} className="flex justify-center w-full">
          <div className="relative w-full max-w-2xl group">
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Search wallpapers by name, style, tag…"
              className="input input-bordered w-full pl-12 h-14 rounded-2xl shadow-sm focus:shadow-md transition-all duration-300 bg-base-100 text-base-content"
            />
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-base-content/40 group-focus-within:text-primary transition-colors"
              size={24}
            />
            <button
              type="submit"
              className="absolute right-2 top-2 btn btn-primary rounded-xl px-6"
            >
              Search
            </button>
          </div>
        </form>

        <div className="mt-4 flex flex-col items-center gap-4">
          <div className="flex items-center gap-3 bg-base-200 p-2 px-4 rounded-full shadow-inner">
            <span className="text-xs font-bold uppercase tracking-wider text-base-content/60">
              Unsplash
            </span>
            <input
              type="checkbox"
              className="toggle toggle-primary toggle-sm"
              checked={useUnsplash}
              onChange={() => {
                setUseUnsplash(!useUnsplash);
                setImages([]);
                setPage(1);
              }}
            />
            <span
              className={`text-xs font-bold ${useUnsplash ? "text-primary" : "text-base-content/40"}`}
            >
              {useUnsplash ? "ON" : "OFF"}
            </span>
          </div>

          {query && (
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-base-content">
                Results for <span className="text-primary">"{query}"</span>
              </h2>
              <button
                onClick={() => {
                  setQuery("");
                  setSearchText("");
                }}
                className="btn btn-ghost btn-circle btn-sm"
              >
                <X size={16} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Grid */}
      {loading && images.length === 0 ? (
        <div className="flex flex-col justify-center items-center h-64 gap-4">
          <span className="loading loading-spinner loading-lg text-primary"></span>
          <p className="text-base-content/60 animate-pulse">
            Finding the best wallpapers...
          </p>
        </div>
      ) : images.length === 0 ? (
        <div className="text-center py-20">
          <div className="max-w-md mx-auto">
            <h3 className="text-2xl font-bold mb-2">No results found</h3>
            <p className="text-base-content/60">
              We couldn't find any images matching "{query}". Try different
              keywords.
            </p>
          </div>
        </div>
      ) : (
        <>
          <Masonry
            breakpointCols={breakpointColumnsObj}
            className="flex gap-6"
            columnClassName="bg-clip-padding"
          >
            {images.map((img, index) => {
              const isFavorite = favoriteIds.has(img.id);
              const isLastElement = images.length === index + 1;
              const isLocal =
                img.id?.toString().startsWith("local") || img.type === "local";

              return (
                <div
                  key={`${img.id}-${index}`}
                  ref={isLastElement ? lastImageRef : null}
                  className="relative group mb-6 cursor-zoom-in"
                  onClick={() => setSelectedImage(img)}
                >
                  <div className="overflow-hidden rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 border border-base-300 bg-base-200">
                    <img
                      src={img.thumb}
                      alt={img.author || img.Title || "wallpaper"}
                      className="w-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out min-h-[100px]"
                      loading="lazy"
                    />
                  </div>

                  {/* Favorite button */}
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      toggleFavorite(img);
                    }}
                    className={`absolute top-3 right-3 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg
                      ${isMobile ? "opacity-100" : "opacity-0 group-hover:opacity-100"}
                      ${isFavorite ? "bg-red-500 text-white scale-110" : "bg-black/20 backdrop-blur-md text-white hover:bg-black/40 hover:scale-110"}`}
                  >
                    <Heart
                      size={isMobile ? 22 : 20}
                      fill={isFavorite ? "currentColor" : "none"}
                      className={`${isFavorite ? "animate-pulse" : ""}`}
                    />
                  </button>

                  {/* Author info */}
                  <div
                    className={`absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/60 to-transparent text-white rounded-b-2xl transition-opacity duration-300 ${
                      isMobile
                        ? "opacity-90"
                        : "opacity-0 group-hover:opacity-100"
                    }`}
                  >
                    <p className="text-sm font-semibold truncate">
                      {img.Title || img.description || `by ${img.author}`}
                    </p>
                  </div>

                  {/* Local badge */}
                  {isLocal && (
                    <div className="absolute top-3 left-3 badge badge-primary font-bold text-xs shadow">
                      Local
                    </div>
                  )}
                </div>
              );
            })}
          </Masonry>

          {loadingMore && (
            <div className="flex justify-center py-10">
              <Loader2 className="animate-spin text-primary" size={40} />
            </div>
          )}

          {!hasMore && images.length > 0 && (
            <div className="text-center py-10 opacity-60">
              <p>You've reached the end of the collection</p>
            </div>
          )}
        </>
      )}

      {/* Image Detail Modal */}
      {selectedImage && (
        <ImageModal
          image={selectedImage}
          onClose={() => setSelectedImage(null)}
          toggleFavorite={toggleFavorite}
          isFavorite={favoriteIds.has(selectedImage.id)}
          onImageSelect={(img) => setSelectedImage(img)}
        />
      )}
    </div>
  );
}
