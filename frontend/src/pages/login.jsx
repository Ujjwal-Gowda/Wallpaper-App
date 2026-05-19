import { useState, useEffect } from "react";
import { Eye, EyeOff, Mail, Lock, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API_ENDPOINTS } from "../config/api";
import { useNotifications } from "../context/NotificationContext";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { addNotification } = useNotifications();

  // Use single high-quality image for login
  const bgImage = `${API_ENDPOINTS.STATIC_IMAGES}/loginflower.jpg`;

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await axios.post(API_ENDPOINTS.LOGIN, {
        email,
        password,
      });

      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));

      addNotification("Welcome back! Login successful.", "success");
      
      setTimeout(() => {
        navigate("/");
        window.location.reload();
      }, 1000);
    } catch (err) {
      addNotification(err.response?.data?.message || "Login failed.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-full flex overflow-hidden bg-base-100">
      {/* Left Side: Centered Image Panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col bg-[#0a0a0a] items-center justify-center p-16 relative">
        <img 
          src={bgImage}
          alt="Featured"
          className="max-w-full max-h-full object-contain pointer-events-none drop-shadow-[0_0_30px_rgba(0,0,0,0.5)]"
        />
        
        <div className="absolute bottom-10 left-0 right-0 text-center px-10">
          <h2 className="text-2xl font-black text-white/90 tracking-tight">
            Premium Wallpapers
          </h2>
          <p className="text-sm text-white/40 font-medium mt-1">
            Discover your next favorite background.
          </p>
        </div>
      </div>

      {/* Right Side: Form Panel */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 overflow-y-auto">
        <div className="w-full max-w-sm">
          <div className="mb-12">
            <h1 className="text-4xl font-black text-base-content mb-3 tracking-tight">
              Sign In
            </h1>
            <p className="text-base-content/50 font-medium">Welcome back! Please enter your details.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="form-control">
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-base-content/20" />
                <input
                  type="email"
                  placeholder="Email"
                  className="input input-bordered w-full pl-12 h-14 rounded-2xl font-medium focus:outline-primary/30"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-control">
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-base-content/20" />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  className="input input-bordered w-full pl-12 pr-12 h-14 rounded-2xl font-medium focus:outline-primary/30"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-base-content/20 hover:text-base-content/40 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button 
              type="submit" 
              className="btn btn-primary w-full h-14 rounded-2xl text-base font-bold shadow-lg shadow-primary/10 mt-2"
              disabled={loading}
            >
              {loading ? <span className="loading loading-spinner"></span> : "Sign In"}
            </button>
          </form>

          <p className="text-center mt-10 text-base-content/40 font-medium text-sm">
            Don't have an account?{" "}
            <button
              onClick={() => navigate("/register")}
              className="text-primary font-bold hover:underline"
            >
              Sign up free
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
