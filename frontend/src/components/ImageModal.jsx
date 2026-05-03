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

  // Derive the current user's id robustly
  const currentUserId = user?.id || user?._id;

  useEffect(() => {
    if (!image) return;

    setLoadingRelated(true);
    setRelatedImages([]);
    setChatMessages([]);
    setChatInput("");

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
      setChatMessages((prev) => {
        // Avoid duplicates
        const exists = prev.some(
          (m) => m.id === message.id || m._id === message._id,
        );
        return exists ? prev : [...prev, message];
      });
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
    if (activeTab === "chat") {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages, activeTab]);

  // Close on Escape key
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  if (!image) return null;

  const title = image.description || image.Title || image.title || "Untitled";

  const handleDownload = async () => {
    try {
      const response = await fetch(image.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `wallpaper-${image.id}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch {
      // Fallback for CORS-restricted images
      const a = document.createElement("a");
      a.href = image.url;
      a.target = "_blank";
      a.download = `wallpaper-${image.id}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  const handleShare = async () => {
    const shareUrl = image.link || window.location.href;
    const txt = `Check out this wallpaper${image.author ? ` by ${image.author}` : ""}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Wallpaper App",
          text: txt,
          url: shareUrl,
        });
      } catch (e) {
        if (e.name !== "AbortError") {
          await navigator.clipboard.writeText(shareUrl);
          alert("Link copied to clipboard!");
        }
      }
    } else {
      await navigator.clipboard.writeText(shareUrl);
      alert("Link copied to clipboard!");
    }
  };

  const sendChat = () => {
    const msg = chatInput.trim();
    if (!msg || !user || !socketRef.current) return;

    socketRef.current.emit("send_message", {
      imageId: image.id,
      senderId: currentUserId,
      text: msg,
    });

    setChatInput("");
  };

  const handleChatKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendChat();
    }
  };

  // Sender ID comparison: backend populates sender with _id, but toJSON maps it to id
  const isOwnMessage = (msg) => {
    const senderId =
      msg.sender?.id || msg.sender?._id?.toString() || msg.senderId?.toString();
    return senderId === currentUserId?.toString();
  };

  const masonryBreaks = { default: 2, 1100: 1 };

  return (
    <>
      {/* Solid overlay backdrop - no transparency issues */}
      <div
        className="fixed inset-0 z-[9998] bg-black/80"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal panel */}
      <div
        className="fixed inset-0 z-[9999] flex pointer-events-none"
        data-theme={theme}
      >
        <div
          className="flex flex-col md:flex-row w-full h-full md:h-[96vh] md:w-[94vw] md:m-auto bg-base-100 shadow-2xl md:rounded-2xl overflow-hidden pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
          style={{ marginLeft: "auto", marginRight: "auto" }}
        >
          {/* ── LEFT: Image panel ── */}
          <div className="flex-[1.2] flex flex-col bg-base-200 border-r border-base-300 relative overflow-hidden min-w-0">
            {/* Back / Close */}
            <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
              <button
                onClick={onClose}
                className="btn btn-sm rounded-full gap-1 bg-black/50 hover:bg-black/70 border-none text-white backdrop-blur-sm"
              >
                <ChevronLeft size={16} />
                <span className="hidden sm:inline text-sm">Back</span>
              </button>
            </div>

            {/* Close button top-right for mobile */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 z-20 btn btn-circle btn-sm bg-black/50 hover:bg-black/70 border-none text-white backdrop-blur-sm md:hidden"
            >
              <X size={16} />
            </button>

            {/* Image */}
            <div className="flex-1 flex items-center justify-center p-6 md:p-10 overflow-hidden">
              <img
                src={image.url}
                alt={title}
                className="max-w-full max-h-full object-contain rounded-xl shadow-xl transition-transform duration-500 hover:scale-[1.01]"
              />
            </div>

            {/* Action bar */}
            <div className="shrink-0 p-4 bg-base-100 border-t border-base-300 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <h2 className="font-bold text-base truncate text-base-content leading-tight">
                  {title}
                </h2>
                <p className="text-sm text-base-content/50 truncate">
                  by {image.author || "Unknown"}
                </p>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={handleShare}
                  className="btn btn-circle btn-ghost btn-sm"
                  title="Share"
                >
                  <Share2 size={18} />
                </button>

                <button
                  onClick={() => toggleFavorite(image)}
                  className={`btn btn-circle btn-sm transition-colors ${
                    isFavorite
                      ? "bg-red-500 hover:bg-red-600 border-none text-white"
                      : "btn-ghost"
                  }`}
                  title={
                    isFavorite ? "Remove from Favorites" : "Add to Favorites"
                  }
                >
                  <Heart
                    size={18}
                    fill={isFavorite ? "currentColor" : "none"}
                  />
                </button>

                <button
                  onClick={handleDownload}
                  className="btn btn-primary rounded-full px-4 gap-2 btn-sm"
                >
                  <Download size={16} />
                  <span className="hidden sm:inline">Download</span>
                </button>
              </div>
            </div>
          </div>

          {/* ── RIGHT: Tabs panel ── */}
          <div className="flex-1 flex flex-col bg-base-100 min-h-0 min-w-0">
            {/* Tab bar */}
            <div className="shrink-0 flex border-b border-base-300 bg-base-100">
              <button
                className={`flex-1 flex items-center justify-center gap-2 py-4 text-sm font-semibold transition-all border-b-2 ${
                  activeTab === "related"
                    ? "border-primary text-primary"
                    : "border-transparent text-base-content/50 hover:text-base-content"
                }`}
                onClick={() => setActiveTab("related")}
              >
                <ExternalLink size={16} />
                More Like This
              </button>
              <button
                className={`flex-1 flex items-center justify-center gap-2 py-4 text-sm font-semibold transition-all border-b-2 ${
                  activeTab === "chat"
                    ? "border-primary text-primary"
                    : "border-transparent text-base-content/50 hover:text-base-content"
                }`}
                onClick={() => setActiveTab("chat")}
              >
                <MessageCircle size={16} />
                Chat
                {chatMessages.length > 0 && (
                  <span className="badge badge-primary badge-xs">
                    {chatMessages.length}
                  </span>
                )}
              </button>
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto" ref={scrollContainerRef}>
              {/* Related images */}
              {activeTab === "related" && (
                <div className="p-4">
                  {loadingRelated ? (
                    <div className="flex justify-center items-center py-20">
                      <span className="loading loading-spinner loading-lg text-primary" />
                    </div>
                  ) : relatedImages.length === 0 ? (
                    <div className="text-center py-20 text-base-content/40 italic">
                      No related images found.
                    </div>
                  ) : (
                    <Masonry
                      breakpointCols={masonryBreaks}
                      className="flex gap-3"
                      columnClassName="bg-clip-padding flex flex-col gap-3"
                    >
                      {relatedImages.map((img) => (
                        <div
                          key={img.id}
                          className="relative group cursor-pointer overflow-hidden rounded-xl border border-base-300 shadow-sm hover:shadow-lg transition-all duration-300"
                          onClick={() => {
                            onImageSelect?.(img);
                            scrollContainerRef.current?.scrollTo({
                              top: 0,
                              behavior: "smooth",
                            });
                          }}
                        >
                          <img
                            src={img.thumb}
                            alt={img.author}
                            className="w-full h-auto group-hover:scale-105 transition-transform duration-500"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                            <p className="text-white text-xs font-medium truncate">
                              by {img.author}
                            </p>
                          </div>
                        </div>
                      ))}
                    </Masonry>
                  )}
                </div>
              )}

              {/* Chat */}
              {activeTab === "chat" && (
                <div className="flex flex-col h-full">
                  <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 min-h-[300px]">
                    {chatMessages.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                          <MessageCircle
                            size={28}
                            className="text-primary opacity-60"
                          />
                        </div>
                        <p className="font-semibold text-base-content/70">
                          No messages yet
                        </p>
                        <p className="text-sm text-base-content/40 mt-1">
                          Be the first to start the conversation!
                        </p>
                      </div>
                    ) : (
                      chatMessages.map((msg, i) => {
                        const own = isOwnMessage(msg);
                        const senderName =
                          msg.sender?.name || msg.senderName || "User";
                        const initial = senderName.charAt(0).toUpperCase();

                        return (
                          <div
                            key={msg.id || msg._id || i}
                            className={`flex gap-2 ${own ? "flex-row-reverse" : "flex-row"}`}
                          >
                            {/* Avatar */}
                            <div
                              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-1 ${
                                own
                                  ? "bg-primary text-primary-content"
                                  : "bg-base-300 text-base-content"
                              }`}
                            >
                              {initial}
                            </div>

                            <div
                              className={`flex flex-col gap-1 max-w-[75%] ${own ? "items-end" : "items-start"}`}
                            >
                              <span className="text-xs text-base-content/40 px-1">
                                {own ? "You" : senderName}
                              </span>
                              <div
                                className={`px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                                  own
                                    ? "bg-primary text-primary-content rounded-tr-sm"
                                    : "bg-base-200 text-base-content rounded-tl-sm"
                                }`}
                              >
                                {msg.text}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                    <div ref={chatEndRef} />
                  </div>

                  {/* Chat input */}
                  <div className="shrink-0 p-4 bg-base-100 border-t border-base-300">
                    {user ? (
                      <div className="flex gap-2 items-center">
                        <input
                          type="text"
                          value={chatInput}
                          onChange={(e) => setChatInput(e.target.value)}
                          onKeyDown={handleChatKeyDown}
                          placeholder="Type a message… (Enter to send)"
                          className="input input-bordered input-sm flex-1 rounded-full h-10 focus:input-primary transition-all"
                          maxLength={500}
                        />
                        <button
                          onClick={sendChat}
                          disabled={!chatInput.trim()}
                          className="btn btn-primary btn-circle btn-sm disabled:opacity-40"
                        >
                          <Send size={15} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 py-2 px-4 bg-base-200 rounded-full text-sm text-base-content/60">
                        <MessageCircle size={16} className="shrink-0" />
                        <span>
                          <a href="/login" className="link link-primary">
                            Sign in
                          </a>{" "}
                          to join the conversation
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
