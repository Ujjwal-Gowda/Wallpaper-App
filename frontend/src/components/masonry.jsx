import { useEffect, useState, useRef, useCallback } from "react";
import Masonry from "react-masonry-css";
import { Heart, Search, Loader2, X } from "lucide-react";
import axios from "axios";
import { API_ENDPOINTS } from "../config/api.js";
import ImageModal from "./ImageModal.jsx";
import { useSearch } from "../context/SearchContext.jsx";

export default function MasonryGrid() {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const { query, setQuery, searchText, setSearchText, clearSearch } =
    useSearch();
  const [favoriteStatus, setFavoriteStatus] = useState({});
  const [isMobile, setIsMobile] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [selectedImage, setSelectedImage] = useState(null);
  const [useUnsplash, setUseUnsplash] = useState(import.meta.env.PROD);

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

  // Detect mobile device
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

  // Reset when query changes
  useEffect(() => {
    setImages([]);
    setPage(1);
    setHasMore(true);
  }, [query]);

  // Fetch when page, query or useUnsplash changes
  useEffect(() => {
    fetchImages(query, page);
  }, [query, page, useUnsplash]);

  // Fetch images from backend API
  async function fetchImages(q, p) {
    try {
      if (p === 1) setLoading(true);
      else setLoadingMore(true);

      const res = await fetch(
        `${API_ENDPOINTS.EXTERNAL_IMAGES}?query=${encodeURIComponent(q)}&page=${p}&per_page=20&useUnsplash=${useUnsplash}`,
      );

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const data = await res.json();
      const newItems = data.items || [];

      if (newItems.length === 0) {
        setHasMore(false);
      }

      // merge old + new
      setImages((prev) => {
        if (p === 1) return newItems;
        const seen = new Set(prev.map((img) => img.id));
        const filteredNew = newItems.filter((img) => !seen.has(img.id));
        return [...prev, ...filteredNew];
      });

      // Check favorite status for each image (if user is logged in)
      const token = localStorage.getItem("token");
      if (token && newItems.length > 0) {
        checkFavoriteStatus(newItems);
      }
    } catch (err) {
      console.error("Error fetching images:", err);
      if (p === 1) setImages([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }

  // Check which images are favorited
  async function checkFavoriteStatus(imageList) {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const statusPromises = imageList.map(async (img) => {
        try {
          if (img.id.startsWith("local") || img.type === "local") {
            return { id: img.id, isFavorite: false };
          }

          const res = await axios.get(
            API_ENDPOINTS.EXTERNAL_FAVORITE_CHECK(img.id),
            {
              headers: { Authorization: `Bearer ${token}` },
              timeout: 5000,
            },
          );
          return { id: img.id, isFavorite: res.data.isFavorite };
        } catch (err) {
          return { id: img.id, isFavorite: false };
        }
      });

      const statusResults = await Promise.all(statusPromises);
      const statusMap = { ...favoriteStatus };
      statusResults.forEach(({ id, isFavorite }) => {
        statusMap[id] = isFavorite;
      });
      setFavoriteStatus(statusMap);
    } catch (err) {
      console.error("Error checking favorite status:", err);
    }
  }

  const toggleFavorite = async (img) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        alert("Please login to add favorites");
        return;
      }

      const isFavorite = favoriteStatus[img.id] || false;

      if (isFavorite) {
        await axios.delete(API_ENDPOINTS.EXTERNAL_FAVORITE_REMOVE(img.id), {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 10000,
        });
      } else {
        await axios.post(
          API_ENDPOINTS.EXTERNAL_FAVORITE,
          {
            externalId: img.id,
            url: img.url,
            thumb: img.thumb,
            author: img.author,
            title: img.description || `Image by ${img.author}`,
          },
          {
            headers: { Authorization: `Bearer ${token}` },
            timeout: 10000,
          },
        );
      }

      setFavoriteStatus((prev) => ({
        ...prev,
        [img.id]: !isFavorite,
      }));
    } catch (err) {
      console.error("Error toggling favorite:", err);
    }
  };

  const breakpointColumnsObj = {
    default: 4,
    1100: 3,
    700: 2,
    500: 1,
  };

  const handleSearch = (e) => {
    if (e) e.preventDefault();
    setQuery(searchText);
  };

  return (
    <div className="p-4 ml-20 bg-base-100 min-h-screen">
      {/* Search Bar & Home Button */}
      <div className="flex flex-col items-center mb-12 mt-6">
        <form onSubmit={handleSearch} className="flex justify-center w-full">
          <div className="relative w-full max-w-2xl group">
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Search high-quality wallpapers..."
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
              Unsplash API
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
            <div className="flex items-center gap-4">
              <h2 className="text-2xl font-bold text-base-content">
                Results for <span className="text-primary">"{query}"</span>
              </h2>
            </div>
          )}
        </div>
      </div>

      {/* Masonry Grid */}
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
              const isFavorite = favoriteStatus[img.id] || false;
              const isLastElement = images.length === index + 1;

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
                      alt={img.author}
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
                    className={`absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 
                    ${isMobile ? "opacity-100" : "opacity-0 group-hover:opacity-100"}
                    ${isFavorite ? "bg-red-500 text-white" : "bg-black/30 backdrop-blur-sm text-white hover:bg-black/50"}
`}
                  >
                    <Heart
                      size={isMobile ? 20 : 24}
                      fill={isFavorite ? "currentColor" : "none"}
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
                      by {img.author}
                    </p>
                  </div>

                  {(img.id.startsWith("local") || img.type === "local") && (
                    <div className="absolute top-3 left-3 badge badge-primary font-bold">
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
              <p>You've reached the end of the collection ✨</p>
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
          isFavorite={favoriteStatus[selectedImage.id] || false}
          onImageSelect={(img) => setSelectedImage(img)}
        />
      )}
    </div>
  );
}
