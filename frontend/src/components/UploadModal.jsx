import React, { useState } from "react";
import { X, Upload, Image as ImageIcon, Loader2 } from "lucide-react";
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

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (selectedFile.size > 5 * 1024 * 1024) {
        setError("File size must be less than 5MB");
        return;
      }
      setFile(selectedFile);
      setError("");
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError("Please select an image");
      return;
    }

    setLoading(true);
    setError("");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("title", title);
    formData.append("tags", tags);

    try {
      const res = await axios.post(`${API_BASE_URL}/images`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (onUploadSuccess) {
        onUploadSuccess(res.data);
      }
      onClose();
    } catch (err) {
      console.error("Upload error:", err);
      setError(err.response?.data?.message || "Failed to upload image");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-base-100 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
        <div className="flex items-center justify-between p-6 border-b border-base-300">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Upload className="text-primary" /> Upload Wallpaper
          </h2>
          <button onClick={onClose} className="btn btn-ghost btn-circle btn-sm">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Dropzone/Preview */}
          <div 
            className={`relative group h-64 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center transition-all duration-300 ${
              preview ? "border-primary bg-base-200" : "border-base-300 hover:border-primary/50 hover:bg-base-200/50"
            }`}
          >
            {preview ? (
              <>
                <img src={preview} alt="Preview" className="h-full w-full object-contain rounded-xl p-2" />
                <button 
                  type="button"
                  onClick={() => { setFile(null); setPreview(null); }}
                  className="absolute top-2 right-2 btn btn-circle btn-error btn-sm opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X size={16} />
                </button>
              </>
            ) : (
              <label className="flex flex-col items-center justify-center w-full h-full cursor-pointer">
                <div className="p-4 bg-primary/10 rounded-full text-primary mb-4 group-hover:scale-110 transition-transform">
                  <ImageIcon size={40} />
                </div>
                <p className="font-bold">Click to upload or drag and drop</p>
                <p className="text-sm text-base-content/50 mt-1">PNG, JPG or JPEG (MAX. 5MB)</p>
                <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
              </label>
            )}
          </div>

          {error && (
            <div className="alert alert-error text-sm py-2 rounded-xl">
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold">Title</span>
              </label>
              <input 
                type="text" 
                placeholder="Give your wallpaper a name" 
                className="input input-bordered rounded-xl focus:input-primary transition-all"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold">Tags (comma separated)</span>
              </label>
              <input 
                type="text" 
                placeholder="nature, minimal, abstract..." 
                className="input input-bordered rounded-xl focus:input-primary transition-all"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading || !file}
            className="btn btn-primary btn-block rounded-xl h-12 text-lg font-bold gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={20} /> Uploading...
              </>
            ) : (
              <>
                <Upload size={20} /> Publish Wallpaper
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
