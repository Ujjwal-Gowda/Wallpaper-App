// src/config/api.js
const isProduction = import.meta.env.VITE_ENV === 'production' || import.meta.env.MODE === 'production';

const API_BASE_URL = isProduction
  ? "https://wallpaper-app-1-9rq5.onrender.com/api"
  : "http://localhost:5000/api";

const SOCKET_URL = isProduction
  ? "https://wallpaper-app-1-9rq5.onrender.com"
  : "http://localhost:5000";

export const API_ENDPOINTS = {
  LOGIN: `${API_BASE_URL}/auth/login`,
  REGISTER: `${API_BASE_URL}/auth/register`,
  LOGOUT: `${API_BASE_URL}/auth/logout`,
  ME: `${API_BASE_URL}/auth/me`,

  PROFILE: `${API_BASE_URL}/profile`,

  EXTERNAL_IMAGES: `${API_BASE_URL}/external`,
  EXTERNAL_IMAGE_DETAIL: (id) => `${API_BASE_URL}/external/${id}`,
  EXTERNAL_IMAGE_RELATED: (id) => `${API_BASE_URL}/external/${id}/related`,
  ALL_FAVORITES: `${API_BASE_URL}/images/all-favorites`,
  EXTERNAL_FAVORITE: `${API_BASE_URL}/images/external-favorite`,
  EXTERNAL_FAVORITE_CHECK: (id) =>
    `${API_BASE_URL}/images/external/${id}/is-favorite`,
  EXTERNAL_FAVORITE_REMOVE: (id) =>
    `${API_BASE_URL}/images/external/${id}/favorite`,

  INTERNAL_FAVORITE_ADD: (id) => `${API_BASE_URL}/images/${id}/favorite`,
  INTERNAL_FAVORITE_REMOVE: (id) => `${API_BASE_URL}/images/${id}/favorite`,

  HEALTH: isProduction
    ? "https://wallpaper-app-1-9rq5.onrender.com/api/health"
    : "http://localhost:5000/health",
};

console.log("🚀 API Base URL:", API_BASE_URL);

export { API_BASE_URL, SOCKET_URL };
