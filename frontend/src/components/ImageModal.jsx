import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  Heart,
  Download,
  ChevronLeft,
  Share2,
  Send,
  MessageCircle,
  X,
  MessageSquare,
  Trash2,
  Loader2,
} from "lucide-react";
import axios from "axios";
import { API_ENDPOINTS, SOCKET_URL, API_BASE_URL } from "../config/api.js";
import Masonry from "react-masonry-css";
import { useTheme } from "../context/ThemeContext.jsx";
import { useAuth } from "../hooks/useAuth.js";
import { useNotifications } from "../context/NotificationContext.jsx";
import { useSocket } from "../context/SocketContext.jsx";

// Helper: is this a DB-uploaded image (MongoDB ObjectId)?
const isUploadedImage = (id) =>
  id && typeof id === "string" && id.length === 24 && /^[a-f0-9]+$/i.test(id);

export default function ImageModal({
  image,
  onClose,
  toggleFavorite,
  isFavorite,
  onImageSelect,
}) {
  const { theme } = useTheme();
  const { user, token } = useAuth();
  const { addNotification } = useNotifications();
  const globalSocket = useSocket();

  const [relatedImages, setRelatedImages] = useState([]);
  const [loadingRelated, setLoadingRelated] = useState(true);

  // Tab: "related" | "chat" | "comments"
  // Uploaded images: related + chat + comments
  // Unsplash/local images: related + comments only
  const isUploaded = isUploadedImage(image?.id);
  const [activeTab, setActiveTab] = useState("related");

  // Private chat (uploaded images only)
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const chatEndRef = useRef(null);

  // Public comments (all images)
  const [comments, setComments] = useState([]);
  const [commentInput, setCommentInput] = useState("");
  const [loadingComments, setLoadingComments] = useState(false);
  const [postingComment, setPostingComment] = useState(false);

  const scrollContainerRef = useRef(null);
  const currentUserId = user?.id || user?._id;

  // ── Theme helpers ──────────────────────────────────────────────────────
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

  const bg = isDark ? "#1d1d1d" : "#ffffff";
  const bgAlt = isDark ? "#161616" : "#f5f5f5";
  const border = isDark ? "1px solid #333" : "1px solid #e5e7eb";
  const textPrimary = isDark ? "#f0f0f0" : "#111";
  const textMuted = isDark ? "#888" : "#666";
  const bubbleBg = isDark ? "#2a2a2a" : "#f0f0f0";
  const bubbleText = isDark ? "#e0e0e0" : "#333";

  // ── Fetch related images ──────────────────────────────────────────────
  useEffect(() => {
    if (!image) return;
    setLoadingRelated(true);
    setRelatedImages([]);

    const fetchRelated = async () => {
      try {
        if (isUploaded) {
          // For uploaded images: use our new internal related endpoint
          const res = await axios.get(API_ENDPOINTS.RELATED(image.id));
          let items = res.data.items || [];

          // If not enough internal related, fill with search
          if (items.length < 6) {
            const title = image.Title || image.description || "";
            const searchQuery = encodeURIComponent(
              title.split(" ").slice(0, 3).join(" ") || "wallpaper",
            );
            const searchRes = await axios.get(
              `${API_ENDPOINTS.EXTERNAL_IMAGES}?query=${searchQuery}&per_page=12&useUnsplash=true`,
            );
            const searchItems = (searchRes.data.items || []).filter(
              (si) => si.id !== image.id && !items.find((r) => r.id === si.id),
            );
            items = [...items, ...searchItems].slice(0, 12);
          }
          setRelatedImages(items);
        } else {
          // Unsplash / local images
          const res = await axios.get(
            API_ENDPOINTS.EXTERNAL_IMAGE_RELATED(image.id),
          );
          setRelatedImages(res.data.items || []);
        }
      } catch (err) {
        console.error("Related images error:", err);
        setRelatedImages([]);
      } finally {
        setLoadingRelated(false);
      }
    };

    fetchRelated();
  }, [image?.id, isUploaded]);

  // ── Socket for private chat & public comments ─────────────────────────
  useEffect(() => {
    if (!image || !globalSocket) return;

    // 1. Setup Private Chat (only if uploaded)
    if (isUploaded) {
      setChatMessages([]);
      globalSocket.emit("join_room", image.id);

      const handleChatHistory = (history) => setChatMessages(history);
      const handleReceiveMessage = (message) => {
        setChatMessages((prev) => {
          const exists = prev.some(
            (m) => m.id === message.id || m._id === message._id,
          );
          if (exists) return prev;
          return [...prev, message];
        });
      };

      globalSocket.on("chat_history", handleChatHistory);
      globalSocket.on("receive_message", handleReceiveMessage);

      return () => {
        globalSocket.off("chat_history", handleChatHistory);
        globalSocket.off("receive_message", handleReceiveMessage);
      };
    }

    // 2. Setup Public Comments (for all images)
    setComments([]);
    globalSocket.emit("join_comments", image.id);

    const handleCommentsHistory = (history) => setComments(history);
    const handleReceiveComment = (comment) => {
      setComments((prev) => {
        const exists = prev.some(
          (c) => c.id === comment.id || c._id === comment._id,
        );
        if (exists) return prev;
        return [...prev, comment];
      });
    };

    globalSocket.on("comments_history", handleCommentsHistory);
    globalSocket.on("receive_comment", handleReceiveComment);

    return () => {
      globalSocket.off("comments_history", handleCommentsHistory);
      globalSocket.off("receive_comment", handleReceiveComment);
    };
  }, [image?.id, isUploaded, globalSocket]);

  // ── Misc effects ──────────────────────────────────────────────────────
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

  // ── Actions ────────────────────────────────────────────────────────────
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
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Wallpaper App",
          text: `Check out this wallpaper`,
          url: shareUrl,
        });
      } catch (e) {
        if (e.name !== "AbortError") {
          await navigator.clipboard.writeText(shareUrl);
          addNotification("🔗 Link copied!", "success");
        }
      }
    } else {
      await navigator.clipboard.writeText(shareUrl);
      addNotification("🔗 Link copied!", "success");
    }
  };

  const handleFavoriteToggle = async () => {
    await toggleFavorite(image);
    addNotification(
      isFavorite ? "💔 Removed from favorites" : "❤️ Added to favorites!",
      isFavorite ? "info" : "success",
    );
  };

  // ── Private chat send ─────────────────────────────────────────────────
  const sendChat = () => {
    const msg = chatInput.trim();
    if (!msg || !user || !globalSocket) return;
    globalSocket.emit("send_message", {
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

  // ── Public comment post ───────────────────────────────────────────────
  const postComment = async () => {
    const text = commentInput.trim();
    if (!text || !user || !globalSocket) return;
    setPostingComment(true);
    try {
      globalSocket.emit("send_comment", {
        imageId: image.id,
        senderId: currentUserId,
        text: text,
      });
      setCommentInput("");
    } catch (err) {
      console.error("Post comment error:", err);
      addNotification("Failed to post comment", "error");
    } finally {
      setPostingComment(false);
    }
  };
  const handleCommentKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      postComment();
    }
  };

  const deleteComment = async (commentId) => {
    try {
      await axios.delete(API_ENDPOINTS.COMMENTS(commentId), {
        headers: { Authorization: `Bearer ${token}` },
      });
      setComments((prev) =>
        prev.filter((c) => c.id !== commentId && c._id !== commentId),
      );
    } catch (err) {
      console.error("Delete comment error:", err);
    }
  };

  // ── Tabs config ────────────────────────────────────────────────────────
  const tabs = [
    {
      id: "related",
      label: "More Like This",
      icon: (
        <svg
          width="15"
          height="15"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
      ),
    },
    ...(isUploaded
      ? [
          {
            id: "chat",
            label: "Chat",
            icon: <MessageCircle size={15} />,
            badge: chatMessages.length,
          },
        ]
      : []),
    {
      id: "comments",
      label: "Comments",
      icon: <MessageSquare size={15} />,
      badge: comments.length || undefined,
    },
  ];

  const masonryBreaks = { default: 2, 1100: 1 };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[9998]"
        style={{ backgroundColor: "rgba(0,0,0,0.85)" }}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-2 md:p-4 pointer-events-none">
        <div
          data-theme={theme}
          className="flex flex-col md:flex-row w-full h-full md:h-[95vh] md:w-[95vw] md:max-w-7xl shadow-2xl md:rounded-2xl overflow-hidden pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
          style={{ backgroundColor: bg }}
        >
          {/* ── LEFT: Image panel ── */}
          <div
            className="flex-[1.2] flex flex-col relative overflow-hidden min-w-0"
            style={{ backgroundColor: bgAlt, borderRight: border }}
          >
            {/* Back button */}
            <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
              <button
                onClick={onClose}
                className="btn btn-sm rounded-full gap-1 border-none text-white backdrop-blur-sm"
                style={{ backgroundColor: "rgba(0,0,0,0.55)" }}
              >
                <ChevronLeft size={32} />
              </button>
            </div>

            {/* Mobile close */}
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
              style={{ backgroundColor: bg, borderTop: border }}
            >
              <div className="flex-1 min-w-0">
                <h2
                  className="font-bold text-base truncate leading-tight"
                  style={{ color: textPrimary }}
                >
                  {title}
                </h2>
                <p className="text-sm truncate" style={{ color: textMuted }}>
                  by {image.author || "Unknown"}
                  {isUploaded && (
                    <span className="ml-2 badge badge-primary badge-xs">
                      Uploaded
                    </span>
                  )}
                </p>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {/* <button */}
                {/*   onClick={handleShare} */}
                {/*   className="btn btn-circle btn-ghost btn-sm" */}
                {/*   title="Share" */}
                {/* > */}
                {/*   <Share2 size={18} /> */}
                {/* </button> */}
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
                    size={32}
                    fill={isFavorite ? "currentColor" : "none"}
                  />
                </button>
                <button
                  onClick={handleDownload}
                  className="btn btn-primary rounded-full px-4 gap-2 btn-sm"
                >
                  <Download size={32} />
                </button>
              </div>
            </div>
          </div>

          {/* ── RIGHT: Tabs panel ── */}
          <div
            className="flex-1 flex flex-col min-h-0 min-w-0"
            style={{ backgroundColor: bg }}
          >
            {/* Tab bar */}
            <div
              className="shrink-0 flex"
              style={{ borderBottom: border, backgroundColor: bg }}
            >
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-4 text-xs font-semibold transition-all border-b-2 ${
                    activeTab === tab.id
                      ? "border-primary text-primary"
                      : "border-transparent"
                  }`}
                  style={{
                    color: activeTab === tab.id ? undefined : textMuted,
                  }}
                  onClick={() => setActiveTab(tab.id)}
                >
                  {tab.icon}
                  <span className="hidden sm:inline">{tab.label}</span>
                  {tab.badge > 0 && (
                    <span className="badge badge-primary badge-xs">
                      {tab.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto" ref={scrollContainerRef}>
              {/* ── Related images ── */}
              {activeTab === "related" && (
                <div className="p-4">
                  {loadingRelated ? (
                    <div className="flex justify-center items-center py-20">
                      <span className="loading loading-spinner loading-lg text-primary" />
                    </div>
                  ) : relatedImages.length === 0 ? (
                    <div
                      className="text-center py-20 italic text-sm"
                      style={{ color: textMuted }}
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
                          style={{ border: border }}
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
                              {img.Title ||
                                img.description ||
                                `by ${img.author}`}
                            </p>
                          </div>
                        </div>
                      ))}
                    </Masonry>
                  )}
                </div>
              )}

              {/* ── Private Chat (uploaded images only) ── */}
              {activeTab === "chat" && isUploaded && (
                <div className="flex flex-col h-full min-h-[400px]">
                  <div
                    className="px-4 py-2 text-xs"
                    style={{
                      backgroundColor: isDark ? "#252525" : "#f9f9f9",
                      color: textMuted,
                      borderBottom: border,
                    }}
                  >
                    💬 Private chat — messages are between you and the uploader
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
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
                          style={{ color: textMuted }}
                        >
                          No messages yet
                        </p>
                        <p
                          className="text-sm mt-1"
                          style={{ color: isDark ? "#555" : "#bbb" }}
                        >
                          Start a conversation about this wallpaper!
                        </p>
                      </div>
                    ) : (
                      chatMessages.map((msg, i) => {
                        const own = isOwnMessage(msg);
                        const senderName = msg.sender?.name || "User";
                        const initial = senderName.charAt(0).toUpperCase();
                        return (
                          <div
                            key={msg.id || msg._id || i}
                            className={`flex gap-2 ${own ? "flex-row-reverse" : "flex-row"}`}
                          >
                            <div
                              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-1 ${own ? "bg-primary text-primary-content" : ""}`}
                              style={
                                !own
                                  ? {
                                      backgroundColor: isDark
                                        ? "#444"
                                        : "#e0e0e0",
                                      color: isDark ? "#ccc" : "#555",
                                    }
                                  : {}
                              }
                            >
                              {initial}
                            </div>
                            <div
                              className={`flex flex-col gap-1 max-w-[75%] ${own ? "items-end" : "items-start"}`}
                            >
                              <span
                                className="text-xs px-1"
                                style={{ color: textMuted }}
                              >
                                {own ? "You" : senderName}
                              </span>
                              <div
                                className={`px-3 py-2 rounded-2xl text-sm leading-relaxed ${own ? "bg-primary text-primary-content rounded-tr-sm" : ""}`}
                                style={
                                  !own
                                    ? {
                                        backgroundColor: bubbleBg,
                                        color: bubbleText,
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

                  <div
                    className="shrink-0 p-4"
                    style={{ borderTop: border, backgroundColor: bg }}
                  >
                    {user ? (
                      <div className="flex gap-2 items-center">
                        <input
                          type="text"
                          value={chatInput}
                          onChange={(e) => setChatInput(e.target.value)}
                          onKeyDown={handleChatKeyDown}
                          placeholder="Message… (Enter to send)"
                          className="input input-bordered input-sm flex-1 rounded-full h-10"
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
                          color: textMuted,
                        }}
                      >
                        <MessageCircle size={16} className="shrink-0" />
                        <span>
                          <a href="/login" className="link link-primary">
                            Sign in
                          </a>{" "}
                          to chat
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── Public Comments (all images) ── */}
              {activeTab === "comments" && (
                <div className="flex flex-col h-full min-h-[400px]">
                  <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
                    {loadingComments ? (
                      <div className="flex justify-center items-center py-16">
                        <Loader2
                          className="animate-spin text-primary"
                          size={32}
                        />
                      </div>
                    ) : comments.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                          <MessageSquare
                            size={28}
                            className="text-primary opacity-60"
                          />
                        </div>
                        <p
                          className="font-semibold"
                          style={{ color: textMuted }}
                        >
                          No comments yet
                        </p>
                        <p
                          className="text-sm mt-1"
                          style={{ color: isDark ? "#555" : "#bbb" }}
                        >
                          Be the first to leave a comment!
                        </p>
                      </div>
                    ) : (
                      comments.map((c) => {
                        const isOwn =
                          String(c.author?._id || c.author?.id || c.author) ===
                          String(currentUserId);
                        const authorName = c.author?.name || "User";
                        const initial = authorName.charAt(0).toUpperCase();
                        return (
                          <div key={c.id || c._id} className="flex gap-3 group">
                            <div
                              className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 mt-0.5"
                              style={{
                                backgroundColor: isDark ? "#3a3a3a" : "#e8e8e8",
                                color: isDark ? "#ccc" : "#555",
                              }}
                            >
                              {initial}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-baseline gap-2 mb-1">
                                <span
                                  className="text-sm font-semibold"
                                  style={{ color: textPrimary }}
                                >
                                  {authorName}
                                </span>
                                <span
                                  className="text-xs"
                                  style={{ color: isDark ? "#555" : "#bbb" }}
                                >
                                  {new Date(c.createdAt).toLocaleDateString()}
                                </span>
                              </div>
                              <p
                                className="text-sm leading-relaxed"
                                style={{ color: isDark ? "#ccc" : "#444" }}
                              >
                                {c.text}
                              </p>
                            </div>
                            {isOwn && (
                              <button
                                onClick={() => deleteComment(c.id || c._id)}
                                className="opacity-0 group-hover:opacity-100 btn btn-ghost btn-xs btn-circle transition-opacity shrink-0"
                                style={{ color: isDark ? "#666" : "#ccc" }}
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>

                  <div
                    className="shrink-0 p-4"
                    style={{ borderTop: border, backgroundColor: bg }}
                  >
                    {user ? (
                      <div className="flex gap-2 items-center">
                        <input
                          type="text"
                          value={commentInput}
                          onChange={(e) => setCommentInput(e.target.value)}
                          onKeyDown={handleCommentKeyDown}
                          placeholder="Add a comment… (Enter to post)"
                          className="input input-bordered input-sm flex-1 rounded-full h-10"
                          maxLength={1000}
                          disabled={postingComment}
                        />
                        <button
                          onClick={postComment}
                          disabled={!commentInput.trim() || postingComment}
                          className="btn btn-primary btn-circle btn-sm disabled:opacity-40"
                        >
                          {postingComment ? (
                            <Loader2 size={15} className="animate-spin" />
                          ) : (
                            <Send size={15} />
                          )}
                        </button>
                      </div>
                    ) : (
                      <div
                        className="flex items-center gap-3 py-2 px-4 rounded-full text-sm"
                        style={{
                          backgroundColor: isDark ? "#2a2a2a" : "#f5f5f5",
                          color: textMuted,
                        }}
                      >
                        <MessageSquare size={16} className="shrink-0" />
                        <span>
                          <a href="/login" className="link link-primary">
                            Sign in
                          </a>{" "}
                          to comment
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
