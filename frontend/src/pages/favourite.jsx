import { useEffect, useState } from "react";
import axios from "axios";
import Masonry from "react-masonry-css";
import { Heart, Trash2, Ghost } from "lucide-react";
import { API_ENDPOINTS } from "../config/api.js";
import ImageModal from "../components/ImageModal.jsx";

export default function Favourite() {
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);

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
          navigator.userAgent
        )
      );
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);


  const removeFavorite = async (favorite) => {
    try {
      const token = localStorage.getItem("token");
      
      if (favorite.type === 'external') {
        await axios.delete(API_ENDPOINTS.EXTERNAL_FAVORITE_REMOVE(favorite.id), {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        await axios.delete(`${API_ENDPOINTS.API_BASE_URL}/api/images/${favorite.id}/favorite`, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      
      setFavorites(favorites.filter(fav => fav.id !== favorite.id));
      if (selectedImage?.id === favorite.id) setSelectedImage(null);
    } catch (err) {
      console.error("Error removing favorite:", err);
    }
  };

  const breakpointColumnsObj = {
    default: 4,
    1100: 3,
    700: 2,
    500: 1,
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    );
  }

  return (
    <div className="p-4 ml-20 bg-base-100 min-h-screen">
      <header className="mb-10 text-center">
        <h1 className="text-4xl font-black mb-2 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">My Favorites</h1>
        <p className="text-base-content/60">Your curated collection of beautiful wallpapers</p>
      </header>
      
      {favorites.length === 0 ? (
          <div className="text-center py-32 bg-base-200/30 rounded-3xl border-2 border-dashed border-base-300">
            <div className="bg-base-200 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Ghost size={40} className="text-base-content/20" />
            </div>
            <h3 className="text-2xl font-bold mb-2">No favorites yet</h3>
            <p className="text-base-content/60 max-w-xs mx-auto mb-8">Start exploring and save the images you love to see them here!</p>
            <a href="/" className="btn btn-primary px-8 rounded-xl">Explore Wallpapers</a>
          </div>
        ) : (
          <Masonry
            breakpointCols={breakpointColumnsObj}
            className="flex gap-6"
            columnClassName="bg-clip-padding"
          >
            {favorites.map((fav) => (
              <div 
                key={`${fav.type}-${fav.id}`} 
                className="relative group mb-6 cursor-zoom-in"
                onClick={() => setSelectedImage({
                  ...fav,
                  url: fav.url || fav.thumb,
                  thumb: fav.thumb || fav.url,
                  author: fav.author || "Unknown",
                  id: fav.externalId || fav.id
                })}
              >
                <div className="overflow-hidden rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 border border-base-300">
                  <img
                    src={fav.thumb || fav.url}
                    alt={fav.title || "Favorite image"}
                    className="w-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                </div>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFavorite(fav);
                  }}
                  className={`absolute top-3 right-3 btn btn-circle btn-sm btn-error text-white transition-all duration-300 
                    ${isMobile ? 'opacity-90' : 'opacity-0 group-hover:opacity-100'}
                  `}
                >
                  <Trash2 size={18} />
                </button>

                <div className="absolute top-3 left-3 badge badge-primary font-bold shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
                  {fav.type === 'external' ? 'Unsplash' : 'Local'}
                </div>
                
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/60 to-transparent text-white rounded-b-2xl opacity-0 group-hover:opacity-100 transition-opacity">
                   <p className="text-sm font-semibold truncate">{fav.title || "Untitled"}</p>
                   {fav.author && <p className="text-xs opacity-80">by {fav.author}</p>}
                </div>
              </div>
            ))}
          </Masonry>
        )}

      {selectedImage && (
        <ImageModal 
          image={selectedImage} 
          onClose={() => setSelectedImage(null)} 
          toggleFavorite={() => removeFavorite(selectedImage)}
          isFavorite={true}
          onImageSelect={(img) => setSelectedImage({
            ...img,
            url: img.url || img.thumb,
            thumb: img.thumb || img.url,
            author: img.author || "Unknown",
            id: img.id
          })}
        />
      )}
    </div>
  );
}
