import { useState, useEffect } from "react";
import { Eye, EyeOff, Mail, User, Lock, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API_ENDPOINTS } from "../config/api";
import { useNotifications } from "../context/NotificationContext";

export default function Register() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [bgImage, setBgImage] = useState("");
  const navigate = useNavigate();
  const { addNotification } = useNotifications();

  // Use local images from backend public folder
  const rotatingImages = [
    `${API_ENDPOINTS.STATIC_IMAGES}/wallpaper.jpeg`,
    `${API_ENDPOINTS.STATIC_IMAGES}/japan.jpeg`,
    `${API_ENDPOINTS.STATIC_IMAGES}/architect.jpeg`,
    `${API_ENDPOINTS.STATIC_IMAGES}/rdr.jpeg`,
    `${API_ENDPOINTS.STATIC_IMAGES}/car.jpeg`,
  ];

  useEffect(() => {
    let i = 0;
    setBgImage(rotatingImages[0]);
    const interval = setInterval(() => {
      i = (i + 1) % rotatingImages.length;
      setBgImage(rotatingImages[i]);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await axios.post(API_ENDPOINTS.REGISTER, {
        username,
        email,
        password,
      });

      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));

      addNotification("Welcome! Account created successfully.", "success");
      
      setTimeout(() => {
        navigate("/");
        window.location.reload();
      }, 1000);
    } catch (err) {
      addNotification(err.response?.data?.message || "Registration failed.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-base-100">
      {/* Left Side: Local Image Showcase */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-neutral">
        {rotatingImages.map((img) => (
          <div 
            key={img}
            className={`absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ease-in-out ${bgImage === img ? "opacity-100" : "opacity-0"}`}
            style={{ backgroundImage: `url("${img}")` }}
          >
            <div className="absolute inset-0 bg-black/20 backdrop-blur-[1px]"></div>
          </div>
        ))}
        
        <div className="relative z-10 flex flex-col justify-center px-12 text-white">
          <h2 className="text-6xl font-black mb-6 leading-tight drop-shadow-2xl">
            Premium <br />
            <span className="text-primary">Wallpapers</span>
          </h2>
          <p className="text-xl text-white/90 max-w-md leading-relaxed font-medium drop-shadow-lg">
            Join our community and discover thousands of hand-picked 4K wallpapers.
          </p>
        </div>
      </div>

      {/* Right Side: Simple Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="mb-10">
            <h1 className="text-4xl font-black text-base-content mb-2">
              Get Started
            </h1>
            <p className="text-base-content/60 font-medium">Create your account to start exploring.</p>
          </div>

          <form onSubmit={handleRegister} className="space-y-6">
            <div className="form-control w-full">
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-base-content/30" />
                <input
                  type="text"
                  placeholder="Username"
                  className="input input-bordered w-full pl-12 h-14 rounded-2xl font-medium focus:border-primary"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-control w-full">
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-base-content/30" />
                <input
                  type="email"
                  placeholder="Email Address"
                  className="input input-bordered w-full pl-12 h-14 rounded-2xl font-medium focus:border-primary"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-control w-full">
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-base-content/30" />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  className="input input-bordered w-full pl-12 pr-12 h-14 rounded-2xl font-medium focus:border-primary"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-base-content/30"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button 
              type="submit" 
              className="btn btn-primary w-full h-14 rounded-2xl text-lg font-bold shadow-xl shadow-primary/20 mt-4"
              disabled={loading}
            >
              {loading ? <span className="loading loading-spinner"></span> : "Create Account"}
            </button>
          </form>

          <p className="text-center mt-10 text-base-content/60 font-medium">
            Already have an account?{" "}
            <button
              onClick={() => navigate("/login")}
              className="text-primary font-bold hover:underline"
            >
              Sign in
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
