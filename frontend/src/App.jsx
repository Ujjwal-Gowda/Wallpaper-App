import React from "react";
import Home from "./pages/Home.jsx";
import Upload from "./pages/Upload.jsx";
import Profile from "./pages/profile.jsx";
import Favourite from "./pages/favourite.jsx";
import Settings from "./pages/Settings.jsx";
import RegisterationPage from "./pages/registerationPage.jsx";
import Login from "./pages/login.jsx";
import PrivateRoute from "./utils/PrivateRoute.jsx";
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import SidebarMenu from "./components/menu.jsx";
import { Navigate } from "react-router-dom";
import { ThemeProvider } from "./context/ThemeContext.jsx";
import { SearchProvider } from "./context/SearchContext.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";

function Layout() {
  const location = useLocation();

  // Hide sidebar on login/register pages
  const hideSidebar = ["/login", "/register"].includes(location.pathname.toLowerCase());

  return (
    <div className="flex">
      {!hideSidebar && <SidebarMenu />}
      <div className="flex-1">
        <Routes>
          {/* Public Routes */}
          <Route path="/register" element={<RegisterationPage />} />
          <Route path="/login" element={<Login />} />

          {/* Protected Routes */}
          <Route
            path="/"
            element={
              <PrivateRoute>
                <Home />
              </PrivateRoute>
            }
          />
          <Route
            path="/upload"
            element={
              <PrivateRoute>
                <Upload />
              </PrivateRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <PrivateRoute>
                <Profile />
              </PrivateRoute>
            }
          />
          <Route
            path="/favourite"
            element={
              <PrivateRoute>
                <Favourite />
              </PrivateRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <PrivateRoute>
                <Settings />
              </PrivateRoute>
            }
          />

          {/* Catch-all: redirect unknown routes to login */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SearchProvider>
          <Router>
            <Layout />
          </Router>
        </SearchProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}