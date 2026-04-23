import React, { useEffect, useState, useRef } from "react";
import { X, Heart, Download, ExternalLink, User, ChevronLeft, Share2 } from "lucide-react";
import axios from "axios";
import { API_ENDPOINTS } from "../config/api.js";
import Masonry from "react-masonry-css";
import { useTheme } from "../context/ThemeContext.jsx";

export default function ImageModal({ image, onClose, toggleFavorite, isFavorite, onImageSelect }) {
  const { theme } = useTheme();
  const [relatedImages, setRelatedImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const sidebarRef = useRef();

  useEffect(() => {
    if (image) {
      fetchRelatedImages();
      if (sidebarRef.current) sidebarRef.current.scrollTo({ top: 0 });
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [image]);

  const fetchRelatedImages = async () => {
    try {
      setLoading(true);
      const res = await axios.get(API_ENDPOINTS.EXTERNAL_IMAGE_RELATED(image.id));
      setRelatedImages(res.data.items || []);
    } catch (err) {
      console.error("Error fetching related images:", err);
    } finally {
      setLoading(false);
    }
  };

  if (!image) return null;

  // 3 columns for similar images in a 50% sidebar
  const breakpointColumnsObj = {
    default: 3,
    1200: 2,
    500: 1,
  };

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = image.url;
    link.download = `wallpaper-${image.id}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-base-100 flex flex-col overflow-hidden" data-theme={theme}>
      {/* Top Header - Solid Background */}
      <header className="h-16 border-b border-base-300 flex items-center justify-between px-6 bg-base-100 z-[110]">
        <button 
          onClick={onClose}
          className="btn btn-ghost gap-2 normal-case font-bold"
        >
          <ChevronLeft size={24} /> Back
        </button>

        <div className="flex items-center gap-2">
           <button 
            className="btn btn-ghost btn-circle"
            onClick={() => {
                const text = `Check out this wallpaper by ${image.author}`;
                if (navigator.share) {
                    navigator.share({ title: 'Wallpaper App', text, url: image.link });
                } else {
                    navigator.clipboard.writeText(image.link);
                    alert("Link copied to clipboard!");
                }
            }}
          >
            <Share2 size={20} />
          </button>
          <button 
            onClick={() => toggleFavorite(image)}
            className={`btn btn-circle ${isFavorite ? 'btn-error text-white' : 'btn-ghost bg-base-200'}`}
          >
            <Heart fill={isFavorite ? "currentColor" : "none"} size={20} />
          </button>
          <button 
            onClick={handleDownload}
            className="btn btn-primary px-8 rounded-full gap-2"
          >
            <Download size={20} /> <span className="hidden sm:inline">Download Free</span>
          </button>
        </div>
      </header>

      {/* Balanced 50/50 Layout */}
      <main className="flex-1 flex flex-col md:flex-row overflow-hidden bg-base-100">
        
        {/* Left Side: 50% Main Image */}
        <section className="w-full md:w-1/2 bg-base-200 flex items-center justify-center p-6 md:p-12 overflow-hidden border-r border-base-300">
          <div className="relative w-full h-full flex items-center justify-center">
            <img 
              src={image.url} 
              alt={image.description || "Wallpaper"} 
              className="max-w-full max-h-full object-contain rounded-xl shadow-2xl"
            />
          </div>
        </section>

        {/* Right Side: 50% Details & Recommendations */}
        <section 
          ref={sidebarRef}
          className="w-full md:w-1/2 bg-base-100 overflow-y-auto p-8 md:p-12 scrollbar-hide"
        >
          <div className="max-w-2xl mx-auto">
            {/* Author Info */}
            <div className="flex items-center gap-4 mb-8">
              <div className="avatar placeholder">
                <div className="bg-neutral text-neutral-content rounded-full w-16">
                  <User size={32} />
                </div>
              </div>
              <div>
                <h3 className="text-2xl font-black text-base-content leading-tight">{image.author}</h3>
                <p className="text-base-content/50">Curated from Unsplash</p>
              </div>
            </div>

            <h1 className="text-3xl md:text-4xl font-black text-base-content mb-6 leading-tight">
              {image.description || "High Quality Wallpaper"}
            </h1>
            
            <div className="flex flex-wrap gap-4 mb-10">
               <a 
                href={image.link} 
                target="_blank" 
                rel="noopener noreferrer"
                className="btn btn-outline btn-md gap-2 rounded-xl"
              >
                View Original <ExternalLink size={18} />
              </a>
               <button 
                className="btn btn-ghost btn-md gap-2 rounded-xl border border-base-300"
                onClick={handleDownload}
              >
                <Download size={18} /> High-Res JPG
              </button>
            </div>

            <div className="divider" />

            {/* Similar Recommendations */}
            <div className="mt-12">
              <h2 className="text-2xl font-black mb-8">More like this</h2>
              
              {loading ? (
                <div className="flex justify-center py-20">
                  <span className="loading loading-spinner loading-lg text-primary"></span>
                </div>
              ) : (
                <Masonry
                  breakpointCols={breakpointColumnsObj}
                  className="flex gap-4"
                  columnClassName="bg-clip-padding"
                >
                  {relatedImages.map((img) => (
                    <div 
                      key={img.id} 
                      className="mb-4 cursor-pointer group relative rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 bg-base-200"
                      onClick={() => {
                        onImageSelect && onImageSelect(img);
                        sidebarRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                    >
                      <img 
                        src={img.thumb} 
                        alt={img.author} 
                        className="w-full hover:scale-110 transition-transform duration-700"
                      />
                      <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  ))}
                </Masonry>
              )}
            </div>
          </div>
          
          <div className="h-20" />
        </section>
      </main>
    </div>
  );
}
