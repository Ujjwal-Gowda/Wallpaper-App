import { useTheme } from "../context/ThemeContext.jsx";
import { Palette, Check, Sparkles } from "lucide-react";

const themes = [
  { name: "light", icon: "☀️", desc: "Clean & Bright", category: "Basic" },
  { name: "dark", icon: "🌙", desc: "Easy on Eyes", category: "Basic" },
];

const categories = ["Basic"];

export default function Settings() {
  const { theme, changeTheme } = useTheme();

  return (
    <div className="min-h-screen bg-base-100 p-4 ml-20">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Palette className="text-primary" size={32} />
            <h1 className="text-4xl font-bold text-base-content">Theme Settings</h1>
          </div>
          <p className="text-base-content/70 text-lg">
            Personalize your wallpaper app with beautiful themes
          </p>
        </div>

        {/* Current Theme Display */}
        <div className="card bg-base-200 shadow-xl mb-8">
          <div className="card-body text-center">
            <h2 className="card-title justify-center text-2xl mb-2">
              Currently Active: {themes.find(t => t.name === theme)?.icon} {theme.charAt(0).toUpperCase() + theme.slice(1)}
            </h2>
            <p className="text-base-content/70">
              {themes.find(t => t.name === theme)?.desc}
            </p>
          </div>
        </div>

        {/* Theme Selection */}
        <div className="mb-8">
          <h3 className="text-2xl font-semibold text-base-content mb-4 flex items-center gap-2">
            <Sparkles size={20} className="text-primary" />
            Choose Your Theme
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
              {themes.map((themeOption) => (
                <div
                  key={themeOption.name}
                  className={`card bg-base-200 hover:bg-base-300 cursor-pointer transition-all duration-200 hover:scale-105 border-2 ${
                    theme === themeOption.name ? 'border-primary shadow-lg' : 'border-transparent'
                  }`}
                  onClick={() => changeTheme(themeOption.name)}
                >
                  <div className="card-body p-4 text-center">
                    {/* Theme Icon */}
                    <div className="text-3xl mb-2">
                      {themeOption.icon}
                    </div>

                    {/* Theme Name */}
                    <h4 className="font-semibold text-base-content capitalize flex items-center justify-center gap-2">
                      {themeOption.name}
                      {theme === themeOption.name && (
                        <Check size={16} className="text-primary" />
                      )}
                    </h4>

                    {/* Theme Description */}
                    <p className="text-sm text-base-content/70 mt-1">
                      {themeOption.desc}
                    </p>

                    {/* Color Preview */}
                    <div
                      className="w-full h-3 rounded-full mt-3 border border-base-300"
                      data-theme={themeOption.name}
                      style={{
                        background: 'linear-gradient(90deg, hsl(var(--p)), hsl(var(--s)), hsl(var(--a)))'
                      }}
                    />

                    {/* Active Indicator */}
                    {theme === themeOption.name && (
                      <div className="badge badge-primary badge-sm mt-2">
                        Active
                      </div>
                    )}
                  </div>
                </div>
            ))}
          </div>
        </div>

        {/* Tips Section */}
        <div className="alert alert-info mt-8">
          <div className="flex items-center gap-2">
            <Sparkles className="text-info" size={20} />
            <div>
              <h4 className="font-semibold">Pro Tip:</h4>
              <p className="text-sm">Your theme preference is automatically saved and will be applied across all pages!</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
