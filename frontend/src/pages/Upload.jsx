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
} from "lucide-react";
import axios from "axios";
import { API_BASE_URL } from "../config/api.js";
import { useAuth } from "../hooks/useAuth.js";
import MasonryGrid from "../components/masonry.jsx";

export default function UploadPage() {
  const { token, user } = useAuth();
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [title, setTitle] = useState("");
  const [tags, setTags] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [myUploads, setMyUploads] = useState([]);
  const [fetchingUploads, setFetchingUploads] = useState(true);
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
      console.error("Error fetching my uploads:", err);
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
      const res = await axios.post(`${API_BASE_URL}/images`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${token}`,
        },
      });

      setSuccess(true);
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
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this image?")) return;
    try {
      await axios.delete(`${API_BASE_URL}/images/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchMyUploads();
    } catch (err) {
      console.error("Error deleting image:", err);
      alert("Failed to delete image.");
    }
  };

  return (
    <div className="min-h-screen bg-base-100 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-12">
        {/* Header Section */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-base-content tracking-tight">
            Share Your <span className="text-primary">Masterpiece</span>
          </h1>
          <p className="text-base-content/60 max-w-2xl mx-auto">
            Upload your favorite high-quality wallpapers and share them with the community.
            We support PNG, JPG and JPEG up to 5MB.
          </p>
        </div>

        {/* Upload Form Section */}
        <div className="grid lg:grid-cols-2 gap-8 items-start">
          {/* Dropzone */}
          <div
            ref={dropRef}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`relative rounded-3xl border-3 border-dashed transition-all duration-300 overflow-hidden flex items-center justify-center min-h-[400px]
              ${preview ? "border-primary/40 bg-base-200" : dragging ? "border-primary bg-primary/5" : "border-base-300 hover:border-primary/50 hover:bg-base-200/60"}`}
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
                  {dragging ? "Release to upload" : "Click or drag your wallpaper here"}
                </h3>
                <p className="text-base-content/40">
                  PNG, JPG, JPEG (Max 5MB)
                </p>
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
                <span className="label-text-alt text-base-content/40">Separated by commas</span>
              </label>
              <input
                type="text"
                placeholder="minimal, dark, nature..."
                className="input input-bordered input-lg w-full bg-base-100 rounded-2xl focus:input-primary transition-all"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                disabled={loading}
              />
            </div>

            {error && (
              <div className="alert alert-error rounded-2xl animate-shake">
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
                  <CheckCircle size={24} /> Successfully Published!
                </>
              ) : loading ? (
                <>
                  <Loader2 className="animate-spin" size={24} /> Processing...
                </>
              ) : (
                <>
                  <UploadIcon size={24} /> Publish Now
                </>
              )}
            </button>
          </div>
        </div>

        {/* My Uploads Section */}
        <div className="pt-12 border-t border-base-300">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold flex items-center gap-3">
              <ImageIcon className="text-primary" />
              Your Uploaded Wallpapers
              <span className="badge badge-primary badge-lg">{myUploads.length}</span>
            </h2>
          </div>

          {fetchingUploads ? (
            <div className="flex justify-center py-20">
              <Loader2 className="animate-spin text-primary" size={48} />
            </div>
          ) : myUploads.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {myUploads.map((img) => (
                <div key={img.id} className="group relative aspect-[3/4] rounded-2xl overflow-hidden bg-base-300 shadow-md transition-all hover:shadow-xl hover:-translate-y-1">
                  <img
                    src={img.url}
                    alt={img.Title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                    <h3 className="text-white font-semibold truncate">{img.Title || "Untitled"}</h3>
                    <div className="flex gap-2 mt-2">
                      <button 
                        onClick={() => handleDelete(img.id)}
                        className="btn btn-error btn-xs rounded-lg gap-1"
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
              <h3 className="text-xl font-medium text-base-content/60">No uploads yet</h3>
              <p className="text-base-content/40">Start sharing your wallpapers today!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
