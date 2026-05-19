import React, { useEffect, useState, useRef } from "react";
import {
  Heart,
  Download,
  ChevronLeft,
  Send,
  X,
  MessageSquare,
  Trash2,
  Loader2,
  CornerDownRight,
  Reply,
} from "lucide-react";
import axios from "axios";
import { API_ENDPOINTS } from "../config/api.js";
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

  // Tab: "related" | "comments"
  const isUploaded = isUploadedImage(image?.id);
  const [activeTab, setActiveTab] = useState("related");

  // Public comments (all images)
  const [comments, setComments] = useState([]);
  const [commentInput, setCommentInput] = useState("");
  const [loadingComments, setLoadingComments] = useState(false);
  const [postingComment, setPostingComment] = useState(false);
  const [replyTo, setReplyTo] = useState(null); // { id, name }

  const scrollContainerRef = useRef(null);
  const commentInputRef = useRef(null);
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
          const res = await axios.get(API_ENDPOINTS.RELATED(image.id));
          let items = res.data.items || [];
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
          const res = await axios.get(
            API_ENDPOINTS.EXTERNAL_IMAGE_RELATED(image.id),
          );
          setRelatedImages(res.data.items || []);
        }
      } catch (err) {
        console.error("Related images error:", err);
      } finally {
        setLoadingRelated(false);
      }
    };
    fetchRelated();
  }, [image?.id, isUploaded]);

  // ── Socket for public comments ─────────────────────────
  useEffect(() => {
    if (!image || !globalSocket) return;

    setLoadingComments(true);
    setComments([]);
    setReplyTo(null);

    globalSocket.emit("join_comments", image.id);

    const handleCommentsHistory = (history) => {
      setComments(history);
      setLoadingComments(false);
    };
    
    const handleReceiveComment = (comment) => {
      setComments((prev) => {
        const exists = prev.some(
          (c) => (c.id && (c.id === comment.id)) || (c._id && (c._id === comment._id)) || (c.tempId && c.tempId === comment.tempId)
        );
        if (exists) {
           return prev.map(c => (c.tempId === comment.tempId) ? comment : c);
        }
        return [...prev, comment];
      });
    };

    globalSocket.on("comments_history", handleCommentsHistory);
    globalSocket.on("receive_comment", handleReceiveComment);

    return () => {
      globalSocket.off("comments_history", handleCommentsHistory);
      globalSocket.off("receive_comment", handleReceiveComment);
    };
  }, [image?.id, globalSocket]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

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

  const handleFavoriteToggle = async () => {
    await toggleFavorite(image);
  };

  // ── Public comment post ───────────────────────────────────────────────
  const postComment = async () => {
    const text = commentInput.trim();
    if (!text || !user || !globalSocket) return;
    
    const tempId = Date.now().toString();
    const optimisticComment = {
      tempId,
      text: text,
      author: {
        id: currentUserId,
        name: user.name || "You",
      },
      parentComment: replyTo?.id || null,
      createdAt: new Date().toISOString(),
    };

    setComments((prev) => [...prev, optimisticComment]);
    setCommentInput("");
    setReplyTo(null);

    try {
      globalSocket.emit("send_comment", {
        imageId: image.id,
        senderId: currentUserId,
        text: text,
        tempId,
        parentCommentId: replyTo?.id || null,
      });
    } catch (err) {
      console.error("Post comment error:", err);
      addNotification("Failed to post comment", "error");
      setComments((prev) => prev.filter(c => c.tempId !== tempId));
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

  const startReply = (commentId, authorName) => {
    setReplyTo({ id: commentId, name: authorName });
    commentInputRef.current?.focus();
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
    {
      id: "comments",
      label: "Comments",
      icon: <MessageSquare size={15} />,
      badge: comments.length || undefined,
    },
  ];

  const masonryBreaks = { default: 2, 1100: 1 };

  const renderComment = (comment, allComments, isReply = false) => {
    const isOwn = String(comment.author?._id || comment.author?.id || comment.author) === String(currentUserId) || 
                  String(comment.sender?._id || comment.sender?.id || comment.sender) === String(currentUserId);
    
    const authorName = comment.author?.name || comment.sender?.name || "User";
    const initial = authorName.charAt(0).toUpperCase();
    const replies = allComments.filter(c => String(c.parentComment) === String(comment.id || comment._id));

    return (
      <div key={comment.id || comment._id || comment.tempId} className={`flex flex-col ${isReply ? 'mt-2' : 'mt-5'}`}>
        <div className="flex gap-3 group">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 shadow-sm border border-base-300/50"
            style={{
              backgroundColor: isDark ? "#2a2a2a" : "#f0f0f0",
              color: isDark ? "#aaa" : "#666",
            }}
          >
            {initial}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2 mb-0.5">
              <span className="text-sm font-bold" style={{ color: textPrimary }}>
                {authorName}
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider opacity-30">
                {new Date(comment.createdAt).toLocaleDateString()}
              </span>
            </div>
            <p className="text-sm leading-relaxed" style={{ color: isDark ? "#ccc" : "#444" }}>
              {comment.text}
            </p>
            <div className="flex gap-4 mt-1.5">
              <button 
                onClick={() => startReply(comment.id || comment._id, authorName)}
                className="flex items-center gap-1 text-[11px] font-bold text-base-content/50 hover:text-primary transition-colors"
              >
                <Reply size={12} /> Reply
              </button>
              {isOwn && (
                <button
                  onClick={() => deleteComment(comment.id || comment._id)}
                  className="flex items-center gap-1 text-[11px] font-bold text-error/60 hover:text-error opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 size={12} /> Delete
                </button>
              )}
            </div>
          </div>
        </div>
        
        {replies.length > 0 && (
          <div className="border-l-2 border-base-content/5 ml-4 pl-4 mt-2 hover:border-primary/30 transition-colors">
            {replies.map(reply => renderComment(reply, allComments, true))}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <div
        className="fixed inset-0 z-[9998]"
        style={{ backgroundColor: "rgba(0,0,0,0.85)" }}
        onClick={onClose}
        aria-hidden="true"
      />

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
            <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
              <button
                onClick={onClose}
                className="btn btn-sm rounded-full gap-1 border-none text-white backdrop-blur-sm"
                style={{ backgroundColor: "rgba(0,0,0,0.55)" }}
              >
                <ChevronLeft size={32} />
              </button>
            </div>

            <button
              onClick={onClose}
              className="absolute top-4 right-4 z-20 btn btn-circle btn-sm border-none text-white backdrop-blur-sm md:hidden"
              style={{ backgroundColor: "rgba(0,0,0,0.55)" }}
            >
              <X size={16} />
            </button>

            <div className="flex-1 flex items-center justify-center p-6 md:p-10 overflow-hidden">
              <img
                src={image.url}
                alt={title}
                className="max-w-full max-h-full object-contain rounded-xl shadow-xl transition-transform duration-500 hover:scale-[1.01]"
              />
            </div>

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

            <div className="flex-1 overflow-y-auto" ref={scrollContainerRef}>
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

              {activeTab === "comments" && (
                <div className="flex flex-col h-full min-h-[400px]">
                  <div className="flex-1 overflow-y-auto p-4 flex flex-col">
                    {loadingComments ? (
                      <div className="flex flex-col items-center justify-center py-20">
                        <span className="loading loading-spinner loading-lg text-primary" />
                        <p className="text-sm mt-4 opacity-50">Loading comments...</p>
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
                      comments.filter(c => !c.parentComment).map(c => renderComment(c, comments))
                    )}
                  </div>

                  <div
                    className="shrink-0 p-4 flex flex-col gap-2"
                    style={{ borderTop: border, backgroundColor: bg }}
                  >
                    {replyTo && (
                      <div className="flex items-center justify-between bg-base-200 px-3 py-1.5 rounded-lg text-xs">
                        <span className="flex items-center gap-2">
                          <CornerDownRight size={14} className="text-primary" />
                          Replying to <span className="font-bold text-primary">{replyTo.name}</span>
                        </span>
                        <button 
                          onClick={() => setReplyTo(null)}
                          className="btn btn-ghost btn-xs btn-circle"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    )}
                    {user ? (
                      <div className="flex gap-2 items-center">
                        <input
                          ref={commentInputRef}
                          type="text"
                          value={commentInput}
                          onChange={(e) => setCommentInput(e.target.value)}
                          onKeyDown={handleCommentKeyDown}
                          placeholder={replyTo ? "Write a reply..." : "Add a comment..."}
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
