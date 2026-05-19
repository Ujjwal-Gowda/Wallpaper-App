import { useEffect, useState } from "react";
import axios from "axios";
import Masonry from "react-masonry-css";
import { Trash2, Heart } from "lucide-react";
import { API_ENDPOINTS } from "../config/api.js";
import ImageModal from "../components/ImageModal.jsx";
import { useTheme } from "../context/ThemeContext.jsx";

// ─── Inline notification hook ─────────────────────────────────────────────────
function useNotifications() {
  const [notifications, setNotifications] = useState([]);
  const add = (msg, type = "info") => {
    const id = Date.now() + Math.random();
    setNotifications((prev) => [...prev, { id, msg, type }]);
    setTimeout(
      () => setNotifications((prev) => prev.filter((n) => n.id !== id)),
      3500,
    );
  };
  const remove = (id) =>
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  return { notifications, add, remove };
}

function NotificationToast({ notifications, onRemove }) {
  return (
    <div className="fixed top-4 right-4 z-[10001] flex flex-col gap-2 pointer-events-none">
      {notifications.map((n) => (
        <div
          key={n.id}
          className="flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl text-sm font-medium max-w-xs pointer-events-auto text-white"
          style={{
            animation: "slideInRight 0.3s cubic-bezier(.22,.68,0,1.2)",
            background:
              n.type === "success"
                ? "linear-gradient(135deg,#22c55e,#16a34a)"
                : n.type === "error"
                  ? "linear-gradient(135deg,#ef4444,#dc2626)"
                  : "linear-gradient(135deg,#3b82f6,#1d4ed8)",
          }}
          onClick={() => onRemove(n.id)}
        >
          {n.msg}
        </div>
      ))}
      <style>{`
        @keyframes slideInRight {
          from { opacity:0; transform: translateX(60px) scale(0.95); }
          to   { opacity:1; transform: translateX(0) scale(1); }
        }
      `}</style>
    </div>
  );
}

export default function Favourite() {
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const { theme } = useTheme();
  const {
    notifications,
    add: addNotif,
    remove: removeNotif,
  } = useNotifications();

  useEffect(() => {
    fetchFavorites();
  }, []);

  const fetchFavorites = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(API_ENDPOINTS.ALL_FAVORITES, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setFavorites(res.data.items);
    } catch (err) {
      console.error("Error fetching favorites:", err);
    } finally {
      setLoading(false);
    }
  };

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

  const removeFavorite = async (favorite) => {
    try {
      const token = localStorage.getItem("token");
      const favId = favorite.externalId || favorite.id;

      if (favorite.type === "external") {
        await axios.delete(API_ENDPOINTS.EXTERNAL_FAVORITE_REMOVE(favId), {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        await axios.delete(`${API_ENDPOINTS.INTERNAL_FAVORITE_REMOVE(favId)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }

      setFavorites((prev) =>
        prev.filter((fav) => {
          const id = fav.externalId || fav.id;
          return id !== favId;
        }),
      );
      if (selectedImage?.id === favId) setSelectedImage(null);
      addNotif("Removed from favorites", "info");
    } catch (err) {
      console.error("Error removing favorite:", err);
      addNotif("Failed to remove favorite", "error");
    }
  };

  const breakpointColumnsObj = { default: 4, 1100: 3, 700: 2, 500: 1 };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-base-100">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    );
  }

  return (
    <div className="p-4 ml-20 bg-base-100 min-h-screen">
      <NotificationToast notifications={notifications} onRemove={removeNotif} />

      <header className="mb-10 text-center">
        <h1 className="text-4xl font-black mb-2 bg-gradient-to-r from-primary to-secondary bg-clip-text ">
          My Favorites
        </h1>
        <p className="text-base-content/60">
          Your curated collection of beautiful wallpapers
        </p>
        {favorites.length > 0 && (
          <div className="badge badge-primary badge-lg mt-2">
            {favorites.length} saved
          </div>
        )}
      </header>

      {favorites.length === 0 ? (
        <div className="text-center py-32 bg-base-200/30 rounded-3xl border-2 border-dashed border-base-300">
          <div className="text-6xl mb-4">✦</div>
          <h3 className="text-2xl font-bold mb-2">Nothing saved yet</h3>
          <p className="text-base-content/60 mb-6">
            Start exploring and heart images you love
          </p>
          <a href="/" className="btn btn-primary px-8 rounded-xl">
            Explore Wallpapers
          </a>
        </div>
      ) : (
        <Masonry
          breakpointCols={breakpointColumnsObj}
          className="flex gap-6"
          columnClassName="bg-clip-padding"
        >
          {favorites.map((fav) => {
            const displayId = fav.externalId || fav.id;
            return (
              <div
                key={`${fav.type}-${displayId}`}
                className="relative group mb-6 cursor-zoom-in"
                onClick={() =>
                  setSelectedImage({
                    ...fav,
                    url: fav.url || fav.thumb,
                    thumb: fav.thumb || fav.url,
                    author: fav.author || "Unknown",
                    id: displayId,
                    description: fav.Title || fav.title || fav.description,
                  })
                }
              >
                <div className="overflow-hidden rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 border border-base-300">
                  <img
                    src={fav.thumb || fav.url}
                    alt={fav.title || fav.Title || "Favorite image"}
                    className="w-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                </div>

                {/* Remove button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFavorite(fav);
                  }}
                  className={`absolute top-3 right-3 btn btn-circle btn-sm btn-error text-white transition-all duration-300 
                    ${isMobile ? "opacity-90" : "opacity-0 group-hover:opacity-100"}`}
                >
                  <Trash2 size={16} />
                </button>

                {/* Type badge */}
                <div className="absolute top-3 left-3 badge badge-primary font-bold shadow-lg opacity-0 group-hover:opacity-100 transition-opacity text-xs">
                  {fav.type === "external" ? "Unsplash" : "Local"}
                </div>

                {/* Info overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/60 to-transparent text-white rounded-b-2xl opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="text-sm font-semibold truncate">
                    {fav.title || fav.Title || "Untitled"}
                  </p>
                  {fav.author && (
                    <p className="text-xs opacity-80">by {fav.author}</p>
                  )}
                </div>
              </div>
            );
          })}
        </Masonry>
      )}

      {selectedImage && (
        <ImageModal
          image={selectedImage}
          onClose={() => setSelectedImage(null)}
          toggleFavorite={() => removeFavorite(selectedImage)}
          isFavorite={true}
          onImageSelect={(img) =>
            setSelectedImage({
              ...img,
              url: img.url || img.thumb,
              thumb: img.thumb || img.url,
              author: img.author || "Unknown",
              id: img.externalId || img.id,
            })
          }
        />
      )}
    </div>
  );
}
