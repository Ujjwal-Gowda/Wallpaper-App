import { useState, useEffect } from "react";
import { Home, Settings, Heart, User, Upload } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useSearch } from "../context/SearchContext.jsx";
import { useAuth } from "../hooks/useAuth.js";
import { NotificationBell } from "../context/NotificationContext.jsx";

export default function SidebarMenu() {
  const navigate = useNavigate();
  const location = useLocation();
  const { clearSearch } = useSearch();
  const { user } = useAuth();

  const menuItems = [
    { id: "home", label: "Home", icon: <Home size={22} />, path: "/" },
    {
      id: "upload",
      label: "Upload",
      icon: <Upload size={22} />,
      path: "/upload",
    },
    {
      id: "profile",
      label: "Profile",
      icon: <User size={22} />,
      path: "/profile",
    },
    {
      id: "favourite",
      label: "Favourites",
      icon: <Heart size={22} />,
      path: "/favourite",
    },
    {
      id: "settings",
      label: "Settings",
      icon: <Settings size={22} />,
      path: "/settings",
      bottom: true,
    },
  ];

  const [active, setActive] = useState("home");

  useEffect(() => {
    const current = menuItems.find((item) => item.path === location.pathname);
    if (current) setActive(current.id);
  }, [location]);

  const handleNavigation = (item) => {
    setActive(item.id);
    if (item.id === "home") clearSearch();
    navigate(item.path);
  };

  return (
    <div className="fixed left-0 top-0 h-screen w-20 bg-base-200 border-r border-base-300 flex flex-col items-center py-5 shadow-lg z-50 transition-colors duration-200">
      {/* Logo */}
      <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-primary-content font-black text-lg mb-7 shadow-md select-none">
        W
      </div>

      {/* Top Menu */}
      <nav className="flex flex-col items-center gap-2 w-full px-2">
        {menuItems
          .filter((item) => !item.bottom)
          .map((item) => (
            <div
              key={item.id}
              className="tooltip tooltip-right w-full"
              data-tip={item.label}
            >
              <button
                onClick={() => handleNavigation(item)}
                className={`w-full h-12 rounded-xl flex items-center justify-center transition-all duration-200 hover:scale-105 ${
                  active === item.id
                    ? "bg-primary text-primary-content shadow-md"
                    : "hover:bg-base-300 text-base-content/70 hover:text-base-content"
                }`}
              >
                {item.icon}
              </button>
            </div>
          ))}
      </nav>

      <div className="flex-1" />

      {/* Notification Bell */}
      {user && (
        <div className="mb-2 w-full px-2">
          <div
            className="tooltip tooltip-right w-full"
            data-tip="Notifications"
          >
            <div className="flex justify-center">
              <NotificationBell />
            </div>
          </div>
        </div>
      )}

      {/* Bottom Menu */}
      <nav className="flex flex-col items-center gap-2 w-full px-2 mb-3">
        {menuItems
          .filter((item) => item.bottom)
          .map((item) => (
            <div
              key={item.id}
              className="tooltip tooltip-right w-full"
              data-tip={item.label}
            >
              <button
                onClick={() => handleNavigation(item)}
                className={`w-full h-12 rounded-xl flex items-center justify-center transition-all duration-200 hover:scale-105 ${
                  active === item.id
                    ? "bg-primary text-primary-content shadow-md"
                    : "hover:bg-base-300 text-base-content/70 hover:text-base-content"
                }`}
              >
                {item.icon}
              </button>
            </div>
          ))}
      </nav>

      <div className="w-2 h-2 bg-accent rounded-full opacity-50 mb-1" />
    </div>
  );
}
