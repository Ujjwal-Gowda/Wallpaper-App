import React, { useEffect, useState, useRef } from "react";
import {
  Heart,
  Download,
  ExternalLink,
  ChevronLeft,
  Share2,
  Send,
  MessageCircle,
  X,
} from "lucide-react";
import axios from "axios";
import { API_ENDPOINTS, SOCKET_URL } from "../config/api.js";
import Masonry from "react-masonry-css";
import { useTheme } from "../context/ThemeContext.jsx";
import { useAuth } from "../hooks/useAuth.js";
import { io } from "socket.io-client";

export default function ImageModal({
  image,
  onClose,
  toggleFavorite,
  isFavorite,
  onImageSelect,
}) {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [relatedImages, setRelatedImages] = useState([]);
  const [loadingRelated, setLoadingRelated] = useState(true);
  const [activeTab, setActiveTab] = useState("related");
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const socketRef = useRef();
  const chatEndRef = useRef();
  const scrollContainerRef = useRef();

  useEffect(() => {
    if (!image) return;

    // Reset state for new image
    setLoadingRelated(true);
    setRelatedImages([]);
    setChatMessages([]);
    setChatInput("");

    // Fetch related images
    axios
      .get(API_ENDPOINTS.EXTERNAL_IMAGE_RELATED(image.id))
      .then((r) => setRelatedImages(r.data.items || []))
      .catch(console.error)
      .finally(() => setLoadingRelated(false));

    // Socket.io connection
    socketRef.current = io(SOCKET_URL);
    
    socketRef.current.emit("join_room", image.id);

    socketRef.current.on("chat_history", (history) => {
      setChatMessages(history);
    });

    socketRef.current.on("receive_message", (message) => {
      setChatMessages((prev) => [...prev, message]);
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [image?.id]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, activeTab]);

  if (!image) return null;

  const title = image.description || image.Title || image.title || "Untitled";

  const handleDownload = () => {
    const a = document.createElement("a");
    a.href = image.url;
    a.download = `wallpaper-${image.id}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleShare = () => {
    const txt = `Check out this wallpaper by ${image.author}`;
    if (navigator.share) {
      navigator.share({
        title: "Wallpaper App",
        text: txt,
        url: image.link || window.location.href,
      });
    } else {
      navigator.clipboard.writeText(image.link || window.location.href);
      alert("Link copied!");
    }
  };

  const sendChat = () => {
    const msg = chatInput.trim();
    if (!msg || !user) return;
    
    socketRef.current.emit("send_message", {
      imageId: image.id,
      senderId: user.id || user._id,
      text: msg
    });
    
    setChatInput("");
  };

  const masonryBreaks = { default: 2, 1100: 1 };

  return (
    <div className="fixed inset-0 z-[9999] flex bg-black/90 overflow-hidden" data-theme={theme}>
      {/* Container */}
      <div className="flex flex-col md:flex-row w-full h-full bg-base-100 shadow-2xl relative ml-0 md:ml-20">
        
        {/* Close Button Mobile */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 z-50 btn btn-circle btn-sm btn-ghost md:hidden"
        >
          <X size={24} />
        </button>

        {/* LEFT - Image Section */}
        <div className="flex-[1.2] flex flex-col bg-base-200 border-r border-base-300 relative overflow-hidden">
          {/* Back button Desktop */}
          <button
            onClick={onClose}
            className="absolute top-6 left-6 z-20 btn btn-neutral btn-sm rounded-full gap-2 backdrop-blur-md bg-black/40 border-none text-white hover:bg-black/60 hidden md:flex"
          >
            <ChevronLeft size={18} /> Back
          </button>

          {/* Image Container */}
          <div className="flex-1 flex items-center justify-center p-4 md:p-12 overflow-hidden">
            <img
              src={image.url}
              alt={title}
              className="max-w-full max-h-full object-contain rounded-xl shadow-2xl transition-transform duration-500 hover:scale-[1.01]"
            />
          </div>

          {/* Action Bar */}
          <div className="p-4 md:p-6 bg-base-100 border-t border-base-300 flex items-center gap-4">
            <div className="flex-1 min-w-0">
              <h2 className="font-bold text-lg truncate text-base-content">{title}</h2>
              <p className="text-sm text-base-content/60 truncate">by {image.author}</p>
            </div>
            
            <div className="flex items-center gap-2">
              <button onClick={handleShare} className="btn btn-circle btn-ghost btn-sm" title="Share">
                <Share2 size={20} />
              </button>
              
              <button 
                onClick={() => toggleFavorite(image)} 
                className={`btn btn-circle btn-sm ${isFavorite ? "btn-error" : "btn-ghost"}`}
                title={isFavorite ? "Remove from Favorites" : "Add to Favorites"}
              >
                <Heart size={20} fill={isFavorite ? "currentColor" : "none"} />
              </button>
              
              <button onClick={handleDownload} className="btn btn-primary rounded-full px-6 gap-2 btn-sm md:btn-md">
                <Download size={18} /> <span className="hidden sm:inline">Download</span>
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT - Content Section (Tabs) */}
        <div className="flex-1 flex flex-col bg-base-100 h-full overflow-hidden">
          {/* Tab Header */}
          <div className="tabs tabs-bordered w-full grid grid-cols-2 bg-base-100 sticky top-0 z-10">
            <button 
              className={`tab tab-lg flex items-center gap-2 transition-all ${activeTab === "related" ? "tab-active font-bold text-primary" : "text-base-content/50"}`}
              onClick={() => setActiveTab("related")}
            >
              <ExternalLink size={18} /> More Like This
            </button>
            <button 
              className={`tab tab-lg flex items-center gap-2 transition-all ${activeTab === "chat" ? "tab-active font-bold text-primary" : "text-base-content/50"}`}
              onClick={() => setActiveTab("chat")}
            >
              <MessageCircle size={18} /> Chat
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto" ref={scrollContainerRef}>
            {activeTab === "related" ? (
              <div className="p-4">
                {loadingRelated ? (
                  <div className="flex justify-center items-center py-20">
                    <span className="loading loading-spinner loading-lg text-primary"></span>
                  </div>
                ) : relatedImages.length === 0 ? (
                  <div className="text-center py-20 opacity-50 italic">No related images found.</div>
                ) : (
                  <Masonry breakpointCols={masonryBreaks} className="flex gap-4" columnClassName="bg-clip-padding">
                    {relatedImages.map((img) => (
                      <div 
                        key={img.id} 
                        className="mb-4 relative group cursor-pointer overflow-hidden rounded-xl border border-base-300 shadow-sm hover:shadow-lg transition-all"
                        onClick={() => {
                          onImageSelect?.(img);
                          scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                      >
                        <img src={img.thumb} alt={img.author} className="w-full h-auto group-hover:scale-105 transition-transform duration-500" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                          <p className="text-white text-xs font-medium">by {img.author}</p>
                        </div>
                      </div>
                    ))}
                  </Masonry>
                )}
              </div>
            ) : (
              <div className="flex flex-col h-full bg-base-200/30">
                {/* Chat Messages */}
                <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
                  {chatMessages.length === 0 && (
                    <div className="text-center py-10">
                      <div className="bg-primary/10 text-primary p-6 rounded-2xl max-w-xs mx-auto">
                        <MessageCircle size={32} className="mx-auto mb-2 opacity-50" />
                        <p className="font-medium text-sm">No messages yet. Be the first to start the conversation!</p>
                      </div>
                    </div>
                  )}
                  {chatMessages.map((msg, i) => (
                    <div 
                      key={msg.id || i} 
                      className={`chat ${msg.sender?._id === (user?.id || user?._id) ? "chat-end" : "chat-start"}`}
                    >
                      <div className="chat-image avatar placeholder">
                        <div className="bg-neutral text-neutral-content rounded-full w-8">
                          <span className="text-xs">{msg.sender?.name?.charAt(0).toUpperCase() || "U"}</span>
                        </div>
                      </div>
                      <div className="chat-header opacity-50 text-xs mb-1">
                        {msg.sender?.name || "User"}
                      </div>
                      <div className={`chat-bubble text-sm ${msg.sender?._id === (user?.id || user?._id) ? "chat-bubble-primary" : "chat-bubble-neutral"}`}>
                        {msg.text}
                      </div>
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>

                {/* Chat Input */}
                <div className="p-4 bg-base-100 border-t border-base-300">
                  {user ? (
                    <div className="flex gap-2 items-center">
                      <input
                        type="text"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && sendChat()}
                        placeholder="Type a message..."
                        className="input input-bordered input-primary flex-1 rounded-full h-11"
                      />
                      <button 
                        onClick={sendChat} 
                        disabled={!chatInput.trim()}
                        className="btn btn-primary btn-circle btn-md shadow-md"
                      >
                        <Send size={18} />
                      </button>
                    </div>
                  ) : (
                    <div className="alert bg-base-200 border-none text-sm py-3">
                      <span>Please login to participate in the chat.</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
