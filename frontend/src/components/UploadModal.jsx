import React, { useState, useRef } from "react";
import {
  X,
  Upload,
  Image as ImageIcon,
  Loader2,
  Tag,
  Type,
  CheckCircle,
} from "lucide-react";
import axios from "axios";
import { API_BASE_URL } from "../config/api.js";
import { useAuth } from "../hooks/useAuth.js";

export default function UploadModal({ onClose, onUploadSuccess }) {
  const { token } = useAuth();
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [title, setTitle] = useState("");
  const [tags, setTags] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const dropRef = useRef(null);
  const [dragging, setDragging] = useState(false);

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
    e.stopPropagation();
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
        if (onUploadSuccess) onUploadSuccess(res.data);
        onClose();
      }, 1200);
    } catch (err) {
      console.error("Upload error:", err);
      setError(
        err.response?.data?.message || "Upload failed. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* Panel */}
      <div
        className="bg-base-100 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-base-300">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center">
              <Upload size={18} className="text-primary" />
            </div>
            <div>
              <h2 className="font-bold text-base-content text-lg leading-tight">
                Upload Wallpaper
              </h2>
              <p className="text-xs text-base-content/50">
                PNG, JPG or JPEG · Max 5 MB
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="btn btn-ghost btn-circle btn-sm text-base-content/60 hover:text-base-content"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Drop zone */}
          <div
            ref={dropRef}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`relative group rounded-xl border-2 border-dashed transition-all duration-200 overflow-hidden
              ${preview ? "border-primary/40 bg-base-200" : dragging ? "border-primary bg-primary/5" : "border-base-300 hover:border-primary/50 hover:bg-base-200/60"}`}
            style={{ minHeight: "180px" }}
          >
            {preview ? (
              <div className="relative w-full h-48">
                <img
                  src={preview}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
                {/* Overlay info */}
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <label className="btn btn-sm btn-ghost text-white gap-2 cursor-pointer">
                    <Upload size={14} /> Change image
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={handleFileChange}
                    />
                  </label>
                </div>
                {/* Remove button */}
                <button
                  type="button"
                  onClick={clearFile}
                  className="absolute top-2 right-2 btn btn-circle btn-xs btn-error shadow-md"
                >
                  <X size={12} />
                </button>
                {/* File name badge */}
                <div className="absolute bottom-2 left-2 badge badge-neutral badge-sm max-w-[180px] truncate opacity-80">
                  {file?.name}
                </div>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center h-44 cursor-pointer w-full">
                <div
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-3 transition-all duration-200
                    ${dragging ? "bg-primary text-primary-content scale-110" : "bg-base-200 text-base-content/40 group-hover:bg-primary/10 group-hover:text-primary"}`}
                >
                  <ImageIcon size={26} />
                </div>
                <p className="font-semibold text-base-content/70 text-sm">
                  {dragging ? "Drop it!" : "Click or drag & drop"}
                </p>
                <p className="text-xs text-base-content/40 mt-1">
                  Supports PNG, JPG, JPEG
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

          {/* Error */}
          {error && (
            <div className="alert alert-error py-2 text-sm rounded-xl gap-2">
              <X size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Title */}
          <div className="form-control">
            <label className="label py-1">
              <span className="label-text font-medium flex items-center gap-1.5">
                <Type size={14} className="text-base-content/50" />
                Title
                <span className="text-base-content/30 text-xs">(optional)</span>
              </span>
            </label>
            <input
              type="text"
              placeholder="Give your wallpaper a name…"
              className="input input-bordered input-sm h-10 rounded-xl focus:input-primary transition-all"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={80}
              disabled={loading}
            />
          </div>

          {/* Tags */}
          <div className="form-control">
            <label className="label py-1">
              <span className="label-text font-medium flex items-center gap-1.5">
                <Tag size={14} className="text-base-content/50" />
                Tags
                <span className="text-base-content/30 text-xs">
                  (comma separated)
                </span>
              </span>
            </label>
            <input
              type="text"
              placeholder="nature, minimal, abstract…"
              className="input input-bordered input-sm h-10 rounded-xl focus:input-primary transition-all"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              disabled={loading}
            />
          </div>

          {/* Submit */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading || !file || success}
            className={`btn btn-block rounded-xl h-11 font-semibold gap-2 transition-all ${
              success ? "btn-success" : "btn-primary"
            }`}
          >
            {success ? (
              <>
                <CheckCircle size={18} /> Uploaded!
              </>
            ) : loading ? (
              <>
                <Loader2 className="animate-spin" size={18} /> Uploading…
              </>
            ) : (
              <>
                <Upload size={18} /> Publish Wallpaper
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
