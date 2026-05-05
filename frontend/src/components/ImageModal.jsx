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
  Bell,
  BellOff,
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
  const [notifications, setNotifications] = useState([]);
  const socketRef = useRef();
  const chatEndRef = useRef();
  const scrollContainerRef = useRef();

  const currentUserId = user?.id || user?._id;

  // Notification helper
  const addNotification = (msg, type = "info") => {
    const id = Date.now();
    setNotifications((prev) => [...prev, { id, msg, type }]);
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 3500);
  };

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

    socketRef.current = io(SOCKET_URL);
    socketRef.current.emit("join_room", image.id);

    socketRef.current.on("chat_history", (history) => {
      setChatMessages(history);
    });

    socketRef.current.on("receive_message", (message) => {
      setChatMessages((prev) => {
        const exists = prev.some(
          (m) => m.id === message.id || m._id === message._id,
        );
        if (!exists) {
          // Notify if message is from someone else
          const senderId =
            message.sender?.id ||
            message.sender?._id?.toString() ||
            message.senderId?.toString();
          if (senderId !== currentUserId?.toString()) {
            addNotification(
              `💬 ${message.sender?.name || "Someone"}: ${message.text.slice(0, 40)}${message.text.length > 40 ? "…" : ""}`,
              "chat",
            );
          }
        }
        return exists ? prev : [...prev, message];
      });
    });

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
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
      addNotification("✅ Download started!", "success");
    } catch {
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
          addNotification("🔗 Link copied to clipboard!", "success");
        }
      }
    } else {
      await navigator.clipboard.writeText(shareUrl);
      addNotification("🔗 Link copied to clipboard!", "success");
    }
  };

  const handleFavoriteToggle = async () => {
    await toggleFavorite(image);
    if (isFavorite) {
      addNotification("💔 Removed from favorites", "info");
    } else {
      addNotification("❤️ Added to favorites!", "success");
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

  const isOwnMessage = (msg) => {
    const senderId =
      msg.sender?.id || msg.sender?._id?.toString() || msg.senderId?.toString();
    return senderId === currentUserId?.toString();
  };

  const masonryBreaks = { default: 2, 1100: 1 };

  // Determine DaisyUI theme for the modal container
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
    <>
      {/* Notification Stack */}
      <div className="fixed top-4 right-4 z-[10002] flex flex-col gap-2 pointer-events-none">
        {notifications.map((n) => (
          <div
            key={n.id}
            className={`px-4 py-3 rounded-xl shadow-xl text-sm font-medium max-w-xs backdrop-blur-sm
              transition-all duration-300 animate-[slideInRight_0.3s_ease-out]
              ${
                n.type === "success"
                  ? "bg-success text-success-content"
                  : n.type === "chat"
                    ? "bg-primary text-primary-content"
                    : "bg-base-100 text-base-content border border-base-300"
              }`}
            style={{
              animation: "slideInRight 0.3s ease-out",
            }}
          >
            {n.msg}
          </div>
        ))}
      </div>

      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[9998]"
        style={{ backgroundColor: "rgba(0,0,0,0.85)" }}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal panel — always rendered with explicit solid background */}
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-2 md:p-4 pointer-events-none">
        <div
          data-theme={theme}
          className="flex flex-col md:flex-row w-full h-full md:h-[95vh] md:w-[95vw] md:max-w-7xl shadow-2xl md:rounded-2xl overflow-hidden pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
          style={{
            backgroundColor: isDark ? "#1d1d1d" : "#ffffff",
          }}
        >
          {/* ── LEFT: Image panel ── */}
          <div
            className="flex-[1.2] flex flex-col relative overflow-hidden min-w-0"
            style={{
              backgroundColor: isDark ? "#161616" : "#f5f5f5",
              borderRight: isDark ? "1px solid #333" : "1px solid #e5e7eb",
            }}
          >
            {/* Back / Close */}
            <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
              <button
                onClick={onClose}
                className="btn btn-sm rounded-full gap-1 border-none text-white backdrop-blur-sm"
                style={{ backgroundColor: "rgba(0,0,0,0.55)" }}
              >
                <ChevronLeft size={16} />
                <span className="hidden sm:inline text-sm">Back</span>
              </button>
            </div>

            {/* Close button for mobile */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 z-20 btn btn-circle btn-sm border-none text-white backdrop-blur-sm md:hidden"
              style={{ backgroundColor: "rgba(0,0,0,0.55)" }}
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
            <div
              className="shrink-0 p-4 flex items-center gap-3"
              style={{
                backgroundColor: isDark ? "#1d1d1d" : "#ffffff",
                borderTop: isDark ? "1px solid #333" : "1px solid #e5e7eb",
              }}
            >
              <div className="flex-1 min-w-0">
                <h2
                  className="font-bold text-base truncate leading-tight"
                  style={{ color: isDark ? "#f0f0f0" : "#111" }}
                >
                  {title}
                </h2>
                <p
                  style={{ color: isDark ? "#888" : "#666" }}
                  className="text-sm truncate"
                >
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
                  onClick={handleFavoriteToggle}
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
          <div
            className="flex-1 flex flex-col min-h-0 min-w-0"
            style={{ backgroundColor: isDark ? "#1d1d1d" : "#ffffff" }}
          >
            {/* Tab bar */}
            <div
              className="shrink-0 flex"
              style={{
                borderBottom: isDark ? "1px solid #333" : "1px solid #e5e7eb",
                backgroundColor: isDark ? "#1d1d1d" : "#ffffff",
              }}
            >
              <button
                className={`flex-1 flex items-center justify-center gap-2 py-4 text-sm font-semibold transition-all border-b-2 ${
                  activeTab === "related"
                    ? "border-primary text-primary"
                    : "border-transparent"
                }`}
                style={{
                  color:
                    activeTab === "related"
                      ? undefined
                      : isDark
                        ? "#888"
                        : "#999",
                }}
                onClick={() => setActiveTab("related")}
              >
                <ExternalLink size={16} />
                More Like This
              </button>
              <button
                className={`flex-1 flex items-center justify-center gap-2 py-4 text-sm font-semibold transition-all border-b-2 ${
                  activeTab === "chat"
                    ? "border-primary text-primary"
                    : "border-transparent"
                }`}
                style={{
                  color:
                    activeTab === "chat" ? undefined : isDark ? "#888" : "#999",
                }}
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
                    <div
                      className="text-center py-20 italic text-sm"
                      style={{ color: isDark ? "#666" : "#aaa" }}
                    >
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
                          className="relative group cursor-pointer overflow-hidden rounded-xl shadow-sm hover:shadow-lg transition-all duration-300"
                          style={{
                            border: isDark
                              ? "1px solid #333"
                              : "1px solid #e5e7eb",
                          }}
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
                        <p
                          className="font-semibold"
                          style={{ color: isDark ? "#aaa" : "#555" }}
                        >
                          No messages yet
                        </p>
                        <p
                          className="text-sm mt-1"
                          style={{ color: isDark ? "#666" : "#aaa" }}
                        >
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
                            <div
                              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-1 ${
                                own
                                  ? "bg-primary text-primary-content"
                                  : isDark
                                    ? "bg-gray-700 text-gray-200"
                                    : "bg-gray-200 text-gray-700"
                              }`}
                            >
                              {initial}
                            </div>

                            <div
                              className={`flex flex-col gap-1 max-w-[75%] ${own ? "items-end" : "items-start"}`}
                            >
                              <span
                                className="text-xs px-1"
                                style={{ color: isDark ? "#666" : "#aaa" }}
                              >
                                {own ? "You" : senderName}
                              </span>
                              <div
                                className={`px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                                  own
                                    ? "bg-primary text-primary-content rounded-tr-sm"
                                    : ""
                                }`}
                                style={
                                  !own
                                    ? {
                                        backgroundColor: isDark
                                          ? "#2a2a2a"
                                          : "#f0f0f0",
                                        color: isDark ? "#e0e0e0" : "#333",
                                        borderTopLeftRadius: "2px",
                                      }
                                    : {}
                                }
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
                  <div
                    className="shrink-0 p-4"
                    style={{
                      borderTop: isDark
                        ? "1px solid #333"
                        : "1px solid #e5e7eb",
                      backgroundColor: isDark ? "#1d1d1d" : "#ffffff",
                    }}
                  >
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
                      <div
                        className="flex items-center gap-3 py-2 px-4 rounded-full text-sm"
                        style={{
                          backgroundColor: isDark ? "#2a2a2a" : "#f5f5f5",
                          color: isDark ? "#888" : "#666",
                        }}
                      >
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

      <style>{`
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(60px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </>
  );
}
