import { useState, useEffect } from "react";
import { Home, Settings, Heart, User, PlusCircle } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useSearch } from "../context/SearchContext.jsx";
import { useAuth } from "../hooks/useAuth.js";
import UploadModal from "./UploadModal.jsx";

export default function SidebarMenu() {
  const navigate = useNavigate();
  const location = useLocation();
  const { clearSearch } = useSearch();
  const { user } = useAuth();
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  // Menu items
  const menuItems = [
    { id: "home", label: "Home", icon: <Home size={24} />, path: "/" },
    {
      id: "profile",
      label: "Profile",
      icon: <User size={24} />,
      path: "/profile",
    },
    {
      id: "favourite",
      label: "Favourite",
      icon: <Heart size={24} />,
      path: "/favourite",
    },
    {
      id: "settings",
      label: "Settings",
      icon: <Settings size={24} />,
      path: "/settings",
      bottom: true,
    },
  ];

  const [active, setActive] = useState("home");

  // Update active state when location changes
  useEffect(() => {
    const current = menuItems.find((item) => item.path === location.pathname);
    if (current) setActive(current.id);
  }, [location]);

  // Handle navigation
  const handleNavigation = (item) => {
    setActive(item.id);
    if (item.id === "home") {
      clearSearch();
    }
    navigate(item.path);
  };

  return (
    <div className="fixed left-0 top-0 h-screen w-20 bg-base-200 border-r border-base-300 flex flex-col items-center py-6 shadow-lg z-50 transition-colors duration-200">
      {/* Logo */}
      <div className="avatar placeholder mb-8">
        <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-primary-content font-bold text-lg mb-8 shadow-sm">
          w
        </div>
      </div>

      {/* Top Menu */}
      <nav className="flex flex-col items-center gap-3">
        {user && (
          <div className="tooltip tooltip-right" data-tip="Upload">
            <button
              onClick={() => setIsUploadOpen(true)}
              className="btn btn-square btn-ghost hover:btn-primary hover:bg-primary/20 text-primary transition-all duration-300 hover:scale-110 mb-2"
            >
              <PlusCircle size={32} strokeWidth={2.5} />
            </button>
          </div>
        )}
        
        {menuItems
          .filter((item) => !item.bottom)
          .map((item) => (
            <div
              key={item.id}
              className="tooltip tooltip-right"
              data-tip={item.label}
            >
              <button
                onClick={() => handleNavigation(item)}
                className={`btn btn-square transition-all duration-300 hover:scale-105 ${
                  active === item.id
                    ? "btn-primary shadow-lg"
                    : "btn-ghost hover:btn-primary hover:bg-primary/20 text-base-content hover:text-primary-content"
                }`}
              >
                <div
                  className={`transition-colors duration-200 ${
                    active === item.id ? "text-primary-content" : ""
                  }`}
                >
                  {item.icon}
                </div>
              </button>
            </div>
          ))}
      </nav>

      {/* Spacer pushes settings to bottom */}
      <div className="flex-1" />

      {/* Bottom Menu (settings only) */}
      <nav className="flex flex-col items-center gap-3 mb-4">
        {menuItems
          .filter((item) => item.bottom)
          .map((item) => (
            <div
              key={item.id}
              className="tooltip tooltip-right"
              data-tip={item.label}
            >
              <button
                onClick={() => handleNavigation(item)}
                className={`btn btn-square transition-all duration-300 hover:scale-105 ${
                  active === item.id
                    ? "btn-primary shadow-lg"
                    : "btn-ghost hover:btn-primary hover:bg-primary/20 text-base-content hover:text-primary-content"
                }`}
              >
                <div
                  className={`transition-colors duration-200 ${
                    active === item.id ? "text-primary-content" : ""
                  }`}
                >
                  {item.icon}
                </div>
              </button>
            </div>
          ))}
      </nav>

      {/* Optional: Theme indicator dot */}
      <div className="w-2 h-2 bg-accent rounded-full opacity-60 mb-2"></div>

      {isUploadOpen && (
        <UploadModal 
          onClose={() => setIsUploadOpen(false)} 
          onUploadSuccess={() => {
            setIsUploadOpen(false);
            window.location.reload(); // Refresh to show new image
          }}
        />
      )}
    </div>
  );
}
