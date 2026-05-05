import React, { useState, useEffect, useRef } from "react";
import {
  Upload as UploadIcon,
  Image as ImageIcon,
  Loader2,
  Tag,
  Type,
  CheckCircle,
  X,
  Trash2,
  ZoomIn,
} from "lucide-react";
import axios from "axios";
import { API_BASE_URL } from "../config/api.js";
import { useAuth } from "../hooks/useAuth.js";
import ImageModal from "../components/ImageModal.jsx";
import { useNotifications } from "../context/NotificationContext.jsx";

export default function UploadPage() {
  const { token } = useAuth();
  const { addToast } = useNotifications();
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [title, setTitle] = useState("");
  const [tags, setTags] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [myUploads, setMyUploads] = useState([]);
  const [fetchingUploads, setFetchingUploads] = useState(true);
  const [selectedImage, setSelectedImage] = useState(null);
  const [favoriteStatus, setFavoriteStatus] = useState({});
  const dropRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    fetchMyUploads();
  }, []);

  const fetchMyUploads = async () => {
    try {
      setFetchingUploads(true);
      const res = await axios.get(`${API_BASE_URL}/images/my-uploads`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMyUploads(res.data.items);
    } catch (err) {
      console.error("Error fetching uploads:", err);
    } finally {
      setFetchingUploads(false);
    }
  };

  const handleFile = (selectedFile) => {
    if (!selectedFile) return;
    if (!selectedFile.type.startsWith("image/")) {
      setError("Only image files are allowed.");
      return;
    }
    if (selectedFile.size > 5 * 1024 * 1024) {
      setError("File size must be less than 5 MB.");
      return;
    }
    setFile(selectedFile);
    setError("");
    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result);
    reader.readAsDataURL(selectedFile);
  };

  const handleFileChange = (e) => handleFile(e.target.files[0]);
  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  };
  const handleDragOver = (e) => {
    e.preventDefault();
    setDragging(true);
  };
  const handleDragLeave = () => setDragging(false);
  const clearFile = (e) => {
    if (e) e.stopPropagation();
    setFile(null);
    setPreview(null);
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError("Please select an image first.");
      return;
    }

    setLoading(true);
    setError("");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("title", title.trim());
    formData.append("tags", tags.trim());

    try {
      await axios.post(`${API_BASE_URL}/images`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${token}`,
        },
      });

      setSuccess(true);
      addToast("✅ Wallpaper published successfully!", "success");
      setTimeout(() => {
        setSuccess(false);
        clearFile();
        setTitle("");
        setTags("");
        fetchMyUploads();
      }, 1500);
    } catch (err) {
      console.error("Upload error:", err);
      setError(
        err.response?.data?.message || "Upload failed. Please try again.",
      );
      addToast("Upload failed. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm("Delete this wallpaper permanently?")) return;
    try {
      await axios.delete(`${API_BASE_URL}/images/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMyUploads((prev) => prev.filter((img) => img.id !== id));
      if (selectedImage?.id === id) setSelectedImage(null);
      addToast("🗑️ Wallpaper deleted", "info");
    } catch (err) {
      console.error("Error deleting image:", err);
      addToast("Failed to delete wallpaper", "error");
    }
  };

  const openModal = (img) => {
    setSelectedImage({
      id: img.id || img._id?.toString(),
      url: img.url,
      thumb: img.url,
      author: "You",
      description: img.Title,
      Title: img.Title,
      type: "local",
      tags: img.tags || [],
    });
  };

  const toggleFavorite = async (img) => {
    try {
      const isFav = favoriteStatus[img.id] || false;
      if (isFav) {
        await axios.delete(`${API_BASE_URL}/images/${img.id}/favorite`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        addToast("💔 Removed from favorites", "info");
      } else {
        await axios.post(
          `${API_BASE_URL}/images/${img.id}/favorite`,
          {},
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        addToast("❤️ Added to favorites!", "success");
      }
      setFavoriteStatus((prev) => ({ ...prev, [img.id]: !isFav }));
    } catch (err) {
      console.error("Error toggling favorite:", err);
    }
  };

  return (
    <div className="min-h-screen bg-base-100 p-4 md:p-8 ml-20">
      <div className="max-w-6xl mx-auto space-y-12">
        {/* Header */}
        <div className="text-center space-y-3">
          <h1 className="text-4xl font-bold text-base-content tracking-tight">
            Share Your <span className="text-primary">Masterpiece</span>
          </h1>
          <p className="text-base-content/60 max-w-2xl mx-auto">
            Upload your favorite wallpapers and share them with the community.
            PNG, JPG or JPEG up to 5MB.
          </p>
        </div>

        {/* Upload Form */}
        <div className="grid lg:grid-cols-2 gap-8 items-start">
          {/* Drop zone */}
          <div
            ref={dropRef}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`relative rounded-3xl border-2 border-dashed transition-all duration-300 overflow-hidden flex items-center justify-center min-h-[400px]
              ${preview ? "border-primary/40 bg-base-200" : dragging ? "border-primary bg-primary/5" : "border-base-300 hover:border-primary/50 hover:bg-base-200/40"}`}
          >
            {preview ? (
              <div className="relative w-full h-full min-h-[400px]">
                <img
                  src={preview}
                  alt="Preview"
                  className="absolute inset-0 w-full h-full object-contain p-4"
                />
                <button
                  type="button"
                  onClick={clearFile}
                  className="absolute top-4 right-4 btn btn-circle btn-error btn-sm shadow-lg"
                >
                  <X size={18} />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full h-full cursor-pointer p-12 text-center">
                <div
                  className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-6 transition-all duration-300
                    ${dragging ? "bg-primary text-primary-content scale-110 shadow-xl" : "bg-base-200 text-base-content/40"}`}
                >
                  <UploadIcon size={40} />
                </div>
                <h3 className="text-xl font-semibold mb-2 text-base-content/80">
                  {dragging
                    ? "Release to upload"
                    : "Click or drag your wallpaper here"}
                </h3>
                <p className="text-base-content/40">PNG, JPG, JPEG · Max 5MB</p>
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={handleFileChange}
                />
              </label>
            )}
          </div>

          {/* Form Fields */}
          <div className="bg-base-200/50 p-8 rounded-3xl space-y-6">
            <div className="form-control">
              <label className="label">
                <span className="label-text font-bold text-lg flex items-center gap-2">
                  <Type size={20} className="text-primary" />
                  Wallpaper Title
                </span>
              </label>
              <input
                type="text"
                placeholder="Ex: Neon Cyberpunk Cityscape"
                className="input input-bordered input-lg w-full bg-base-100 rounded-2xl focus:input-primary transition-all"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-bold text-lg flex items-center gap-2">
                  <Tag size={20} className="text-primary" />
                  Tags
                </span>
                <span className="label-text-alt text-base-content/40">
                  Comma separated
                </span>
              </label>
              <input
                type="text"
                placeholder="minimal, dark, nature…"
                className="input input-bordered input-lg w-full bg-base-100 rounded-2xl focus:input-primary transition-all"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                disabled={loading}
              />
            </div>

            {error && (
              <div className="alert alert-error rounded-2xl">
                <X size={20} />
                <span>{error}</span>
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={loading || !file || success}
              className={`btn btn-block btn-lg rounded-2xl h-16 text-lg font-bold gap-3 transition-all ${
                success ? "btn-success" : "btn-primary"
              }`}
            >
              {success ? (
                <>
                  <CheckCircle size={24} /> Published!
                </>
              ) : loading ? (
                <>
                  <Loader2 className="animate-spin" size={24} /> Uploading…
                </>
              ) : (
                <>
                  <UploadIcon size={24} /> Publish Now
                </>
              )}
            </button>
          </div>
        </div>

        {/* My Uploads */}
        <div className="pt-12 border-t border-base-300">
          <div className="flex items-center gap-3 mb-8">
            <h2 className="text-2xl font-bold flex items-center gap-3">
              <ImageIcon className="text-primary" />
              Your Uploaded Wallpapers
            </h2>
            <span className="badge badge-primary badge-lg">
              {myUploads.length}
            </span>
          </div>

          {fetchingUploads ? (
            <div className="flex justify-center py-20">
              <Loader2 className="animate-spin text-primary" size={48} />
            </div>
          ) : myUploads.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {myUploads.map((img) => (
                <div
                  key={img.id || img._id}
                  className="group relative aspect-[3/4] rounded-2xl overflow-hidden bg-base-300 shadow-md cursor-zoom-in transition-all hover:shadow-xl hover:-translate-y-1"
                  onClick={() => openModal(img)}
                >
                  <img
                    src={img.url}
                    alt={img.Title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                    <h3 className="text-white font-semibold truncate text-sm">
                      {img.Title || "Untitled"}
                    </h3>
                    {img.tags?.length > 0 && (
                      <p className="text-white/60 text-xs truncate mt-1">
                        {img.tags.join(", ")}
                      </p>
                    )}
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openModal(img);
                        }}
                        className="btn btn-xs btn-ghost text-white gap-1 border border-white/30 rounded-lg"
                      >
                        <ZoomIn size={12} /> View
                      </button>
                      <button
                        onClick={(e) => handleDelete(img.id || img._id, e)}
                        className="btn btn-xs btn-error rounded-lg gap-1"
                      >
                        <Trash2 size={12} /> Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20 bg-base-200/30 rounded-3xl border-2 border-dashed border-base-300">
              <div className="w-16 h-16 bg-base-300 rounded-full flex items-center justify-center mx-auto mb-4 opacity-50">
                <ImageIcon size={32} />
              </div>
              <h3 className="text-xl font-medium text-base-content/60">
                No uploads yet
              </h3>
              <p className="text-base-content/40">
                Start sharing your wallpapers today!
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Image Modal for uploaded images */}
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
